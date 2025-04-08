from sqlalchemy.orm import Session
import models, schemas
from database import engine, get_db, SessionLocal
from datetime import datetime
from passlib.context import CryptContext
import sys

# Создаем пароль для тестового пользователя
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
def get_password_hash(password):
    return pwd_context.hash(password)

def create_test_data(db: Session):
    # Проверяем, есть ли уже админ в системе
    admin = db.query(models.User).filter(models.User.email == "admin@example.com").first()
    
    # Если нет, создаем
    if not admin:
        admin = models.User(
            email="admin@example.com",
            full_name="Test Admin",
            hashed_password=get_password_hash("admin"),
            role="admin"
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
        print("Created admin user")
    else:
        print("Admin user already exists")
    
    # Создаем тестовую вакансию
    test_vacancy = models.Vacancy(
        title="Senior Python Developer",
        requirements="Python, FastAPI, SQLAlchemy, React",
        conditions="Remote work, flexible hours, competitive salary",
        description="We are looking for a senior Python developer to join our team",
        status="new",
        created_by_id=admin.id,
        created_at=datetime.now(),
        updated_at=datetime.now()
    )
    
    db.add(test_vacancy)
    db.commit()
    db.refresh(test_vacancy)
    
    print(f"Created test vacancy: {test_vacancy.title}, ID: {test_vacancy.id}")
    
    # Создаем тестового рекрутера если его нет
    recruiter = db.query(models.User).filter(models.User.email == "recruiter@example.com").first()
    
    if not recruiter:
        recruiter = models.User(
            email="recruiter@example.com",
            full_name="Test Recruiter",
            hashed_password=get_password_hash("recruiter"),
            role="recruiter",
            position="HR Manager"
        )
        db.add(recruiter)
        db.commit()
        db.refresh(recruiter)
        print("Created recruiter user")
    else:
        print("Recruiter user already exists")
    
    return "Test data created successfully"

if __name__ == "__main__":
    db = SessionLocal()
    try:
        result = create_test_data(db)
        print(result)
    except Exception as e:
        print(f"Error creating test data: {e}")
    finally:
        db.close() 