from sqlalchemy import create_engine, text
from config import DATABASE_URL
import logging
import os
import sys

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

def apply_migration():
    """Применение SQL-миграции для добавления колонки created_by в таблицу status_history"""
    try:
        # Подключаемся к базе данных через SQLAlchemy
        logger.info(f"Подключаемся к базе данных: {DATABASE_URL}")
        engine = create_engine(DATABASE_URL)
        conn = engine.connect()
        
        # Добавление колонки created_by в таблицу status_history, если она не существует
        logger.info("Проверяем наличие колонки created_by в таблице status_history")
        conn.execute(text("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_name = 'status_history' AND column_name = 'created_by'
                ) THEN
                    ALTER TABLE status_history ADD COLUMN created_by VARCHAR;
                    RAISE NOTICE 'Колонка created_by добавлена в таблицу status_history';
                ELSE
                    RAISE NOTICE 'Колонка created_by уже существует в таблице status_history';
                END IF;
            END $$;
        """))
        
        # Добавление значения по умолчанию для поля created_at
        logger.info("Проверяем и настраиваем значение по умолчанию для поля created_at")
        conn.execute(text("""
            DO $$
            BEGIN
                -- Проверяем, имеет ли поле created_at значение по умолчанию
                IF NOT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_name = 'status_history' AND column_name = 'created_at' AND column_default IS NOT NULL
                ) THEN
                    -- Устанавливаем значение по умолчанию для created_at
                    ALTER TABLE status_history 
                    ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP;
                    
                    -- Обновляем NULL-значения в существующих записях
                    UPDATE status_history SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL;
                    
                    RAISE NOTICE 'Добавлено значение по умолчанию для поля created_at в таблице status_history';
                ELSE
                    RAISE NOTICE 'Поле created_at уже имеет значение по умолчанию';
                END IF;
            END $$;
        """))
        
        # Создание таблицы folders
        logger.info("Создаем таблицу folders, если она не существует")
        conn.execute(text("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'folders'
                ) THEN
                    CREATE TABLE folders (
                        id SERIAL PRIMARY KEY,
                        name VARCHAR NOT NULL,
                        parent_id INTEGER REFERENCES folders(id),
                        owner_id INTEGER NOT NULL REFERENCES users(id),
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    );
                    
                    RAISE NOTICE 'Таблица folders создана';
                ELSE
                    RAISE NOTICE 'Таблица folders уже существует';
                END IF;
            END $$;
        """))
        
        # Создание таблицы documents
        logger.info("Создаем таблицу documents, если она не существует")
        conn.execute(text("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'documents'
                ) THEN
                    CREATE TABLE documents (
                        id SERIAL PRIMARY KEY,
                        name VARCHAR NOT NULL,
                        file_path VARCHAR NOT NULL,
                        file_type VARCHAR NOT NULL,
                        file_size INTEGER NOT NULL,
                        folder_id INTEGER REFERENCES folders(id),
                        owner_id INTEGER NOT NULL REFERENCES users(id),
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    );
                    
                    RAISE NOTICE 'Таблица documents создана';
                ELSE
                    RAISE NOTICE 'Таблица documents уже существует';
                END IF;
            END $$;
        """))
        
        # Создание таблицы document_access
        logger.info("Создаем таблицу document_access, если она не существует")
        conn.execute(text("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'document_access'
                ) THEN
                    CREATE TABLE document_access (
                        id SERIAL PRIMARY KEY,
                        document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
                        user_id INTEGER NOT NULL REFERENCES users(id),
                        access_level VARCHAR NOT NULL,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    );
                    
                    RAISE NOTICE 'Таблица document_access создана';
                ELSE
                    RAISE NOTICE 'Таблица document_access уже существует';
                END IF;
            END $$;
        """))
        
        conn.commit()
        logger.info("Миграция успешно выполнена")
        conn.close()
        
    except Exception as e:
        logger.error(f"Ошибка при выполнении миграции: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return True

if __name__ == "__main__":
    if apply_migration():
        logger.info("Миграция успешно применена")
        sys.exit(0)
    else:
        logger.error("Не удалось применить миграцию")
        sys.exit(1) 