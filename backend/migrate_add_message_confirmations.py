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
    
    # Проверяем существование таблицы
    check_query = text("""
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'message_confirmations'
    )
    """)
    
    exists = connection.execute(check_query).scalar()
    
    if not exists:
        # SQL запрос для создания таблицы message_confirmations
        create_table_query = text("""
        CREATE TABLE message_confirmations (
            id SERIAL PRIMARY KEY,
            broadcast_id INTEGER REFERENCES telegram_broadcasts(id),
            telegram_chat_id VARCHAR NOT NULL,
            status VARCHAR DEFAULT 'sent',
            confirmed_at TIMESTAMP
        )
        """)
        
        connection.execute(create_table_query)
        connection.commit()
        logger.info("Таблица message_confirmations успешно создана")
    else:
        logger.info("Таблица message_confirmations уже существует")
    
except Exception as e:
    logger.error(f"Ошибка при создании таблицы: {str(e)}")
finally:
    if 'connection' in locals():
        connection.close()
    logger.info("Соединение с базой данных закрыто") 