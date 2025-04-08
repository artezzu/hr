import requests
import json
import time

# URL API
API_URL = "http://localhost:8000"

# Предоставленные учетные данные
RECRUITER_EMAIL = "recruiter@example.com"
RECRUITER_PASSWORD = "recruiter"
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "admin"

def login(email, password):
    """Авторизация и получение токена"""
    print(f"Авторизация: {email}")
    response = requests.post(
        f"{API_URL}/token",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    
    if response.status_code == 200:
        data = response.json()
        print("Авторизация успешна!")
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
        print(f"Ошибка получения пользователя {user_id}: {response.status_code}")
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

def get_vacancy(token, vacancy_id):
    """Получение информации о конкретной вакансии"""
    response = requests.get(
        f"{API_URL}/vacancies/{vacancy_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Ошибка получения вакансии {vacancy_id}: {response.status_code}")
        print(response.text)
        return None

def create_vacancy(token, title, requirements="Требования", conditions="Условия", description="Описание"):
    """Создание новой вакансии"""
    vacancy_data = {
        "title": title,
        "requirements": requirements,
        "conditions": conditions,
        "description": description,
        "status": "new"
    }
    
    response = requests.post(
        f"{API_URL}/vacancies/",
        json=vacancy_data,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    )
    
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Ошибка создания вакансии: {response.status_code}")
        print(response.text)
        return None

def assign_vacancy(token, vacancy_id, recruiter_id):
    """Назначение вакансии рекрутеру"""
    assignment_data = {
        "vacancy_id": vacancy_id,
        "recruiter_id": recruiter_id
    }
    
    response = requests.post(
        f"{API_URL}/vacancy-assignments/",
        json=assignment_data,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    )
    
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Ошибка назначения вакансии: {response.status_code}")
        print(response.text)
        return None

def test_vacancy_creation_and_assignment():
    """Тестирование создания вакансии и назначения ее рекрутеру"""
    # Авторизуемся как админ
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    if not admin_token:
        print("Не удалось авторизоваться как админ")
        return
    
    # Получаем информацию о рекрутере
    recruiter_token = login(RECRUITER_EMAIL, RECRUITER_PASSWORD)
    if not recruiter_token:
        print("Не удалось авторизоваться как рекрутер")
        return
    
    # Получаем данные о рекрутере через API me
    recruiter_info_response = requests.get(
        f"{API_URL}/users/me/",
        headers={"Authorization": f"Bearer {recruiter_token}"}
    )
    
    if recruiter_info_response.status_code != 200:
        print(f"Ошибка получения данных о рекрутере: {recruiter_info_response.status_code}")
        print(recruiter_info_response.text)
        return
    
    recruiter_info = recruiter_info_response.json()
    recruiter_id = recruiter_info["id"]
    
    print(f"Информация о рекрутере:")
    print(f"  ID: {recruiter_id}")
    print(f"  Имя: {recruiter_info.get('full_name')}")
    print(f"  Email: {recruiter_info.get('email')}")
    print(f"  Роль: {recruiter_info.get('role')}")
    print(f"  Должность: {recruiter_info.get('position')}")
    
    # Создаем новую вакансию от имени админа
    print("\nСоздаем новую тестовую вакансию...")
    vacancy = create_vacancy(
        admin_token, 
        f"Тестовая вакансия {time.strftime('%H:%M:%S')}", 
        "Требуется опыт работы", 
        "Хорошие условия труда", 
        "Подробное описание вакансии"
    )
    
    if not vacancy:
        print("Не удалось создать вакансию")
        return
    
    print(f"Вакансия успешно создана:")
    print(f"  ID: {vacancy.get('id')}")
    print(f"  Название: {vacancy.get('title')}")
    print(f"  Статус: {vacancy.get('status')}")
    
    # Получаем детальную информацию о вакансии
    vacancy_id = vacancy["id"]
    detailed_vacancy = get_vacancy(admin_token, vacancy_id)
    
    if not detailed_vacancy:
        print("Не удалось получить детальную информацию о вакансии")
        return
    
    print(f"\nДетальная информация о вакансии:")
    print(f"  ID: {detailed_vacancy.get('id')}")
    print(f"  Название: {detailed_vacancy.get('title')}")
    print(f"  Статус: {detailed_vacancy.get('status')}")
    
    creator = detailed_vacancy.get('creator')
    if creator:
        print(f"  Создатель: {creator.get('full_name')} (ID: {creator.get('id')})")
    else:
        print(f"  Создатель: Нет данных")
    
    # Назначаем вакансию рекрутеру
    print(f"\nНазначаем вакансию рекрутеру (ID: {recruiter_id})...")
    
    # Для назначения вакансии необходимо использовать токен рекрутера
    assignment = assign_vacancy(recruiter_token, vacancy_id, recruiter_id)
    
    if not assignment:
        print("Не удалось назначить вакансию рекрутеру")
        return
    
    print(f"Вакансия успешно назначена:")
    print(f"  Назначение ID: {assignment.get('id')}")
    print(f"  Статус: {assignment.get('status')}")
    
    # Проверяем детали рекрутера в назначении
    recruiter_in_assignment = assignment.get('recruiter')
    if recruiter_in_assignment:
        print(f"  Рекрутер: {recruiter_in_assignment.get('full_name')} (ID: {recruiter_in_assignment.get('id')})")
        print(f"  Email рекрутера: {recruiter_in_assignment.get('email')}")
        print(f"  Должность рекрутера: {recruiter_in_assignment.get('position')}")
    else:
        print(f"  Рекрутер: Данные о рекрутере отсутствуют")
    
    # Получаем обновленную информацию о вакансии после назначения
    updated_vacancy = get_vacancy(admin_token, vacancy_id)
    
    if not updated_vacancy:
        print("Не удалось получить обновленную информацию о вакансии")
        return
    
    print(f"\nОбновленная информация о вакансии после назначения:")
    print(f"  ID: {updated_vacancy.get('id')}")
    print(f"  Название: {updated_vacancy.get('title')}")
    print(f"  Статус: {updated_vacancy.get('status')}")
    
    assignments = updated_vacancy.get('assignments', [])
    print(f"  Количество назначений: {len(assignments)}")
    
    for idx, a in enumerate(assignments, 1):
        print(f"  Назначение {idx}:")
        print(f"    ID: {a.get('id')}")
        print(f"    Статус: {a.get('status')}")
        
        assignment_recruiter = a.get('recruiter')
        if assignment_recruiter:
            print(f"    Рекрутер: {assignment_recruiter.get('full_name')} (ID: {assignment_recruiter.get('id')})")
            print(f"    Email рекрутера: {assignment_recruiter.get('email')}")
            print(f"    Должность рекрутера: {assignment_recruiter.get('position')}")
        else:
            print(f"    Рекрутер: Данные о рекрутере отсутствуют")

def main():
    test_vacancy_creation_and_assignment()

if __name__ == "__main__":
    main() 