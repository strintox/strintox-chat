# NightTalk - Анонимный онлайн чат

![NightTalk Logo](https://via.placeholder.com/200x100?text=NightTalk)

## Описание

NightTalk - это анонимный онлайн чат с темным дизайном, который позволяет пользователям общаться без необходимости регистрации. Каждому пользователю автоматически присваивается уникальный ник на основе IP-адреса и случайный аватар из набора предустановленных.

## Основные функции

- 🌙 Современный темный дизайн, оптимизированный для ПК и мобильных устройств
- 🔄 Обмен сообщениями в режиме реального времени
- 📷 Отправка изображений в чат
- 🖼️ Автоматическое присвоение уникального аватара из коллекции из 10 изображений
- 👤 Автоматическая генерация уникальных имен пользователей
- 👥 Счетчик онлайн пользователей

## Технологии

- HTML5, CSS3, JavaScript
- [Supabase](https://supabase.io/) - для бэкенда и хранения данных
- [Font Awesome](https://fontawesome.com/) - для иконок
- [Flaticon](https://www.flaticon.com/) - для аватаров пользователей

## Структура базы данных (Supabase)

Для корректной работы проекта необходимо создать следующие таблицы в Supabase:

### Таблица `users`

```sql
CREATE TABLE public.users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    avatar_url TEXT,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### Таблица `messages`

```sql
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT REFERENCES public.users(id),
    content TEXT,
    image_url TEXT DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### Хранилища (Storage Buckets)

Необходимо создать два хранилища в Supabase:
- `avatars` - для хранения аватаров пользователей
- `message_images` - для хранения изображений в сообщениях

Настройте публичный доступ для чтения обоих хранилищ.

## Настройка и запуск

1. Клонируйте репозиторий
   ```
   git clone https://github.com/yourusername/nighttalk.git
   cd nighttalk
   ```

2. Настройте базу данных Supabase как описано выше

3. Обновите данные подключения к Supabase в файле `script.js` (если вы не используете предоставленные)
   ```javascript
   const SUPABASE_URL = 'ваш_url';
   const SUPABASE_KEY = 'ваш_ключ';
   ```

4. Запустите проект через любой веб-сервер, например:
   - Используйте расширение Live Server в VS Code
   - Или запустите Python HTTP server: `python -m http.server`
   - Или другой веб-сервер по вашему выбору

## Коллекция аватаров

В проекте используются 10 предустановленных аватаров, которые автоматически назначаются пользователям:
- Бизнесмен
- Программист
- Художник
- Фермер
- Музыкант
- Доктор
- Спортсмен
- Повар
- Студент
- Пилот

## Устранение неполадок

Если вы столкнулись с проблемами при работе приложения:

1. **Не отображается аватар** - попробуйте дважды кликнуть на аватар в заголовке чата и подтвердить сброс данных. После этого перезагрузите страницу и войдите снова.

2. **Сообщения не отправляются** - убедитесь, что все SQL-запросы в db-setup.sql были успешно выполнены и Supabase настроен правильно.

## Развертывание

Проект можно легко развернуть на любом хостинге, который поддерживает статические сайты, например:
- GitHub Pages
- Netlify
- Vercel
- Firebase Hosting

## Лицензия

Этот проект распространяется под лицензией MIT. 