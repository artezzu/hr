from database import engine
from sqlalchemy.orm import sessionmaker
import models
from passlib.context import CryptContext

# Создаем сессию для работы с БД
Session = sessionmaker(bind=engine)
session = Session()

# Настраиваем контекст для хеширования паролей
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Проверяем наличие пользователя admin
existing_user = session.query(models.User).filter(models.User.email == "admin@example.com").first()

if not existing_user:
    # Создаем нового пользователя
    new_user = models.User(
        email="admin@example.com",
        full_name="Admin User",
        hashed_password=pwd_context.hash("admin123"),
        role="admin"
    )
    session.add(new_user)
    session.commit()
    print("Admin user created successfully!")
else:
    print("Admin user already exists.")

print("Script completed.") 