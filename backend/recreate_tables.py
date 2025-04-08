from sqlalchemy import create_engine
from models import Base, User
from database import SessionLocal
from config import DATABASE_URL
from passlib.context import CryptContext
import sys

def recreate_tables():
    print(f"Подключаемся к базе данных: {DATABASE_URL}")
    try:
        engine = create_engine(DATABASE_URL)
        
        print("Сохраняем данные пользователей...")
        db = SessionLocal()
        users = []
        try:
            # Получаем существующих пользователей
            for user in db.query(User).all():
                users.append({
                    'email': user.email,
                    'full_name': user.full_name,
                    'hashed_password': user.hashed_password,
                    'role': user.role
                })
        except Exception as e:
            print(f"Ошибка при получении пользователей: {e}")
            # Продолжаем работу даже при ошибке
        finally:
            db.close()
        
        print(f"Сохранено {len(users)} пользователей")
        
        print("Удаляем существующие таблицы...")
        Base.metadata.drop_all(bind=engine)
        
        print("Создаем таблицы заново...")
        Base.metadata.create_all(bind=engine)
        
        # Восстанавливаем пользователей
        if users:
            print("Восстанавливаем пользователей...")
            db = SessionLocal()
            try:
                pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
                
                for user_data in users:
                    # Создаем нового пользователя
                    new_user = User(
                        email=user_data['email'],
                        full_name=user_data['full_name'],
                        hashed_password=user_data['hashed_password'],
                        role=user_data['role']
                    )
                    db.add(new_user)
                
                db.commit()
                print(f"Восстановлено {len(users)} пользователей")
            except Exception as e:
                print(f"Ошибка при восстановлении пользователей: {e}")
                db.rollback()
            finally:
                db.close()
        
        print("\nБаза данных успешно пересоздана!")
        return True
        
    except Exception as e:
        print(f"Ошибка при пересоздании базы данных: {e}")
        return False

if __name__ == "__main__":
    if recreate_tables():
        sys.exit(0)
    else:
        sys.exit(1) 