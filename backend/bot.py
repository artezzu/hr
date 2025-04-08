import os
import logging
import aiohttp
from dotenv import load_dotenv
from aiogram import Bot, Dispatcher, types
from aiogram.contrib.fsm_storage.memory import MemoryStorage
from aiogram.dispatcher import FSMContext
from aiogram.dispatcher.filters.state import State, StatesGroup
from sqlalchemy.orm import Session
from database import SessionLocal
import models
import schemas
import re
from datetime import datetime
from transliterate import translit
from pathlib import Path
import unicodedata
from config import BOT_TOKEN, API_URL

load_dotenv()

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Инициализация бота
bot = Bot(token=BOT_TOKEN)
storage = MemoryStorage()
dp = Dispatcher(bot, storage=storage)

# Словарь для хранения chat_id кандидатов
candidate_chat_ids = {}

# Структура вакансий с переводами
VACANCIES = {
    'production': {
        'positions': {
            'mechanic': {
                'title': {'ru': 'Слесарь', 'uz': 'Chilangar'},
                'description': {
                    'ru': 'Работа со станками и оборудованием',
                    'uz': 'Stanoklar va uskunalar bilan ishlash'
                },
                'requirements': {
                    'ru': '- Опыт работы от 1 года\n- Знание технической документации',
                    'uz': '- 1 yillik ish tajribasi\n- Texnik hujjatlarni bilish'
                },
                'conditions': {
                    'ru': '- Официальное трудоустройство\n- Полный соцпакет',
                    'uz': '- Rasmiy ishga joylashish\n- To\'liq ijtimoiy paket'
                },
                'schedule': {
                    'ru': '5/2, с 9:00 до 18:00',
                    'uz': '5/2, 9:00 dan 18:00 gacha'
                }
            },
            'operator': {
                'title': {'ru': 'Оператор станка', 'uz': 'Stanok operatori'},
                'description': {
                    'ru': 'Управление производственным оборудованием',
                    'uz': 'Ishlab chiqarish uskunalarini boshqarish'
                },
                'requirements': {
                    'ru': '- Опыт работы от 2 лет\n- Знание ЧПУ станков',
                    'uz': '- 2 yillik ish tajribasi\n- CNC stanoklar bilimi'
                },
                'conditions': {
                    'ru': '- Официальное трудоустройство\n- Полный соцпакет',
                    'uz': '- Rasmiy ishga joylashish\n- To\'liq ijtimoiy paket'
                },
                'schedule': {
                    'ru': '5/2, с 9:00 до 18:00',
                    'uz': '5/2, 9:00 dan 18:00 gacha'
                }
            }
        }
    },
    'office': {
        'positions': {
            'manager': {
                'title': {'ru': 'Менеджер', 'uz': 'Menejer'},
                'description': {
                    'ru': 'Работа с клиентами и документацией',
                    'uz': 'Mijozlar va hujjatlar bilan ishlash'
                },
                'requirements': {
                    'ru': '- Высшее образование\n- Опыт работы от 1 года',
                    'uz': '- Oliy ma\'lumot\n- 1 yillik ish tajribasi'
                },
                'conditions': {
                    'ru': '- Официальное трудоустройство\n- Полный соцпакет',
                    'uz': '- Rasmiy ishga joylashish\n- To\'liq ijtimoiy paket'
                },
                'schedule': {
                    'ru': '5/2, с 9:00 до 18:00',
                    'uz': '5/2, 9:00 dan 18:00 gacha'
                }
            },
            'accountant': {
                'title': {'ru': 'Бухгалтер', 'uz': 'Hisobchi'},
                'description': {
                    'ru': 'Ведение бухгалтерского учета',
                    'uz': 'Buxgalteriya hisobini yuritish'
                },
                'requirements': {
                    'ru': '- Высшее образование\n- Опыт работы от 3 лет',
                    'uz': '- Oliy ma\'lumot\n- 3 yillik ish tajribasi'
                },
                'conditions': {
                    'ru': '- Официальное трудоустройство\n- Полный соцпакет',
                    'uz': '- Rasmiy ishga joylashish\n- To\'liq ijtimoiy paket'
                },
                'schedule': {
                    'ru': '5/2, с 9:00 до 18:00',
                    'uz': '5/2, 9:00 dan 18:00 gacha'
                }
            }
        }
    }
}

# Состояния FSM
class Form(StatesGroup):
    choosing_language = State()
    choosing_direction = State()  # Выбор направления (производство/офис)
    choosing_vacancy = State()    # Выбор конкретной вакансии
    viewing_vacancy = State()     # Просмотр описания вакансии
    full_name = State()
    birth_date = State()
    position = State()
    specialization = State()
    education = State()
    citizenship = State()
    experience = State()
    city = State()
    phone = State()
    languages = State()
    source = State()
    upload_resume = State()
    preview_data = State()
    WaitingForMessage = State()

# Тексты на разных языках
TEXTS = {
    'ru': {
        'welcome': """
🏢 *Orient Metal* - Ваш надежный партнер в сфере металлообработки!

*О нас:*
📈 Динамично развивающаяся компания
🛠 Современное производство
🌟 Высокое качество продукции
🤝 Надежные решения для клиентов

*Наши преимущества:*
✅ Опытные специалисты
✅ Современное оборудование
✅ Индивидуальный подход
✅ Выгодные условия

*Присоединяйтесь к нашей команде!*
👥 Мы ищем талантливых и мотивированных специалистов.
        """,
        'agreement_text': """
Перед заполнением анкеты, пожалуйста, ознакомьтесь с соглашением об обработке персональных данных.

Нажимая кнопку "Принимаю", вы подтверждаете, что:
1. Даете согласие на обработку ваших персональных данных
2. Подтверждаете достоверность предоставляемой информации
3. Соглашаетесь с условиями обработки данных
        """,
        'accept_agreement': "✅ Принимаю",
        'decline_agreement': "❌ Не принимаю",
        'download_agreement': "📄 Скачать полный текст соглашения",
        'agreement_declined': "Без согласия на обработку персональных данных мы не можем принять вашу анкету",
        'choose_language': "Выберите язык / Tilni tanlang:",
        'enter_fullname': "Введите ваши ФИО полностью:",
        'enter_birthdate': "Введите вашу дату рождения (дд.мм.гггг):",
        'enter_position': "На какую должность вы претендуете?",
        'enter_speciality': "Укажите вашу специальность:",
        'enter_education': "Укажите ваше образование:",
        'enter_citizenship': "Укажите ваше гражданство:",
        'enter_experience': "Опишите Ваш опыт работы:",
        'enter_location': "Укажите город проживания:",
        'enter_phone': "Введите ваш номер телефона:",
        'enter_languages': "Какими языками вы владеете?",
        'upload_resume': "Прикрепите ваше резюме (если есть):",
        'skip_resume': "Пропустить",
        'form_completed': "Спасибо! Ваша анкета принята. HR-менеджер рассмотрит её и свяжется с вами через этого бота.",
        'invalid_input': "Пожалуйста, введите корректные данные.",
        'enter_source': "Как вы узнали о вакансии?",
        'source_options': {
            'headhunter': "Head hunter",
            'facebook': "Facebook",
            'instagram': "Instagram",
            'linkedin': "Linkedin",
            'olx': "Olx",
            'university': "Вузы",
            'friend': "Приглашен через знакомого",
            'telegram': "Телеграм",
            'other': "Другие"
        },
        'choose_direction': """
*Выберите интересующее направление:*

💼 У нас открыты вакансии в следующих отделах:
        """,
        'production': "🏭 Производственные вакансии",
        'office': "👨‍💼 Офисные вакансии",
        'choose_vacancy': 'Выберите вакансию из списка:',
        'back': "🔙 Назад",
        'main_menu': "🏠 В главное меню",
        'fill_form': "📝 Заполнить анкету",
        'back_to_vacancies': "📋 К списку вакансий",
    },
    'uz': {
        'welcome': """
🏢 *Orient Metal* - Metall ishlab chiqarish sohasida ishonchli hamkoringiz!

*Biz haqimizda:*
📈 Jadal rivojlanayotgan kompaniya
🛠 Zamonaviy ishlab chiqarish
🌟 Yuqori sifatli mahsulotlar
🤝 Mijozlar uchun ishonchli yechimlar

*Bizning afzalliklarimiz:*
✅ Tajribali mutaxassislar
✅ Zamonaviy uskunalar
✅ Individual yondashuv
✅ Foydali shartlar

*Jamoamizga qo'shiling!*
👥 Biz iqtidorli va g'ayratli mutaxassislarni izlaymiz.
        """,
        'agreement_text': """
Anketani to'ldirishdan oldin, iltimos, shaxsiy ma'lumotlarni qayta ishlash to'g'risidagi kelishuv bilan tanishing.

"Qabul qilaman" tugmasini bosish orqali siz:
1. Shaxsiy ma'lumotlaringizni qayta ishlashga rozilik berasiz
2. Taqdim etilayotgan ma'lumotlarning to'g'riligini tasdiqlaysiz
3. Ma'lumotlarni qayta ishlash shartlariga rozisiz
        """,
        'accept_agreement': "✅ Qabul qilaman",
        'decline_agreement': "❌ Rad etaman",
        'download_agreement': "📄 To'liq matnni yuklab olish",
        'agreement_declined': "Shaxsiy ma'lumotlarni qayta ishlashga rozilik bermasdan, biz sizning anketangizni qabul qila olmaymiz",
        'choose_language': "Выберите язык / Tilni tanlang:",
        'enter_fullname': "To'liq FISHingizni kiriting:",
        'enter_birthdate': "Tug'ilgan sanangizni kiriting (kk.oo.yyyy):",
        'enter_position': "Qaysi lavozimga da'vogarlik qilyapsiz?",
        'enter_speciality': "Mutaxassisligingizni kiriting:",
        'enter_education': "Ma'lumotingizni kiriting:",
        'enter_citizenship': "Fuqaroligingizni kiriting:",
        'enter_experience': "Ish tajribangizni tasvirlab bering:",
        'enter_location': "Yashash shahringizni kiriting:",
        'enter_phone': "Telefon raqamingizni kiriting:",
        'enter_languages': "Qaysi tillarda gaplasha olasiz?",
        'upload_resume': "Rezyumengizni biriktiring (agar mavjud bo'lsa):",
        'skip_resume': "O'tkazib yuborish",
        'form_completed': "Rahmat! Sizning anketangiz qabul qilindi. HR-menejer ko'rib chiqadi va siz bilan bot orqali bog'lanadi.",
        'invalid_input': "Iltimos, to'g'ri ma'lumotlarni kiriting.",
        'enter_source': "Vakansiya haqida qanday bildingiz?",
        'source_options': {
            'headhunter': "Head hunter",
            'facebook': "Facebook",
            'instagram': "Instagram",
            'linkedin': "Linkedin",
            'olx': "Olx",
            'university': "Universitetlar",
            'friend': "Tanish orqali taklif qilingan",
            'telegram': "Telegram",
            'other': "Boshqalar"
        },
        'choose_direction': """
*Yo'nalishni tanlang:*

💼 Bizda quyidagi bo'limlarda vakansiyalar mavjud:
        """,
        'production': "🏭 Ishlab chiqarish vakansiyalari",
        'office': "👨‍💼 Ofis vakansiyalari",
        'choose_vacancy': 'Vakansiyani tanlang:',
        'back': "🔙 Ortga",
        'main_menu': "🏠 Asosiy menyu",
        'fill_form': "📝 Anketani to'ldirish",
        'back_to_vacancies': "📋 Vakansiyalarga qaytish",
    }
}

@dp.message_handler(commands=['start'])
async def cmd_start(message: types.Message):
    """Обработчик команды /start"""
    user_username = message.from_user.username
    if user_username:
        candidate_chat_ids[f"@{user_username}"] = message.chat.id
        logger.info(f"Saved chat_id for @{user_username}: {message.chat.id}")

    # Создаем клавиатуру для выбора языка
    keyboard = types.InlineKeyboardMarkup(row_width=2)
    keyboard.add(
        types.InlineKeyboardButton("Русский 🇷🇺", callback_data="lang_ru"),
        types.InlineKeyboardButton("O'zbek 🇺🇿", callback_data="lang_uz")
    )
    
    # Отправляем сообщение с выбором языка
    await message.answer(
        "Добро пожаловать!\nВыберите язык / Tilni tanlang:",
        reply_markup=keyboard
    )
    await Form.choosing_language.set()

@dp.callback_query_handler(lambda c: c.data.startswith('lang_'), state=Form.choosing_language)
async def process_language_choice(callback_query: types.CallbackQuery, state: FSMContext):
    """Обработчик выбора языка"""
    lang = callback_query.data.split('_')[1]
    await state.update_data(language=lang)
    
    # Отправляем приветственное сообщение о компании
    await callback_query.message.answer(
        TEXTS[lang]['welcome'],
        parse_mode="Markdown"
    )
    
    # Создаем клавиатуру с направлениями
    keyboard = types.InlineKeyboardMarkup(row_width=1)
    keyboard.add(
        types.InlineKeyboardButton(TEXTS[lang]['production'], callback_data='production'),
        types.InlineKeyboardButton(TEXTS[lang]['office'], callback_data='office')
    )
    
    # Отправляем сообщение с выбором направления
    await callback_query.message.answer(
        TEXTS[lang]['choose_direction'],
        reply_markup=keyboard,
        parse_mode="Markdown"
    )
    await Form.choosing_direction.set()
    await callback_query.answer()

@dp.callback_query_handler(lambda c: c.data.startswith("apply_"), state=Form.viewing_vacancy)
async def start_filling_form(callback_query: types.CallbackQuery, state: FSMContext):
    """Начало заполнения анкеты"""
    try:
        vacancy_id = callback_query.data.split('_')[1]
        state_data = await state.get_data()
        direction = state_data.get('chosen_direction')
        language = state_data.get('language', 'ru')
        
        # Сохраняем выбранную вакансию и её название
        vacancy_data = VACANCIES[direction]["positions"][vacancy_id]
        await state.update_data(
            chosen_vacancy=vacancy_id,
            position=vacancy_data['title'][language]  # Сохраняем название должности
        )
        
        # Показываем соглашение перед началом заполнения анкеты
        keyboard = types.InlineKeyboardMarkup(row_width=1)
        keyboard.add(
            types.InlineKeyboardButton(
                TEXTS[language]['accept_agreement'],
                callback_data="accept_agreement"
            ),
            types.InlineKeyboardButton(
                TEXTS[language]['decline_agreement'],
                callback_data="decline_agreement"
            ),
            types.InlineKeyboardButton(
                TEXTS[language]['download_agreement'],
                callback_data="download_agreement"
            )
        )
        
        await callback_query.message.answer(
            TEXTS[language]['agreement_text'],
            reply_markup=keyboard
        )
        
    except Exception as e:
        logger.error(f"Error in start_filling_form: {e}")
        await callback_query.answer(
            "Произошла ошибка. Попробуйте еще раз." if language == 'ru' else 
            "Xatolik yuz berdi. Qaytadan urinib ko'ring."
        )

@dp.callback_query_handler(lambda c: c.data == "accept_agreement", state="*")
async def process_agreement_accepted(callback_query: types.CallbackQuery, state: FSMContext):
    """Обработка принятия соглашения"""
    state_data = await state.get_data()
    language = state_data.get('language', 'ru')
    
    # Начинаем заполнение анкеты
    await callback_query.message.answer(TEXTS[language]['enter_fullname'])
    await Form.full_name.set()

@dp.callback_query_handler(lambda c: c.data == "decline_agreement", state="*")
async def process_agreement_declined(callback_query: types.CallbackQuery, state: FSMContext):
    """Обработка отказа от соглашения"""
    state_data = await state.get_data()
    language = state_data.get('language', 'ru')
    
    await callback_query.message.answer(TEXTS[language]['agreement_declined'])
    await state.finish()

@dp.callback_query_handler(lambda c: c.data in ['production', 'office'], state=Form.choosing_direction)
async def process_direction_choice(callback_query: types.CallbackQuery, state: FSMContext):
    """Обработчик выбора направления"""
    state_data = await state.get_data()
    language = state_data.get('language', 'ru')
    direction = callback_query.data
    
    # Сохраняем выбранное направление
    await state.update_data(chosen_direction=direction)
    
    # Создаем клавиатуру с вакансиями
    keyboard = types.InlineKeyboardMarkup(row_width=1)
    
    # Добавляем вакансии из выбранного направления
    for position_id, position_data in VACANCIES[direction]['positions'].items():
        keyboard.add(
            types.InlineKeyboardButton(
                position_data['title'][language],
                callback_data=f"vacancy_{position_id}"
            )
        )
    
    # Добавляем кнопку "Назад"
    keyboard.add(
        types.InlineKeyboardButton(
            TEXTS[language]['back'],
            callback_data="back_to_start"
        )
    )
    
    await callback_query.message.edit_text(
        TEXTS[language]['choose_vacancy'],
        reply_markup=keyboard
    )
    await Form.choosing_vacancy.set()

@dp.callback_query_handler(lambda c: c.data.startswith("vacancy_"), state=Form.choosing_vacancy)
async def process_vacancy_choice(callback_query: types.CallbackQuery, state: FSMContext):
    """Обработчик выбора вакансии"""
    try:
        vacancy_id = callback_query.data.split('_')[1]
        state_data = await state.get_data()
        direction = state_data.get('chosen_direction')
        language = state_data.get('language', 'ru')
        
        if direction not in VACANCIES or vacancy_id not in VACANCIES[direction]["positions"]:
            logger.error(f"Invalid vacancy ID: {vacancy_id} for direction: {direction}")
            await process_back_to_start(callback_query, state)
            return
            
        vacancy_data = VACANCIES[direction]["positions"][vacancy_id]
        
        # Формируем сообщение в зависимости от выбранного языка
        vacancy_info = f"""
🔍 <b>Вакансия:</b> {vacancy_data['title'][language]}

📝 <b>Описание:</b>
{vacancy_data['description'][language]}

📋 <b>Требования:</b>
{vacancy_data['requirements'][language]}

💼 <b>Условия:</b>
{vacancy_data['conditions'][language]}

🕒 <b>График работы:</b>
{vacancy_data['schedule'][language]}
"""
        
        # Создаем клавиатуру
        keyboard = types.InlineKeyboardMarkup(row_width=1)
        keyboard.add(
            types.InlineKeyboardButton(
                TEXTS[language]['fill_form'],
                callback_data=f"apply_{vacancy_id}"
            ),
            types.InlineKeyboardButton(
                TEXTS[language]['back_to_vacancies'],
                callback_data="back_to_vacancies"
            ),
            types.InlineKeyboardButton(
                TEXTS[language]['main_menu'],
                callback_data="back_to_start"
            )
        )
        
        await callback_query.message.edit_text(
            vacancy_info,
            reply_markup=keyboard,
            parse_mode="HTML"
        )
        await Form.viewing_vacancy.set()
        
    except Exception as e:
        logger.error(f"Error in process_vacancy_choice: {e}")
        await process_back_to_start(callback_query, state)

@dp.callback_query_handler(lambda c: c.data == "back_to_vacancies", state="*")
async def process_back_to_vacancies(callback_query: types.CallbackQuery, state: FSMContext):
    """Обработчик возврата к списку вакансий"""
    try:
        state_data = await state.get_data()
        direction = state_data.get('chosen_direction')
        language = state_data.get('language', 'ru')
        
        keyboard = types.InlineKeyboardMarkup(row_width=1)
        for position_id, position_data in VACANCIES[direction]["positions"].items():
            keyboard.add(
                types.InlineKeyboardButton(
                    position_data['title'][language],
                    callback_data=f"vacancy_{position_id}"
                )
            )
        keyboard.add(
            types.InlineKeyboardButton(
                TEXTS[language]['back'],
                callback_data="back_to_start"
            )
        )
        
        await callback_query.message.edit_text(
            TEXTS[language]['choose_vacancy'],
            reply_markup=keyboard
        )
        await Form.choosing_vacancy.set()
    except Exception as e:
        logger.error(f"Error in process_back_to_vacancies: {e}")
        await process_back_to_start(callback_query, state)

@dp.message_handler(state=Form.full_name)
async def process_name(message: types.Message, state: FSMContext):
    state_data = await state.get_data()
    language = state_data.get('language', 'ru')
    
    async with state.proxy() as data:
        data['full_name'] = message.text
    await Form.birth_date.set()
    await message.answer(TEXTS[language]['enter_birthdate'])

@dp.message_handler(state=Form.birth_date)
async def process_birthdate(message: types.Message, state: FSMContext):
    state_data = await state.get_data()
    language = state_data.get('language', 'ru')
    
    async with state.proxy() as data:
        data['birth_date'] = message.text
    await Form.specialization.set()
    await message.answer(TEXTS[language]['enter_speciality'])

@dp.message_handler(state=Form.specialization)
async def process_specialization(message: types.Message, state: FSMContext):
    state_data = await state.get_data()
    language = state_data.get('language', 'ru')
    
    async with state.proxy() as data:
        data['specialization'] = message.text
    await Form.education.set()
    await message.answer(TEXTS[language]['enter_education'])

@dp.message_handler(state=Form.education)
async def process_education(message: types.Message, state: FSMContext):
    state_data = await state.get_data()
    language = state_data.get('language', 'ru')
    
    async with state.proxy() as data:
        data['education'] = message.text
    await Form.citizenship.set()
    await message.answer(TEXTS[language]['enter_citizenship'])

@dp.message_handler(state=Form.citizenship)
async def process_citizenship(message: types.Message, state: FSMContext):
    state_data = await state.get_data()
    language = state_data.get('language', 'ru')
    
    async with state.proxy() as data:
        data['citizenship'] = message.text
    await Form.experience.set()
    await message.answer(TEXTS[language]['enter_experience'])

@dp.message_handler(state=Form.experience)
async def process_experience(message: types.Message, state: FSMContext):
    state_data = await state.get_data()
    language = state_data.get('language', 'ru')
    
    async with state.proxy() as data:
        data['experience'] = message.text
    await Form.city.set()
    await message.answer(TEXTS[language]['enter_location'])

@dp.message_handler(state=Form.city)
async def process_city(message: types.Message, state: FSMContext):
    state_data = await state.get_data()
    language = state_data.get('language', 'ru')
    
    async with state.proxy() as data:
        data['city'] = message.text
    await Form.phone.set()
    await message.answer(TEXTS[language]['enter_phone'])

@dp.message_handler(state=Form.phone)
async def process_phone(message: types.Message, state: FSMContext):
    state_data = await state.get_data()
    language = state_data.get('language', 'ru')
    
    async with state.proxy() as data:
        data['phone'] = message.text
    await Form.languages.set()
    await message.answer(TEXTS[language]['enter_languages'])

@dp.message_handler(state=Form.languages)
async def process_languages(message: types.Message, state: FSMContext):
    state_data = await state.get_data()
    language = state_data.get('language', 'ru')
    
    async with state.proxy() as data:
        data['languages'] = message.text
    
    # Создаем клавиатуру для выбора источника
    keyboard = types.InlineKeyboardMarkup(row_width=1)
    for source_id, source_name in TEXTS[language]['source_options'].items():
        keyboard.add(types.InlineKeyboardButton(source_name, callback_data=f"source_{source_id}"))
    
    await message.answer(TEXTS[language]['enter_source'], reply_markup=keyboard)
    await Form.source.set()

@dp.callback_query_handler(lambda c: c.data.startswith('source_'), state=Form.source)
async def process_source(callback_query: types.CallbackQuery, state: FSMContext):
    state_data = await state.get_data()
    language = state_data.get('language', 'ru')
    source_id = callback_query.data.split('_')[1]
    
    async with state.proxy() as data:
        data['source'] = TEXTS[language]['source_options'][source_id]
    
    # Создаем клавиатуру для загрузки резюме
    keyboard = types.InlineKeyboardMarkup(row_width=1)
    keyboard.add(
        types.InlineKeyboardButton(
            "📎 Загрузить резюме" if language == 'ru' else "📎 Rezyume yuklash",
            callback_data="upload_resume"
        ),
        types.InlineKeyboardButton(
            "✅ Отправить без резюме" if language == 'ru' else "✅ Rezyumesiz yuborish",
            callback_data="submit_without_resume"
        )
    )
    
    await callback_query.message.edit_text(TEXTS[language]['upload_resume'], reply_markup=keyboard)
    await Form.upload_resume.set()

@dp.callback_query_handler(lambda c: c.data == "upload_resume", state=Form.upload_resume)
async def request_resume(callback_query: types.CallbackQuery, state: FSMContext):
    state_data = await state.get_data()
    language = state_data.get('language', 'ru')
    
    await callback_query.message.answer(
        "📎 Пожалуйста, отправьте файл резюме (PDF, DOC, DOCX)" if language == 'ru' else 
        "📎 Iltimos, rezyume faylini yuboring (PDF, DOC, DOCX)"
    )

def sanitize_filename(filename: str) -> str:
    """
    Создает безопасное имя файла, удаляя специальные символы и транслитерируя русский текст
    """
    # Удаляем расширение для обработки
    name, ext = os.path.splitext(filename)
    
    # Транслитерация русских букв
    trans_map = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
        'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
        'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
        'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
        'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
    }
    
    # Нормализуем unicode и конвертируем в нижний регистр
    name = unicodedata.normalize('NFKD', name.lower())
    
    # Транслитерация
    result = ''
    for char in name:
        if char in trans_map:
            result += trans_map[char]
        elif char.isalnum() or char in '-_':
            result += char
        else:
            result += '_'
    
    # Удаляем множественные подчеркивания
    result = re.sub(r'_+', '_', result)
    
    # Добавляем временную метку и расширение
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    return f"{result}_{timestamp}{ext}"

@dp.message_handler(content_types=['document'], state=Form.upload_resume)
async def process_resume(message: types.Message, state: FSMContext):
    try:
        state_data = await state.get_data()
        language = state_data.get('language', 'ru')
        
        # Проверяем тип файла
        file_name = message.document.file_name.lower()
        logger.info(f"Processing resume file: {file_name}")
        
        if not any(file_name.endswith(ext) for ext in ['.pdf', '.doc', '.docx']):
            await message.answer(
                "Пожалуйста, отправьте файл в формате PDF, DOC или DOCX" if language == 'ru' else
                "Iltimos, PDF, DOC yoki DOCX formatidagi faylni yuboring"
            )
            return
        
        # Проверяем размер файла (10MB лимит)
        if message.document.file_size > 10 * 1024 * 1024:
            await message.answer(
                "Размер файла слишком большой. Максимальный размер - 10MB" if language == 'ru' else
                "Fayl hajmi juda katta. Maksimal hajm - 10MB"
            )
            return
        
        # Создаем безопасное имя файла
        safe_filename = sanitize_filename(file_name)
        
        # Создаем директорию если её нет
        resume_dir = Path("resumes")
        resume_dir.mkdir(exist_ok=True)
        
        # Формируем путь к файлу
        file_path = resume_dir / safe_filename
        
        # Загружаем файл
        file = await message.document.get_file()
        await file.download(destination_file=str(file_path))
        logger.info(f"Resume saved successfully to: {file_path}")
        
        # Получаем все необходимые данные из состояния
        data = await state.get_data()
        
        # Создаем данные для API
        api_data = {
            'full_name': data['full_name'],
            'birth_date': data['birth_date'],
            'position': data['position'],
            'specialization': data['specialization'],
            'education': data['education'],
            'citizenship': data['citizenship'],
            'experience': data['experience'],
            'city': data['city'],
            'phone': data['phone'],
            'telegram': f"@{message.from_user.username}" if message.from_user.username else "Не указан",
            'languages': data['languages'],
            'telegram_chat_id': str(message.chat.id),
            'source': data['source'],
            'resume_file_path': str(safe_filename)  # Сохраняем только имя файла
        }
        
        logger.info(f"Sending application data to API with resume_file_path: {safe_filename}")
        
        # Отправляем данные в API
        async with aiohttp.ClientSession() as session:
            async with session.post(f"{API_URL}/applications/", json=api_data) as resp:
                if resp.status == 200:
                    response_data = await resp.json()
                    await handle_successful_form_submission(response_data['id'], message, state)
                else:
                    error_text = await resp.text()
                    logger.error(f"API error: {error_text}")
                    await message.answer(
                        "Извините, произошла ошибка при отправке заявки. Пожалуйста, попробуйте позже." if language == 'ru' else
                        "Kechirasiz, ariza yuborishda xatolik yuz berdi. Iltimos, keyinroq urinib ko'ring."
                    )
                    # Удаляем файл в случае ошибки
                    file_path.unlink(missing_ok=True)
                    await state.finish()
            
    except Exception as e:
        logger.error(f"Error processing resume: {e}")
        await message.answer(
            "Произошла ошибка при обработке резюме. Пожалуйста, попробуйте позже." if language == 'ru' else
            "Rezyumeni qayta ishlashda xatolik yuz berdi. Iltimos, keyinroq urinib ko'ring."
        )
        await state.finish()

@dp.callback_query_handler(lambda c: c.data == "submit_without_resume", state=Form.upload_resume)
async def submit_without_resume(callback_query: types.CallbackQuery, state: FSMContext):
    try:
        state_data = await state.get_data()
        language = state_data.get('language', 'ru')
        
        async with state.proxy() as data:
            api_data = {
                'full_name': data['full_name'],
                'birth_date': data['birth_date'],
                'position': data['position'],
                'specialization': data['specialization'],
                'education': data['education'],
                'citizenship': data['citizenship'],
                'experience': data['experience'],
                'city': data['city'],
                'phone': data['phone'],
                'telegram': f"@{callback_query.from_user.username}" if callback_query.from_user.username else "Не указан",
                'languages': data['languages'],
                'telegram_chat_id': str(callback_query.message.chat.id),
                'source': data['source']
            }

            # Отправляем данные в API
            async with aiohttp.ClientSession() as session:
                async with session.post(f"{API_URL}/applications/", json=api_data) as resp:
                    if resp.status == 200:
                        response_data = await resp.json()
                        await handle_successful_form_submission(response_data['id'], callback_query.message, state)
                    else:
                        await callback_query.message.edit_text(
                            "Извините, произошла ошибка при отправке заявки. Пожалуйста, попробуйте позже." if language == 'ru' else
                            "Kechirasiz, ariza yuborishda xatolik yuz berdi. Iltimos, keyinroq urinib ko'ring."
                        )
                        await state.finish()

    except Exception as e:
        logger.error(f"Error submitting form: {e}")
        await callback_query.message.edit_text(
            "Произошла ошибка при отправке формы. Пожалуйста, попробуйте позже." if language == 'ru' else
            "Forma yuborishda xatolik yuz berdi. Iltimos, keyinroq urinib ko'ring."
        )

@dp.message_handler(state="*")
async def handle_all_messages(message: types.Message, state: FSMContext):
    """Обработчик всех сообщений для логирования состояния"""
    current_state = await state.get_state()
    logger.info(f"Received message in state: {current_state}")
    
    # Если это не команда
    if not message.text.startswith('/'):
        # Проверяем, есть ли у пользователя активная заявка
        db = SessionLocal()
        try:
            # Ищем заявку по telegram_chat_id
            application = db.query(models.Application).filter(
                models.Application.telegram_chat_id == str(message.chat.id)
            ).order_by(models.Application.created_at.desc()).first()
            
            if application:
                # Если нашли заявку, восстанавливаем состояние
                logger.info(f"Found existing application {application.id} for chat {message.chat.id}")
                await state.update_data(application_id=application.id)
                await Form.WaitingForMessage.set()
                # Передаем сообщение в обработчик
                await handle_candidate_message(message, state)
                return
                
        except Exception as e:
            logger.error(f"Error checking existing application: {e}")
        finally:
            db.close()
    
    if current_state is None:
        await message.answer(
            "Для подачи новой заявки или начала общения используйте команду /start"
        )
        return

@dp.callback_query_handler(lambda c: c.data.startswith('confirm_') or c.data.startswith('reject_'), state="*")
async def process_confirmation(callback_query: types.CallbackQuery, state: FSMContext):
    """Обработчик нажатий на кнопки подтверждения/отклонения сообщения"""
    try:
        logger.info(f"Получен callback: {callback_query.data}")
        chat_id = callback_query.from_user.id
        message_id = callback_query.message.message_id
        
        # Определяем тип действия и ID подтверждения
        if '_' not in callback_query.data:
            await callback_query.answer("Неверный формат запроса")
            return
            
        action, confirmation_id = callback_query.data.split('_', 1)
        
        # Открываем сессию базы данных
        db = SessionLocal()
        try:
            # Ищем подтверждение в БД по ключу
            confirmation = db.query(models.MessageConfirmation).filter(
                models.MessageConfirmation.confirmation_key == confirmation_id,
                models.MessageConfirmation.telegram_chat_id == str(chat_id)
            ).first()
            
            # Импортируем словарь подтверждений для сохранения совместимости
            try:
                from telegram_service import message_confirmations
                logger.info(f"Доступные confirmations в памяти: {list(message_confirmations.keys())}")
            except ImportError:
                logger.error("Не удалось импортировать message_confirmations")
                message_confirmations = {}
            
            if confirmation:
                broadcast_id = confirmation.broadcast_id
                
                if action == 'confirm':
                    # Обновляем статус в базе данных
                    confirmation.status = 'confirmed'
                    confirmation.confirmed_at = datetime.now()
                    
                    # Увеличиваем счетчик подтверждений
                    broadcast = db.query(models.TelegramBroadcast).filter(
                        models.TelegramBroadcast.id == broadcast_id
                    ).first()
                    
                    if broadcast:
                        broadcast.confirmed_count += 1
                    
                    db.commit()
                    
                    # Отвечаем на callback с подтверждением
                    await callback_query.answer("Спасибо за подтверждение получения сообщения!")
                    
                    # Обновляем текст исходного сообщения, убирая кнопки
                    await bot.edit_message_reply_markup(
                        chat_id=chat_id,
                        message_id=message_id,
                        reply_markup=None
                    )
                    
                    # Добавляем пометку о подтверждении
                    await bot.edit_message_text(
                        chat_id=chat_id,
                        message_id=message_id,
                        text=callback_query.message.text + "\n\n✅ Получение подтверждено",
                        parse_mode='HTML'
                    )
                    
                    # Обновляем статус в словаре подтверждений, если он там есть
                    if confirmation_id in message_confirmations:
                        message_confirmations[confirmation_id]['status'] = 'confirmed'
                        message_confirmations[confirmation_id]['confirmed_at'] = datetime.now().isoformat()
                    
                elif action == 'reject':
                    # Обновляем статус в базе данных
                    confirmation.status = 'rejected'
                    confirmation.confirmed_at = datetime.now()
                    db.commit()
                    
                    # Отвечаем на callback
                    await callback_query.answer("Сообщение помечено как отправленное не тому пользователю.")
                    
                    # Обновляем текст исходного сообщения, убирая кнопки
                    await bot.edit_message_reply_markup(
                        chat_id=chat_id,
                        message_id=message_id,
                        reply_markup=None
                    )
                    
                    # Добавляем пометку об отклонении
                    await bot.edit_message_text(
                        chat_id=chat_id,
                        message_id=message_id,
                        text=callback_query.message.text + "\n\n❌ Сообщение отклонено",
                        parse_mode='HTML'
                    )
                    
                    # Обновляем статус в словаре подтверждений, если он там есть
                    if confirmation_id in message_confirmations:
                        message_confirmations[confirmation_id]['status'] = 'rejected'
                        message_confirmations[confirmation_id]['rejected_at'] = datetime.now().isoformat()
            else:
                # Пробуем найти в словаре (для обратной совместимости)
                if confirmation_id in message_confirmations:
                    logger.info(f"Найдено в message_confirmations вместо БД: {confirmation_id}")
                    confirmation_info = message_confirmations[confirmation_id]
                    broadcast_id = confirmation_info.get('broadcast_id')
                    
                    if action == 'confirm':
                        # Создаем запись о подтверждении
                        if broadcast_id:
                            confirmation = models.MessageConfirmation(
                                broadcast_id=broadcast_id,
                                telegram_chat_id=str(chat_id),
                                confirmation_key=confirmation_id,
                                status='confirmed',
                                confirmed_at=datetime.now(),
                                message_id=message_id
                            )
                            db.add(confirmation)
                            
                            # Увеличиваем счетчик подтверждений
                            broadcast = db.query(models.TelegramBroadcast).filter(
                                models.TelegramBroadcast.id == broadcast_id
                            ).first()
                            
                            if broadcast:
                                broadcast.confirmed_count += 1
                            
                            db.commit()
                        
                        # Отвечаем на callback с подтверждением
                        await callback_query.answer("Спасибо за подтверждение получения сообщения!")
                        
                        # Обновляем текст исходного сообщения, убирая кнопки
                        await bot.edit_message_reply_markup(
                            chat_id=chat_id,
                            message_id=message_id,
                            reply_markup=None
                        )
                        
                        # Добавляем пометку о подтверждении
                        await bot.edit_message_text(
                            chat_id=chat_id,
                            message_id=message_id,
                            text=callback_query.message.text + "\n\n✅ Получение подтверждено",
                            parse_mode='HTML'
                        )
                        
                        # Обновляем статус в словаре подтверждений
                        message_confirmations[confirmation_id]['status'] = 'confirmed'
                        message_confirmations[confirmation_id]['confirmed_at'] = datetime.now().isoformat()
                    elif action == 'reject':
                        # Аналогично для отклонения
                        if broadcast_id:
                            confirmation = models.MessageConfirmation(
                                broadcast_id=broadcast_id,
                                telegram_chat_id=str(chat_id),
                                confirmation_key=confirmation_id,
                                status='rejected',
                                confirmed_at=datetime.now(),
                                message_id=message_id
                            )
                            db.add(confirmation)
                            db.commit()
                        
                        # Отвечаем на callback
                        await callback_query.answer("Сообщение помечено как отправленное не тому пользователю.")
                        
                        # Обновляем текст исходного сообщения, убирая кнопки
                        await bot.edit_message_reply_markup(
                            chat_id=chat_id,
                            message_id=message_id,
                            reply_markup=None
                        )
                        
                        # Добавляем пометку об отклонении
                        await bot.edit_message_text(
                            chat_id=chat_id,
                            message_id=message_id,
                            text=callback_query.message.text + "\n\n❌ Сообщение отклонено",
                            parse_mode='HTML'
                        )
                        
                        # Обновляем статус в словаре подтверждений
                        message_confirmations[confirmation_id]['status'] = 'rejected'
                        message_confirmations[confirmation_id]['rejected_at'] = datetime.now().isoformat()
                else:
                    await callback_query.answer("Информация о сообщении не найдена")
                    logger.warning(f"Confirmation ID не найден: {confirmation_id}. Проверьте базу данных.")
        finally:
            db.close()
    except Exception as e:
        logger.error(f"Ошибка при обработке подтверждения: {str(e)}")
        await callback_query.answer("Произошла ошибка при обработке запроса")

@dp.message_handler(state=Form.WaitingForMessage)
async def handle_candidate_message(message: types.Message, state: FSMContext):
    logger.info(f"Received message from candidate: {message.text}")
    async with state.proxy() as data:
        application_id = data.get('application_id')
        logger.info(f"Application ID from state: {application_id}")
        
        # Если ID заявки нет в состоянии, попробуем найти его в базе
        if not application_id:
            db = SessionLocal()
            try:
                application = db.query(models.Application).filter(
                    models.Application.telegram_chat_id == str(message.chat.id)
                ).order_by(models.Application.created_at.desc()).first()
                
                if application:
                    application_id = application.id
                    await state.update_data(application_id=application_id)
                else:
                    logger.error("No application found for this chat")
                    await message.answer("Произошла ошибка. Пожалуйста, начните заново с команды /start")
                    await state.finish()
                    return
            except Exception as e:
                logger.error(f"Error finding application: {e}")
                await message.answer("Произошла ошибка. Пожалуйста, начните заново с команды /start")
                await state.finish()
                return
            finally:
                db.close()
        
        db = SessionLocal()
        try:
            # Проверяем существование заявки
            application = db.query(models.Application).filter(models.Application.id == application_id).first()
            if not application:
                logger.error(f"Application {application_id} not found")
                await message.answer("Заявка не найдена или была удалена. Пожалуйста, начните заново с команды /start")
                await state.finish()
                return

            logger.info(f"Creating message for application {application_id}")
            # Создаем новое сообщение в базе данных
            db_message = models.Message(
                application_id=application_id,
                content=message.text,
                sender='candidate',
                is_read=False,
                delivery_status='pending'
            )
            db.add(db_message)
            db.commit()
            db.refresh(db_message)
            logger.info(f"Message saved to database with id {db_message.id}")
            
            # Отправляем уведомление через WebSocket
            try:
                logger.info("Sending WebSocket notification")
                async with aiohttp.ClientSession() as session:
                    notification_data = {
                        "type": "new_message",
                        "application_id": application_id,
                        "message": {
                            "id": db_message.id,
                            "content": message.text,
                            "sender": "candidate",
                            "created_at": db_message.created_at.isoformat(),
                            "is_read": False
                        }
                    }
                    logger.info(f"Notification data: {notification_data}")
                    response = await session.post(
                        f"{API_URL}/notify",
                        json=notification_data
                    )
                    logger.info(f"WebSocket notification response status: {response.status}")
                    if response.status == 200:
                        await message.answer("✅ Сообщение отправлено HR-менеджеру")
                    else:
                        response_text = await response.text()
                        logger.error(f"WebSocket notification failed with status {response.status}: {response_text}")
                        raise Exception(f"WebSocket notification failed: {response.status}")
            except Exception as e:
                logger.error(f"Error sending WebSocket notification: {str(e)}")
                db_message.delivery_status = 'failed'
                db.commit()
                await message.answer("⚠️ Сообщение сохранено, но могут быть задержки в доставке")
            
        except Exception as e:
            logger.error(f"Error saving candidate message: {str(e)}")
            await message.answer("❌ Произошла ошибка при отправке сообщения")
            db.rollback()
        finally:
            db.close()

# Модифицируем обработчик успешной отправки формы
async def handle_successful_form_submission(application_id: int, message: types.Message, state: FSMContext):
    """Общая функция для установки состояния после успешной отправки формы"""
    logger.info(f"Setting up chat state for application {application_id}")
    await state.update_data(application_id=application_id)
    await Form.WaitingForMessage.set()
    await message.answer("Спасибо! Ваша анкета принята. Теперь вы можете общаться с HR-менеджером через этот чат.")

async def send_message_to_candidate(application_id: int, message_content: str):
    db = SessionLocal()
    try:
        application = db.query(models.Application).filter(models.Application.id == application_id).first()
        if not application or not application.telegram_chat_id:
            logger.error(f"Application {application_id} not found or no chat_id")
            return False
            
        await bot.send_message(
            chat_id=application.telegram_chat_id,
            text=f"Сообщение от HR:\n{message_content}"
        )
        return True
        
    except Exception as e:
        logger.error(f"Error sending message to candidate: {e}")
        return False
    finally:
        db.close()

if __name__ == '__main__':
    from aiogram import executor
    
    # Больше не нужно регистрировать обработчики из telegram_service,
    # так как теперь они встроены напрямую в файл bot.py
    
    executor.start_polling(dp, skip_updates=True) 