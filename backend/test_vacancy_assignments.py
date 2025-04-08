import requests
import json
import os
from dotenv import load_dotenv

# Загружаем переменные окружения из .env файла
load_dotenv()

# URL API
API_URL = "http://localhost:8000"

def login(email, password):
    """Авторизация и получение токена"""
    response = requests.post(
        f"{API_URL}/token",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    
    if response.status_code == 200:
        data = response.json()
        return data.get("access_token")
    else:
        print(f"Ошибка аутентификации: {response.status_code}")
        print(response.text)
        return None

def get_user(token, user_id):
    """Получение информации о пользователе по ID"""
    response = requests.get(
        f"{API_URL}/users/{user_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Ошибка получения пользователя: {response.status_code}")
        print(response.text)
        return None

def get_vacancies(token):
    """Получение списка вакансий"""
    response = requests.get(
        f"{API_URL}/vacancies/",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Ошибка получения вакансий: {response.status_code}")
        print(response.text)
        return []

def get_vacancy_assignments(token, vacancy_id=None, recruiter_id=None):
    """Получение назначений вакансий"""
    params = {}
    if vacancy_id:
        params["vacancy_id"] = vacancy_id
    if recruiter_id:
        params["recruiter_id"] = recruiter_id
        
    response = requests.get(
        f"{API_URL}/vacancy-assignments/",
        headers={"Authorization": f"Bearer {token}"},
        params=params
    )
    
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Ошибка получения назначений: {response.status_code}")
        print(response.text)
        return []

def main():
    # Авторизуемся как админ
    admin_email = "admin@example.com"
    admin_password = "password"
    
    print(f"Попытка входа как админ: {admin_email}")
    token = login(admin_email, admin_password)
    if not token:
        # Если не получилось войти как админ, попробуем войти как другой пользователь
        admin_email = "admin@admin.com"
        admin_password = "password"
        
        print(f"Попытка входа как админ: {admin_email}")
        token = login(admin_email, admin_password)
        
        if not token:
            # Если и это не сработало, попробуем рекрутера
            admin_email = "recrut@1.com"
            admin_password = "password"
            
            print(f"Попытка входа как рекрутер: {admin_email}")
            token = login(admin_email, admin_password)
            
            if not token:
                print("Не удалось получить токен. Проверьте данные для входа.")
                return
    
    print(f"Успешная аутентификация. Токен получен: {token[:20]}...")

    # Получаем список вакансий
    vacancies = get_vacancies(token)
    print(f"Получено {len(vacancies)} вакансий.")
    
    for idx, vacancy in enumerate(vacancies, 1):
        print(f"\nВакансия {idx}:")
        print(f"  ID: {vacancy['id']}")
        print(f"  Название: {vacancy['title']}")
        print(f"  Статус: {vacancy['status']}")
        
        creator = vacancy.get('creator')
        if creator:
            print(f"  Создатель: {creator.get('full_name')} (ID: {creator.get('id')})")
        else:
            print(f"  Создатель: Нет данных")
        
        assignments = vacancy.get('assignments', [])
        print(f"  Назначений: {len(assignments)}")
        
        for assignment in assignments:
            print(f"\n  Назначение ID: {assignment['id']}")
            print(f"    Статус: {assignment['status']}")
            recruiter = assignment.get('recruiter')
            if recruiter:
                print(f"    Рекрутер: {recruiter.get('full_name')} (ID: {recruiter.get('id')})")
                # Дополнительно получим данные о рекрутере через прямой вызов API
                user = get_user(token, recruiter['id'])
                if user:
                    print(f"    Проверка через API: {user.get('full_name')} (роль: {user.get('role')})")
            else:
                print(f"    Рекрутер: Нет данных")

    # Получаем назначения вакансий
    assignments = get_vacancy_assignments(token)
    print(f"\nПолучено {len(assignments)} назначений вакансий.")
    
    for idx, assignment in enumerate(assignments, 1):
        print(f"\nНазначение {idx}:")
        print(f"  ID: {assignment['id']}")
        print(f"  Vacancy ID: {assignment['vacancy_id']}")
        print(f"  Recruiter ID: {assignment['recruiter_id']}")
        print(f"  Статус: {assignment['status']}")
        
        recruiter = assignment.get('recruiter')
        if recruiter:
            print(f"  Рекрутер: {recruiter.get('full_name')} (ID: {recruiter.get('id')})")
        else:
            print(f"  Рекрутер: Нет данных")

if __name__ == "__main__":
    main() 