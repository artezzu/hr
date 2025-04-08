-- Переименовать столбец new_status в status в таблице status_history
ALTER TABLE status_history 
RENAME COLUMN new_status TO status; 

-- Добавить колонку created_by в таблицу status_history, если она отсутствует
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

-- Проверить и добавить значение по умолчанию для поля created_at в таблице status_history
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

-- Создание таблицы folders, если она не существует
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

-- Создание таблицы documents, если она не существует
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

-- Создание таблицы document_access, если она не существует
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