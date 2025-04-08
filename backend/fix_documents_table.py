import psycopg2
import logging
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from sqlalchemy.sql import text
from config import DATABASE_URL

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def fix_documents_table():
    """Исправление структуры таблицы documents, добавление отсутствующих колонок"""
    try:
        # Подключаемся к базе данных напрямую через psycopg2
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = True
        cursor = conn.cursor()
        
        # Проверяем наличие колонки file_path
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'documents' AND column_name = 'file_path'
        """)
        
        if cursor.fetchone() is None:
            logger.info("Колонка file_path отсутствует в таблице documents. Добавляем...")
            cursor.execute("""
                ALTER TABLE documents 
                ADD COLUMN file_path VARCHAR NOT NULL DEFAULT '';
            """)
            logger.info("Колонка file_path успешно добавлена")
        else:
            logger.info("Колонка file_path уже существует в таблице documents")
        
        # Проверяем наличие колонки mime_type (возможно существует вместо file_type)
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'documents' AND column_name = 'mime_type'
        """)
        
        has_mime_type = cursor.fetchone() is not None
        
        # Проверяем наличие колонки file_type
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'documents' AND column_name = 'file_type'
        """)
        
        if cursor.fetchone() is None:
            if has_mime_type:
                logger.info("Найдена колонка mime_type, переименовываем в file_type...")
                cursor.execute("""
                    ALTER TABLE documents 
                    RENAME COLUMN mime_type TO file_type;
                """)
                logger.info("Колонка mime_type успешно переименована в file_type")
            else:
                logger.info("Колонка file_type отсутствует в таблице documents. Добавляем...")
                cursor.execute("""
                    ALTER TABLE documents 
                    ADD COLUMN file_type VARCHAR NOT NULL DEFAULT '';
                """)
                logger.info("Колонка file_type успешно добавлена")
        else:
            logger.info("Колонка file_type уже существует в таблице documents")
        
        # Проверяем наличие колонки file_size
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'documents' AND column_name = 'file_size'
        """)
        
        if cursor.fetchone() is None:
            logger.info("Колонка file_size отсутствует в таблице documents. Добавляем...")
            cursor.execute("""
                ALTER TABLE documents 
                ADD COLUMN file_size INTEGER NOT NULL DEFAULT 0;
            """)
            logger.info("Колонка file_size успешно добавлена")
        else:
            logger.info("Колонка file_size уже существует в таблице documents")
            
        # Проверяем наличие колонки folder_id
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'documents' AND column_name = 'folder_id'
        """)
        
        if cursor.fetchone() is None:
            logger.info("Колонка folder_id отсутствует в таблице documents. Добавляем...")
            
            # Сначала проверим, существует ли таблица folders
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'folders'
                );
            """)
            
            folders_exists = cursor.fetchone()[0]
            
            if folders_exists:
                cursor.execute("""
                    ALTER TABLE documents 
                    ADD COLUMN folder_id INTEGER REFERENCES folders(id);
                """)
            else:
                # Если таблицы folders не существует, добавляем без внешнего ключа
                cursor.execute("""
                    ALTER TABLE documents 
                    ADD COLUMN folder_id INTEGER;
                """)
                
            logger.info("Колонка folder_id успешно добавлена")
        else:
            logger.info("Колонка folder_id уже существует в таблице documents")
        
        # Закрываем соединение
        cursor.close()
        conn.close()
        
        logger.info("Структура таблицы documents успешно исправлена")
        
    except Exception as e:
        logger.error(f"Ошибка при исправлении структуры таблицы documents: {e}")
        raise

if __name__ == "__main__":
    fix_documents_table() 