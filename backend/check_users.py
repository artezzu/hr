from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import User, Base
from config import DATABASE_URL

# Создаем движок и сессию
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

# Получаем всех пользователей
users = db.query(User).all()

print(f"Всего пользователей в системе: {len(users)}")
for user in users:
    print(f"ID: {user.id}, Email: {user.email}, Имя: {user.full_name}, Роль: {user.role}")

db.close() 