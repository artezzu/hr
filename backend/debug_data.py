from fastapi.testclient import TestClient
from main import app
import json

def pretty_print(data):
    """Print data in a readable format"""
    print(json.dumps(data, indent=2, ensure_ascii=False))

def main():
    # Инициализируем клиент
    client = TestClient(app)
    
    # Авторизуемся как админ
    token_response = client.post('/token', data={
        'username': 'admin@example.com', 
        'password': 'admin'
    })
    token = token_response.json().get('access_token')
    
    if not token:
        print("Ошибка авторизации:", token_response.json())
        return
    
    auth_headers = {'Authorization': f'Bearer {token}'}
    
    # Получаем список рекрутеров
    print("\n=== Recruiters ===")
    recruiters_response = client.get('/users/?role=recruiter', headers=auth_headers)
    recruiters = recruiters_response.json()
    print(f"Получено {len(recruiters)} рекрутеров")
    pretty_print(recruiters)
    
    # Получаем список вакансий
    print("\n=== Vacancies ===")
    vacancies_response = client.get('/vacancies/', headers=auth_headers)
    vacancies = vacancies_response.json()
    print(f"Получено {len(vacancies)} вакансий")
    
    if vacancies:
        print("Пример вакансии:")
        pretty_print(vacancies[0])
        
        # Статистика по статусам вакансий
        status_stats = {}
        for vacancy in vacancies:
            status = vacancy.get('status', 'Unknown')
            status_stats[status] = status_stats.get(status, 0) + 1
        
        print("\nСтатистика статусов вакансий:")
        pretty_print(status_stats)
    
    # Получаем список назначений вакансий
    print("\n=== Vacancy Assignments ===")
    assignments_response = client.get('/vacancy-assignments/', headers=auth_headers)
    assignments = assignments_response.json()
    print(f"Получено {len(assignments)} назначений вакансий")
    
    if assignments:
        print("Пример назначения:")
        pretty_print(assignments[0])
        
        # Проверяем связи между рекрутерами и вакансиями
        recruiter_vacancy_map = {}
        for assignment in assignments:
            recruiter_id = None
            vacancy_id = assignment.get('vacancy_id')
            
            if isinstance(assignment.get('recruiter'), dict):
                recruiter_id = assignment['recruiter'].get('id')
            elif isinstance(assignment.get('recruiter'), int):
                recruiter_id = assignment['recruiter']
            
            if recruiter_id and vacancy_id:
                if recruiter_id not in recruiter_vacancy_map:
                    recruiter_vacancy_map[recruiter_id] = []
                recruiter_vacancy_map[recruiter_id].append(vacancy_id)
        
        print("\nНазначения вакансий по рекрутерам:")
        for recruiter_id, vacancy_ids in recruiter_vacancy_map.items():
            recruiter_name = "Unknown"
            for recruiter in recruiters:
                if recruiter.get('id') == recruiter_id:
                    recruiter_name = recruiter.get('full_name', 'No name')
            print(f"Рекрутер {recruiter_name} (ID: {recruiter_id}): {len(vacancy_ids)} вакансий")
    
    # Получаем список заявок
    print("\n=== Applications ===")
    applications_response = client.get('/applications/', headers=auth_headers)
    applications = applications_response.json()
    print(f"Получено {len(applications)} заявок")
    
    if applications:
        print("Пример заявки:")
        pretty_print(applications[0])
        
        # Проверяем структуру заявок и связь с рекрутерами
        print("\nСтруктура связей заявок с рекрутерами:")
        app_example = applications[0]
        
        print("Поля, которые могут ссылаться на рекрутера:")
        for field in ['recruiter_id', 'processed_by', 'assigned_to', 'recruiter']:
            print(f" - {field}: {app_example.get(field, 'отсутствует')}")
        
        # Статистика по статусам заявок
        status_stats = {}
        for app in applications:
            status = app.get('status', 'Unknown')
            status_stats[status] = status_stats.get(status, 0) + 1
        
        print("\nСтатистика статусов заявок:")
        pretty_print(status_stats)

if __name__ == "__main__":
    main() 