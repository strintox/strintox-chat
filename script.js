// Инициализация Supabase
const SUPABASE_URL = 'https://pmnhonmxlwdlnmcigfvr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtbmhvbm14bHdkbG5tY2lnZnZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI3NTc0MTUsImV4cCI6MjA1ODMzMzQxNX0.aSbWcgh8th__oEcGv8oiKlrVsrtheLZtjM-nZ8bfogA';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Пользовательские данные
const users = {
    adamur: {
        id: 'adamur',
        name: 'Adamur',
        password: 'FFz-vysUNjK6c',
        avatarClass: 'adamur',
        avatarSeed: 'adamur2024' // Уникальный seed для генерации аватарки
    },
    leonard: {
        id: 'leonard',
        name: 'Leonard',
        password: '5-x8eNTAWwx3x',
        avatarClass: 'leonard',
        avatarSeed: 'leonard2024' // Уникальный seed для генерации аватарки
    }
};

// Основные элементы DOM
const elements = {
    loginScreen: document.getElementById('login-screen'),
    chatScreen: document.getElementById('chat-screen'),
    passwordInput: document.getElementById('password-input'),
    loginBtn: document.getElementById('login-btn'),
    errorMsg: document.getElementById('error-msg'),
    messagesContainer: document.getElementById('messages'),
    messageInput: document.getElementById('message-input'),
    sendBtn: document.getElementById('send-btn'),
    logoutBtn: document.getElementById('logout-btn'),
    currentUserAvatar: document.getElementById('current-user-avatar'),
    currentUserName: document.getElementById('current-user-name'),
    soundToggle: document.getElementById('sound-toggle')
};

// Состояние приложения
let state = {
    currentUser: null,
    subscription: null,
    messages: [],
    muted: localStorage.getItem('mute') === 'true' // Загружаем сохраненное состояние звука
};

// Добавим функционал индикатора набора текста
let typingTimer;
const TYPING_DELAY = 2000; // Задержка перед скрытием индикатора набора текста

// Инициализация приложения
document.addEventListener('DOMContentLoaded', initApp);

// Функция инициализации
async function initApp() {
    // Добавляем обработчики событий
    addEventListeners();
    
    // Проверяем статус пользователя в localStorage
    checkUserSession();
    
    // Запрещаем масштабирование на мобильных устройствах
    document.addEventListener('touchmove', preventZoom, { passive: false });
    document.addEventListener('wheel', preventZoom, { passive: false });
    
    // Добавляем обработчик для предотвращения свечения на мобильных устройствах
    preventHighlightOnMobile();
    
    // Инициализируем состояние звука
    updateSoundButtonState();
}

// Предотвращение масштабирования
function preventZoom(e) {
    if (e.ctrlKey || (e.touches && e.touches.length > 1)) {
        e.preventDefault();
    }
}

// Предотвращение свечения на мобильных устройствах
function preventHighlightOnMobile() {
    // Отменяем стандартное поведение при касании для всех кнопок
    const allButtons = document.querySelectorAll('button');
    allButtons.forEach(button => {
        button.addEventListener('touchstart', (e) => {
            e.preventDefault();
            // Эмулируем клик для работы обработчиков
            button.click();
        });
    });
    
    // Отключаем стандартное свечение для всех элементов формы
    const formElements = document.querySelectorAll('input, textarea, button');
    formElements.forEach(el => {
        el.style.webkitTapHighlightColor = 'transparent';
        el.style.webkitTouchCallout = 'none';
        el.style.outline = 'none';
    });
}

// Добавление обработчиков событий
function addEventListeners() {
    // Вход в чат
    elements.loginBtn.addEventListener('click', login);
    elements.passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') login();
    });
    
    // Отправка сообщения
    elements.sendBtn.addEventListener('click', sendMessage);
    elements.messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Отслеживание набора текста
    elements.messageInput.addEventListener('input', handleTyping);
    
    // Выход из чата
    elements.logoutBtn.addEventListener('click', logout);
    
    // Запрещаем копирование текста
    document.addEventListener('copy', e => e.preventDefault());
    document.addEventListener('selectstart', e => e.preventDefault());
    
    // Управление звуком
    elements.soundToggle.addEventListener('click', toggleSound);
}

// Функция обработки набора текста
function handleTyping() {
    // Отправляем событие о наборе текста
    sendTypingEvent();
    
    // Сбрасываем таймер при каждом нажатии
    clearTimeout(typingTimer);
    
    // Устанавливаем новый таймер для отправки события о прекращении набора
    typingTimer = setTimeout(() => {
        sendStopTypingEvent();
    }, TYPING_DELAY);
}

// Отправка события о наборе текста
async function sendTypingEvent() {
    if (!state.currentUser) return;
    
    try {
        await supabase
            .channel('typing')
            .send({
                type: 'broadcast',
                event: 'typing',
                payload: {
                    user_id: state.currentUser.id,
                    name: state.currentUser.name
                }
            });
    } catch (error) {
        console.error('Ошибка при отправке события набора текста:', error);
    }
}

// Отправка события о прекращении набора текста
async function sendStopTypingEvent() {
    if (!state.currentUser) return;
    
    try {
        await supabase
            .channel('typing')
            .send({
                type: 'broadcast',
                event: 'stop_typing',
                payload: {
                    user_id: state.currentUser.id
                }
            });
    } catch (error) {
        console.error('Ошибка при отправке события прекращения набора текста:', error);
    }
}

// Функция входа в чат
function login() {
    const enteredPassword = elements.passwordInput.value;
    let foundUser = null;
    
    // Ищем пользователя по паролю
    for (const userId in users) {
        if (users[userId].password === enteredPassword) {
            foundUser = users[userId];
            break;
        }
    }
    
    if (!foundUser) {
        showError('Неверный пароль');
        return;
    }
    
    // Сохраняем пользователя в состоянии и localStorage
    state.currentUser = foundUser;
    localStorage.setItem('currentUser', JSON.stringify(foundUser));
    
    // Переходим к экрану чата
    showChatScreen();
    
    // Загружаем историю сообщений
    loadMessages();
    
    // Подписываемся на обновления
    subscribeToMessages();
}

// Отображение ошибки входа
function showError(message) {
    elements.errorMsg.textContent = message;
    elements.errorMsg.style.animation = 'none';
    
    // Перезапускаем анимацию
    setTimeout(() => {
        elements.errorMsg.style.animation = 'fadeIn 0.3s ease-in-out';
    }, 10);
}

// Показ экрана чата
function showChatScreen() {
    elements.loginScreen.classList.add('hidden');
    elements.chatScreen.classList.remove('hidden');
    
    // Устанавливаем информацию о текущем пользователе
    elements.currentUserAvatar.className = `avatar ${state.currentUser.avatarClass}`;
    
    // Генерируем аватарку с помощью DiceBear API
    const avatarUrl = generateAvatarUrl(state.currentUser.avatarSeed, state.currentUser.id);
    elements.currentUserAvatar.style.backgroundImage = `url('${avatarUrl}')`;
    elements.currentUserAvatar.style.backgroundSize = 'cover';
    elements.currentUserAvatar.style.backgroundPosition = 'center';
    
    elements.currentUserName.textContent = state.currentUser.name;
    
    // Фокус на поле ввода сообщения
    elements.messageInput.focus();
}

// Функция для генерации URL аватарки с помощью DiceBear API
function generateAvatarUrl(seed, userId) {
    // Выбираем разные стили для разных пользователей
    const style = userId === 'adamur' ? 'avataaars' : 'bottts';
    // Используем DiceBear API для генерации аватарки
    return `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede&radius=50`;
}

// Показ экрана входа
function showLoginScreen() {
    elements.chatScreen.classList.add('hidden');
    elements.loginScreen.classList.remove('hidden');
    
    // Сбрасываем значения полей
    elements.passwordInput.value = '';
    elements.errorMsg.textContent = '';
    
    // Фокус на поле ввода пароля
    elements.passwordInput.focus();
}

// Загрузка истории сообщений
async function loadMessages() {
    try {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .order('created_at', { ascending: true });
            
        if (error) throw error;
        
        state.messages = data || [];
        renderMessages();
    } catch (error) {
        console.error('Ошибка загрузки сообщений:', error);
    }
}

// Подписка на обновления сообщений в реальном времени
function subscribeToMessages() {
    // Отписываемся от предыдущей подписки, если она существует
    if (state.subscription) {
        state.subscription.unsubscribe();
    }
    
    // Создаем новую подписку на сообщения
    state.subscription = supabase
        .channel('messages-channel')
        .on('postgres_changes', 
            { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'messages' 
            }, 
            payload => {
                const newMessage = payload.new;
                state.messages.push(newMessage);
                renderMessage(newMessage);
                scrollToBottom();
            }
        )
        .subscribe();
    
    // Подписываемся на события набора текста
    supabase
        .channel('typing')
        .on('broadcast', { event: 'typing' }, payload => {
            if (payload.payload.user_id !== state.currentUser.id) {
                showTypingIndicator(payload.payload.name);
            }
        })
        .on('broadcast', { event: 'stop_typing' }, payload => {
            if (payload.payload.user_id !== state.currentUser.id) {
                hideTypingIndicator();
            }
        })
        .subscribe();
}

// Отправка сообщения
async function sendMessage() {
    const content = elements.messageInput.value.trim();
    if (!content) return;
    
    const message = {
        sender_id: state.currentUser.id,
        sender_name: state.currentUser.name,
        content,
        created_at: new Date().toISOString()
    };
    
    try {
        const { error } = await supabase
            .from('messages')
            .insert([message]);
            
        if (error) throw error;
        
        // Очищаем поле ввода
        elements.messageInput.value = '';
    } catch (error) {
        console.error('Ошибка отправки сообщения:', error);
    }
}

// Отрисовка всех сообщений
function renderMessages() {
    elements.messagesContainer.innerHTML = '';
    
    state.messages.forEach(message => {
        renderMessage(message);
    });
    
    scrollToBottom();
}

// Отрисовка одного сообщения
function renderMessage(message) {
    const isCurrentUser = message.sender_id === state.currentUser.id;
    const messageClass = isCurrentUser ? 'sent' : 'received';
    const avatarClass = message.sender_id === 'adamur' ? 'adamur' : 'leonard';
    
    // Скрываем индикатор набора текста при получении сообщения
    if (!isCurrentUser) {
        hideTypingIndicator();
    }
    
    const messageElement = document.createElement('div');
    messageElement.className = `message ${messageClass}`;
    
    const time = new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Генерируем URL аватарки
    const seed = message.sender_id === 'adamur' ? users.adamur.avatarSeed : users.leonard.avatarSeed;
    const avatarUrl = generateAvatarUrl(seed, message.sender_id);
    
    messageElement.innerHTML = `
        <div class="message-info">
            <div class="message-avatar ${avatarClass}" style="background-image: url('${avatarUrl}');"></div>
            <span class="message-sender">${message.sender_name}</span>
            <span class="message-time">${time}</span>
        </div>
        <div class="message-content">${message.content}</div>
    `;
    
    // Скрываем сообщение изначально для эффекта появления
    messageElement.style.opacity = '0';
    messageElement.style.transform = 'translateY(20px) scale(0.97)';
    
    elements.messagesContainer.appendChild(messageElement);
    
    // Добавляем небольшую задержку для более естественной анимации
    setTimeout(() => {
        messageElement.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        messageElement.style.opacity = '1';
        messageElement.style.transform = 'translateY(0) scale(1)';
        
        // Звуковой эффект при получении сообщения
        if (!isCurrentUser) {
            playMessageSound('receive');
        } else {
            playMessageSound('send');
        }
    }, isCurrentUser ? 50 : 150);
    
    scrollToBottom();
}

// Звуковые эффекты для сообщений
function playMessageSound(type) {
    // Проверяем, что звуки не отключены пользователем
    if (state.muted) return;
    
    // Создаем звуковой эффект программно
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    // Настраиваем звук в зависимости от типа
    if (type === 'send') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2);
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.2);
    } else {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(660, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.3);
    }
}

// Прокрутка контейнера сообщений вниз
function scrollToBottom() {
    elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
}

// Функция выхода из чата
function logout() {
    // Отписываемся от обновлений
    if (state.subscription) {
        state.subscription.unsubscribe();
        state.subscription = null;
    }
    
    // Очищаем состояние и localStorage
    state.currentUser = null;
    state.messages = [];
    localStorage.removeItem('currentUser');
    
    // Показываем экран входа
    showLoginScreen();
}

// Проверка сохраненной сессии пользователя
function checkUserSession() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        try {
            state.currentUser = JSON.parse(savedUser);
            showChatScreen();
            loadMessages();
            subscribeToMessages();
        } catch (error) {
            console.error('Ошибка при восстановлении сессии:', error);
            localStorage.removeItem('currentUser');
        }
    }
}

// Показ индикатора набора текста
function showTypingIndicator(name) {
    // Удаляем существующий индикатор, если он есть
    hideTypingIndicator();
    
    // Создаем новый индикатор
    const typingElement = document.createElement('div');
    typingElement.className = 'typing-indicator';
    typingElement.id = 'typing-indicator';
    
    typingElement.innerHTML = `
        <span class="typing-text">${name} печатает</span>
        <div class="typing-bubble"></div>
        <div class="typing-bubble"></div>
        <div class="typing-bubble"></div>
    `;
    
    elements.messagesContainer.appendChild(typingElement);
    scrollToBottom();
}

// Скрытие индикатора набора текста
function hideTypingIndicator() {
    const typingElement = document.getElementById('typing-indicator');
    if (typingElement) {
        typingElement.remove();
    }
}

// Функция включения/выключения звука
function toggleSound() {
    state.muted = !state.muted;
    localStorage.setItem('mute', state.muted);
    updateSoundButtonState();
}

// Обновляем внешний вид кнопки звука
function updateSoundButtonState() {
    if (state.muted) {
        elements.soundToggle.classList.add('muted');
        elements.soundToggle.querySelector('i').className = 'fas fa-volume-mute';
    } else {
        elements.soundToggle.classList.remove('muted');
        elements.soundToggle.querySelector('i').className = 'fas fa-volume-up';
    }
} 