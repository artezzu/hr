import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base, User, Application
from config import DATABASE_URL
from passlib.context import CryptContext

# Создаем engine
engine = create_engine(DATABASE_URL)

# Создаем сессию
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Создаем тестового пользователя
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def init_db():
    # Создаем все таблицы
    Base.metadata.drop_all(bind=engine)  # Удаляем старые таблицы
    Base.metadata.create_all(bind=engine)  # Создаем новые таблицы
    
    # Создаем сессию
    db = SessionLocal()
    
    try:
        # Проверяем, существует ли пользователь admin
        admin = db.query(User).filter(User.email == "admin@abstract.com").first()
        
        if not admin:
            # Создаем пользователя admin
            hashed_password = pwd_context.hash("admin123")
            admin_user = User(
                email="admin@abstract.com",
                full_name="Admin User",
                hashed_password=hashed_password,
                role="admin"
            )
            db.add(admin_user)
            db.commit()
            print("Пользователь admin создан успешно!")
        else:
            print("Пользователь admin уже существует")
    
    except Exception as e:
        print(f"Ошибка при создании пользователя admin: {e}")
        db.rollback()
    
    finally:
        db.close()

if __name__ == "__main__":
    print("Инициализация базы данных...")
    init_db() 
    print("Инициализация базы данных завершена!") 