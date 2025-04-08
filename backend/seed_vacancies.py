from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, configure_mappers
from models import Base, User, Vacancy
from config import DATABASE_URL
from datetime import datetime

# Создаем engine и сессию
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Обновляем мапперы SQLAlchemy для распознавания новых колонок
configure_mappers()

def create_test_vacancies():
    db = SessionLocal()
    
    try:
        # Находим пользователя с ролью admin для создания вакансий
        admin = db.query(User).filter(User.role == "admin").first()
        
        if not admin:
            print("Администратор не найден. Создайте пользователя с ролью admin.")
            return
        
        # Проверяем, есть ли уже вакансии в базе
        existing_vacancies = db.query(Vacancy).count()
        if existing_vacancies > 0:
            print(f"В базе уже существуют вакансии ({existing_vacancies}). Пропускаем создание тестовых вакансий.")
            return
        
        # Создаем тестовые вакансии
        vacancies = [
            Vacancy(
                title="Старший разработчик Python",
                requirements="- Опыт работы с Python от 3 лет\n- Знание фреймворков Flask, FastAPI\n- Опыт работы с базами данных PostgreSQL\n- Опыт работы с Docker",
                conditions="- Удаленная работа\n- Гибкий график\n- Конкурентная зарплата\n- ДМС после испытательного срока",
                description="Мы ищем опытного Python разработчика для работы над нашим основным продуктом.",
                status="new",
                created_by_id=admin.id,
                created_at=datetime.utcnow()
            ),
            Vacancy(
                title="Front-end разработчик React",
                requirements="- Опыт работы с React от 2 лет\n- Знание JavaScript/TypeScript\n- Опыт работы с Redux\n- Понимание принципов UI/UX",
                conditions="- Офис в центре города\n- График 5/2\n- Бонусы и премии\n- Корпоративные мероприятия",
                description="Требуется front-end разработчик для создания современных пользовательских интерфейсов.",
                status="new",
                created_by_id=admin.id,
                created_at=datetime.utcnow()
            ),
            Vacancy(
                title="DevOps инженер",
                requirements="- Опыт работы с Kubernetes, Docker\n- Знание AWS/GCP\n- Автоматизация CI/CD\n- Мониторинг и логирование",
                conditions="- Гибридный формат работы\n- Современное оборудование\n- Профессиональное обучение\n- Медицинская страховка",
                description="Ищем DevOps инженера для оптимизации инфраструктуры и автоматизации процессов.",
                status="new",
                created_by_id=admin.id,
                created_at=datetime.utcnow()
            )
        ]
        
        # Добавляем вакансии в базу данных
        for vacancy in vacancies:
            db.add(vacancy)
        
        db.commit()
        print(f"Создано {len(vacancies)} тестовых вакансий")
        
    except Exception as e:
        print(f"Ошибка при создании тестовых вакансий: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_test_vacancies() 