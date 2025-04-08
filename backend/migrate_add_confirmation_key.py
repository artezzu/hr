from sqlalchemy import create_engine, text
import logging
from database import DATABASE_URL

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    # Создаем соединение с базой данных
    engine = create_engine(DATABASE_URL)
    connection = engine.connect()
    
    # Добавляем столбец confirmation_key
    query1 = text("ALTER TABLE message_confirmations ADD COLUMN IF NOT EXISTS confirmation_key VARCHAR")
    connection.execute(query1)
    
    # Добавляем индекс для быстрого поиска по ключу
    query2 = text("CREATE INDEX IF NOT EXISTS idx_confirmation_key ON message_confirmations (confirmation_key)")
    connection.execute(query2)
    
    # Добавляем столбец message_id
    query3 = text("ALTER TABLE message_confirmations ADD COLUMN IF NOT EXISTS message_id INTEGER")
    connection.execute(query3)
    
    connection.commit()
    
    logger.info("Успешно добавлены столбцы confirmation_key и message_id в таблицу message_confirmations")
    
except Exception as e:
    logger.error(f"Ошибка при добавлении столбцов: {str(e)}")
finally:
    if 'connection' in locals():
        connection.close()
    logger.info("Соединение с базой данных закрыто") 