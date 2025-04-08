import sqlite3
from sqlalchemy import create_engine, text
from config import DATABASE_URL
import logging
import os
import sys
import traceback

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

def ensure_directories():
    """Создание необходимых директорий"""
    directories = [
        "resumes",  # Для хранения резюме
        "logs",     # Для логов
        "temp"      # Для временных файлов
    ]
    
    for directory in directories:
        if not os.path.exists(directory):
            os.makedirs(directory)
            logger.info(f"Created directory: {directory}")

def run_migrations():
    """Выполнение миграций базы данных для PostgreSQL"""
    try:
        # Подключаемся к базе данных через SQLAlchemy
        logger.info(f"Подключаемся к базе данных: {DATABASE_URL}")
        engine = create_engine(DATABASE_URL)
        conn = engine.connect()
        
        # Добавление колонки position в таблицу users, если она не существует
        logger.info("Проверяем наличие колонки position в таблице users")
        conn.execute(text("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_name = 'users' AND column_name = 'position'
                ) THEN
                    ALTER TABLE users ADD COLUMN position VARCHAR;
                    RAISE NOTICE 'Колонка position добавлена';
                ELSE
                    RAISE NOTICE 'Колонка position уже существует';
                END IF;
            END $$;
        """))
        
        # Добавление колонки created_at в таблицу users, если она не существует
        logger.info("Проверяем наличие колонки created_at в таблице users")
        conn.execute(text("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_name = 'users' AND column_name = 'created_at'
                ) THEN
                    ALTER TABLE users ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
                    RAISE NOTICE 'Колонка created_at добавлена';
                ELSE
                    RAISE NOTICE 'Колонка created_at уже существует';
                END IF;
            END $$;
        """))
        
        # Миграция: Добавление полей closed_by_id и closed_at в таблицу vacancies
        add_columns_to_vacancies(conn)
        
        logger.info("Миграции успешно выполнены")
        conn.close()
        
    except Exception as e:
        logger.error(f"Ошибка при выполнении миграций: {e}")
        traceback.print_exc()
        raise e

def setup_environment():
    """Настройка окружения"""
    try:
        # Создаем необходимые директории
        ensure_directories()
        
        # Выполняем миграции базы данных
        run_migrations()
        
        logger.info("Environment setup completed successfully!")
        
    except Exception as e:
        logger.error(f"Error during environment setup: {e}")
        raise

def create_tasks_table():
    """
    Создание таблицы для задач
    """
    try:
        with sqlite3.connect(DATABASE_URL.replace("sqlite:///", "")) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS tasks (
                    id INTEGER PRIMARY KEY,
                    title TEXT NOT NULL,
                    description TEXT,
                    date TEXT NOT NULL,
                    time TEXT,
                    status TEXT DEFAULT 'planned',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    assigned_to INTEGER,
                    created_by_id INTEGER,
                    FOREIGN KEY(assigned_to) REFERENCES users(id),
                    FOREIGN KEY(created_by_id) REFERENCES users(id)
                )
            ''')
            conn.commit()
            print("Таблица tasks создана или уже существует")
    except Exception as e:
        print(f"Ошибка при создании таблицы tasks: {e}")

def update_tasks_table():
    """
    Обновление таблицы tasks: добавление полей time и created_by_id, если они не существуют
    """
    try:
        with sqlite3.connect(DATABASE_URL.replace("sqlite:///", "")) as conn:
            cursor = conn.cursor()
            
            # Проверяем, существует ли колонка time
            cursor.execute("PRAGMA table_info(tasks)")
            columns = cursor.fetchall()
            column_names = [column[1] for column in columns]
            
            if "time" not in column_names:
                print("Добавление поля time в таблицу tasks...")
                cursor.execute("ALTER TABLE tasks ADD COLUMN time TEXT")
            
            if "created_by_id" not in column_names:
                print("Добавление поля created_by_id в таблицу tasks...")
                cursor.execute("ALTER TABLE tasks ADD COLUMN created_by_id INTEGER REFERENCES users(id)")
            
            conn.commit()
            print("Таблица tasks успешно обновлена")
    except Exception as e:
        print(f"Ошибка при обновлении таблицы tasks: {e}")

def create_notifications_table():
    """
    Создание таблицы для уведомлений
    """
    try:
        with sqlite3.connect(DATABASE_URL.replace("sqlite:///", "")) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS notifications (
                    id INTEGER PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    task_id INTEGER NOT NULL,
                    message TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    is_read BOOLEAN DEFAULT 0,
                    FOREIGN KEY(user_id) REFERENCES users(id),
                    FOREIGN KEY(task_id) REFERENCES tasks(id)
                )
            ''')
            # Создаем индекс для быстрого поиска непрочитанных уведомлений для пользователя
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_notifications_user_read
                ON notifications (user_id, is_read)
            ''')
            conn.commit()
            print("Таблица notifications создана или уже существует")
    except Exception as e:
        print(f"Ошибка при создании таблицы notifications: {e}")

def add_columns_to_vacancies(conn):
    """
    Добавляет поля closed_by_id и closed_at в таблицу vacancies.
    """
    print("Добавление полей closed_by_id и closed_at в таблицу vacancies...")
    
    # Проверяем, существует ли колонка closed_by_id
    result = conn.execute(text("PRAGMA table_info(vacancies)"))
    columns = [column[1] for column in result.fetchall()]
    
    if 'closed_by_id' not in columns:
        # Добавляем колонку closed_by_id
        conn.execute(text("ALTER TABLE vacancies ADD COLUMN closed_by_id INTEGER REFERENCES users(id)"))
        print("Добавлена колонка closed_by_id")
    else:
        print("Колонка closed_by_id уже существует")
    
    if 'closed_at' not in columns:
        # Добавляем колонку closed_at
        conn.execute(text("ALTER TABLE vacancies ADD COLUMN closed_at TIMESTAMP"))
        print("Добавлена колонка closed_at")
    else:
        print("Колонка closed_at уже существует")

def main():
    create_tasks_table()
    update_tasks_table()
    create_notifications_table()

if __name__ == "__main__":
    logger.info("Запуск миграций...")
    ensure_directories()
    run_migrations()
    logger.info("Миграции завершены")