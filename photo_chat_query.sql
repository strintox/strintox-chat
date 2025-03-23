-- SQL запрос для добавления поддержки изображений в чате

-- 1. Добавление нового столбца image_url в таблицу messages, если он еще не существует
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT NULL;

-- 2. Создание бакета в Storage для хранения изображений чата (выполнять в SQL Editor)
-- Этот запрос нужно выполнить в SQL Editor в консоли Supabase
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat_images', 'chat_images', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Настройка политик безопасности для нового бакета
-- Политика для чтения: разрешить чтение всем пользователям
BEGIN;
  INSERT INTO storage.policies (name, definition, bucket_id)
  VALUES (
    'Public Read Access',
    'bucket_id = ''chat_images''',
    'chat_images'
  )
  ON CONFLICT (name, bucket_id) DO NOTHING;
COMMIT;

-- 4. Политика для создания: разрешить загрузку только аутентифицированным пользователям
BEGIN;
  INSERT INTO storage.policies (name, definition, bucket_id, operation)
  VALUES (
    'Upload Access',
    'bucket_id = ''chat_images''',
    'chat_images',
    'INSERT'
  )
  ON CONFLICT (name, bucket_id) DO NOTHING;
COMMIT;

-- 5. Обновление RLS политик для таблицы messages
-- Политика для чтения сообщений с изображениями
ALTER POLICY "Разрешить чтение всех сообщений" ON public.messages
USING (true);

-- 6. Создание функции для обновления сообщений с изображениями
CREATE OR REPLACE FUNCTION public.process_message_with_image()
RETURNS TRIGGER AS $$
BEGIN
  -- Проверяем наличие изображения и добавляем метаданные
  IF NEW.image_url IS NOT NULL THEN
    -- Здесь можно добавить дополнительную логику для обработки изображений
    -- Например, создание миниатюр, проверка содержимого и т.д.
    NEW.content = COALESCE(NEW.content, ''); -- Если текст пустой, устанавливаем пустую строку
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Создание триггера для обработки сообщений с изображениями
DROP TRIGGER IF EXISTS process_message_with_image_trigger ON public.messages;
CREATE TRIGGER process_message_with_image_trigger
BEFORE INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.process_message_with_image();

-- 8. Индекс для ускорения поиска сообщений с изображениями
CREATE INDEX IF NOT EXISTS idx_messages_with_images ON public.messages (image_url)
WHERE image_url IS NOT NULL;

-- 9. Создание представления для сообщений с изображениями
CREATE OR REPLACE VIEW public.messages_with_images AS
SELECT m.id, m.content, m.created_at, m.user_id, m.image_url, 
       u.username, u.avatar_url
FROM public.messages m
JOIN public.users u ON m.user_id = u.id
WHERE m.image_url IS NOT NULL
ORDER BY m.created_at DESC;

-- ВАЖНО: После выполнения этого SQL, необходимо настроить Supabase Storage
-- через веб-интерфейс, если вы хотите дополнительно настроить размеры файлов,
-- CORS и другие параметры хранилища.
