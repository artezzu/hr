from fastapi.testclient import TestClient
from main import app
import json
from pprint import pprint

def debug_api():
    """
    Функция для отладки API и проверки получения данных для KPI рекрутеров
    """
    # Инициализируем клиент для тестирования API
    client = TestClient(app)
    
    # Авторизуемся как админ
    print("\n=== Авторизация ===")
    token_response = client.post('/token', data={
        'username': 'admin@example.com', 
        'password': 'admin'
    })
    
    token_data = token_response.json()
    print(f"Статус ответа: {token_response.status_code}")
    pprint(token_data)
    
    if token_response.status_code != 200 or 'access_token' not in token_data:
        print("Ошибка авторизации! Проверьте учетные данные.")
        return
    
    token = token_data.get('access_token')
    auth_headers = {'Authorization': f'Bearer {token}'}
    
    # 1. Получаем список рекрутеров
    print("\n=== Рекрутеры ===")
    recruiters_response = client.get('/users/?role=recruiter', headers=auth_headers)
    print(f"Статус ответа: {recruiters_response.status_code}")
    
    if recruiters_response.status_code != 200:
        print("Ошибка получения рекрутеров!")
        return
    
    recruiters = recruiters_response.json()
    print(f"Получено {len(recruiters)} рекрутеров")
    
    if recruiters:
        for recruiter in recruiters:
            print(f"ID: {recruiter.get('id')}, Имя: {recruiter.get('full_name', 'Нет имени')}, Email: {recruiter.get('email', 'Нет email')}")
    else:
        print("Нет данных о рекрутерах!")
    
    # 2. Получаем список вакансий
    print("\n=== Вакансии ===")
    vacancies_response = client.get('/vacancies/', headers=auth_headers)
    print(f"Статус ответа: {vacancies_response.status_code}")
    
    if vacancies_response.status_code != 200:
        print("Ошибка получения вакансий!")
        return
    
    vacancies = vacancies_response.json()
    print(f"Получено {len(vacancies)} вакансий")
    
    # Статистика по статусам вакансий
    vacancies_by_status = {}
    for vacancy in vacancies:
        status = vacancy.get('status', 'Unknown')
        vacancies_by_status[status] = vacancies_by_status.get(status, 0) + 1
    
    print("Статистика по статусам вакансий:")
    for status, count in vacancies_by_status.items():
        print(f"  {status}: {count}")
    
    # 3. Получаем список назначений вакансий рекрутерам
    print("\n=== Назначения вакансий ===")
    assignments_response = client.get('/vacancy-assignments/', headers=auth_headers)
    print(f"Статус ответа: {assignments_response.status_code}")
    
    if assignments_response.status_code != 200:
        print("Ошибка получения назначений вакансий!")
        return
    
    assignments = assignments_response.json()
    print(f"Получено {len(assignments)} назначений вакансий")
    
    if assignments:
        # Анализируем структуру назначений
        print("\nСтруктура назначений:")
        example = assignments[0]
        for key, value in example.items():
            print(f"  {key}: {type(value).__name__} - {value}")
        
        # Анализируем назначения по рекрутерам
        assignments_by_recruiter = {}
        for assignment in assignments:
            recruiter_id = None
            vacancy_id = assignment.get('vacancy_id')
            
            # Поддерживаем разные варианты связи рекрутера с вакансией
            if isinstance(assignment.get('recruiter'), dict):
                recruiter_id = assignment['recruiter'].get('id')
            elif isinstance(assignment.get('recruiter'), int):
                recruiter_id = assignment['recruiter']
            
            if recruiter_id is not None:
                if recruiter_id not in assignments_by_recruiter:
                    assignments_by_recruiter[recruiter_id] = []
                
                # Находим вакансию по ID
                vacancy = next((v for v in vacancies if v.get('id') == vacancy_id), None)
                vacancy_status = vacancy.get('status', 'Unknown') if vacancy else 'Unknown'
                
                assignments_by_recruiter[recruiter_id].append({
                    'vacancy_id': vacancy_id,
                    'status': vacancy_status
                })
        
        print("\nНазначения вакансий по рекрутерам:")
        for recruiter_id, assigned_vacancies in assignments_by_recruiter.items():
            # Находим рекрутера по ID
            recruiter = next((r for r in recruiters if r.get('id') == recruiter_id), {'full_name': 'Неизвестный рекрутер'})
            
            # Считаем активные и закрытые вакансии
            active_count = sum(1 for v in assigned_vacancies if v['status'].lower() != 'closed')
            closed_count = sum(1 for v in assigned_vacancies if v['status'].lower() == 'closed')
            
            print(f"  Рекрутер: {recruiter.get('full_name')} (ID: {recruiter_id})")
            print(f"    Всего назначено вакансий: {len(assigned_vacancies)}")
            print(f"    Активных вакансий: {active_count}")
            print(f"    Закрытых вакансий: {closed_count}")
    else:
        print("Нет данных о назначениях вакансий!")
    
    # 4. Получаем список заявок
    print("\n=== Заявки ===")
    applications_response = client.get('/applications/', headers=auth_headers)
    print(f"Статус ответа: {applications_response.status_code}")
    
    if applications_response.status_code != 200:
        print("Ошибка получения заявок!")
        return
    
    applications = applications_response.json()
    print(f"Получено {len(applications)} заявок")
    
    if applications:
        # Анализируем структуру заявок
        print("\nСтруктура заявок:")
        example = applications[0]
        for key, value in example.items():
            print(f"  {key}: {type(value).__name__} - {value}")
        
        # Статистика по статусам заявок
        applications_by_status = {}
        for app in applications:
            status = app.get('status', 'Unknown')
            applications_by_status[status] = applications_by_status.get(status, 0) + 1
        
        print("\nСтатистика по статусам заявок:")
        for status, count in applications_by_status.items():
            print(f"  {status}: {count}")
        
        # Проверяем связь заявок с рекрутерами
        applications_by_recruiter = {}
        for app in applications:
            # Проверяем все возможные поля, которые могут связывать заявку с рекрутером
            recruiter_id = app.get('recruiter_id')
            if recruiter_id is None and isinstance(app.get('recruiter'), dict):
                recruiter_id = app['recruiter'].get('id')
            if recruiter_id is None and isinstance(app.get('recruiter'), int):
                recruiter_id = app['recruiter']
            if recruiter_id is None:
                recruiter_id = app.get('processed_by')
            if recruiter_id is None:
                recruiter_id = app.get('assigned_to')
            
            if recruiter_id is not None:
                if recruiter_id not in applications_by_recruiter:
                    applications_by_recruiter[recruiter_id] = []
                
                applications_by_recruiter[recruiter_id].append({
                    'id': app.get('id'),
                    'status': app.get('status', 'Unknown')
                })
        
        print("\nЗаявки по рекрутерам:")
        for recruiter_id, apps in applications_by_recruiter.items():
            # Находим рекрутера по ID
            recruiter = next((r for r in recruiters if r.get('id') == recruiter_id), {'full_name': 'Неизвестный рекрутер'})
            
            # Считаем заявки по статусам
            status_counts = {}
            for app in apps:
                status = app['status']
                status_counts[status] = status_counts.get(status, 0) + 1
            
            print(f"  Рекрутер: {recruiter.get('full_name')} (ID: {recruiter_id})")
            print(f"    Всего заявок: {len(apps)}")
            print(f"    Статусы заявок:")
            for status, count in status_counts.items():
                print(f"      {status}: {count}")
    else:
        print("Нет данных о заявках!")
    
    print("\n=== Итоги анализа ===")
    print(f"Рекрутеров: {len(recruiters)}")
    print(f"Вакансий: {len(vacancies)}")
    print(f"Назначений вакансий: {len(assignments)}")
    print(f"Заявок: {len(applications)}")

if __name__ == "__main__":
    debug_api() 