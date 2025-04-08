from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_admin():
    db = SessionLocal()
    try:
        # Проверяем существует ли админ
        admin = db.query(models.User).filter(models.User.email == "admin@abstract.com").first()
        if not admin:
            # Создаем админа если не существует
            hashed_password = pwd_context.hash("admin123")
            admin = models.User(
                email="admin@abstract.com",
                hashed_password=hashed_password,
                is_active=True,
                is_superuser=True
            )
            db.add(admin)
            db.commit()
            print("Админ создан успешно")
        else:
            # Обновляем пароль существующего админа
            admin.hashed_password = pwd_context.hash("admin123")
            db.commit()
            print("Пароль админа обновлен")
    except Exception as e:
        print(f"Ошибка: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    create_admin() 