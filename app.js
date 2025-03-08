/**
 * Основной модуль приложения
 */
(function() {
    // DOM элементы
    const loadingScreen = document.getElementById('loading-screen');
    const welcomeScreen = document.getElementById('welcome-screen');
    const chatsScreen = document.getElementById('chats-screen');
    const chatScreen = document.getElementById('chat-screen');
    const connectScreen = document.getElementById('connect-screen');
    
    const userIdDisplay = document.getElementById('user-id-display');
    const copyIdBtn = document.getElementById('copy-id-btn');
    const connectIdInput = document.getElementById('connect-id-input');
    const connectBtn = document.getElementById('connect-btn');
    
    const newChatBtn = document.getElementById('new-chat-btn');
    const chatsList = document.getElementById('chats-list');
    
    const backBtn = document.getElementById('back-btn');
    const chatTitle = document.getElementById('chat-title');
    const messagesContainer = document.getElementById('messages-container');
    const messageInput = document.getElementById('message-input');
    const sendMessageBtn = document.getElementById('send-message-btn');
    
    const connectBackBtn = document.getElementById('connect-back-btn');
    const newConnectIdInput = document.getElementById('new-connect-id-input');
    const newConnectBtn = document.getElementById('new-connect-btn');
    
    const notification = document.getElementById('notification');
    
    // Текущие данные
    let currentUserId = null;
    let currentChatId = null;
    let isTypingTimeout = null;
    
    /**
     * Инициализация приложения
     */
    async function init() {
        try {
            // Инициализируем хранилище
            await Storage.init();
            
            // Авторизация пользователя
            currentUserId = await Auth.init();
            userIdDisplay.textContent = currentUserId;
            
            // Инициализация P2P соединения
            await P2P.init(currentUserId);
            
            // Настройка слушателей P2P событий
            setupP2PEventListeners();
            
            // Загружаем существующие чаты
            await loadChats();
            
            // Показываем экран приветствия
            showScreen(welcomeScreen);
            
            // Настройка обработчиков событий UI
            setupEventListeners();
            
            console.log('Приложение инициализировано успешно');
        } catch (error) {
            console.error('Ошибка инициализации приложения:', error);
            showNotification('Ошибка при запуске приложения', 'error');
        }
    }
    
    /**
     * Настройка слушателей P2P событий
     */
    function setupP2PEventListeners() {
        // Обработка входящих соединений
        P2P.addEventListener('connection', async (peerId) => {
            try {
                // Проверяем, есть ли уже чат с этим пользователем
                let chat = await Storage.getChat(peerId);
                
                if (!chat) {
                    // Создаем новый чат
                    chat = {
                        id: peerId,
                        name: `Пользователь ${peerId.substring(0, 5)}`,
                        lastMessage: 'Новый чат',
                        lastMessageTime: Date.now()
                    };
                    
                    await Storage.addChat(chat);
                    
                    // Обновляем список чатов, если находимся на экране чатов
                    if (isScreenVisible(chatsScreen)) {
                        await loadChats();
                    } else {
                        showNotification('Новое сообщение от ' + chat.name);
                    }
                }
                
                console.log('Установлено соединение с:', peerId);
            } catch (error) {
                console.error('Ошибка при обработке соединения:', error);
            }
        });
        
        // Обработка входящих сообщений
        P2P.addEventListener('message', async (data) => {
            try {
                const { peerId, message } = data;
                
                // Получаем чат с этим пользователем
                let chat = await Storage.getChat(peerId);
                
                if (!chat) {
                    // Создаем новый чат, если его еще нет
                    chat = {
                        id: peerId,
                        name: `Пользователь ${peerId.substring(0, 5)}`,
                        lastMessage: message.text,
                        lastMessageTime: message.timestamp || Date.now()
                    };
                    
                    await Storage.addChat(chat);
                } else {
                    // Обновляем информацию о последнем сообщении
                    chat.lastMessage = message.text;
                    chat.lastMessageTime = message.timestamp || Date.now();
                    await Storage.updateChat(chat);
                }
                
                // Создаем объект сообщения
                const newMessage = {
                    chatId: peerId,
                    text: message.text,
                    timestamp: message.timestamp || Date.now(),
                    isOutgoing: false
                };
                
                // Сохраняем сообщение
                await Storage.addMessage(newMessage);
                
                // Если мы сейчас в этом чате, добавляем сообщение в UI
                if (currentChatId === peerId) {
                    appendMessage(newMessage);
                    // Прокручиваем к последнему сообщению
                    scrollToBottom();
                } else {
                    // Показываем уведомление, если мы не в этом чате
                    showNotification(`Сообщение от ${chat.name}: ${message.text.substring(0, 30)}${message.text.length > 30 ? '...' : ''}`);
                    
                    // Обновляем список чатов, если находимся на экране чатов
                    if (isScreenVisible(chatsScreen)) {
                        await loadChats();
                    }
                }
            } catch (error) {
                console.error('Ошибка при обработке сообщения:', error);
            }
        });
        
        // Обработка статуса печатания
        P2P.addEventListener('typing', (data) => {
            const { peerId, isTyping } = data;
            
            // Если мы сейчас в этом чате, показываем статус печатания
            if (currentChatId === peerId) {
                showTypingStatus(isTyping);
            }
        });
        
        // Обработка разрыва соединения
        P2P.addEventListener('disconnection', (peerId) => {
            console.log('Соединение разорвано с:', peerId);
            
            // Если мы сейчас в этом чате, показываем уведомление
            if (currentChatId === peerId) {
                showNotification('Собеседник отключился', 'error');
            }
        });
        
        // Обработка ошибок
        P2P.addEventListener('error', (data) => {
            console.error('Ошибка P2P соединения:', data);
            showNotification('Ошибка соединения', 'error');
        });
    }
    
    /**
     * Настройка обработчиков событий UI
     */
    function setupEventListeners() {
        // Копирование ID пользователя
        copyIdBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(currentUserId)
                .then(() => {
                    showNotification('ID скопирован в буфер обмена');
                })
                .catch(() => {
                    // Если API буфера обмена не поддерживается или нет разрешения
                    showNotification('Не удалось скопировать ID', 'error');
                });
        });
        
        // Подключение к другому пользователю
        connectBtn.addEventListener('click', async () => {
            const peerId = connectIdInput.value.trim();
            
            if (!peerId) {
                showNotification('Введите ID пользователя', 'error');
                return;
            }
            
            if (peerId === currentUserId) {
                showNotification('Нельзя подключиться к самому себе', 'error');
                return;
            }
            
            try {
                // Показываем загрузку
                showScreen(loadingScreen);
                
                // Подключаемся к пользователю
                await P2P.connect(peerId);
                
                // Создаем или получаем чат
                let chat = await Storage.getChat(peerId);
                
                if (!chat) {
                    // Создаем новый чат
                    chat = {
                        id: peerId,
                        name: `Пользователь ${peerId.substring(0, 5)}`,
                        lastMessage: 'Новый чат',
                        lastMessageTime: Date.now()
                    };
                    
                    await Storage.addChat(chat);
                }
                
                // Очищаем поле ввода
                connectIdInput.value = '';
                
                // Открываем чат
                openChat(chat.id);
            } catch (error) {
                console.error('Ошибка при подключении:', error);
                showNotification('Не удалось подключиться к пользователю', 'error');
                showScreen(welcomeScreen);
            }
        });
        
        // Обработка нажатия на кнопку "Новый чат"
        newChatBtn.addEventListener('click', () => {
            showScreen(connectScreen);
        });
        
        // Кнопка "Назад" в экране чата
        backBtn.addEventListener('click', () => {
            // Сбрасываем текущий чат
            currentChatId = null;
            // Очищаем контейнер сообщений
            messagesContainer.innerHTML = '';
            // Показываем экран чатов
            showScreen(chatsScreen);
        });
        
        // Отправка сообщения
        sendMessageBtn.addEventListener('click', sendCurrentMessage);
        
        // Отправка сообщения по нажатию Enter
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendCurrentMessage();
            }
        });
        
        // Отслеживание статуса печатания
        messageInput.addEventListener('input', () => {
            if (!currentChatId) return;
            
            // Отправляем статус "печатает" и сбрасываем предыдущий таймер
            if (isTypingTimeout) {
                clearTimeout(isTypingTimeout);
            }
            
            P2P.sendTypingStatus(currentChatId, true);
            
            // Через 2 секунды отправляем статус "не печатает"
            isTypingTimeout = setTimeout(() => {
                P2P.sendTypingStatus(currentChatId, false);
                isTypingTimeout = null;
            }, 2000);
        });
        
        // Кнопка "Назад" в экране подключения
        connectBackBtn.addEventListener('click', () => {
            showScreen(chatsScreen);
        });
        
        // Подключение к другому пользователю из экрана "Новый чат"
        newConnectBtn.addEventListener('click', async () => {
            const peerId = newConnectIdInput.value.trim();
            
            if (!peerId) {
                showNotification('Введите ID пользователя', 'error');
                return;
            }
            
            if (peerId === currentUserId) {
                showNotification('Нельзя подключиться к самому себе', 'error');
                return;
            }
            
            try {
                // Показываем загрузку
                showScreen(loadingScreen);
                
                // Подключаемся к пользователю
                await P2P.connect(peerId);
                
                // Создаем или получаем чат
                let chat = await Storage.getChat(peerId);
                
                if (!chat) {
                    // Создаем новый чат
                    chat = {
                        id: peerId,
                        name: `Пользователь ${peerId.substring(0, 5)}`,
                        lastMessage: 'Новый чат',
                        lastMessageTime: Date.now()
                    };
                    
                    await Storage.addChat(chat);
                }
                
                // Очищаем поле ввода
                newConnectIdInput.value = '';
                
                // Открываем чат
                openChat(chat.id);
            } catch (error) {
                console.error('Ошибка при подключении:', error);
                showNotification('Не удалось подключиться к пользователю', 'error');
                showScreen(chatsScreen);
            }
        });
        
        // Переключение на экран чатов при клике на welcome screen (для удобства)
        welcomeScreen.addEventListener('click', (e) => {
            // Проверяем, что клик не был по кнопкам или полям ввода
            if (e.target === welcomeScreen || e.target.className === 'welcome-container') {
                showScreen(chatsScreen);
            }
        });
    }
    
    /**
     * Отправка текущего сообщения
     */
    async function sendCurrentMessage() {
        if (!currentChatId) return;
        
        const text = messageInput.value.trim();
        
        if (!text) return;
        
        try {
            const timestamp = Date.now();
            
            // Создаем объект сообщения
            const message = {
                chatId: currentChatId,
                text: text,
                timestamp: timestamp,
                isOutgoing: true
            };
            
            // Отправляем сообщение через P2P
            await P2P.sendMessage(currentChatId, {
                text: text,
                timestamp: timestamp
            });
            
            // Сохраняем сообщение в локальную базу данных
            await Storage.addMessage(message);
            
            // Добавляем сообщение в UI
            appendMessage(message);
            
            // Очищаем поле ввода
            messageInput.value = '';
            
            // Отправляем статус "не печатает"
            if (isTypingTimeout) {
                clearTimeout(isTypingTimeout);
                isTypingTimeout = null;
                P2P.sendTypingStatus(currentChatId, false);
            }
            
            // Прокручиваем к последнему сообщению
            scrollToBottom();
        } catch (error) {
            console.error('Ошибка при отправке сообщения:', error);
            showNotification('Не удалось отправить сообщение', 'error');
        }
    }
    
    /**
     * Загрузка списка чатов
     */
    async function loadChats() {
        try {
            const chats = await Storage.getAllChats();
            
            // Очищаем список чатов
            chatsList.innerHTML = '';
            
            if (chats.length === 0) {
                // Если чатов нет, показываем сообщение
                const emptyMessage = document.createElement('div');
                emptyMessage.className = 'empty-chats-message';
                emptyMessage.textContent = 'У вас пока нет чатов. Начните новый чат с другом!';
                chatsList.appendChild(emptyMessage);
                return;
            }
            
            // Сортируем чаты по времени последнего сообщения (новые сверху)
            chats.sort((a, b) => b.lastMessageTime - a.lastMessageTime);
            
            // Добавляем чаты в список
            chats.forEach(chat => {
                const chatItem = createChatItem(chat);
                chatsList.appendChild(chatItem);
            });
        } catch (error) {
            console.error('Ошибка при загрузке чатов:', error);
        }
    }
    
    /**
     * Создание элемента чата для списка
     */
    function createChatItem(chat) {
        const chatItem = document.createElement('div');
        chatItem.className = 'chat-item';
        chatItem.dataset.chatId = chat.id;
        
        // Для аватара используем первую букву имени
        const firstLetter = chat.name.charAt(0).toUpperCase();
        
        chatItem.innerHTML = `
            <div class="chat-avatar">${firstLetter}</div>
            <div class="chat-details">
                <div class="chat-name">${chat.name}</div>
                <div class="chat-last-message">${chat.lastMessage}</div>
            </div>
            <div class="chat-time">${formatTime(chat.lastMessageTime)}</div>
        `;
        
        // Обработчик клика по чату
        chatItem.addEventListener('click', () => {
            openChat(chat.id);
        });
        
        return chatItem;
    }
    
    /**
     * Открытие чата
     */
    async function openChat(chatId) {
        try {
            // Получаем информацию о чате
            const chat = await Storage.getChat(chatId);
            
            if (!chat) {
                showNotification('Чат не найден', 'error');
                showScreen(chatsScreen);
                return;
            }
            
            // Устанавливаем текущий чат
            currentChatId = chatId;
            
            // Устанавливаем заголовок чата
            chatTitle.textContent = chat.name;
            
            // Очищаем контейнер сообщений
            messagesContainer.innerHTML = '';
            
            // Загружаем сообщения
            const messages = await Storage.getMessages(chatId);
            
            // Добавляем сообщения в UI
            messages.forEach(message => {
                appendMessage(message);
            });
            
            // Прокручиваем к последнему сообщению
            scrollToBottom();
            
            // Проверяем, есть ли соединение с пользователем
            if (!P2P.hasConnection(chatId)) {
                try {
                    // Пытаемся подключиться
                    await P2P.connect(chatId);
                } catch (error) {
                    console.error('Не удалось подключиться к пользователю:', error);
                    // Показываем уведомление, но не прерываем открытие чата
                    showNotification('Пользователь не в сети. Сообщения будут отправлены, когда он появится в сети.', 'error');
                }
            }
            
            // Показываем экран чата
            showScreen(chatScreen);
            
            // Устанавливаем фокус на поле ввода
            messageInput.focus();
        } catch (error) {
            console.error('Ошибка при открытии чата:', error);
            showNotification('Не удалось открыть чат', 'error');
        }
    }
    
    /**
     * Добавление сообщения в UI
     */
    function appendMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${message.isOutgoing ? 'message-outgoing' : 'message-incoming'}`;
        
        messageElement.innerHTML = `
            <div class="message-text">${escapeHtml(message.text)}</div>
            <div class="message-time">${formatTime(message.timestamp)}</div>
        `;
        
        messagesContainer.appendChild(messageElement);
    }
    
    /**
     * Экранирование HTML
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Прокрутка к последнему сообщению
     */
    function scrollToBottom() {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    /**
     * Показать статус печатания
     */
    function showTypingStatus(isTyping) {
        let typingElement = messagesContainer.querySelector('.typing-indicator');
        
        if (isTyping) {
            if (!typingElement) {
                typingElement = document.createElement('div');
                typingElement.className = 'message message-incoming typing-indicator';
                typingElement.innerHTML = `
                    <div class="typing-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                `;
                messagesContainer.appendChild(typingElement);
                scrollToBottom();
            }
        } else {
            if (typingElement) {
                typingElement.remove();
            }
        }
    }
    
    /**
     * Показать экран
     */
    function showScreen(screen) {
        // Скрываем все экраны
        loadingScreen.classList.add('hidden');
        welcomeScreen.classList.add('hidden');
        chatsScreen.classList.add('hidden');
        chatScreen.classList.add('hidden');
        connectScreen.classList.add('hidden');
        
        // Показываем нужный экран
        screen.classList.remove('hidden');
        
        // Если показываем экран чатов, обновляем список
        if (screen === chatsScreen) {
            loadChats();
        }
    }
    
    /**
     * Проверка, виден ли экран
     */
    function isScreenVisible(screen) {
        return !screen.classList.contains('hidden');
    }
    
    /**
     * Показать уведомление
     */
    function showNotification(message, type = 'success') {
        notification.textContent = message;
        notification.className = `notification ${type}`;
        
        // Сначала удаляем класс hidden, чтобы показать уведомление
        notification.classList.remove('hidden');
        
        // Запускаем анимацию
        void notification.offsetWidth; // Это нужно для перезапуска анимации
        
        // Через 3 секунды скрываем уведомление
        setTimeout(() => {
            notification.classList.add('hidden');
        }, 3000);
    }
    
    /**
     * Форматирование времени
     */
    function formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        
        // Если сообщение отправлено сегодня, показываем только время
        if (date.toDateString() === now.toDateString()) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        
        // Если сообщение отправлено в этом году, показываем дату без года
        if (date.getFullYear() === now.getFullYear()) {
            return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
        }
        
        // Иначе показываем полную дату
        return date.toLocaleDateString();
    }
    
    // Запускаем приложение
    init();
})(); 