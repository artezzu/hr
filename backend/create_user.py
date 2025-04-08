from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, configure_mappers
from models import Base, User
from config import DATABASE_URL
from passlib.context import CryptContext
import re

# Создаем engine и сессию
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Обновляем мапперы SQLAlchemy для распознавания новых колонок
configure_mappers()

# Создаем контекст для хеширования паролей
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def is_valid_email(email):
    """Проверка валидности email"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def create_user():
    print("\n=== Создание нового пользователя ===")
    
    # Получаем email
    while True:
        email = input("\nВведите email пользователя: ").strip()
        if not email:
            print("Email не может быть пустым!")
            continue
        if not is_valid_email(email):
            print("Некорректный формат email!")
            continue
        break
    
    # Получаем полное имя
    while True:
        full_name = input("Введите полное имя пользователя: ").strip()
        if not full_name:
            print("Имя не может быть пустым!")
            continue
        break
    
    # Получаем и подтверждаем пароль
    while True:
        password = input("Введите пароль (минимум 6 символов): ").strip()
        if len(password) < 6:
            print("Пароль должен содержать минимум 6 символов!")
            continue
        
        confirm_password = input("Подтвердите пароль: ").strip()
        if password != confirm_password:
            print("Пароли не совпадают!")
            continue
        break
    
    # Получаем роль
    while True:
        print("\nДоступные роли:")
        print("1. user (обычный пользователь)")
        print("2. admin (администратор)")
        print("3. recruiter (рекрутер)")
        role_choice = input("Выберите роль (1, 2 или 3): ").strip()
        
        if role_choice == "1":
            role = "user"
            break
        elif role_choice == "2":
            role = "admin"
            break
        elif role_choice == "3":
            role = "recruiter"
            break
        else:
            print("Пожалуйста, выберите 1, 2 или 3!")
    
    # Если выбрана роль "recruiter", запрашиваем должность
    position = None
    if role == "recruiter":
        while True:
            position = input("Введите должность рекрутера: ").strip()
            if not position:
                print("Должность не может быть пустой!")
                continue
            break
    
    # Создаем пользователя в базе данных
    db = SessionLocal()
    try:
        # Проверяем, существует ли пользователь с таким email
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            print(f"\nОшибка: пользователь с email {email} уже существует!")
            return
        
        # Создаем нового пользователя
        hashed_password = pwd_context.hash(password)
        new_user = User(
            email=email,
            full_name=full_name,
            hashed_password=hashed_password,
            role=role,
            position=position
        )
        
        db.add(new_user)
        db.commit()
        
        print("\n=== Пользователь успешно создан! ===")
        print(f"Email: {email}")
        print(f"Полное имя: {full_name}")
        print(f"Роль: {role}")
        if position:
            print(f"Должность: {position}")
        
    except Exception as e:
        print(f"\nОшибка при создании пользователя: {e}")
        db.rollback()
    finally:
        db.close()

def main():
    while True:
        create_user()
        
        while True:
            choice = input("\nХотите создать еще одного пользователя? (да/нет): ").strip().lower()
            if choice in ['да', 'нет']:
                break
            print("Пожалуйста, введите 'да' или 'нет'")
        
        if choice == 'нет':
            break
    
    print("\nРабота скрипта завершена. Все пользователи созданы.")

if __name__ == "__main__":
    main() 