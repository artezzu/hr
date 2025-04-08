from database import SessionLocal
from models import Vacancy

# Функция для получения всех вакансий из базы данных
def get_all_vacancies():
    db = SessionLocal()
    try:
        vacancies = db.query(Vacancy).all()
        print(f"Найдено {len(vacancies)} вакансий:")
        
        # Подсчет вакансий по статусам
        status_counts = {
            "new": 0,
            "in_progress": 0,
            "closed": 0,
            "other": 0
        }
        
        # Вывод информации о каждой вакансии
        for vacancy in vacancies:
            print(f"ID: {vacancy.id}, Название: {vacancy.title}, Статус: {vacancy.status}")
            
            if vacancy.status == "new":
                status_counts["new"] += 1
            elif vacancy.status == "in_progress":
                status_counts["in_progress"] += 1
            elif vacancy.status == "closed":
                status_counts["closed"] += 1
            else:
                status_counts["other"] += 1
        
        # Итоговая статистика
        print("\nИтоговая статистика по статусам вакансий:")
        print(f"Новые: {status_counts['new']}")
        print(f"В работе: {status_counts['in_progress']}")
        print(f"Закрытые: {status_counts['closed']}")
        print(f"Другие статусы: {status_counts['other']}")
        
        return vacancies
    finally:
        db.close()

# Запуск проверки
if __name__ == "__main__":
    get_all_vacancies() 