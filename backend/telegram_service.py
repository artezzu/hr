import asyncio
import logging
from typing import List, Dict, Any, Optional
import importlib
from database import get_db
import models
from sqlalchemy.orm import Session
from datetime import datetime
from uuid import uuid4

# Словарь для хранения данных о подтверждениях
message_confirmations = {}

# Импортируем бота из существующего файла
try:
    # Динамический импорт бота и необходимых функций
    bot_module = importlib.import_module('bot')
    bot = getattr(bot_module, 'bot')
    from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
except ImportError as e:
    logging.error(f"Failed to import bot: {e}")
    bot = None
    InlineKeyboardMarkup = None
    InlineKeyboardButton = None

async def send_broadcast_message(message_text: str, telegram_ids: List[str], broadcast_id: int = None) -> Dict[str, Any]:
    """
    Отправляет сообщение нескольким пользователям по их Telegram ID с кнопками подтверждения.
    
    Args:
        message_text: Текст сообщения для отправки.
        telegram_ids: Список Telegram ID получателей.
        broadcast_id: ID рассылки в базе данных.
    
    Returns:
        dict: Результаты отправки {
            'success_count': int,
            'failed_count': int,
            'failed_ids': list
        }
    """
    results = {
        'success_count': 0,
        'failed_count': 0,
        'failed_ids': []
    }
    
    # Если нет получателей, вернуть пустой результат
    if not telegram_ids or not bot:
        return results
    
    # Создаем inline клавиатуру с кнопкой подтверждения
    confirmation_keyboard = InlineKeyboardMarkup(row_width=2)
    
    # Перебираем всех получателей и отправляем сообщение каждому
    for chat_id in telegram_ids:
        try:
            # Проверка, что chat_id не пустой
            if not chat_id:
                results['failed_count'] += 1
                results['failed_ids'].append(chat_id)
                continue
            
            # Генерируем уникальный callback_data для этого сообщения и пользователя
            confirmation_id = str(uuid4())
            
            # Создаем кнопки
            confirm_button = InlineKeyboardButton(
                "✅ Подтверждаю получение", 
                callback_data=f"confirm_{confirmation_id}"
            )
            
            reject_button = InlineKeyboardButton(
                "❌ Не ко мне", 
                callback_data=f"reject_{confirmation_id}"
            )
            
            # Добавляем кнопки на клавиатуру
            confirmation_keyboard.add(confirm_button, reject_button)
            
            # Отправляем сообщение
            sent_message = await bot.send_message(
                chat_id=chat_id,
                text=message_text,
                parse_mode='HTML',
                reply_markup=confirmation_keyboard
            )
            
            # Сохраняем информацию о сообщении для отслеживания подтверждения
            if broadcast_id:
                # Сначала сохраняем в памяти
                message_confirmations[confirmation_id] = {
                    'broadcast_id': broadcast_id,
                    'chat_id': chat_id,
                    'message_id': sent_message.message_id,
                    'status': 'sent',
                    'sent_at': datetime.now().isoformat()
                }
                
                # Затем сохраняем в базу данных
                db = next(get_db())
                try:
                    # Создаем запись о неподтвержденном сообщении
                    message_confirmation = models.MessageConfirmation(
                        broadcast_id=broadcast_id,
                        telegram_chat_id=str(chat_id),
                        confirmation_key=confirmation_id,  # Сохраняем ключ подтверждения
                        status='sent',
                        message_id=sent_message.message_id
                    )
                    db.add(message_confirmation)
                    db.commit()
                except Exception as e:
                    logging.error(f"Error saving message confirmation to DB: {e}")
                finally:
                    db.close()
            
            # Увеличиваем счетчик успешных отправок
            results['success_count'] += 1
            
            # Небольшая задержка, чтобы не перегружать API Telegram
            await asyncio.sleep(0.1)
            
        except Exception as e:
            # В случае ошибки увеличиваем счетчик неудачных отправок
            results['failed_count'] += 1
            results['failed_ids'].append(chat_id)
            logging.error(f"Error sending message to {chat_id}: {str(e)}")
    
    return results

async def get_users_by_status(db: Session, status: str) -> List[str]:
    """
    Получает Telegram ID всех кандидатов с указанным статусом.
    
    Args:
        db: Сессия базы данных.
        status: Статус кандидатов для выборки.
    
    Returns:
        List[str]: Список Telegram ID кандидатов.
    """
    # Логирование для отладки
    logging.info(f"Ищем заявки со статусом: '{status}'")
    
    # Нормализуем статусы для сравнения (с учетом разных форматов записи)
    status_mapping = {
        "Новый": ["новый", "Новый"],
        "Активный": ["активный", "Активный"],
        "На собеседовании": ["на собеседовании", "На собеседовании"],
        "Нанят": ["нанят", "Нанят"],
        "На рассмотрении": ["на рассмотрении", "На рассмотрении"],
        "Телефонное интервью": ["телефонное интервью", "Телефонное интервью"],
        "Собеседование": ["собеседование", "Собеседование"],
        "Служба безопасности": ["служба безопасности", "Служба безопасности"],
        "Оффер": ["оффер", "Оффер"],
        "Сбор документов": ["сбор документов", "Сбор документов"],
        "Принят на работу": ["принят на работу", "Принят на работу"],
        "Резерв": ["резерв", "Резерв"],
        "Отказ": ["отказ", "Отказ"]
    }
    
    # Определяем варианты написания статуса
    status_variants = []
    for key, variants in status_mapping.items():
        if status in variants:
            status_variants = variants
            break
    
    if not status_variants:
        status_variants = [status]  # Если не нашли в маппинге, используем оригинальный
    
    logging.info(f"Ищем заявки со статусами: {status_variants}")
    
    # Получаем все статусы для отладки
    all_statuses = db.query(models.Application.status).distinct().all()
    logging.info(f"Доступные статусы в базе: {[s[0] for s in all_statuses]}")
    
    # Ищем заявки с указанным статусом (любым из вариантов)
    applications = db.query(models.Application).filter(
        models.Application.status.in_(status_variants),
        models.Application.telegram_chat_id.isnot(None)  # Только с привязанным Telegram
    ).all()
    
    logging.info(f"Найдено {len(applications)} заявок со статусами {status_variants}")
    
    # Собираем Telegram ID
    telegram_ids = [app.telegram_chat_id for app in applications if app.telegram_chat_id]
    
    logging.info(f"Количество телеграм ID для отправки: {len(telegram_ids)}")
    
    return telegram_ids

async def get_telegram_ids_by_user_ids(db: Session, user_ids: List[int]) -> List[str]:
    """
    Получает Telegram ID пользователей по их ID.
    
    Args:
        db: Сессия базы данных.
        user_ids: Список ID пользователей.
    
    Returns:
        List[str]: Список Telegram ID пользователей.
    """
    # Теперь user_ids это ID заявок, а не пользователей
    # Ищем заявки по указанным ID
    applications = db.query(models.Application).filter(
        models.Application.id.in_(user_ids),
        models.Application.telegram_chat_id.isnot(None)
    ).all()
    
    # Собираем telegram_chat_id из заявок
    telegram_ids = [app.telegram_chat_id for app in applications if app.telegram_chat_id]
    
    return telegram_ids

# Функция для обработки callback от кнопок
async def process_confirmation_callback(callback_query, db: Session):
    """
    Обрабатывает callback от кнопок подтверждения.
    
    Args:
        callback_query: Callback запрос от Telegram.
        db: Сессия базы данных.
    """
    try:
        callback_data = callback_query.data
        chat_id = callback_query.from_user.id
        message_id = callback_query.message.message_id
        
        # Извлекаем идентификатор подтверждения
        if '_' not in callback_data:
            return
        
        action, confirmation_id = callback_data.split('_', 1)
        
        if confirmation_id in message_confirmations:
            confirmation_info = message_confirmations[confirmation_id]
            broadcast_id = confirmation_info.get('broadcast_id')
            
            if action == 'confirm':
                # Обновляем статус подтверждения
                message_confirmations[confirmation_id]['status'] = 'confirmed'
                message_confirmations[confirmation_id]['confirmed_at'] = datetime.now().isoformat()
                
                # Записываем в базу данных о подтверждении
                if broadcast_id:
                    confirmation = models.MessageConfirmation(
                        broadcast_id=broadcast_id,
                        telegram_chat_id=str(chat_id),
                        status='confirmed',
                        confirmed_at=datetime.now()
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
                await bot.answer_callback_query(
                    callback_query.id,
                    text="Спасибо за подтверждение получения сообщения!"
                )
                
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
                
            elif action == 'reject':
                # Обновляем статус отклонения
                message_confirmations[confirmation_id]['status'] = 'rejected'
                message_confirmations[confirmation_id]['rejected_at'] = datetime.now().isoformat()
                
                # Записываем в базу данных об отклонении
                if broadcast_id:
                    confirmation = models.MessageConfirmation(
                        broadcast_id=broadcast_id,
                        telegram_chat_id=str(chat_id),
                        status='rejected',
                        confirmed_at=datetime.now()
                    )
                    db.add(confirmation)
                    db.commit()
                
                # Отвечаем на callback
                await bot.answer_callback_query(
                    callback_query.id,
                    text="Сообщение помечено как отправленное не тому пользователю."
                )
                
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
    except Exception as e:
        logging.error(f"Error processing confirmation callback: {str(e)}")

def register_callback_handlers(dp=None):
    """
    Регистрирует обработчики callback запросов для работы с подтверждениями.
    
    Args:
        dp: Диспетчер бота из aiogram.
    """
    if not bot or not dp:
        logging.warning("Cannot register callback handlers: bot or dispatcher is not available")
        return
    
    from database import get_db
    from functools import partial
    
    @dp.callback_query_handler(lambda c: c.data.startswith('confirm_') or c.data.startswith('reject_'))
    async def handle_confirmation_callback(callback_query, db=None):
        """Обрабатывает callback запросы от кнопок подтверждения"""
        if not db:
            # Получаем сессию базы данных
            db_session = next(get_db())
            try:
                await process_confirmation_callback(callback_query, db_session)
            finally:
                db_session.close()
        else:
            await process_confirmation_callback(callback_query, db)
    
    logging.info("Confirmation callback handlers registered successfully")

async def process_broadcast(
    db: Session, 
    message: str, 
    status: Optional[str] = None, 
    user_ids: Optional[List[int]] = None,
    broadcast_id: Optional[int] = None
) -> Dict[str, Any]:
    """
    Обрабатывает рассылку сообщений.
    
    Args:
        db: Сессия базы данных.
        message: Текст сообщения.
        status: Статус кандидатов (если выбор по статусу).
        user_ids: Список ID пользователей (если выбор индивидуальный).
        broadcast_id: ID рассылки в базе данных.
    
    Returns:
        Dict[str, Any]: Результаты отправки.
    """
    telegram_ids = []
    
    # Получаем список Telegram ID в зависимости от параметров
    if status:
        telegram_ids = await get_users_by_status(db, status)
    elif user_ids:
        telegram_ids = await get_telegram_ids_by_user_ids(db, user_ids)
    
    # Отправляем сообщения
    results = await send_broadcast_message(message, telegram_ids, broadcast_id)
    
    return {
        "status": "success",
        "message": f"Сообщение отправлено {results['success_count']} получателям",
        "results": results
    }

# Экспортировать функции
__all__ = ['process_broadcast', 'send_broadcast_message', 'message_confirmations'] 