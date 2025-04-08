import urllib.request
import json
import base64
import sys

API_BASE_URL = "http://localhost:8000"  # URL вашего API
ADMIN_USERNAME = "arsen@gmail.com"
ADMIN_PASSWORD = "5533951"

def pretty_print(data):
    """Красивый вывод JSON данных"""
    print(json.dumps(data, indent=2, ensure_ascii=False))

def make_request(url, method="GET", data=None, headers=None):
    """Выполнить HTTP запрос к API"""
    if headers is None:
        headers = {}
    
    full_url = f"{API_BASE_URL}{url}"
    print(f"Запрос: {method} {full_url}")
    
    try:
        if data and method == "POST":
            if isinstance(data, dict):
                data = json.dumps(data).encode('utf-8')
                headers['Content-Type'] = 'application/json'
            elif isinstance(data, str):
                data = data.encode('utf-8')
                headers['Content-Type'] = 'application/x-www-form-urlencoded'
        
        req = urllib.request.Request(
            full_url, 
            data=data, 
            headers=headers, 
            method=method
        )
        
        with urllib.request.urlopen(req) as response:
            response_data = response.read().decode('utf-8')
            try:
                return json.loads(response_data), response.status
            except json.JSONDecodeError:
                return response_data, response.status
    
    except urllib.error.HTTPError as e:
        print(f"Ошибка HTTP: {e.code} - {e.reason}")
        try:
            error_data = json.loads(e.read().decode('utf-8'))
            print("Ответ сервера:")
            pretty_print(error_data)
        except:
            print(f"Ответ сервера: {e.read().decode('utf-8')}")
        return None, e.code
    
    except Exception as e:
        print(f"Ошибка при запросе: {e}")
        return None, None

def get_token():
    """Получить токен доступа"""
    print("\n=== Авторизация ===")
    
    # Подготовка данных для авторизации
    credentials = f"username={ADMIN_USERNAME}&password={ADMIN_PASSWORD}"
    
    # Выполнение запроса авторизации
    response, status = make_request(
        "/token", 
        method="POST", 
        data=credentials
    )
    
    if response and 'access_token' in response:
        print("Авторизация успешна!")
        return response['access_token']
    else:
        print("Ошибка авторизации! Проверьте учетные данные.")
        return None

def get_recruiters(token):
    """Получить список рекрутеров"""
    print("\n=== Рекрутеры ===")
    
    response, status = make_request(
        "/users/?role=recruiter", 
        headers={"Authorization": f"Bearer {token}"}
    )
    
    if response:
        print(f"Получено {len(response)} рекрутеров")
        
        if response:
            for recruiter in response:
                print(f"ID: {recruiter.get('id')}, Имя: {recruiter.get('full_name', 'Нет имени')}, Email: {recruiter.get('email', 'Нет email')}")
    else:
        print("Ошибка при получении списка рекрутеров")
    
    return response or []

def get_vacancies(token):
    """Получить список вакансий"""
    print("\n=== Вакансии ===")
    
    response, status = make_request(
        "/vacancies/", 
        headers={"Authorization": f"Bearer {token}"}
    )
    
    if response:
        print(f"Получено {len(response)} вакансий")
        
        # Статистика по статусам вакансий
        vacancies_by_status = {}
        for vacancy in response:
            status = vacancy.get('status', 'Unknown')
            vacancies_by_status[status] = vacancies_by_status.get(status, 0) + 1
        
        print("Статистика по статусам вакансий:")
        for status, count in vacancies_by_status.items():
            print(f"  {status}: {count}")
    else:
        print("Ошибка при получении списка вакансий")
    
    return response or []

def get_vacancy_assignments(token):
    """Получить список назначений вакансий"""
    print("\n=== Назначения вакансий ===")
    
    response, status = make_request(
        "/vacancy-assignments/", 
        headers={"Authorization": f"Bearer {token}"}
    )
    
    if response:
        print(f"Получено {len(response)} назначений вакансий")
        
        if response:
            # Анализируем структуру назначений
            print("\nСтруктура назначений:")
            example = response[0]
            for key, value in example.items():
                print(f"  {key}: {type(value).__name__} - {value}")
    else:
        print("Ошибка при получении списка назначений вакансий")
    
    return response or []

def get_applications(token):
    """Получить список заявок"""
    print("\n=== Заявки ===")
    
    response, status = make_request(
        "/applications/", 
        headers={"Authorization": f"Bearer {token}"}
    )
    
    if response:
        print(f"Получено {len(response)} заявок")
        
        if response:
            # Анализируем структуру заявок
            print("\nСтруктура заявок:")
            example = response[0]
            for key, value in example.items():
                print(f"  {key}: {type(value).__name__} - {value}")
            
            # Статистика по статусам заявок
            applications_by_status = {}
            for app in response:
                status = app.get('status', 'Unknown')
                applications_by_status[status] = applications_by_status.get(status, 0) + 1
            
            print("\nСтатистика по статусам заявок:")
            for status, count in applications_by_status.items():
                print(f"  {status}: {count}")
    else:
        print("Ошибка при получении списка заявок")
    
    return response or []

def analyze_recruiters_performance(recruiters, vacancies, assignments, applications):
    """Анализировать производительность рекрутеров"""
    print("\n=== Анализ KPI рекрутеров ===")
    
    if not recruiters or not vacancies or not assignments:
        print("Недостаточно данных для анализа производительности рекрутеров")
        return
    
    # Анализируем назначения по рекрутерам
    assignments_by_recruiter = {}
    for assignment in assignments:
        recruiter_id = assignment.get('recruiter_id')  # Используем recruiter_id вместо поля recruiter
        vacancy_id = assignment.get('vacancy_id')
        
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
    
    # Анализируем заявки по рекрутерам
    applications_by_recruiter = {}
    for app in applications:
        # Проверяем все возможные поля, которые могут связывать заявку с рекрутером
        recruiter_id = app.get('recruiter_id')
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
    
    print("\nKPI рекрутеров:")
    for recruiter in recruiters:
        recruiter_id = recruiter.get('id')
        recruiter_name = recruiter.get('full_name', 'Без имени')
        
        # Получаем назначенные вакансии
        assigned_vacancies = assignments_by_recruiter.get(recruiter_id, [])
        
        # Считаем активные и закрытые вакансии
        active_count = sum(1 for v in assigned_vacancies if v['status'].lower() != 'closed')
        closed_count = sum(1 for v in assigned_vacancies if v['status'].lower() == 'closed')
        
        # Получаем заявки
        recruiter_applications = applications_by_recruiter.get(recruiter_id, [])
        
        # Выводим детальную информацию о вакансиях этого рекрутера
        if assigned_vacancies:
            print(f"\n  Детали вакансий для {recruiter_name} (ID: {recruiter_id}):")
            for vacancy in assigned_vacancies:
                print(f"    Вакансия ID: {vacancy['vacancy_id']}, Статус: {vacancy['status']}")
        
        # Выводим детальную информацию о заявках
        if recruiter_applications:
            print(f"\n  Детали заявок для {recruiter_name} (ID: {recruiter_id}):")
            for app in recruiter_applications[:3]:  # показываем только первые 3 для краткости
                print(f"    Заявка ID: {app['id']}, Статус: {app['status']}")
            if len(recruiter_applications) > 3:
                print(f"    ... и еще {len(recruiter_applications) - 3} заявок")
        
        # Считаем заявки по статусам
        status_counts = {}
        for app in recruiter_applications:
            status = app['status']
            status_counts[status] = status_counts.get(status, 0) + 1
        
        # Подсчет количества кандидатов на разных этапах
        new_candidates = sum(1 for app in recruiter_applications if app['status'].lower() == 'новый')
        interview_candidates = sum(1 for app in recruiter_applications 
                               if app['status'].lower() in ['собеседование', 'телефонное интервью'])
        offer_candidates = sum(1 for app in recruiter_applications if app['status'].lower() == 'оффер')
        hired_candidates = sum(1 for app in recruiter_applications if app['status'].lower() == 'принят на работу')
        rejected_candidates = sum(1 for app in recruiter_applications if app['status'].lower() == 'отказ')
        
        # Вычисляем конверсию (процент успешных наймов)
        conversion_rate = 0
        if len(recruiter_applications) > 0:
            conversion_rate = round((hired_candidates / len(recruiter_applications)) * 100)
        
        print(f"\nРекрутер: {recruiter_name} (ID: {recruiter_id})")
        print(f"  Активные вакансии: {active_count}")
        print(f"  Закрытые вакансии: {closed_count}")
        print(f"  Всего вакансий: {len(assigned_vacancies)}")
        print(f"  Всего кандидатов: {len(recruiter_applications)}")
        print(f"  Новые кандидаты: {new_candidates}")
        print(f"  Интервью: {interview_candidates}")
        print(f"  Оффер: {offer_candidates}")
        print(f"  Принято на работу: {hired_candidates}")
        print(f"  Отказ: {rejected_candidates}")
        print(f"  Конверсия: {conversion_rate}%")

def main():
    """Основная функция для анализа API"""
    # Получение токена доступа
    token = get_token()
    if not token:
        sys.exit(1)
    
    # Получение данных с API
    recruiters = get_recruiters(token)
    vacancies = get_vacancies(token)
    assignments = get_vacancy_assignments(token)
    applications = get_applications(token)
    
    # Анализ KPI рекрутеров
    analyze_recruiters_performance(recruiters, vacancies, assignments, applications)
    
    print("\n=== Итоги анализа ===")
    print(f"Рекрутеров: {len(recruiters)}")
    print(f"Вакансий: {len(vacancies)}")
    print(f"Назначений вакансий: {len(assignments)}")
    print(f"Заявок: {len(applications)}")

if __name__ == "__main__":
    main() 