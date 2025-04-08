import requests
import json
import os
from datetime import datetime

# URL API
API_URL = "http://localhost:8000"

def login(email, password):
    """Вход в систему и получение токена"""
    login_url = f"{API_URL}/token"
    response = requests.post(
        login_url,
        data={"username": email, "password": password}
    )
    if response.status_code == 200:
        token_data = response.json()
        return token_data.get("access_token")
    else:
        print(f"Ошибка входа: {response.status_code}")
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

def get_vacancy(token, vacancy_id):
    """Получение информации о вакансии по ID"""
    url = f"{API_URL}/vacancies/{vacancy_id}"
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Ошибка получения вакансии: {response.status_code}")
        print(response.text)
        return None

def get_vacancies(token):
    """Получение списка всех вакансий"""
    url = f"{API_URL}/vacancies/"
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Ошибка получения списка вакансий: {response.status_code}")
        print(response.text)
        return None

def main():
    # Логин администратором
    admin_email = "admin@example.com"
    admin_password = "admin"
    
    token = login(admin_email, admin_password)
    if not token:
        print("Не удалось получить токен. Убедитесь, что сервер запущен и учетные данные верны.")
        return
    
    print(f"Успешная аутентификация, получен токен: {token[:10]}...")
    
    # Создание тестовой вакансии
    vacancy_title = f"Тестовая вакансия {datetime.now().strftime('%H:%M:%S')}"
    vacancy = create_vacancy(
        token=token,
        title=vacancy_title,
        requirements="- Python\n- SQL\n- Docker",
        conditions="- Удаленная работа\n- Гибкий график",
        description="Тестовое описание вакансии"
    )
    
    if vacancy:
        print(f"Создана вакансия ID: {vacancy['id']}, Название: {vacancy['title']}")
        
        # Получение деталей вакансии
        vacancy_details = get_vacancy(token, vacancy['id'])
        if vacancy_details:
            print("\nДетали вакансии:")
            print(f"ID: {vacancy_details['id']}")
            print(f"Название: {vacancy_details['title']}")
            print(f"Статус: {vacancy_details['status']}")
            print(f"Дата создания: {vacancy_details['created_at']}")
            
            # Проверка данных о создателе
            if "creator" in vacancy_details and vacancy_details["creator"]:
                print(f"Создатель ID: {vacancy_details['creator']['id']}")
                
                # Проверка различных форматов полей имени создателя
                if "firstname" in vacancy_details["creator"] and "lastname" in vacancy_details["creator"]:
                    print(f"Имя создателя: {vacancy_details['creator']['firstname']} {vacancy_details['creator']['lastname']}")
                elif "full_name" in vacancy_details["creator"]:
                    print(f"Имя создателя: {vacancy_details['creator']['full_name']}")
                elif "email" in vacancy_details["creator"]:
                    print(f"Email создателя: {vacancy_details['creator']['email']}")
                else:
                    print(f"Данные создателя: {vacancy_details['creator']}")
            else:
                print("ВНИМАНИЕ: Информация о создателе отсутствует!")
                if "created_by_id" in vacancy_details:
                    print(f"created_by_id: {vacancy_details['created_by_id']}")
                else:
                    print("ВНИМАНИЕ: created_by_id также отсутствует!")
        
        # Получение списка всех вакансий
        print("\nПроверка списка всех вакансий:")
        vacancies = get_vacancies(token)
        if vacancies:
            print(f"Получено {len(vacancies)} вакансий")
            # Ищем созданную вакансию в списке
            for v in vacancies:
                if v["id"] == vacancy["id"]:
                    print(f"Найдена вакансия в списке: {v['title']}")
                    if "creator" in v and v["creator"]:
                        print(f"Создатель ID: {v['creator']['id']}")
                        
                        # Проверка различных форматов полей имени создателя
                        if "firstname" in v["creator"] and "lastname" in v["creator"]:
                            print(f"Имя создателя: {v['creator']['firstname']} {v['creator']['lastname']}")
                        elif "full_name" in v["creator"]:
                            print(f"Имя создателя: {v['creator']['full_name']}")
                        elif "email" in v["creator"]:
                            print(f"Email создателя: {v['creator']['email']}")
                        else:
                            print(f"Данные создателя: {v['creator']}")
                    else:
                        print("ВНИМАНИЕ: Информация о создателе в списке отсутствует!")
                    break
    else:
        print("Не удалось создать вакансию.")

if __name__ == "__main__":
    main() 