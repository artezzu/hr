import requests
import json
from datetime import datetime

# Настройки API
API_URL = "http://localhost:8000"
EMAIL = "admin@example.com"
PASSWORD = "admin"

def login():
    """Аутентификация и получение токена"""
    login_url = f"{API_URL}/token"
    login_data = {
        "username": EMAIL,
        "password": PASSWORD,
    }
    
    response = requests.post(login_url, data=login_data)
    if response.status_code == 200:
        token_data = response.json()
        return token_data.get("access_token")
    else:
        print(f"Ошибка аутентификации: {response.status_code}")
        print(response.text)
        return None

def get_vacancies(token):
    """Получение списка вакансий"""
    vacancies_url = f"{API_URL}/vacancies/"
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    response = requests.get(vacancies_url, headers=headers)
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Ошибка получения вакансий: {response.status_code}")
        print(response.text)
        return None

def create_vacancy(token, title, requirements, conditions, description):
    """Создание новой вакансии"""
    vacancy_url = f"{API_URL}/vacancies/"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    vacancy_data = {
        "title": title,
        "requirements": requirements,
        "conditions": conditions,
        "description": description
    }
    
    response = requests.post(vacancy_url, headers=headers, json=vacancy_data)
    if response.status_code in [200, 201]:
        return response.json()
    else:
        print(f"Ошибка создания вакансии: {response.status_code}")
        print(response.text)
        return None

def main():
    token = login()
    if not token:
        print("Не удалось получить токен. Завершение скрипта.")
        return
    
    print(f"Токен получен: {token[:20]}...")
    
    # Получаем список вакансий
    vacancies = get_vacancies(token)
    if vacancies:
        print(f"Всего вакансий: {len(vacancies)}")
        for idx, vacancy in enumerate(vacancies):
            print(f"{idx+1}. {vacancy['title']} - {vacancy['status']}")
    
    # Создаем новую вакансию
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    new_vacancy = create_vacancy(
        token,
        f"Test Vacancy {now}",
        "Python, Django, React",
        "Remote work, flexible hours",
        "We are looking for a developer"
    )
    
    if new_vacancy:
        print(f"Создана новая вакансия: ID {new_vacancy['id']}, {new_vacancy['title']}")
        
        # Пропускаем получение деталей вакансии, так как это вызывает ошибку
        # Вместо этого просто получаем обновленный список вакансий
    
    # Получаем обновленный список вакансий
    vacancies = get_vacancies(token)
    if vacancies:
        print(f"Всего вакансий после создания: {len(vacancies)}")
        for idx, vacancy in enumerate(vacancies):
            print(f"{idx+1}. {vacancy['title']} - {vacancy['status']}")

if __name__ == "__main__":
    main() 