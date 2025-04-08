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
    
    # Добавляем столбец confirmed_count
    query = text("ALTER TABLE telegram_broadcasts ADD COLUMN IF NOT EXISTS confirmed_count INTEGER DEFAULT 0")
    connection.execute(query)
    connection.commit()
    
    logger.info("Успешно добавлен столбец confirmed_count в таблицу telegram_broadcasts")
    
except Exception as e:
    logger.error(f"Ошибка при добавлении столбца: {str(e)}")
finally:
    if 'connection' in locals():
        connection.close()
    logger.info("Соединение с базой данных закрыто") 