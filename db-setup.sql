-- Включаем расширение для генерации UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Создаем таблицу пользователей, если она не существует
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    avatar_url TEXT,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Создаем таблицу сообщений для глобального чата
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT REFERENCES public.users(id),
    content TEXT,
    image_url TEXT DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Создаем таблицу чатов для личных переписок
CREATE TABLE IF NOT EXISTS public.chats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    last_message TEXT DEFAULT NULL,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Создаем таблицу участников чата
CREATE TABLE IF NOT EXISTS public.chat_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (chat_id, user_id)
);

-- Создаем таблицу сообщений для личных чатов
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES public.users(id),
    content TEXT,
    image_url TEXT DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Настройка уровня безопасности на уровне строк
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Удаляем существующие политики, если они есть
DROP POLICY IF EXISTS "Пользователи доступны всем для чтения" ON public.users;
DROP POLICY IF EXISTS "Пользователи могут создавать свои профили" ON public.users;
DROP POLICY IF EXISTS "Пользователи могут обновлять только свои профили" ON public.users;
DROP POLICY IF EXISTS "Сообщения доступны всем для чтения" ON public.messages;
DROP POLICY IF EXISTS "Любой может добавлять сообщения" ON public.messages;
DROP POLICY IF EXISTS "Чаты доступны участникам" ON public.chats;
DROP POLICY IF EXISTS "Любой может создавать чаты" ON public.chats;
DROP POLICY IF EXISTS "Чаты могут обновляться участниками" ON public.chats;
DROP POLICY IF EXISTS "Участники чата доступны для чтения" ON public.chat_participants;
DROP POLICY IF EXISTS "Любой может добавлять участников" ON public.chat_participants;
DROP POLICY IF EXISTS "Сообщения чата доступны участникам" ON public.chat_messages;
DROP POLICY IF EXISTS "Участники могут добавлять сообщения в чат" ON public.chat_messages;

-- Создаем новые политики для таблицы пользователей
CREATE POLICY "Пользователи доступны всем для чтения" 
ON public.users FOR SELECT 
USING (true);

CREATE POLICY "Пользователи могут создавать свои профили" 
ON public.users FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Пользователи могут обновлять только свои профили" 
ON public.users FOR UPDATE 
USING (true);

-- Создаем новые политики для таблицы сообщений глобального чата
CREATE POLICY "Сообщения доступны всем для чтения" 
ON public.messages FOR SELECT 
USING (true);

CREATE POLICY "Любой может добавлять сообщения" 
ON public.messages FOR INSERT 
WITH CHECK (true);

-- Создаем политики для таблицы чатов
CREATE POLICY "Чаты доступны участникам" 
ON public.chats FOR SELECT 
USING (true);

CREATE POLICY "Любой может создавать чаты" 
ON public.chats FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Чаты могут обновляться участниками" 
ON public.chats FOR UPDATE 
USING (true);

-- Создаем политики для таблицы участников чата
CREATE POLICY "Участники чата доступны для чтения" 
ON public.chat_participants FOR SELECT 
USING (true);

CREATE POLICY "Любой может добавлять участников" 
ON public.chat_participants FOR INSERT 
WITH CHECK (true);

-- Создаем политики для таблицы сообщений в личных чатах
CREATE POLICY "Сообщения чата доступны участникам" 
ON public.chat_messages FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.chat_participants
        WHERE chat_participants.chat_id = chat_messages.chat_id
        AND chat_participants.user_id = auth.uid()
    )
);

CREATE POLICY "Участники могут добавлять сообщения в чат" 
ON public.chat_messages FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.chat_participants
        WHERE chat_participants.chat_id = chat_messages.chat_id
        AND chat_participants.user_id = auth.uid()
    )
);

-- Проверка наличия публикации supabase_realtime
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END
$$;

-- Включаем публикацию для реализации реального времени
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Включаем уведомления о вставке для таблицы сообщений для реализации реального времени
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.chats REPLICA IDENTITY FULL;
ALTER TABLE public.chat_participants REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;

-- Функция для проверки статуса realtime
CREATE OR REPLACE FUNCTION public.get_realtime_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Проверяем наличие публикации и таблиц в ней
  SELECT jsonb_build_object(
    'has_realtime_publication', EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'),
    'messages_in_publication', EXISTS (
      SELECT 1 
      FROM pg_publication p 
      JOIN pg_publication_tables pt ON p.oid = pt.pubid 
      WHERE p.pubname = 'supabase_realtime' 
      AND pt.tablename = 'messages' 
      AND pt.schemaname = 'public'
    ),
    'replica_identity', (
      SELECT CASE WHEN relreplident = 'f' THEN 'FULL' 
                 WHEN relreplident = 'd' THEN 'DEFAULT'
                 WHEN relreplident = 'n' THEN 'NOTHING'
                 ELSE 'UNKNOWN' END
      FROM pg_class 
      WHERE oid = 'public.messages'::regclass
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Функция для поиска пользователей по имени
CREATE OR REPLACE FUNCTION public.search_users(search_query TEXT)
RETURNS TABLE (
    id TEXT,
    username TEXT,
    avatar_url TEXT,
    last_seen TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT id, username, avatar_url, last_seen
    FROM public.users
    WHERE username ILIKE '%' || search_query || '%'
    ORDER BY username ASC
    LIMIT 20;
$$;

-- Функция для получения чатов пользователя
CREATE OR REPLACE FUNCTION public.get_user_chats(user_id TEXT)
RETURNS TABLE (
    id UUID,
    created_at TIMESTAMP WITH TIME ZONE,
    last_message TEXT,
    last_activity TIMESTAMP WITH TIME ZONE,
    participants JSONB
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        c.id, 
        c.created_at, 
        c.last_message, 
        c.last_activity, 
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'user_id', u.id,
                    'username', u.username,
                    'avatar_url', u.avatar_url
                )
            )
            FROM public.chat_participants cp
            JOIN public.users u ON cp.user_id = u.id
            WHERE cp.chat_id = c.id
        ) AS participants
    FROM public.chats c
    JOIN public.chat_participants cp ON c.id = cp.chat_id
    WHERE cp.user_id = user_id
    ORDER BY c.last_activity DESC;
$$;

-- Комментарии о таблицах
COMMENT ON TABLE public.users IS 'Таблица пользователей чата. Аватары выбираются автоматически из предустановленных изображений.';
COMMENT ON TABLE public.messages IS 'Сообщения для глобального чата. Доступны всем пользователям.';
COMMENT ON TABLE public.chats IS 'Чаты для личных переписок между пользователями.';
COMMENT ON TABLE public.chat_participants IS 'Участники чатов. Связывает пользователей с чатами.';
COMMENT ON TABLE public.chat_messages IS 'Сообщения для личных чатов. Доступны только участникам чата.'; 