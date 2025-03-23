-- Создание таблицы сообщений напрямую
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Включение realtime для таблицы
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Включение Row Level Security для сообщений (все могут видеть, только авторизованные могут писать)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Создание политики для доступа к сообщениям (чтение для всех)
CREATE POLICY messages_select_policy ON messages
    FOR SELECT 
    USING (true);

-- Создание политики для вставки сообщений (только для авторизованных)
CREATE POLICY messages_insert_policy ON messages
    FOR INSERT 
    WITH CHECK (true);

-- Создание индекса для ускорения запросов
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON messages (created_at); 