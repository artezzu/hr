import os
import requests
from typing import Optional, List, Dict
from bs4 import BeautifulSoup
from dotenv import load_dotenv

load_dotenv()

HH_LOGIN = os.getenv('HH_LOGIN')
HH_PASSWORD = os.getenv('HH_PASSWORD')
HH_BASE_URL = 'https://hh.ru'

class HeadHunterParser:
    def __init__(self):
        self.session = requests.Session()
        self.is_authorized = False
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
        }

    async def authorize(self):
        """
        Авторизация на сайте HH.ru
        """
        if self.is_authorized:
            return True

        try:
            # Шаг 1: Получаем страницу входа
            response = self.session.get(
                f"{HH_BASE_URL}/account/login", 
                headers=self.headers,
                allow_redirects=True
            )
            
            # Шаг 2: Извлекаем все скрытые поля из формы
            soup = BeautifulSoup(response.text, 'html.parser')
            login_form = soup.find('form', {'action': '/account/login'})
            
            if not login_form:
                print("Не найдена форма входа")
                return False
            
            # Собираем все скрытые поля
            hidden_inputs = login_form.find_all('input', {'type': 'hidden'})
            login_data = {
                input_field.get('name'): input_field.get('value', '')
                for input_field in hidden_inputs
            }
            
            # Добавляем учетные данные
            login_data.update({
                'backUrl': 'https://hh.ru/',
                'username': HH_LOGIN,
                'password': HH_PASSWORD,
                'remember': 'yes',
                'action': 'Войти',
                'continue': ''
            })

            # Шаг 3: Отправляем форму входа
            response = self.session.post(
                f"{HH_BASE_URL}/account/login",
                data=login_data,
                headers={
                    **self.headers,
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Origin': HH_BASE_URL,
                    'Referer': f"{HH_BASE_URL}/account/login"
                },
                allow_redirects=True
            )

            # Проверяем успешность авторизации
            if 'account/login' not in response.url:
                self.is_authorized = True
                print("Успешная авторизация")
                return True
            else:
                print(f"Ошибка авторизации. URL после входа: {response.url}")
                return False

        except Exception as e:
            print(f"Ошибка авторизации: {str(e)}")
            return False

    async def search_resumes(
        self,
        query: str,
        experience: Optional[str] = None,
        salary: Optional[int] = None,
        page: int = 0
    ) -> List[Dict]:
        """
        Поиск резюме через веб-интерфейс
        """
        if not await self.authorize():
            raise Exception("Не удалось авторизоваться")

        try:
            # Формируем URL поиска
            params = {
                'text': query,
                'page': page,
                'experience': experience if experience else '',
                'salary': salary if salary else '',
                'area': 97,  # Узбекистан
                'currency_code': 'UZS',
                'label': 'only_with_salary' if salary else '',
                'search_period': '30',
                'order_by': 'relevance',
                'no_magic': 'true',
                'pos': 'full_text',
                'source': 'all',
                'st': 'searchVacancy'
            }

            response = self.session.get(
                f"{HH_BASE_URL}/search/resume",
                params=params,
                headers={
                    **self.headers,
                    'Referer': f"{HH_BASE_URL}/employer/main"
                }
            )

            if not response.ok:
                print(f"Ошибка при поиске резюме. Статус: {response.status_code}")
                print(f"Текст ответа: {response.text}")
                return []

            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Проверяем, не перенаправило ли нас на страницу входа
            if 'account/login' in response.url:
                print("Сессия истекла, требуется повторная авторизация")
                self.is_authorized = False
                return []

            resumes = []

            # Находим все карточки резюме
            resume_items = soup.find_all(['div', 'article'], {'data-qa': ['resume-serp__resume', 'resume-serp__resume_standard', 'serp-item']})
            
            if not resume_items:
                print("Не найдены резюме на странице")
                print(f"URL запроса: {response.url}")
                return []

            for item in resume_items:
                try:
                    # Извлекаем основную информацию
                    title_elem = item.find(['a', 'h3', 'span'], {
                        'data-qa': [
                            'resume-serp__resume-title',
                            'resume-search-item__name',
                            'serp-item__title'
                        ]
                    })
                    
                    if not title_elem:
                        continue

                    # Получаем ссылку и ID резюме
                    resume_url = title_elem.get('href', '')
                    if not resume_url.startswith('http'):
                        resume_url = f"{HH_BASE_URL}{resume_url}"
                    resume_id = resume_url.split('/')[-1]

                    # Извлекаем зарплату
                    salary_elem = item.find(['span', 'div'], {
                        'data-qa': [
                            'resume-serp__resume-compensation',
                            'resume-search-item__compensation',
                            'serp-item__salary'
                        ]
                    })
                    
                    # Извлекаем опыт работы
                    experience_elem = item.find(['div', 'span'], {
                        'data-qa': [
                            'resume-serp__resume-experience',
                            'resume-search-item__experience',
                            'serp-item__experience'
                        ]
                    })

                    # Извлекаем навыки
                    skills_elem = item.find(['div', 'span'], {
                        'data-qa': [
                            'resume-serp__resume-skills',
                            'resume-search-item__skills',
                            'serp-item__skills'
                        ]
                    })

                    resume = {
                        'id': resume_id,
                        'title': title_elem.text.strip(),
                        'fullName': title_elem.text.strip().split(',')[0] if ',' in title_elem.text else title_elem.text.strip(),
                        'url': resume_url,
                        'salary': salary_elem.text.strip() if salary_elem else 'Не указана',
                        'experience': experience_elem.text.strip() if experience_elem else 'Нет опыта',
                        'skills': [skill.strip() for skill in (skills_elem.text.split(',') if skills_elem else [])]
                    }
                    resumes.append(resume)

                except Exception as e:
                    print(f"Ошибка при парсинге резюме: {str(e)}")
                    continue

            return resumes

        except Exception as e:
            print(f"Ошибка при поиске резюме: {str(e)}")
            return []

    async def get_resume_detail(self, resume_id: str) -> Dict:
        """
        Получение ФИО и даты рождения из резюме
        """
        if not await self.authorize():
            raise Exception("Не удалось авторизоваться")

        try:
            response = self.session.get(
                f"{HH_BASE_URL}/resume/{resume_id}",
                headers=self.headers
            )

            if not response.ok:
                print(f"Ошибка при получении резюме. Статус: {response.status_code}")
                return {}

            soup = BeautifulSoup(response.text, 'html.parser')

            # Извлекаем ФИО
            name_elem = soup.find('h2', {'data-qa': 'resume-personal-name'})
            if not name_elem:
                raise Exception("Не удалось найти ФИО в резюме")
            
            full_name = name_elem.text.strip()

            # Извлекаем возраст и дату рождения
            birth_info = soup.find('span', {'data-qa': 'resume-personal-age'})
            birth_date = None
            
            if birth_info:
                # Текст обычно в формате "30 лет, родился 1 января 1994"
                birth_text = birth_info.text.strip()
                if 'родился' in birth_text or 'родилась' in birth_text:
                    # Извлекаем дату рождения после слова "родился" или "родилась"
                    birth_parts = birth_text.split('родил')
                    if len(birth_parts) > 1:
                        birth_date = birth_parts[1].strip('ась ').strip()

            return {
                'full_name': full_name,
                'birth_date': birth_date or 'Не указана'
            }

        except Exception as e:
            print(f"Ошибка при получении данных резюме: {str(e)}")
            raise Exception(f"Не удалось получить данные резюме: {str(e)}") 