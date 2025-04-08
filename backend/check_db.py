from sqlalchemy import create_engine, text
from config import DATABASE_URL
import sys

def check_and_update_schema():
    print(f"Подключаемся к базе данных: {DATABASE_URL}")
    engine = create_engine(DATABASE_URL)
    conn = engine.connect()
    
    try:
        # Проверяем структуру таблицы users
        print("Проверяем структуру таблицы users...")
        result = conn.execute(text("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users'
            ORDER BY ordinal_position;
        """))
        
        columns = result.fetchall()
        print("Существующие колонки в таблице users:")
        for column in columns:
            print(f"  - {column[0]}: {column[1]}")
        
        # Добавляем колонку position, если её нет
        print("\nДобавляем колонку position...")
        conn.execute(text("""
            ALTER TABLE users ADD COLUMN IF NOT EXISTS position VARCHAR;
        """))
        
        # Добавляем колонку created_at, если её нет
        print("Добавляем колонку created_at...")
        conn.execute(text("""
            ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
        """))
        
        # Проверяем, что колонки были добавлены
        print("\nПроверяем обновленную структуру таблицы users...")
        result = conn.execute(text("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users'
            ORDER BY ordinal_position;
        """))
        
        columns = result.fetchall()
        print("Обновленные колонки в таблице users:")
        for column in columns:
            print(f"  - {column[0]}: {column[1]}")
        
        print("\nМиграция успешно выполнена!")
        
    except Exception as e:
        print(f"Ошибка при выполнении миграции: {e}")
        sys.exit(1)
    finally:
        conn.close()

if __name__ == "__main__":
    check_and_update_schema() 