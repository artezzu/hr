from sqlalchemy.orm import Session
from database import SessionLocal
import models

def create_test_department():
    db = SessionLocal()
    try:
        # Проверяем, существует ли отдел
        department = db.query(models.Department).filter(models.Department.name == "IT отдел").first()
        if department:
            print("Отдел уже существует")
            return
        
        # Создаем новый отдел
        db_department = models.Department(
            name="IT отдел",
            description="Отдел информационных технологий"
        )
        db.add(db_department)
        db.commit()
        print("Отдел успешно создан")
    finally:
        db.close()

if __name__ == "__main__":
    create_test_department() 