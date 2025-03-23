// Дополнительная защита для GitHub Pages
(function() {
    try {
        // Проверка загрузки на GitHub Pages
        const isGitHubPages = window.location.hostname.includes('github.io');
        
        // Проверка наличия Supabase
        if (typeof window.supabase === 'undefined') {
            console.error('Supabase не найден. Возможно, скрипт был загружен до библиотеки Supabase.');
            // Отображаем пользователю ошибку
            setTimeout(() => {
                const connectionElement = document.getElementById('connection-notification');
                const messageElement = document.getElementById('connection-message');
                if (connectionElement && messageElement) {
                    messageElement.textContent = 'Ошибка инициализации приложения. Пожалуйста, обновите страницу.';
                    connectionElement.classList.remove('hidden');
                } else {
                    alert('Не удалось инициализировать приложение. Пожалуйста, обновите страницу.');
                }
            }, 1000);
            return; // Прерываем выполнение скрипта
        }
        
        // Если мы на GitHub Pages, добавляем дополнительные параметры для CORS
        if (isGitHubPages) {
            console.log('Работа на GitHub Pages, настройка дополнительных параметров...');
            // Добавляем временные метки к запросам для предотвращения кеширования
            const originalFetch = window.fetch;
            window.fetch = function(url, options) {
                if (typeof url === 'string' && url.includes('api.ipify.org')) {
                    // Добавляем случайный параметр к URL для предотвращения кеширования
                    const separator = url.includes('?') ? '&' : '?';
                    url = `${url}${separator}cache=${Date.now()}`;
                }
                return originalFetch(url, options);
            };
        }
    } catch (error) {
        console.error('Ошибка при запуске защитного кода:', error);
    }
})();

// Инициализация Supabase
const SUPABASE_URL = 'https://qiqskfxvlwjhanziheby.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpcXNrZnh2bHdqaGFuemloZWJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI3MjU2ODcsImV4cCI6MjA1ODMwMTY4N30.0l6xsQ_zUlu8D_2XUL-LRKtyVlbaRJ8aEVti9QP5Hq4';

// Проверка среды выполнения
const isGitHubPages = window.location.hostname.includes('github.io');
const RETRY_DELAYS = [1000, 2000, 3000, 5000]; // Задержки для повторных попыток в мс

// Создаем клиент Supabase с более надежными настройками и обработкой ошибок
let supabase;
try {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
        realtime: {
            params: {
                eventsPerSecond: 10
            }
        },
        global: {
            headers: { 'X-Client-Info': 'nighttalk-chat' },
        },
        auth: {
            persistSession: true,
            autoRefreshToken: true,
        }
    });
    
    // Проверяем, что объект создан корректно
    if (!supabase || !supabase.from) {
        throw new Error('Supabase клиент не был правильно инициализирован');
    }
    
    console.log('Supabase клиент успешно инициализирован');
} catch (error) {
    console.error('Критическая ошибка при инициализации Supabase:', error);
    // Показываем пользователю уведомление о проблеме
    window.addEventListener('load', () => {
        alert('Произошла ошибка при инициализации приложения. Пожалуйста, обновите страницу и попробуйте снова.');
    });
}

// Включаем дополнительное логирование
let DEBUG_MODE = true;

function logDebug(...args) {
    if (DEBUG_MODE) {
        console.log('[DEBUG]', ...args);
    }
}

// Проверяем, что Supabase правильно настроен
logDebug('Supabase объект:', supabase);
logDebug('Supabase realtime клиент:', supabase.realtime);

// DOM элементы
const loginScreen = document.getElementById('login-screen');
const chatScreen = document.getElementById('chat-screen');
const enterBtn = document.getElementById('enter-btn');
const loadingIndicator = document.getElementById('loading');
const usernameDisplay = document.getElementById('username');
const messagesContainer = document.getElementById('messages-container');
const messageInput = document.getElementById('message-input');
const sendMessageBtn = document.getElementById('send-message');
const userAvatar = document.getElementById('user-avatar');
const onlineCountDisplay = document.getElementById('online-count');
const themeToggleBtn = document.getElementById('theme-toggle');
const connectionStatus = document.getElementById('connection-status');
const connectionNotification = document.getElementById('connection-notification');
const connectionMessage = document.getElementById('connection-message');
const chatList = document.getElementById('chat-list');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search');
const sidebarToggleBtn = document.getElementById('sidebar-toggle');
const chatSidebar = document.querySelector('.chat-sidebar');
const newChatBtn = document.getElementById('new-chat-btn');
const userSearchModal = document.getElementById('user-search-modal');
const userSearchInput = document.getElementById('user-search-input');
const userSearchResults = document.getElementById('user-search-results');
const currentChatName = document.getElementById('current-chat-name');
const currentChatStatus = document.getElementById('current-chat-status');
const currentChatIcon = document.getElementById('current-chat-icon');
const currentChatImg = document.getElementById('current-chat-img');
const closeModalBtns = document.querySelectorAll('.close-modal');

// Состояние приложения
let currentUser = null;
let onlineUsers = 0;
let channelSubscription = null;
let oldestMessageTimestamp = null; // Для пагинации
let isLoadingMoreMessages = false; // Флаг загрузки
let hasMoreMessages = true; // Флаг наличия старых сообщений
let activeChatId = 'global'; // По умолчанию открыт глобальный чат
let userChats = []; // Список чатов пользователя
let chatMessages = {}; // Сообщения по ID чата
let unreadMessages = {}; // Счетчики непрочитанных сообщений
let searchTimeout = null; // Для отложенного поиска
let chatSubscriptions = {}; // Подписки на каналы чатов

// Коллекция предустановленных аватаров
const AVATARS = [
    'https://cdn-icons-png.flaticon.com/512/3022/3022561.png', // Бизнесмен
    'https://cdn-icons-png.flaticon.com/512/3022/3022554.png', // Программист
    'https://cdn-icons-png.flaticon.com/512/3022/3022580.png', // Художник
    'https://cdn-icons-png.flaticon.com/512/3022/3022595.png', // Фермер
    'https://cdn-icons-png.flaticon.com/512/3022/3022549.png', // Музыкант
    'https://cdn-icons-png.flaticon.com/512/3022/3022563.png', // Доктор
    'https://cdn-icons-png.flaticon.com/512/3022/3022574.png', // Спортсмен
    'https://cdn-icons-png.flaticon.com/512/3022/3022588.png', // Повар
    'https://cdn-icons-png.flaticon.com/512/3022/3022600.png', // Студент
    'https://cdn-icons-png.flaticon.com/512/3022/3022608.png'  // Пилот
];

// Выбор аватара на основе userId
function getAvatarForUser(userId) {
    const avatarIndex = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % AVATARS.length;
    return AVATARS[avatarIndex];
}

// РАЗДЕЛ 1: АВТОРИЗАЦИЯ ПОЛЬЗОВАТЕЛЯ

// Генерация уникального ID на основе случайных данных и временной метки
async function generateUniqueId() {
    try {
        // В GitHub Pages API может не работать, поэтому добавляем проверку
        let ipInfo = null;
        if (!isGitHubPages) {
            try {
                const response = await fetch('https://api.ipify.org?format=json');
                if (response.ok) {
                    ipInfo = await response.json();
                }
            } catch (ipError) {
                console.warn('Не удалось получить IP:', ipError);
            }
        }

        // Создаем комбинированную строку для хеширования
        const timestamp = Date.now().toString();
        const randomStr = Math.random().toString(36).substring(2, 10);
        const randomStr2 = crypto.getRandomValues(new Uint32Array(4))
            .join('-');
        
        let combinedString = `${timestamp}-${randomStr}-${randomStr2}`;
        
        // Добавляем IP если доступен
        if (ipInfo && ipInfo.ip) {
            combinedString = `${ipInfo.ip}-${combinedString}`;
        }
        
        // Добавляем информацию о браузере и экране для большей уникальности
        const browserInfo = `${navigator.userAgent}-${screen.width}x${screen.height}`;
        combinedString = `${combinedString}-${browserInfo}`;
        
        // Хешируем результат
        const hash = await hashString(combinedString);
        
        // Возвращаем часть хеша в качестве ID
        return `u${hash.slice(0, 12)}`; // Префикс 'u' для обеспечения допустимого формата ID
    } catch (error) {
        console.error('Ошибка при генерации уникального ID:', error);
        // Запасной вариант, максимально надежный
        const timestamp = Date.now().toString();
        const random = Math.random().toString(36).substring(2, 8);
        const random2 = Math.random().toString(36).substring(2, 8);
        return `u${timestamp.slice(-6)}${random}${random2}`;
    }
}

// Улучшенная функция хеширования строки
async function hashString(str) {
    try {
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
        console.error('Ошибка при хешировании строки:', error);
        // Запасной вариант, если crypto API недоступен
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(16);
    }
}

// Генерация уникального имени пользователя
function generateUsername(userId) {
    const prefixes = ["Ночной", "Тайный", "Космо", "Звёздный", "Мистик", "Фантом", "Призрак", "Странник", "Искатель", "Путник"];
    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const number = userId.slice(0, 4).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 1000;
    return `${randomPrefix}${number}`;
}

// Сброс состояния пользователя
function resetUserState() {
    try {
        localStorage.removeItem('nighttalk_user');
        currentUser = null;
        
        // Просто перезагружаем страницу вместо показа alert
        if (connectionNotification) {
            connectionMessage.textContent = 'Данные сброшены. Пожалуйста, попробуйте снова.';
            connectionNotification.classList.remove('hidden');
            
            // Перезагружаем через небольшую задержку, чтобы пользователь увидел сообщение
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } else {
            window.location.reload();
        }
    } catch (error) {
        console.error("Ошибка при сбросе данных пользователя:", error);
        // В случае ошибки все равно пытаемся перезагрузить страницу
        window.location.reload();
    }
}

// Функция для проверки и восстановления соединения с Supabase
async function checkSupabaseConnection() {
    if (!supabase) {
        console.error("Клиент Supabase не инициализирован");
        return false;
    }

    try {
        // Сначала проверяем простой запрос к базе данных
        const { error } = await supabase
            .from('users')
            .select('count', { count: 'exact', head: true })
            .limit(1);
        
        if (error) {
            console.error("Ошибка соединения с Supabase:", error);
            return false;
        }
        
        // Проверяем состояние подписки на реальное время
        if (supabase.realtime && supabase.realtime.listChannels) {
            const channels = supabase.realtime.listChannels();
            console.log("Текущие каналы:", channels);
        }
        
        return true;
    } catch (error) {
        console.error("Произошла ошибка при проверке соединения:", error);
        return false;
    }
}

// Функция для повторных попыток подключения с задержкой
async function retryWithBackoff(fn, retries = 3) {
    for (let i = 0; i <= retries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === retries) {
                throw error; // Исчерпаны все попытки
            }
            const delay = RETRY_DELAYS[i] || 5000;
            console.log(`Попытка ${i+1} не удалась. Повтор через ${delay}мс...`);
            await new Promise(r => setTimeout(r, delay));
        }
    }
}

// Инициализация пользователя - вход в чат
async function initUser() {
    try {
        // Показываем индикатор загрузки
        loadingIndicator.classList.remove('hidden');
        enterBtn.disabled = true;
        
        // Сначала проверяем соединение с Supabase
        if (isGitHubPages) {
            console.log("Запуск на GitHub Pages, проверка соединения...");
            const isConnected = await retryWithBackoff(checkSupabaseConnection);
            if (!isConnected) {
                throw new Error("Не удалось установить соединение с сервером после нескольких попыток. Пожалуйста, обновите страницу.");
            }
        }
        
        // Проверяем, существует ли пользователь в локальном хранилище
        const storedUser = localStorage.getItem('nighttalk_user');
        
        if (storedUser) {
            try {
                currentUser = JSON.parse(storedUser);
                console.log("Пользователь загружен из хранилища:", currentUser);
                
                if (!currentUser.id) {
                    throw new Error('Некорректные данные пользователя');
                }
                
                // Проверяем существование пользователя в базе данных
                const { data: existingUser, error: userCheckError } = await supabase
                    .from('users')
                    .select('id')
                    .eq('id', currentUser.id)
                    .single();
                
                if (userCheckError || !existingUser) {
                    console.warn("Пользователь не найден в базе данных, создаем заново");
                    throw new Error('Пользователь не найден в базе данных');
                }
                
                // Устанавливаем аватар из коллекции
                currentUser.avatar_url = getAvatarForUser(currentUser.id);
                localStorage.setItem('nighttalk_user', JSON.stringify(currentUser));
                
                // Обновляем аватар в базе данных
                await supabase
                    .from('users')
                    .update({ 
                        avatar_url: currentUser.avatar_url,
                        last_seen: new Date().toISOString()
                    })
                    .eq('id', currentUser.id);
                
            } catch (parseError) {
                console.error('Ошибка данных пользователя:', parseError);
                localStorage.removeItem('nighttalk_user'); // Очищаем неверные данные
                currentUser = null;
                // Продолжаем выполнение для создания нового пользователя
            }
        }
        
        // Если пользователь не найден или возникла ошибка, создаем нового
        if (!currentUser) {
            // Создаем нового пользователя
            let maxRetries = 3;
            let created = false;
            
            while (!created && maxRetries > 0) {
                try {
                    const userId = await generateUniqueId();
                    const username = generateUsername(userId);
                    const avatarUrl = getAvatarForUser(userId);
                    
                    console.log("Создаем нового пользователя:", username);
                    
                    // Создаем запись пользователя в базе данных с более безопасной обработкой
                    const { data, error } = await supabase
                        .from('users')
                        .insert({ 
                            id: userId,
                            username: username,
                            avatar_url: avatarUrl,
                            last_seen: new Date().toISOString()
                        })
                        .select();
                        
                    if (error) {
                        // Проверяем, является ли ошибка конфликтом ключей
                        const errorMessage = error.message ? error.message.toLowerCase() : '';
                        if (error.code === '23505' || 
                            errorMessage.includes('duplicate key') || 
                            errorMessage.includes('violates unique constraint') ||
                            errorMessage.includes('users_pkey')) {
                            console.warn("Конфликт ID пользователя, генерирую новый ID...");
                            maxRetries--;
                            
                            // Добавляем небольшую задержку перед следующей попыткой
                            await new Promise(r => setTimeout(r, 500));
                            continue;
                        } else {
                            console.error("Ошибка при создании пользователя:", error);
                            throw error;
                        }
                    }
                    
                    currentUser = {
                        id: userId,
                        username: username,
                        avatar_url: avatarUrl
                    };
                    
                    // Сохраняем в локальное хранилище
                    localStorage.setItem('nighttalk_user', JSON.stringify(currentUser));
                    
                    created = true;
                } catch (innerError) {
                    console.error("Ошибка в цикле создания пользователя:", innerError);
                    maxRetries--;
                    
                    // Добавляем задержку между попытками
                    await new Promise(r => setTimeout(r, 1000));
                    
                    if (maxRetries <= 0) {
                        throw new Error("Не удалось создать пользователя после нескольких попыток: " + innerError.message);
                    }
                }
            }
            
            if (!created) {
                throw new Error("Не удалось создать уникального пользователя после нескольких попыток");
            }
        }
        
        // Обновляем last_seen
        await supabase
            .from('users')
            .update({ last_seen: new Date().toISOString() })
            .eq('id', currentUser.id);
        
        // Обновляем интерфейс пользователя
        usernameDisplay.textContent = currentUser.username;
        userAvatar.src = currentUser.avatar_url;
        
        // Проверка статуса реального времени
        await checkRealtimeStatus();
        
        // ВАЖНО: Сначала настраиваем подписку, потом загружаем сообщения
        startRealtimeSubscription();
        
        // Загружаем существующие сообщения
        await loadMessages();
        
        // Обновляем счетчик онлайн пользователей
        updateOnlineUsers();
        
        // Показываем экран чата
        loginScreen.classList.remove('active');
        chatScreen.classList.add('active');
        
    } catch (error) {
        console.error('Ошибка при входе в чат:', error);
        connectionMessage.textContent = 'Не удалось войти в чат: ' + error.message;
        connectionNotification.classList.remove('hidden');
        
        // Сбрасываем локальное хранилище при серьезных ошибках
        const errorMessage = error.message ? error.message.toLowerCase() : '';
        if (errorMessage.includes("duplicate key") || 
            errorMessage.includes("violates unique constraint") ||
            errorMessage.includes("users_pkey")) {
            console.warn("Обнаружен конфликт ID, сбрасываю данные пользователя...");
            resetUserState();
        }
    } finally {
        loadingIndicator.classList.add('hidden');
        enterBtn.disabled = false;
    }
}

// РАЗДЕЛ 2: РАБОТА С СООБЩЕНИЯМИ

// Загрузка сообщений из базы данных
async function loadMessages() {
    try {
        console.log("Загрузка существующих сообщений...");
        
        // Очищаем контейнер сообщений
        messagesContainer.innerHTML = '';
        
        // Сбрасываем состояние пагинации
        oldestMessageTimestamp = null;
        hasMoreMessages = true;
        
        // Загружаем последние 50 сообщений
        const { data, error } = await supabase
            .from('messages')
            .select(`
                id,
                content,
                image_url,
                created_at,
                user_id,
                users (
                    id,
                    username,
                    avatar_url
                )
            `)
            .order('created_at', { ascending: false }) // Сначала новые
            .limit(50);
            
        if (error) {
            throw error;
        }
        
        // Если есть сообщения
        if (data && data.length > 0) {
            // Сохраняем timestamp самого старого сообщения
            oldestMessageTimestamp = data[data.length - 1].created_at;
            
            // Переворачиваем массив, чтобы отобразить сначала старые сообщения
            const reversedData = data.reverse();
            
            // Добавляем сообщения в DOM
            reversedData.forEach(message => {
                renderMessage(message, 'global');
            });
            
            // Проверяем, есть ли ещё сообщения
            hasMoreMessages = data.length === 50;
        } else {
            console.log("Нет сообщений для отображения");
            messagesContainer.innerHTML = '<div class="no-messages">Станьте первым, кто напишет сообщение!</div>';
            hasMoreMessages = false;
        }
        
        // Если есть старые сообщения, добавляем кнопку загрузки
        updateLoadMoreButton();
        
        // Прокручиваем к последнему сообщению
        scrollToBottom();
        
    } catch (error) {
        console.error('Ошибка при загрузке сообщений:', error);
        showConnectionNotification('Не удалось загрузить сообщения');
        messagesContainer.innerHTML = '<div class="error-message">Ошибка при загрузке сообщений</div>';
    }
}

// Функция для загрузки старых сообщений
async function loadOlderMessages(chatId) {
    if (isLoadingMoreMessages || !hasMoreMessages || !oldestMessageTimestamp) return;
    
    try {
        isLoadingMoreMessages = true;
        
        // Показываем индикатор загрузки
        const loadingIndicator = document.getElementById('load-more-indicator');
        if (loadingIndicator) {
            loadingIndicator.classList.remove('hidden');
        }
        
        logDebug("Загрузка старых сообщений до", oldestMessageTimestamp);
        
        const { data, error } = await supabase
            .from('messages')
            .select(`
                id,
                content,
                image_url,
                created_at,
                user_id,
                users (
                    id,
                    username,
                    avatar_url
                )
            `)
            .lt('created_at', oldestMessageTimestamp) // Сообщения, созданные ранее самого старого
            .order('created_at', { ascending: false })
            .limit(50);
            
        if (error) {
            throw error;
        }
        
        // Сохраняем текущую позицию прокрутки и высоту
        const scrollPosition = messagesContainer.scrollTop;
        const oldHeight = messagesContainer.scrollHeight;
        
        // Если есть сообщения
        if (data && data.length > 0) {
            // Сохраняем timestamp самого старого сообщения
            oldestMessageTimestamp = data[data.length - 1].created_at;
            
            // Создаем временный контейнер
            const tempContainer = document.createElement('div');
            
            // Переворачиваем массив и добавляем сообщения
            const reversedData = data.reverse();
            reversedData.forEach(message => {
                // Создаем сообщение в temp контейнере
                renderMessageToContainer(message, tempContainer);
            });
            
            // Вставляем все новые сообщения в начало контейнера
            messagesContainer.insertBefore(tempContainer, messagesContainer.firstChild);
            
            // Перемещаем все дочерние элементы из временного контейнера напрямую в основной
            while (tempContainer.firstChild) {
                messagesContainer.insertBefore(tempContainer.firstChild, tempContainer);
            }
            
            // Удаляем временный контейнер
            messagesContainer.removeChild(tempContainer);
            
            // Проверяем, есть ли ещё сообщения
            hasMoreMessages = data.length === 50;
            
            // Восстанавливаем позицию прокрутки с учетом новой высоты
            const newHeight = messagesContainer.scrollHeight;
            messagesContainer.scrollTop = scrollPosition + (newHeight - oldHeight);
            
            logDebug(`Загружено ${data.length} старых сообщений`);
        } else {
            hasMoreMessages = false;
            logDebug("Больше старых сообщений нет");
        }
        
        // Обновляем кнопку загрузки
        updateLoadMoreButton();
        
    } catch (error) {
        console.error("Ошибка при загрузке старых сообщений:", error);
        
        // Показываем сообщение об ошибке над чатом
        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.textContent = 'Не удалось загрузить старые сообщения';
        errorElement.style.margin = '10px 0';
        messagesContainer.insertBefore(errorElement, messagesContainer.firstChild);
        
        // Удаляем сообщение об ошибке через 5 секунд
        setTimeout(() => {
            if (errorElement.parentNode) {
                errorElement.parentNode.removeChild(errorElement);
            }
        }, 5000);
    } finally {
        isLoadingMoreMessages = false;
        
        // Скрываем индикатор загрузки
        const loadingIndicator = document.getElementById('load-more-indicator');
        if (loadingIndicator) {
            loadingIndicator.classList.add('hidden');
        }
    }
}

// Функция для обновления кнопки "Загрузить еще"
function updateLoadMoreButton() {
    // Проверяем наличие существующей кнопки
    let loadMoreContainer = document.getElementById('load-more-container');
    
    // Удаляем контейнер, если он существует
    if (loadMoreContainer) {
        messagesContainer.removeChild(loadMoreContainer);
    }
    
    // Если есть еще сообщения для загрузки
    if (hasMoreMessages) {
        // Создаем контейнер кнопки
        loadMoreContainer = document.createElement('div');
        loadMoreContainer.id = 'load-more-container';
        loadMoreContainer.className = 'load-more-container';
        
        loadMoreContainer.innerHTML = `
            <button id="load-more-btn" class="load-more-btn">
                <i class="fas fa-history"></i> Загрузить предыдущие сообщения
            </button>
            <div id="load-more-indicator" class="spinner hidden"></div>
        `;
        
        // Добавляем контейнер в начало списка сообщений
        messagesContainer.insertBefore(loadMoreContainer, messagesContainer.firstChild);
        
        // Добавляем обработчик клика
        document.getElementById('load-more-btn').addEventListener('click', loadOlderMessages);
    }
}

// Функция для рендеринга сообщения в указанный контейнер
function renderMessageToContainer(message, container) {
    // Проверка на корректность данных
    if (!message || !message.users) {
        console.error("Некорректные данные сообщения");
        return;
    }
    
    // Проверяем, является ли это собственным сообщением
    const isOwnMessage = message.user_id === currentUser.id;
    
    // Создаем элемент сообщения
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    
    // Добавляем классы в зависимости от типа сообщения
    if (isOwnMessage) {
        messageElement.classList.add('own');
    }
    
    messageElement.id = 'msg-' + message.id;
    
    // Определяем URL аватара
    const avatarUrl = isOwnMessage 
        ? currentUser.avatar_url 
        : (message.users.avatar_url || getAvatarForUser(message.users.id));
    
    // Форматируем время
    const messageTime = new Date(message.created_at);
    const formattedTime = messageTime.toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    // Используем иконку пользователя для аватара
    const userInitial = message.users.username.substring(0,1).toUpperCase();
    const avatarContent = avatarUrl ? 
        `<img src="${avatarUrl}" alt="${message.users.username}" loading="lazy" onerror="this.onerror=null; this.src='https://via.placeholder.com/32?text=${userInitial}'" />` : 
        `<i class="fas fa-user"></i>`;
    
    // Создаем HTML сообщения с корректным аватаром
    messageElement.innerHTML = `
        <div class="message-avatar">
            ${avatarContent}
        </div>
        <div class="message-content">
            <div class="message-header">
                <span class="message-name">${message.users.username}</span>
                <span class="message-time">${formattedTime}</span>
            </div>
            <div class="message-text">${escapeHtml(message.content)}</div>
        </div>
    `;
    
    // Добавляем в указанный контейнер
    container.appendChild(messageElement);
}

// Обновляем функцию renderMessage для использования общей логики
function renderMessage(message, chatId) {
    // Проверка наличия chatId и установка значения по умолчанию, если оно не указано
    if (!chatId) {
        chatId = activeChatId || 'global';
        console.log('Warning: chatId не указан, используем значение по умолчанию:', chatId);
    }
    
    const messageElement = document.createElement('div');
    const isOwnMessage = message.user_id === currentUser.id;
    
    messageElement.className = `message ${isOwnMessage ? 'own' : ''}`;
    messageElement.dataset.id = message.id;
    
    const username = message.users?.username || 'Unknown User';
    const avatarUrl = message.users?.avatar_url || getAvatarForUser(message.user_id);
    const formattedTime = formatMessageTime(message.created_at);
    
    // Используем иконку пользователя для аватара
    const userInitial = username.substring(0,1).toUpperCase();
    const avatarContent = avatarUrl ? 
        `<img src="${avatarUrl}" alt="${username}" loading="lazy" onerror="this.onerror=null; this.src='https://via.placeholder.com/32?text=${userInitial}'" />` : 
        `<i class="fas fa-user"></i>`;
    
    // Создаем кликабельное имя пользователя для всех чатов, кроме личных и не собственных сообщений
    const isGlobalChat = chatId === 'global';
    const nameElement = isGlobalChat && !isOwnMessage ? 
        `<span class="message-name clickable" data-user-id="${message.user_id}">${escapeHtml(username)}</span>` : 
        `<span class="message-name">${escapeHtml(username)}</span>`;
    
    messageElement.innerHTML = `
        <div class="message-avatar">
            ${avatarContent}
        </div>
        <div class="message-content">
            <div class="message-header">
                ${nameElement}
                <span class="message-time">${formattedTime}</span>
            </div>
            <div class="message-text">${formatMessageContent(message.content)}</div>
        </div>
    `;
    
    // Добавляем обработчик для увеличения изображений
    const imageElement = messageElement.querySelector('.message-image');
    if (imageElement) {
        imageElement.addEventListener('click', function() {
            showImageModal(message.image_url);
        });
    }
    
    // Добавляем обработчик клика по имени пользователя
    const clickableUsername = messageElement.querySelector('.message-name.clickable');
    if (clickableUsername) {
        clickableUsername.addEventListener('click', async function() {
            const userId = this.dataset.userId;
            if (userId && userId !== currentUser.id) {
                try {
                    // Проверяем, существует ли пользователь
                    const { data, error } = await supabase
                        .from('users')
                        .select('id')
                        .eq('id', userId)
                        .single();
                    
                    if (error || !data) {
                        throw new Error('Пользователь не найден');
                    }
                    
                    // Если пользователь существует, создаем чат
                    createPersonalChat(userId);
                } catch (error) {
                    console.error('Ошибка при проверке пользователя:', error);
                    showConnectionNotification('Пользователь не найден');
                }
            }
        });
    }
    
    messagesContainer.appendChild(messageElement);
}

// Обновление индикатора соединения
function updateConnectionStatus(isConnected) {
    if (isConnected) {
        connectionStatus.innerHTML = '<i class="fas fa-signal"></i>';
        connectionStatus.classList.remove('offline');
        connectionNotification.classList.add('hidden');
    } else {
        connectionStatus.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
        connectionStatus.classList.add('offline');
        connectionMessage.textContent = 'Проблема с подключением к серверу';
        connectionNotification.classList.remove('hidden');
        
        // Скрываем уведомление через 5 секунд
        setTimeout(() => {
            connectionNotification.classList.add('hidden');
        }, 5000);
    }
}

// Запуск подписки на обновления в реальном времени
async function startRealtimeSubscription() {
    try {
        console.log('Запуск общей подписки на обновления...');
        
        // Проверяем доступность Supabase Realtime
        const { error } = await supabase.from('users').select('id').limit(1);
        if (error) {
            throw new Error('Не удалось подключиться к базе данных');
        }
        
        // Инициируем подписки на все чаты
        await subscribeToUserChats();
        
        // Устанавливаем статус онлайн для текущего пользователя
        await supabase
            .from('users')
            .update({ last_seen: new Date().toISOString() })
            .eq('id', currentUser.id);
        
        // Обновляем статус соединения
        connectionStatus.classList.remove('offline');
        connectionStatus.classList.add('online');
        connectionStatus.innerHTML = '<i class="fas fa-signal"></i> <span>онлайн</span>';
        
        // Загружаем историю активного чата
        if (activeChatId) {
            await loadChatMessages(activeChatId);
        } else {
            await loadChatMessages('global');
        }
        
        console.log('Подписка на обновления успешно настроена');
    } catch (error) {
        console.error('Ошибка при подписке на обновления:', error);
        showConnectionNotification('Проблема с подключением к серверу');
        
        // Обновляем статус соединения
        connectionStatus.classList.remove('online');
        connectionStatus.classList.add('offline');
        connectionStatus.innerHTML = '<i class="fas fa-exclamation-circle"></i> <span>офлайн</span>';
    }
}

// Подписка на чат для получения обновлений в реальном времени
async function subscribeToChat(chatId) {
    console.log(`Подписка на чат: ${chatId}`);
    
    try {
        // Отписываемся от предыдущей подписки на этот чат, если она существует
        if (chatSubscriptions[chatId]) {
            chatSubscriptions[chatId].unsubscribe();
            delete chatSubscriptions[chatId];
            console.log(`Отписка от предыдущей подписки на чат ${chatId}`);
        }
        
        // Настраиваем новую подписку в зависимости от типа чата
        if (chatId === 'global') {
            // Подписка на глобальный чат
            console.log('Создание подписки на глобальный чат');
            
            const subscription = supabase
                .channel('public:messages')
                .on('postgres_changes', 
                    { 
                        event: 'INSERT', 
                        schema: 'public', 
                        table: 'messages' 
                    }, 
                    (payload) => {
                        console.log('Новое сообщение в глобальном чате:', payload);
                        handleGlobalMessage(payload);
                    }
                )
                .subscribe((status) => {
                    console.log(`Статус подписки на глобальный чат: ${status}`);
                });
                
            // Сохраняем подписку
            chatSubscriptions[chatId] = subscription;
        } else {
            // Подписка на приватный чат
            console.log(`Создание подписки на приватный чат ${chatId}`);
            
            const subscription = supabase
                .channel(`private:chat:${chatId}`)
                .on('postgres_changes', 
                    { 
                        event: 'INSERT', 
                        schema: 'public', 
                        table: 'chat_messages',
                        filter: `chat_id=eq.${chatId}`
                    }, 
                    (payload) => {
                        console.log(`Новое сообщение в приватном чате ${chatId}:`, payload);
                        handlePrivateMessage(payload);
                    }
                )
                .subscribe((status) => {
                    console.log(`Статус подписки на приватный чат ${chatId}: ${status}`);
                });
                
            // Сохраняем подписку
            chatSubscriptions[chatId] = subscription;
        }
        
        console.log(`Подписка на чат ${chatId} успешно создана`);
    } catch (error) {
        console.error(`Ошибка при подписке на чат ${chatId}:`, error);
        showConnectionNotification(`Не удалось подписаться на обновления чата: ${error.message || 'Проверьте подключение'}`);
    }
}

// Обработка входящего глобального сообщения
async function handleGlobalMessage(payload) {
    console.log('Входящее глобальное сообщение:', payload);
    
    try {
        const message = payload.new;
        
        // Пропускаем временные сообщения, которые уже отображены
        if (message.temp_id) {
            const tempElement = document.querySelector(`.message[data-id="temp-${message.temp_id}"]`);
            if (tempElement) {
                // Удаляем временное сообщение и заменяем постоянным
                tempElement.remove();
            }
        }
        
        // Проверяем, активен ли глобальный чат
        if (activeChatId === 'global') {
            // Получаем информацию о пользователе
            const { data: user, error: userError } = await supabase
                .from('users')
                .select('username, avatar_url')
                .eq('id', message.user_id)
                .single();
                
            if (userError) {
                console.error('Ошибка получения данных пользователя:', userError);
                return;
            }
            
            // Добавляем информацию о пользователе к сообщению
            message.users = user;
            
            // Отображаем сообщение
            renderMessage(message, chatId);
            
            // Прокручиваем к последнему сообщению если мы близко к концу
            if (isNearBottom()) {
                scrollToBottom();
            }
        } else {
            // Увеличиваем счетчик непрочитанных сообщений
            incrementUnreadCount(chatId);
            
            // Воспроизводим звук уведомления
            playNotificationSound();
        }
        
        // Обновляем информацию о чате локально
        const chatIndex = userChats.findIndex(c => c.id === chatId);
        if (chatIndex !== -1) {
            // Получаем сокращенный текст сообщения для предпросмотра (до 30 символов)
            const previewText = message.content.length > 30
                ? message.content.substring(0, 30) + '...'
                : message.content;
                
            userChats[chatIndex].lastMessage = previewText;
            userChats[chatIndex].lastActivity = new Date(message.created_at);
            
            // Сортируем чаты по времени последней активности
            userChats.sort((a, b) => {
                return new Date(b.lastActivity) - new Date(a.lastActivity);
            });
            
            // Обновляем отображение списка чатов
            renderChatList();
        }
    } catch (error) {
        console.error('Ошибка при обработке приватного сообщения:', error);
    }
}

// Обработка входящего приватного сообщения
async function handlePrivateMessage(payload) {
    console.log('Входящее приватное сообщение:', payload);
    
    try {
        const message = payload.new;
        const chatId = message.chat_id;
        
        // Пропускаем временные сообщения, которые уже отображены
        if (message.temp_id) {
            const tempElement = document.querySelector(`.message[data-id="temp-${message.temp_id}"]`);
            if (tempElement) {
                // Удаляем временное сообщение и заменяем постоянным
                tempElement.remove();
            }
        }
        
        // Проверяем, это сообщение в текущем активном чате
        if (chatId === activeChatId) {
            // Получаем информацию о пользователе
            const { data: user, error: userError } = await supabase
                .from('users')
                .select('username, avatar_url')
                .eq('id', message.user_id)
                .single();
                
            if (userError) {
                console.error('Ошибка получения данных пользователя:', userError);
                return;
            }
            
            // Добавляем информацию о пользователе к сообщению
            message.users = user;
            
            // Отображаем сообщение
            renderMessage(message, chatId);
            
            // Прокручиваем к последнему сообщению если мы близко к концу
            if (isNearBottom()) {
                scrollToBottom();
            }
        } else {
            // Увеличиваем счетчик непрочитанных сообщений
            incrementUnreadCount(chatId);
            
            // Воспроизводим звук уведомления
            playNotificationSound();
        }
        
        // Обновляем информацию о чате локально
        const chatIndex = userChats.findIndex(c => c.id === chatId);
        if (chatIndex !== -1) {
            // Получаем сокращенный текст сообщения для предпросмотра (до 30 символов)
            const previewText = message.content.length > 30
                ? message.content.substring(0, 30) + '...'
                : message.content;
                
            userChats[chatIndex].lastMessage = previewText;
            userChats[chatIndex].lastActivity = new Date(message.created_at);
            
            // Сортируем чаты по времени последней активности
            userChats.sort((a, b) => {
                return new Date(b.lastActivity) - new Date(a.lastActivity);
            });
            
            // Обновляем отображение списка чатов
            renderChatList();
        }
    } catch (error) {
        console.error('Ошибка при обработке приватного сообщения:', error);
    }
}

// Обработчик новых сообщений
async function handleNewMessage(payload, chatId) {
    console.log('Обработка нового сообщения:', payload, 'для чата:', chatId);
    
    // Проверяем, что все данные существуют
    if (!payload || !payload.payload) {
        console.error('Некорректные данные сообщения:', payload);
        return;
    }
    
    // Проверяем, соответствует ли сообщение текущему чату
    if (chatId !== activeChatId) {
        // Увеличиваем счетчик непрочитанных сообщений
        unreadMessages[chatId] = (unreadMessages[chatId] || 0) + 1;
        
        // Обновляем бейдж у чата
        const chatElement = document.querySelector(`.chat-item[data-chat-id="${chatId}"]`);
        if (chatElement) {
            const badgeElement = chatElement.querySelector('.chat-badge');
            if (badgeElement) {
                badgeElement.textContent = unreadMessages[chatId];
                badgeElement.classList.remove('hidden');
            }
        }
        
        // Находим чат в списке и обновляем последнее сообщение
        const chatIndex = userChats.findIndex(c => c.id === chatId);
        if (chatIndex !== -1) {
            userChats[chatIndex].lastMessage = payload.payload.content || 'Новое сообщение';
            userChats[chatIndex].lastActivity = new Date();
            
            // Сортируем чаты
            userChats.sort((a, b) => {
                if (a.pinned && !b.pinned) return -1;
                if (!a.pinned && b.pinned) return 1;
                return b.lastActivity - a.lastActivity;
            });
            
            // Обновляем список чатов
            renderChatList();
        }
        
        // Воспроизводим звуковое уведомление
        playNotificationSound();
        
        return;
    }
    
    // Получаем данные о сообщении из нагрузки
    const messageData = payload.payload;
    
    // Если сообщение от текущего пользователя и это временное сообщение, найдем и обновим его
    if (messageData.user_id === currentUser.id && messageData.temp_id) {
        // Находим временное сообщение и обновляем его
        const tempMessage = document.querySelector(`.message[data-id="temp-${messageData.temp_id}"]`);
        if (tempMessage) {
            tempMessage.classList.remove('temp');
            tempMessage.dataset.id = messageData.id;
            const timeElement = tempMessage.querySelector('.message-time');
            if (timeElement) {
                timeElement.textContent = formatMessageTime(messageData.created_at);
            }
            return; // Выходим, так как это наше сообщение и мы его уже отобразили
        }
    }
    
    // Если это новое сообщение (не временное), добавляем его в чат
    try {
        // Получаем информацию о пользователе, если это не наше сообщение
        let userData;
        if (messageData.user_id !== currentUser.id) {
            const { data, error } = await supabase
                .from('users')
                .select('username, avatar_url')
                .eq('id', messageData.user_id)
                .single();
                
            if (!error) {
                userData = data;
            }
        } else {
            // Если это наше сообщение, используем данные текущего пользователя
            userData = {
                username: currentUser.username,
                avatar_url: currentUser.avatar_url
            };
        }
        
        // Формируем объект сообщения для отображения
        const message = {
            id: messageData.id,
            user_id: messageData.user_id,
            content: messageData.content,
            image_url: messageData.image_url,
            created_at: messageData.created_at || new Date().toISOString(),
            users: userData || {
                username: 'Unknown User',
                avatar_url: getAvatarForUser(messageData.user_id)
            }
        };
        
        // Отображаем сообщение
        renderMessage(message, chatId);
        
        // Воспроизводим звуковое уведомление, если это сообщение от другого пользователя
        if (messageData.user_id !== currentUser.id) {
            playNotificationSound();
        }
        
        // Прокручиваем к последнему сообщению
        scrollToBottom();
        
        // Добавляем сообщение в кэш чата
        if (chatMessages[chatId]) {
            chatMessages[chatId].push(message);
        } else {
            chatMessages[chatId] = [message];
        }
        
    } catch (error) {
        console.error('Ошибка при обработке нового сообщения:', error);
    }
}

// Функция для проигрывания звука уведомления (опционально)
function playNotificationSound() {
    try {
        const notificationSound = new Audio('sounds/notification.mp3');
        notificationSound.volume = 0.5;
        notificationSound.play().catch(err => {
            console.warn('Не удалось воспроизвести звук уведомления:', err);
        });
    } catch (err) {
        console.warn('Ошибка при создании аудио объекта:', err);
    }
}

// РАЗДЕЛ 3: ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ

// Обновление счетчика онлайн пользователей
async function updateOnlineUsers() {
    try {
        // Получаем пользователей, которые были онлайн в последние 10 минут
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
        
        const { data, error, count } = await supabase
            .from('users')
            .select('id', { count: 'exact' })
            .gt('last_seen', tenMinutesAgo);
            
        if (!error) {
            onlineUsers = count;
            onlineCountDisplay.textContent = `${onlineUsers} онлайн`;
        }
    } catch (error) {
        console.error('Ошибка при получении списка онлайн пользователей:', error);
    }
}

// Безопасное отображение HTML
function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Прокрутка к нижней части чата
function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Переключение темы (заглушка)
function toggleTheme() {
    alert('Функция переключения на светлую тему в разработке!');
}

// РАЗДЕЛ 4: СЛУШАТЕЛИ СОБЫТИЙ И ИНИЦИАЛИЗАЦИЯ

// Кнопка входа в чат
enterBtn.addEventListener('click', initUser);

// Отправка сообщения по клику на кнопку
sendMessageBtn.addEventListener('click', sendMessage);

// Отправка сообщения по нажатию Enter
messageInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        sendMessage();
    }
});

// Кнопка переключения темы
themeToggleBtn.addEventListener('click', toggleTheme);

// Обновление статуса пользователя каждые 5 минут
setInterval(async () => {
    if (currentUser && currentUser.id) {
        try {
            await supabase
                .from('users')
                .update({ last_seen: new Date().toISOString() })
                .eq('id', currentUser.id);
            
            updateOnlineUsers();
        } catch (error) {
            console.error('Ошибка при обновлении статуса:', error);
        }
    }
}, 5 * 60 * 1000);

// Дополнительный функционал: сброс данных пользователя по двойному клику на аватар
userAvatar.addEventListener('dblclick', () => {
    if (confirm('Сбросить данные пользователя?')) {
        resetUserState();
    }
});

// Обновляем статус соединения
window.addEventListener('online', function() {
    console.log('Соединение восстановлено. Переподключение к каналу...');
    updateConnectionStatus(true);
    if (currentUser) {
        startRealtimeSubscription();
        updateOnlineUsers();
    }
});

// Обновляем статус соединения при потере соединения
window.addEventListener('offline', function() {
    console.log('Соединение потеряно');
    updateConnectionStatus(false);
});

// Добавление состояния подключения
window.addEventListener('load', () => {
    if (!navigator.onLine) {
        updateConnectionStatus(false);
        alert('Вы находитесь в автономном режиме. Пожалуйста, проверьте подключение к интернету.');
    } else {
        updateConnectionStatus(true);
    }
});

// При инициализации чата проверяем работоспособность канала реального времени
async function checkRealtimeStatus() {
    try {
        logDebug("Проверка статуса подписки на реальное время...");
        
        // Проверяем доступные каналы
        const allChannels = supabase.getChannels();
        logDebug("Текущие каналы:", allChannels);
        
        try {
            const { data, error } = await supabase.rpc('get_realtime_status');
            if (error) {
                console.error("Ошибка при проверке статуса RPC:", error);
                return;
            }
            logDebug("Статус реального времени из БД:", data);
        } catch (error) {
            console.error("Ошибка при вызове RPC функции:", error);
        }
        
        // Дополнительная проверка соединения
        const isConnected = supabase.realtime.isConnected();
        logDebug("Supabase realtime соединение:", isConnected ? "Подключено" : "Отключено");
    } catch (error) {
        console.error("Ошибка при проверке статуса реального времени:", error);
    }
}

// Инициализируем клиент realtime при загрузке страницы
window.addEventListener('load', async () => {
    logDebug("Страница загружена, инициализация Supabase realtime...");
    
    // Настраиваем обработчик для отладки событий realtime
    supabase.realtime.forValidToken(token => {
        logDebug('Realtime token получен:', token && token.slice(0, 10) + '...');
        return token;
    });
    
    // Проверяем онлайн-статус
    if (!navigator.onLine) {
        updateConnectionStatus(false);
        alert('Вы находитесь в автономном режиме. Пожалуйста, проверьте подключение к интернету.');
    } else {
        updateConnectionStatus(true);
    }
});

// Функция для отправки тестового сообщения (для отладки)
async function sendTestMessage() {
    if (!currentUser) {
        console.error("Нельзя отправить тестовое сообщение - пользователь не авторизован");
        return;
    }
    
    try {
        const testMessage = `Тестовое сообщение ${new Date().toLocaleTimeString()}`;
        logDebug("Отправка тестового сообщения:", testMessage);
        
        const { data, error } = await supabase
            .from('messages')
            .insert({
                user_id: currentUser.id,
                content: testMessage
            })
            .select();
        
        if (error) {
            throw error;
        }
        
        logDebug("Тестовое сообщение отправлено успешно:", data);
        
    } catch (error) {
        console.error("Ошибка при отправке тестового сообщения:", error);
    }
}

// Отправка сообщения
async function sendMessage() {
    const content = messageInput.value.trim();
    
    if (!content) return;
    
    // Очищаем поле ввода
    messageInput.value = '';
    
    // Создаем временный ID для сообщения
    const tempId = Date.now().toString();
    
    try {
        console.log(`Отправка сообщения в чат ${activeChatId}...`);
        
        // Создаем временное сообщение для отображения
        const tempMessage = {
            id: `temp-${tempId}`,
            user_id: currentUser.id,
            content: content,
            created_at: new Date().toISOString(),
            users: {
                username: currentUser.username,
                avatar_url: currentUser.avatar_url
            },
            temp_id: tempId
        };
        
        // Отображаем временное сообщение
        renderMessage(tempMessage, activeChatId);
        
        // Прокручиваем к последнему сообщению
        scrollToBottom();
        
        let result;
        
        if (activeChatId === 'global') {
            // Отправляем сообщение в глобальный чат
            result = await supabase
                .from('messages')
                .insert({
                    content: content,
                    user_id: currentUser.id,
                    temp_id: tempId,
                    created_at: new Date().toISOString()
                });
        } else {
            // Проверяем существование чата и права доступа
            const { data: chat, error: chatError } = await supabase
                .from('chats')
                .select('id')
                .eq('id', activeChatId)
                .single();
                
            if (chatError || !chat) {
                throw new Error('Чат не найден');
            }
            
            // Проверяем, является ли пользователь участником чата
            const { data: participant, error: participantError } = await supabase
                .from('chat_participants')
                .select('id')
                .eq('chat_id', activeChatId)
                .eq('user_id', currentUser.id)
                .single();
                
            if (participantError || !participant) {
                throw new Error('Вы не являетесь участником этого чата');
            }
            
            // Отправляем сообщение в приватный чат
            result = await supabase
                .from('chat_messages')
                .insert({
                    chat_id: activeChatId,
                    content: content,
                    user_id: currentUser.id,
                    temp_id: tempId,
                    created_at: new Date().toISOString()
                });
                
            // Обновляем информацию о последнем сообщении в чате
            const { error: updateError } = await supabase
                .from('chats')
                .update({
                    last_message: content,
                    last_activity: new Date().toISOString()
                })
                .eq('id', activeChatId);
                
            if (updateError) {
                console.warn('Ошибка при обновлении информации о чате:', updateError);
            }
            
            // Обновляем информацию о чате локально
            const chatIndex = userChats.findIndex(c => c.id === activeChatId);
            if (chatIndex !== -1) {
                userChats[chatIndex].lastMessage = content;
                userChats[chatIndex].lastActivity = new Date();
                renderChatList();
            }
        }
        
        if (result.error) {
            console.error('Ошибка при отправке сообщения:', result.error);
            throw result.error;
        }
        
        console.log('Сообщение успешно отправлено');
        
    } catch (error) {
        console.error('Ошибка при отправке сообщения:', error);
        showConnectionNotification('Не удалось отправить сообщение: ' + (error.message || 'Проверьте подключение'));
        
        // Удаляем временное сообщение
        const tempElement = document.querySelector(`.message[data-id="temp-${tempId}"]`);
        if (tempElement) {
            tempElement.remove();
        }
    }
}

// Улучшенная функция для настройки мобильных взаимодействий
function setupMobileInteractions() {
    // Фиксация для проблем с виртуальной клавиатурой
    const messageInput = document.getElementById('message-input');
    const sendMessageBtn = document.getElementById('send-message');
    const messagesContainer = document.getElementById('messages-container');
    const chatInput = document.querySelector('.chat-input');
    
    // Фокусировка при касании поля ввода
    messageInput.addEventListener('focus', function() {
        // Небольшая задержка для появления клавиатуры
        setTimeout(() => {
            scrollToBottom();
            // Добавляем класс для активного состояния
            chatInput.classList.add('focus');
        }, 300);
    });
    
    // Потеря фокуса поля ввода
    messageInput.addEventListener('blur', function() {
        // Удаляем класс активного состояния
        chatInput.classList.remove('focus');
    });
    
    // Явно показываем кнопку отправки сообщения на мобильных устройствах
    messageInput.addEventListener('input', function() {
        if (messageInput.value.trim()) {
            sendMessageBtn.classList.add('visible');
        } else {
            sendMessageBtn.classList.remove('visible');
        }
    });
    
    // Делаем все кнопки более отзывчивыми на мобильных устройствах
    document.querySelectorAll('button').forEach(button => {
        // Предотвращаем "двойные нажатия" и задержку на мобильных устройствах
        button.addEventListener('touchstart', function(e) {
            e.preventDefault(); // Предотвращаем эффект зума/прокрутки
            this.classList.add('touch-active');
        }, { passive: false });
        
        button.addEventListener('touchend', function() {
            this.classList.remove('touch-active');
        });
    });
    
    // Особое внимание кнопке отправки сообщения
    sendMessageBtn.addEventListener('touchstart', function(e) {
        e.preventDefault();
        this.classList.add('pressed');
    }, { passive: false });
    
    sendMessageBtn.addEventListener('touchend', function(e) {
        e.preventDefault();
        this.classList.remove('pressed');
        // Имитируем нажатие через setTimeout
        setTimeout(() => {
            sendMessage();
        }, 10);
    }, { passive: false });
    
    // Исправляем проблему с позиционированием на iOS
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
        document.body.classList.add('ios-device');
        
        // Добавляем обработчик изменения размера для iOS
        window.addEventListener('resize', function() {
            // iOS отправляет событие resize при появлении клавиатуры
            // Устанавливаем переменную CSS для корректного расчета высоты
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
            
            // Исправление для iOS: прокрутка к нижней части сообщений
            if (messageInput === document.activeElement) {
                setTimeout(scrollToBottom, 100);
            }
        });
    }
    
    // Оптимизация для всех мобильных устройств
    window.addEventListener('resize', function() {
        // Обновляем переменную высоты для корректного расчета
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    });
    
    // Устанавливаем оптимальную высоту при первой загрузке
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
}

// Вызов функции после загрузки DOM
document.addEventListener('DOMContentLoaded', function() {
    // Обнаруживаем мобильное устройство
    const isMobile = window.innerWidth <= 768 || 
                    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
        // Добавляем класс для мобильных стилей
        document.body.classList.add('mobile-device');
        
        // Вызываем функцию настройки мобильных взаимодействий
        setupMobileInteractions();
    }
    
    // Дополнительное обнаружение устройства для стилизации
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
        document.body.classList.add('ios-device');
    } else if (/Android/i.test(navigator.userAgent)) {
        document.body.classList.add('android-device');
    }
    
    // Адаптация под ориентацию
    window.addEventListener('orientationchange', function() {
        // Нужна задержка для корректного обновления
        setTimeout(() => {
            // Обновляем высоту viewport
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
            
            // Прокручиваем к нижней части чата
            if (messagesContainer) {
                scrollToBottom();
            }
        }, 200);
    });
});

// РАЗДЕЛ: УПРАВЛЕНИЕ ЧАТАМИ

// Загрузка чатов пользователя
async function loadUserChats() {
    try {
        // Сначала добавляем глобальный чат (всегда доступен)
        userChats = [{
            id: 'global',
            name: 'Глобальный чат',
            lastMessage: 'Общий чат для всех пользователей',
            avatar: null,
            pinned: true,
            isGroup: true,
            participants: [], // Пустой массив для глобального чата
            lastActivity: new Date()
        }];
        
        // Загружаем личные чаты из базы данных
        const { data: personalChats, error: chatsError } = await supabase
            .from('chats')
            .select(`
                id,
                created_at,
                last_message,
                last_activity,
                participants:chat_participants(user_id, chat_id)
            `)
            .or(`participants.user_id.eq.${currentUser.id}`)
            .order('last_activity', { ascending: false });
            
        if (chatsError) {
            throw chatsError;
        }
        
        if (personalChats && personalChats.length > 0) {
            // Преобразуем результаты в формат для отображения
            const formattedChats = await Promise.all(personalChats.map(async (chat) => {
                // Находим ID другого участника (для личных чатов)
                const otherParticipantId = chat.participants.find(p => p.user_id !== currentUser.id)?.user_id;
                
                // Получаем информацию о другом пользователе
                let chatName = 'Чат';
                let avatar = null;
                
                if (otherParticipantId) {
                    const { data: userData } = await supabase
                        .from('users')
                        .select('username, avatar_url')
                        .eq('id', otherParticipantId)
                        .single();
                    
                    if (userData) {
                        chatName = userData.username;
                        avatar = userData.avatar_url || getAvatarForUser(otherParticipantId);
                    }
                }
                
                return {
                    id: chat.id,
                    name: chatName,
                    lastMessage: chat.last_message || 'Начните общение',
                    avatar: avatar,
                    pinned: false,
                    isGroup: false, // Пока поддерживаем только личные чаты
                    participants: chat.participants.map(p => p.user_id),
                    lastActivity: new Date(chat.last_activity || chat.created_at)
                };
            }));
            
            // Добавляем личные чаты к списку
            userChats = [...userChats, ...formattedChats];
        }
        
        // Сортируем чаты: сначала закрепленные, потом по дате последней активности
        userChats.sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return b.lastActivity - a.lastActivity;
        });
        
        // Отображаем список чатов
        renderChatList();
        
        // Подписываемся на обновления для всех чатов
        subscribeToUserChats();
        
    } catch (error) {
        console.error('Ошибка при загрузке чатов:', error);
        showConnectionNotification('Не удалось загрузить список чатов');
    }
}

// Отображение списка чатов
function renderChatList(searchTerm = '') {
    // Очищаем список (кроме глобального чата, который мы добавляем вручную в HTML)
    const globalChatElement = chatList.querySelector('.chat-item[data-chat-id="global"]');
    chatList.innerHTML = '';
    if (globalChatElement) {
        chatList.appendChild(globalChatElement);
    } else {
        // Если глобальный чат не найден в DOM, создаем его
        const globalChat = document.createElement('div');
        globalChat.className = `chat-item pinned ${activeChatId === 'global' ? 'active' : ''}`;
        globalChat.dataset.chatId = 'global';
        
        globalChat.innerHTML = `
            <div class="chat-avatar">
                <i class="fas fa-globe"></i>
            </div>
            <div class="chat-info">
                <div class="chat-name">Глобальный чат</div>
                <div class="chat-last-message">Общий чат для всех пользователей</div>
            </div>
            <div class="chat-meta">
                <div class="chat-time"></div>
                <div class="chat-badge hidden">0</div>
            </div>
        `;
        
        globalChat.addEventListener('click', () => {
            switchToChat('global');
        });
        
        chatList.appendChild(globalChat);
    }
    
    // Фильтруем чаты, если задан поисковый запрос
    const filteredChats = searchTerm 
        ? userChats.filter(chat => 
            chat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            chat.lastMessage.toLowerCase().includes(searchTerm.toLowerCase())
          )
        : userChats;
    
    // Если ничего не найдено
    if (filteredChats.length === 0 && searchTerm) {
        const noResultsElement = document.createElement('div');
        noResultsElement.className = 'no-results';
        noResultsElement.innerHTML = `
            <i class="fas fa-search"></i>
            <p>Ничего не найдено по запросу "${searchTerm}"</p>
        `;
        chatList.appendChild(noResultsElement);
        return;
    }
    
    // Добавляем чаты в список
    filteredChats.forEach(chat => {
        // Пропускаем глобальный чат, так как он уже добавлен в HTML
        if (chat.id === 'global') return;
        
        const chatElement = document.createElement('div');
        chatElement.className = `chat-item ${chat.id === activeChatId ? 'active' : ''} ${chat.pinned ? 'pinned' : ''}`;
        chatElement.dataset.chatId = chat.id;
        
        // Проверяем наличие непрочитанных сообщений
        const unreadCount = unreadMessages[chat.id] || 0;
        
        chatElement.innerHTML = `
            <div class="chat-avatar">
                ${chat.avatar 
                    ? `<img src="${chat.avatar}" alt="${chat.name}" onerror="this.onerror=null; this.src='https://via.placeholder.com/40?text=${chat.name.substring(0,1)}'">` 
                    : `<i class="${chat.isGroup ? 'fas fa-users' : 'fas fa-user'}"></i>`
                }
            </div>
            <div class="chat-info">
                <div class="chat-name">${escapeHtml(chat.name)}</div>
                <div class="chat-last-message">${escapeHtml(chat.lastMessage)}</div>
            </div>
            <div class="chat-meta">
                <div class="chat-time">${formatChatTime(chat.lastActivity)}</div>
                <div class="chat-badge ${unreadCount > 0 ? '' : 'hidden'}">${unreadCount}</div>
            </div>
        `;
        
        // Добавляем обработчик клика
        chatElement.addEventListener('click', () => {
            switchToChat(chat.id);
        });
        
        chatList.appendChild(chatElement);
    });
}

// Форматирование времени для отображения в списке чатов
function formatChatTime(date) {
    if (!date) return '';
    
    const now = new Date();
    const chatDate = new Date(date);
    
    // Если сегодня, показываем только время
    if (now.toDateString() === chatDate.toDateString()) {
        return chatDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Если вчера, показываем "Вчера"
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (yesterday.toDateString() === chatDate.toDateString()) {
        return 'Вчера';
    }
    
    // Если в этом году, показываем день и месяц
    if (now.getFullYear() === chatDate.getFullYear()) {
        return chatDate.toLocaleDateString([], { day: 'numeric', month: 'short' });
    }
    
    // Иначе показываем дату полностью
    return chatDate.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
}

// Переключение на другой чат
async function switchToChat(chatId) {
    try {
        console.log(`Переключение на чат ${chatId}`);
        
        // Очищаем таймаут загрузки сообщений
        if (messageLoadingTimeout) {
            clearTimeout(messageLoadingTimeout);
            messageLoadingTimeout = null;
        }
        
        // Очищаем контейнер сообщений и показываем индикатор загрузки
        messagesContainer.innerHTML = '';
        showLoader();
        
        // Обновляем активный чат
        activeChatId = chatId;
        
        // Очищаем счетчик непрочитанных сообщений
        clearUnreadCount(chatId);
        
        // Проверяем наличие и статус подписки на чат
        if (!chatSubscriptions[chatId]) {
            console.log(`Создание новой подписки для чата ${chatId}`);
            await subscribeToChat(chatId);
        } else {
            console.log(`Подписка для чата ${chatId} уже существует`);
        }
        
        // Загружаем сообщения чата
        await loadChatMessages(chatId);
        
        // Обновляем заголовок чата
        updateChatHeader();
        
        // Скрываем индикатор загрузки
        hideLoader();
        
        // Прокручиваем к новым сообщениям
        scrollToBottom();
        
        // Фокусируемся на поле ввода
        messageInput.focus();
    } catch (error) {
        console.error('Ошибка при переключении чата:', error);
        showConnectionNotification(`Ошибка при переключении чата: ${error.message || 'Проверьте подключение'}`);
        hideLoader();
    }
}

// Обновление заголовка активного чата
function updateChatHeader() {
    const chat = userChats.find(c => c.id === activeChatId) || { 
        id: 'global', 
        name: 'Глобальный чат', 
        isGroup: true 
    };
    
    currentChatName.textContent = chat.name;
    
    // Обновляем аватар/иконку
    if (chat.avatar) {
        currentChatIcon.classList.add('hidden');
        currentChatImg.classList.remove('hidden');
        currentChatImg.src = chat.avatar;
        currentChatImg.alt = chat.name;
    } else {
        currentChatImg.classList.add('hidden');
        currentChatIcon.classList.remove('hidden');
        
        // Используем правильную иконку в зависимости от типа чата
        if (chat.id === 'global') {
            currentChatIcon.className = 'fas fa-globe-americas';
        } else {
            currentChatIcon.className = `fas ${chat.isGroup ? 'fa-users' : 'fa-user'}`;
        }
    }
    
    // Обновляем статус
    if (chat.id === 'global') {
        currentChatStatus.innerHTML = `<span id="connection-status" class="connection-status">
            <i class="fas fa-signal"></i> <span>онлайн</span>
        </span>`;
    } else {
        // Другие статусы для личных и групповых чатов...
    }
}

// Создание нового личного чата
async function createPersonalChat(otherUserId) {
    try {
        // Проверка существования пользователя
        if (!currentUser || !currentUser.id) {
            console.error('Ошибка: текущий пользователь не определен');
            showConnectionNotification('Ошибка: пользователь не авторизован');
            return;
        }
        
        // Проверяем, существует ли пользователь, с которым создаем чат
        const { data: otherUser, error: userError } = await supabase
            .from('users')
            .select('id, username')
            .eq('id', otherUserId)
            .single();
            
        if (userError || !otherUser) {
            console.error('Ошибка: пользователь не найден', userError);
            showConnectionNotification('Пользователь не найден');
            return;
        }
        
        // Проверяем, существует ли уже чат с этим пользователем
        const existingChat = userChats.find(chat => 
            !chat.isGroup && 
            chat.participants && 
            chat.participants.includes(otherUserId) && 
            chat.participants.includes(currentUser.id)
        );
        
        if (existingChat) {
            // Если чат уже существует, просто переключаемся на него
            switchToChat(existingChat.id);
            closeUserSearchModal();
            return;
        }
        
        // Создаем новый чат
        const { data: newChat, error: chatError } = await supabase
            .from('chats')
            .insert([
                { 
                    last_activity: new Date().toISOString(),
                    last_message: 'Начните общение'
                }
            ])
            .select()
            .single();
            
        if (chatError) {
            throw chatError;
        }
        
        // Добавляем участников чата
        const { error: participantsError } = await supabase
            .from('chat_participants')
            .insert([
                { chat_id: newChat.id, user_id: currentUser.id },
                { chat_id: newChat.id, user_id: otherUserId }
            ]);
            
        if (participantsError) {
            throw participantsError;
        }
        
        // Получаем информацию о другом пользователе
        const { data: userData, error: userDataError } = await supabase
            .from('users')
            .select('username, avatar_url')
            .eq('id', otherUserId)
            .single();
            
        if (userDataError) {
            throw userDataError;
        }
        
        // Добавляем новый чат в список
        const newChatData = {
            id: newChat.id,
            name: userData.username,
            lastMessage: 'Начните общение',
            avatar: userData.avatar_url || getAvatarForUser(otherUserId),
            pinned: false,
            isGroup: false,
            participants: [currentUser.id, otherUserId],
            lastActivity: new Date()
        };
        
        userChats.push(newChatData);
        
        // Сортируем чаты
        userChats.sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return b.lastActivity - a.lastActivity;
        });
        
        // Обновляем список чатов
        renderChatList();
        
        // Переключаемся на новый чат
        switchToChat(newChat.id);
        
        // Подписываемся на обновления нового чата
        subscribeToChat(newChat.id);
        
        // Закрываем модальное окно поиска
        closeUserSearchModal();
        
    } catch (error) {
        console.error('Ошибка при создании чата:', error);
        showConnectionNotification('Не удалось создать чат');
    }
}

// Подписка на обновления всех чатов пользователя
async function subscribeToUserChats() {
    try {
        console.log('Настройка подписок на чаты...');
        
        // Отписываемся от старых подписок
        Object.keys(chatSubscriptions).forEach(chatId => {
            if (chatSubscriptions[chatId]) {
                chatSubscriptions[chatId].unsubscribe();
                delete chatSubscriptions[chatId];
            }
        });
        
        // Подписываемся на глобальный чат
        subscribeToChat('global');
        
        // Подписываемся на личные чаты
        userChats.forEach(chat => {
            if (chat.id !== 'global') {
                subscribeToChat(chat.id);
            }
        });
        
        console.log('Подписки на чаты настроены');
    } catch (error) {
        console.error('Ошибка при настройке подписок на чаты:', error);
        showConnectionNotification('Ошибка при подключении к чатам');
    }
}

// Загрузка сообщений для конкретного чата
async function loadChatMessages(chatId) {
    try {
        console.log(`Загрузка сообщений для чата ${chatId}...`);
        
        // Очищаем контейнер сообщений
        messagesContainer.innerHTML = '';
        
        // Сбрасываем переменные пагинации
        oldestMessageTimestamp = null;
        isLoadingMoreMessages = false;
        hasMoreMessages = true;
        
        // Показываем индикатор загрузки
        const loadingElement = document.createElement('div');
        loadingElement.className = 'loading-messages';
        loadingElement.innerHTML = '<div class="spinner"></div><p>Загрузка сообщений...</p>';
        messagesContainer.appendChild(loadingElement);
        
        // Загружаем сообщения из базы данных
        let query;
        
        if (chatId === 'global') {
            // Для глобального чата загружаем из таблицы messages
            query = supabase
                .from('messages')
                .select('id, user_id, content, image_url, created_at, users:user_id(username, avatar_url)')
                .order('created_at', { ascending: false })
                .limit(20);
        } else {
            // Проверяем существование чата
            const { data: chatData, error: chatError } = await supabase
                .from('chats')
                .select('id')
                .eq('id', chatId)
                .single();
                
            if (chatError || !chatData) {
                throw new Error('Чат не найден');
            }
            
            // Проверяем, является ли пользователь участником чата
            const { data: participantData, error: participantError } = await supabase
                .from('chat_participants')
                .select('id')
                .eq('chat_id', chatId)
                .eq('user_id', currentUser.id)
                .single();
                
            if (participantError || !participantData) {
                throw new Error('Вы не являетесь участником этого чата');
            }
            
            // Для личных чатов загружаем из таблицы chat_messages
            query = supabase
                .from('chat_messages')
                .select('id, chat_id, user_id, content, image_url, created_at, users:user_id(username, avatar_url)')
                .eq('chat_id', chatId)
                .order('created_at', { ascending: false })
                .limit(20);
        }
        
        const { data: messages, error } = await query;
        
        // Удаляем индикатор загрузки
        messagesContainer.removeChild(loadingElement);
        
        if (error) {
            throw error;
        }
        
        if (!messages || messages.length === 0) {
            // Если сообщений нет, показываем заглушку
            const emptyElement = document.createElement('div');
            emptyElement.className = 'no-messages';
            emptyElement.innerHTML = `
                <i class="fas fa-comments"></i>
                <p>Сообщений пока нет</p>
                <p>Начните общение прямо сейчас!</p>
            `;
            messagesContainer.appendChild(emptyElement);
            return;
        }
        
        // Сохраняем временную метку самого старого сообщения для пагинации
        oldestMessageTimestamp = messages[messages.length - 1].created_at;
        
        // Проверяем, есть ли еще сообщения для загрузки
        hasMoreMessages = messages.length >= 20;
        
        // Если есть сообщения для загрузки, добавляем кнопку "Загрузить еще"
        if (hasMoreMessages) {
            addLoadMoreButton();
        }
        
        // Отображаем сообщения в обратном порядке (от старых к новым)
        messages.reverse().forEach(message => {
            renderMessage(message, chatId);
        });
        
        // Прокручиваем к последнему сообщению
        scrollToBottom();
        
        // Сохраняем сообщения в кэше
        chatMessages[chatId] = messages.reverse();
        
        // Сбрасываем счетчик непрочитанных сообщений для этого чата
        unreadMessages[chatId] = 0;
        
        // Обновляем бейдж у чата
        const chatElement = document.querySelector(`.chat-item[data-chat-id="${chatId}"]`);
        if (chatElement) {
            const badgeElement = chatElement.querySelector('.chat-badge');
            if (badgeElement) {
                badgeElement.textContent = '0';
                badgeElement.classList.add('hidden');
            }
        }
        
    } catch (error) {
        console.error('Ошибка при загрузке сообщений:', error);
        showConnectionNotification('Не удалось загрузить сообщения');
        
        // Показываем сообщение об ошибке в контейнере
        messagesContainer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>Ошибка при загрузке сообщений</p>
                <p>${error.message || 'Проверьте подключение к интернету'}</p>
            </div>
        `;
    }
}

// Добавление кнопки "Загрузить еще"
function addLoadMoreButton() {
    const loadMoreContainer = document.createElement('div');
    loadMoreContainer.className = 'load-more-container';
    loadMoreContainer.innerHTML = `
        <button class="load-more-btn">
            <i class="fas fa-arrow-up"></i>
            <span>Загрузить еще</span>
        </button>
    `;
    
    const loadMoreBtn = loadMoreContainer.querySelector('.load-more-btn');
    loadMoreBtn.addEventListener('click', () => {
        loadOlderMessages(activeChatId);
    });
    
    messagesContainer.insertBefore(loadMoreContainer, messagesContainer.firstChild);
}

// Загрузка более старых сообщений
async function loadOlderMessages(chatId) {
    if (isLoadingMoreMessages || !hasMoreMessages || !oldestMessageTimestamp) {
        return;
    }
    
    isLoadingMoreMessages = true;
    
    // Заменяем кнопку "Загрузить еще" на индикатор загрузки
    const loadMoreContainer = document.querySelector('.load-more-container');
    if (loadMoreContainer) {
        loadMoreContainer.innerHTML = '<div class="spinner"></div>';
    }
    
    try {
        // Загружаем более старые сообщения
        let query;
        
        if (chatId === 'global') {
            // Для глобального чата
            query = supabase
                .from('messages')
                .select('id, user_id, content, image_url, created_at, users:user_id(username, avatar_url)')
                .lt('created_at', oldestMessageTimestamp)
                .order('created_at', { ascending: false })
                .limit(20);
        } else {
            // Для личных чатов
            query = supabase
                .from('chat_messages')
                .select('id, chat_id, user_id, content, image_url, created_at, users:user_id(username, avatar_url)')
                .eq('chat_id', chatId)
                .lt('created_at', oldestMessageTimestamp)
                .order('created_at', { ascending: false })
                .limit(20);
        }
        
        const { data: olderMessages, error } = await query;
        
        if (error) {
            throw error;
        }
        
        // Удаляем контейнер для кнопки "Загрузить еще"
        if (loadMoreContainer) {
            messagesContainer.removeChild(loadMoreContainer);
        }
        
        if (!olderMessages || olderMessages.length === 0) {
            // Больше сообщений нет
            hasMoreMessages = false;
            isLoadingMoreMessages = false;
            return;
        }
        
        // Сохраняем временную метку самого старого сообщения
        oldestMessageTimestamp = olderMessages[olderMessages.length - 1].created_at;
        
        // Проверяем, есть ли еще сообщения для загрузки
        hasMoreMessages = olderMessages.length >= 20;
        
        // Запоминаем текущую высоту прокрутки
        const scrollHeight = messagesContainer.scrollHeight;
        
        // Отображаем сообщения в обратном порядке (от старых к новым)
        olderMessages.reverse().forEach(message => {
            renderOlderMessage(message, chatId);
        });
        
        // Добавляем кнопку "Загрузить еще", если есть еще сообщения
        if (hasMoreMessages) {
            addLoadMoreButton();
        }
        
        // Восстанавливаем позицию прокрутки
        messagesContainer.scrollTop = messagesContainer.scrollHeight - scrollHeight;
        
        // Добавляем сообщения в кэш
        chatMessages[chatId] = [...olderMessages.reverse(), ...chatMessages[chatId]];
        
    } catch (error) {
        console.error('Ошибка при загрузке старых сообщений:', error);
        
        // Восстанавливаем кнопку "Загрузить еще"
        if (loadMoreContainer) {
            loadMoreContainer.innerHTML = `
                <button class="load-more-btn">
                    <i class="fas fa-arrow-up"></i>
                    <span>Загрузить еще</span>
                </button>
            `;
            
            const loadMoreBtn = loadMoreContainer.querySelector('.load-more-btn');
            loadMoreBtn.addEventListener('click', () => {
                loadOlderMessages(activeChatId);
            });
        }
    } finally {
        isLoadingMoreMessages = false;
    }
}

// РАЗДЕЛ: ОБРАБОТКА СООБЩЕНИЙ И ИНТЕРФЕЙС

// Отображение сообщения
function renderMessage(message, chatId) {
    // Проверка наличия chatId и установка значения по умолчанию, если оно не указано
    if (!chatId) {
        chatId = activeChatId || 'global';
        console.log('Warning: chatId не указан, используем значение по умолчанию:', chatId);
    }
    
    const messageElement = document.createElement('div');
    const isOwnMessage = message.user_id === currentUser.id;
    
    messageElement.className = `message ${isOwnMessage ? 'own' : ''}`;
    messageElement.dataset.id = message.id;
    
    const username = message.users?.username || 'Unknown User';
    const avatarUrl = message.users?.avatar_url || getAvatarForUser(message.user_id);
    const formattedTime = formatMessageTime(message.created_at);
    
    // Используем иконку пользователя для аватара
    const userInitial = username.substring(0,1).toUpperCase();
    const avatarContent = avatarUrl ? 
        `<img src="${avatarUrl}" alt="${username}" loading="lazy" onerror="this.onerror=null; this.src='https://via.placeholder.com/32?text=${userInitial}'" />` : 
        `<i class="fas fa-user"></i>`;
    
    // Создаем кликабельное имя пользователя для всех чатов, кроме личных и не собственных сообщений
    const isGlobalChat = chatId === 'global';
    const nameElement = isGlobalChat && !isOwnMessage ? 
        `<span class="message-name clickable" data-user-id="${message.user_id}">${escapeHtml(username)}</span>` : 
        `<span class="message-name">${escapeHtml(username)}</span>`;
    
    messageElement.innerHTML = `
        <div class="message-avatar">
            ${avatarContent}
        </div>
        <div class="message-content">
            <div class="message-header">
                ${nameElement}
                <span class="message-time">${formattedTime}</span>
            </div>
            <div class="message-text">${formatMessageContent(message.content)}</div>
        </div>
    `;
    
    // Добавляем обработчик для увеличения изображений
    const imageElement = messageElement.querySelector('.message-image');
    if (imageElement) {
        imageElement.addEventListener('click', function() {
            showImageModal(message.image_url);
        });
    }
    
    // Добавляем обработчик клика по имени пользователя
    const clickableUsername = messageElement.querySelector('.message-name.clickable');
    if (clickableUsername) {
        clickableUsername.addEventListener('click', async function() {
            const userId = this.dataset.userId;
            if (userId && userId !== currentUser.id) {
                try {
                    // Проверяем, существует ли пользователь
                    const { data, error } = await supabase
                        .from('users')
                        .select('id')
                        .eq('id', userId)
                        .single();
                    
                    if (error || !data) {
                        throw new Error('Пользователь не найден');
                    }
                    
                    // Если пользователь существует, создаем чат
                    createPersonalChat(userId);
                } catch (error) {
                    console.error('Ошибка при проверке пользователя:', error);
                    showConnectionNotification('Пользователь не найден');
                }
            }
        });
    }
    
    messagesContainer.appendChild(messageElement);
}

// Отображение более старого сообщения (в начало контейнера)
function renderOlderMessage(message, chatId) {
    // Проверка наличия chatId и установка значения по умолчанию, если оно не указано
    if (!chatId) {
        chatId = activeChatId || 'global';
        console.log('Warning: chatId не указан для renderOlderMessage, используем значение по умолчанию:', chatId);
    }
    
    const messageElement = document.createElement('div');
    const isOwnMessage = message.user_id === currentUser.id;
    
    messageElement.className = `message ${isOwnMessage ? 'own' : ''}`;
    messageElement.dataset.id = message.id;
    
    const username = message.users?.username || 'Unknown User';
    const avatarUrl = message.users?.avatar_url || getAvatarForUser(message.user_id);
    const formattedTime = formatMessageTime(message.created_at);
    
    // Используем иконку пользователя для аватара
    const userInitial = username.substring(0,1).toUpperCase();
    const avatarContent = avatarUrl ? 
        `<img src="${avatarUrl}" alt="${username}" loading="lazy" onerror="this.onerror=null; this.src='https://via.placeholder.com/32?text=${userInitial}'" />` : 
        `<i class="fas fa-user"></i>`;
    
    // Создаем кликабельное имя пользователя для всех чатов, кроме личных и не собственных сообщений
    const isGlobalChat = chatId === 'global';
    const nameElement = isGlobalChat && !isOwnMessage ? 
        `<span class="message-name clickable" data-user-id="${message.user_id}">${escapeHtml(username)}</span>` : 
        `<span class="message-name">${escapeHtml(username)}</span>`;
    
    messageElement.innerHTML = `
        <div class="message-avatar">
            ${avatarContent}
        </div>
        <div class="message-content">
            <div class="message-header">
                ${nameElement}
                <span class="message-time">${formattedTime}</span>
            </div>
            <div class="message-text">${formatMessageContent(message.content)}</div>
        </div>
    `;
    
    // Добавляем обработчик для увеличения изображений
    const imageElement = messageElement.querySelector('.message-image');
    if (imageElement) {
        imageElement.addEventListener('click', function() {
            showImageModal(message.image_url);
        });
    }
    
    // Добавляем обработчик клика по имени пользователя
    const clickableUsername = messageElement.querySelector('.message-name.clickable');
    if (clickableUsername) {
        clickableUsername.addEventListener('click', async function() {
            const userId = this.dataset.userId;
            if (userId && userId !== currentUser.id) {
                try {
                    // Проверяем, существует ли пользователь
                    const { data, error } = await supabase
                        .from('users')
                        .select('id')
                        .eq('id', userId)
                        .single();
                    
                    if (error || !data) {
                        throw new Error('Пользователь не найден');
                    }
                    
                    // Если пользователь существует, создаем чат
                    createPersonalChat(userId);
                } catch (error) {
                    console.error('Ошибка при проверке пользователя:', error);
                    showConnectionNotification('Пользователь не найден');
                }
            }
        });
    }
    
    // Находим первый элемент после кнопки "Загрузить еще" (если она есть)
    const loadMoreContainer = messagesContainer.querySelector('.load-more-container');
    if (loadMoreContainer) {
        messagesContainer.insertBefore(messageElement, loadMoreContainer.nextSibling);
    } else {
        messagesContainer.insertBefore(messageElement, messagesContainer.firstChild);
    }
}

// Форматирование времени сообщения
function formatMessageTime(timestamp) {
    if (!timestamp) return '';
    
    const messageDate = new Date(timestamp);
    const now = new Date();
    
    // Если сегодня, показываем только время
    if (now.toDateString() === messageDate.toDateString()) {
        return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Если вчера, показываем "Вчера" и время
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (yesterday.toDateString() === messageDate.toDateString()) {
        return `Вчера, ${messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // Иначе показываем дату и время
    return `${messageDate.toLocaleDateString([], { day: 'numeric', month: 'short' })}, ${messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

// Форматирование содержимого сообщения
function formatMessageContent(content) {
    if (!content) return '';
    
    // Экранируем HTML
    let formattedContent = escapeHtml(content);
    
    // Заменяем URL на ссылки
    formattedContent = formattedContent.replace(
        /(https?:\/\/[^\s]+)/g, 
        '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
    );
    
    // Заменяем эмодзи
    formattedContent = replaceEmojis(formattedContent);
    
    return formattedContent;
}

// Замена эмодзи-кодов на иконки
function replaceEmojis(text) {
    const emojiMap = {
        ':)': '😊',
        ':(': '😢',
        ':D': '😀',
        ';)': '😉',
        ':p': '😋',
        ':P': '😛',
        ':o': '😮',
        ':O': '😲'
        // Можно добавить больше эмодзи
    };
    
    for (const [code, emoji] of Object.entries(emojiMap)) {
        text = text.replace(new RegExp(escapeRegExp(code), 'g'), emoji);
    }
    
    return text;
}

// Экранирование специальных символов для регулярных выражений
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Воспроизведение звука уведомления
function playNotificationSound() {
    try {
        const notificationSound = new Audio('sounds/notification.mp3');
        notificationSound.volume = 0.5;
        notificationSound.play().catch(err => {
            console.warn('Не удалось воспроизвести звук уведомления:', err);
        });
    } catch (err) {
        console.warn('Ошибка при создании аудио объекта:', err);
    }
}

// Отправка сообщения
async function sendMessage() {
    const content = messageInput.value.trim();
    
    if (!content) return;
    
    // Очищаем поле ввода
    messageInput.value = '';
    
    // Создаем временный ID для сообщения
    const tempId = Date.now().toString();
    
    try {
        // Создаем временное сообщение
        const tempMessage = {
            id: `temp-${tempId}`,
            user_id: currentUser.id,
            content: content,
            created_at: new Date().toISOString(),
            users: {
                username: currentUser.username,
                avatar_url: currentUser.avatar_url
            }
        };
        
        // Отображаем временное сообщение
        renderMessage(tempMessage, activeChatId);
        
        // Прокручиваем к последнему сообщению
        scrollToBottom();
        
        // Отправляем сообщение в базу данных
        let result;
        
        if (activeChatId === 'global') {
            // Отправляем в глобальный чат
            result = await supabase
                .from('messages')
                .insert({
                    content: content,
                    user_id: currentUser.id,
                    temp_id: tempId
                });
        } else {
            // Проверка существования чата перед отправкой в личный чат
            const { data: chatExists, error: chatCheckError } = await supabase
                .from('chats')
                .select('id')
                .eq('id', activeChatId)
                .single();
                
            if (chatCheckError || !chatExists) {
                throw new Error('Чат не найден');
            }
            
            // Проверка является ли пользователь участником чата
            const { data: isParticipant, error: participantCheckError } = await supabase
                .from('chat_participants')
                .select('id')
                .eq('chat_id', activeChatId)
                .eq('user_id', currentUser.id)
                .single();
                
            if (participantCheckError || !isParticipant) {
                throw new Error('Вы не являетесь участником этого чата');
            }
            
            // Отправляем в личный чат
            result = await supabase
                .from('chat_messages')
                .insert({
                    chat_id: activeChatId,
                    content: content,
                    user_id: currentUser.id,
                    temp_id: tempId
                });
                
            // Обновляем информацию о последнем сообщении в чате
            await supabase
                .from('chats')
                .update({
                    last_message: content,
                    last_activity: new Date().toISOString()
                })
                .eq('id', activeChatId);
                
            // Обновляем локальные данные чата
            const chatIndex = userChats.findIndex(c => c.id === activeChatId);
            if (chatIndex !== -1) {
                userChats[chatIndex].lastMessage = content;
                userChats[chatIndex].lastActivity = new Date();
                
                // Обновляем отображение списка чатов
                renderChatList();
            }
        }
        
        // Проверяем на наличие ошибок
        if (result.error) {
            console.error('Ошибка при отправке:', result.error);
            throw result.error;
        }
        
        console.log('Сообщение успешно отправлено');
        
    } catch (error) {
        console.error('Ошибка при отправке сообщения:', error);
        showConnectionNotification('Не удалось отправить сообщение');
        
        // Удаляем временное сообщение
        const tempElement = document.querySelector(`.message[data-id="temp-${tempId}"]`);
        if (tempElement) {
            tempElement.remove();
        }
    }
}

// Поиск пользователей
async function searchUsers(query) {
    try {
        if (!query.trim()) {
            userSearchResults.innerHTML = `
                <div class="search-prompt">
                    <i class="fas fa-search"></i>
                    <p>Введите имя пользователя для поиска</p>
                </div>
            `;
            return;
        }
        
        // Показываем индикатор загрузки
        userSearchResults.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Поиск...</p></div>';
        
        // Выполняем поиск по пользователям
        const { data: users, error } = await supabase
            .from('users')
            .select('id, username, avatar_url, last_seen')
            .ilike('username', `%${query}%`)
            .neq('id', currentUser.id) // Исключаем текущего пользователя
            .limit(20);
            
        if (error) {
            throw error;
        }
        
        if (!users || users.length === 0) {
            userSearchResults.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-user-slash"></i>
                    <p>Пользователи не найдены</p>
                </div>
            `;
            return;
        }
        
        // Отображаем результаты поиска
        userSearchResults.innerHTML = '';
        
        users.forEach(user => {
            const userElement = document.createElement('div');
            userElement.className = 'user-item';
            
            const avatarUrl = user.avatar_url || getAvatarForUser(user.id);
            
            // Определяем статус пользователя
            const lastSeen = user.last_seen ? new Date(user.last_seen) : null;
            const isOnline = lastSeen && (new Date() - lastSeen) < 5 * 60 * 1000; // Считаем онлайн, если активность была менее 5 минут назад
            
            userElement.innerHTML = `
                <div class="user-avatar">
                    <img src="${avatarUrl}" alt="${user.username}">
                </div>
                <div class="user-info-search">
                    <div class="user-name">${escapeHtml(user.username)}</div>
                    <div class="user-status">${isOnline ? 'Онлайн' : 'Офлайн'}</div>
                </div>
            `;
            
            // Добавляем обработчик клика для создания чата с пользователем
            userElement.addEventListener('click', () => {
                createPersonalChat(user.id);
            });
            
            userSearchResults.appendChild(userElement);
        });
        
    } catch (error) {
        console.error('Ошибка при поиске пользователей:', error);
        userSearchResults.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>Ошибка при поиске пользователей</p>
            </div>
        `;
    }
}

// Открыть модальное окно поиска пользователей
function openUserSearchModal() {
    userSearchModal.classList.add('active');
    userSearchInput.value = '';
    userSearchResults.innerHTML = `
        <div class="search-prompt">
            <i class="fas fa-search"></i>
            <p>Введите имя пользователя для поиска</p>
        </div>
    `;
    
    // Фокус на поле ввода
    setTimeout(() => {
        userSearchInput.focus();
    }, 300);
}

// Закрыть модальное окно поиска пользователей
function closeUserSearchModal() {
    userSearchModal.classList.remove('active');
}

// Экранирование HTML
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Прокрутка к последнему сообщению
function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Показать модальное окно с изображением
function showImageModal(imageUrl) {
    const modal = document.querySelector('.modal');
    const modalContent = modal.querySelector('.modal-content');
    
    modalContent.innerHTML = `
        <img id="modal-image" src="${imageUrl}" alt="Изображение">
        <button class="close-modal" aria-label="Закрыть">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    modal.classList.add('active');
    
    const closeBtn = modal.querySelector('.close-modal');
    closeBtn.addEventListener('click', () => {
        modal.classList.remove('active');
    });
    
    // Закрытие по клику вне изображения
    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.classList.remove('active');
        }
    });
}

// Показать уведомление о соединении
function showConnectionNotification(message) {
    connectionMessage.textContent = message;
    connectionNotification.classList.remove('hidden');
    
    // Скрываем уведомление через 5 секунд
    setTimeout(() => {
        connectionNotification.classList.add('hidden');
    }, 5000);
}

// Переключение темной/светлой темы
function toggleTheme() {
    document.body.classList.toggle('light-theme');
    
    // Обновляем иконку
    const icon = themeToggleBtn.querySelector('i');
    if (document.body.classList.contains('light-theme')) {
        icon.className = 'fas fa-sun';
    } else {
        icon.className = 'fas fa-moon';
    }
    
    // Сохраняем предпочтение пользователя
    localStorage.setItem('theme', document.body.classList.contains('light-theme') ? 'light' : 'dark');
}

// Загружаем сохраненную тему
function loadSavedTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        themeToggleBtn.querySelector('i').className = 'fas fa-sun';
    }
}

// Функция для применения класса к заголовку глобального чата
function updateGlobalChatHeaderStyles() {
    const chatHeader = document.querySelector('.chat-header');
    const currentChatIcon = document.getElementById('current-chat-icon');
    
    if (activeChatId === 'global') {
        chatHeader.classList.add('global-chat-header');
        if (currentChatIcon) {
            currentChatIcon.className = 'fas fa-globe-americas';
            currentChatIcon.style.cssText = '';
            currentChatIcon.style.fontSize = '24px';
            currentChatIcon.style.color = '#fff';
            currentChatIcon.style.display = 'block';
        }
    } else {
        chatHeader.classList.remove('global-chat-header');
    }
    
    // Обеспечиваем, что иконка имеет правильный класс
    const chatItem = document.querySelector('.chat-item[data-chat-id="global"]');
    if (chatItem) {
        const chatAvatar = chatItem.querySelector('.chat-avatar i');
        if (chatAvatar) {
            chatAvatar.className = 'fas fa-globe-americas';
            chatAvatar.style.cssText = '';
            chatAvatar.style.fontSize = '20px';
            chatAvatar.style.color = '#fff'; 
            chatAvatar.style.display = 'block';
        }
    }
}

// Инициализация приложения
async function initializeApp() {
    try {
        console.log('Инициализация приложения...');
        
        // Проверяем сохраненную тему
        loadSavedTheme();
        
        // Инициализируем пользователя
        await initUser();
        
        // Настраиваем обработчики событий
        setupEventListeners();
        
        // Настраиваем мобильное взаимодействие
        setupMobileInteractions();
        
        // Переключаемся на экран чата
        loginScreen.classList.remove('active');
        chatScreen.classList.add('active');
        
        // Загружаем список чатов пользователя
        await loadUserChats();
        
        // Настраиваем подписку на глобальный чат и подписки на личные чаты
        await subscribeToUserChats();
        
        // Загружаем сообщения глобального чата
        activeChatId = 'global';
        await loadChatMessages('global');
        
        // Обновляем стили заголовка для глобального чата
        updateGlobalChatHeaderStyles();
        
        console.log('Приложение успешно инициализировано');
    } catch (error) {
        console.error('Ошибка при инициализации приложения:', error);
        
        // Показываем уведомление об ошибке
        showConnectionNotification('Ошибка при инициализации приложения. Попробуйте обновить страницу.');
        
        // Возвращаемся на экран входа в случае ошибки
        chatScreen.classList.remove('active');
        loginScreen.classList.add('active');
        
        // Скрываем индикатор загрузки и разблокируем кнопку
        loadingIndicator.classList.add('hidden');
        enterBtn.disabled = false;
    }
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Отправка сообщения
    sendMessageBtn.addEventListener('click', sendMessage);
    
    // Отправка сообщения по Enter
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Обработчик загрузки DOM для стилизации глобального чата
    document.addEventListener('DOMContentLoaded', function() {
        // После загрузки DOM применяем стили глобального чата с небольшой задержкой
        setTimeout(() => {
            updateGlobalChatHeaderStyles();
        }, 200);
    });
    
    // Обработчик для переключения чатов
    chatList.addEventListener('click', (e) => {
        if (e.target.classList.contains('chat-item')) {
            const chatId = e.target.dataset.chatId;
            switchToChat(chatId);
        }
    });
    
    // Переключение темы
    themeToggleBtn.addEventListener('click', toggleTheme);
    
    // Поиск чатов
    searchInput.addEventListener('input', () => {
        // Отображаем/скрываем кнопку очистки
        if (searchInput.value.trim()) {
            clearSearchBtn.classList.remove('hidden');
        } else {
            clearSearchBtn.classList.add('hidden');
        }
        
        // Выполняем поиск с задержкой
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            renderChatList(searchInput.value.trim());
        }, 300);
    });
    
    // Очистка поиска
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearSearchBtn.classList.add('hidden');
        renderChatList();
        searchInput.focus();
    });
    
    // Открытие модального окна поиска пользователей
    newChatBtn.addEventListener('click', openUserSearchModal);
    
    // Закрытие модальных окон
    closeModalBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal');
            if (modal) {
                modal.classList.remove('active');
            }
        });
    });
    
    // Поиск пользователей
    userSearchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            searchUsers(userSearchInput.value.trim());
        }, 500);
    });
    
    // Переключение боковой панели на мобильных устройствах
    sidebarToggleBtn.addEventListener('click', () => {
        chatSidebar.classList.toggle('active');
    });
    
    // Закрытие боковой панели при клике вне её
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && 
            chatSidebar.classList.contains('active') && 
            !chatSidebar.contains(e.target) && 
            !sidebarToggleBtn.contains(e.target)) {
            chatSidebar.classList.remove('active');
        }
    });
    
    // Закрытие уведомления о соединении
    connectionNotification.addEventListener('click', () => {
        connectionNotification.classList.add('hidden');
    });
}

// Оптимизация для мобильных устройств
function setupMobileInteractions() {
    // Определяем тип устройства
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    if (isMobile) {
        document.body.classList.add('mobile-device');
        
        if (isIOS) {
            document.body.classList.add('ios-device');
        } else {
            document.body.classList.add('android-device');
        }
        
        // Улучшение отзывчивости кнопок на мобильных устройствах
        const buttons = document.querySelectorAll('button');
        buttons.forEach(button => {
            button.addEventListener('touchstart', () => {
                button.classList.add('touch-active');
            });
            
            button.addEventListener('touchend', () => {
                button.classList.remove('touch-active');
            });
        });
        
        // Улучшение полей ввода на мобильных устройствах
        const inputs = document.querySelectorAll('input[type="text"]');
        inputs.forEach(input => {
            input.addEventListener('focus', () => {
                input.parentElement.classList.add('focus');
            });
            
            input.addEventListener('blur', () => {
                input.parentElement.classList.remove('focus');
            });
        });
    }
}

// Запускаем приложение
document.addEventListener('DOMContentLoaded', initializeApp);

// После загрузки документа инициализируем приложение
document.addEventListener('DOMContentLoaded', () => {
    // Проверяем, был ли загружен Supabase
    if (window.supabaseLoadError) {
        console.error('Не удалось инициализировать приложение из-за ошибки загрузки Supabase');
        return;
    }
    
    initializeApp();
    
    // Применяем стили для глобального чата
    setTimeout(() => {
        updateGlobalChatHeaderStyles();
    }, 500);
});

// ... existing code ... 

// Проверка находится ли пользователь вблизи нижней части чата
function isNearBottom() {
    const messages = document.querySelector('.messages');
    return messages.scrollHeight - messages.scrollTop - messages.clientHeight < 150;
}

// ... existing code ... 

// Функция для сортировки чатов
function sortChatsByLastActivity() {
    // ... existing code ...
}

// Очистка счетчика непрочитанных сообщений для чата
function clearUnreadCount(chatId) {
    // Сбрасываем счетчик непрочитанных сообщений в объекте
    if (unreadMessages[chatId]) {
        unreadMessages[chatId] = 0;
    }
    
    // Обновляем UI - скрываем счетчик в списке чатов
    const chatItem = document.querySelector(`.chat-item[data-chat-id="${chatId}"]`);
    if (chatItem) {
        const badge = chatItem.querySelector('.chat-badge');
        if (badge) {
            badge.textContent = '0';
            badge.classList.add('hidden');
        }
    }
    
    // Обновляем UI - кнопки в заголовке
    document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.remove('active');
    });
    
    if (chatItem) {
        chatItem.classList.add('active');
    }
    
    // Закрываем боковое меню на мобильных устройствах
    if (window.innerWidth <= 768) {
        chatSidebar.classList.remove('active');
    }
    
    // Обновляем класс заголовка для глобального чата
    updateGlobalChatHeaderStyles();
}

// Увеличение счетчика непрочитанных сообщений
function incrementUnreadCount(chatId) {
    // Инициализируем счетчик, если его нет
    if (!unreadMessages[chatId]) {
        unreadMessages[chatId] = 0;
    }
    
    // Увеличиваем счетчик
    unreadMessages[chatId]++;
    
    // Обновляем UI - показываем счетчик в списке чатов
    const chatItem = document.querySelector(`.chat-item[data-chat-id="${chatId}"]`);
    if (chatItem) {
        const badge = chatItem.querySelector('.chat-badge');
        if (badge) {
            badge.textContent = unreadMessages[chatId];
            badge.classList.remove('hidden');
        }
    }
    
    // Обновляем общий счетчик в заголовке (для мобильной версии)
    updateTotalUnreadCount();
}

// Обновление общего счетчика непрочитанных сообщений
function updateTotalUnreadCount() {
    const totalUnread = Object.values(unreadMessages).reduce((sum, count) => sum + count, 0);
    const chatsBadge = document.querySelector('.chats-badge');
    
    if (chatsBadge) {
        if (totalUnread > 0) {
            chatsBadge.textContent = totalUnread;
            chatsBadge.classList.remove('hidden');
        } else {
            chatsBadge.classList.add('hidden');
        }
    }
}