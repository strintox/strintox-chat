/**
 * Firebase Chat - Real-time chat using Firebase Realtime Database
 * Обновленная версия с решением проблем безопасности и прав доступа
 */

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAAdu7bWt9F2GF1W9qEzfc2f_y6LCqMM14",
  authDomain: "strintox-3a2b8.firebaseapp.com",
  projectId: "strintox-3a2b8",
  storageBucket: "strintox-3a2b8.firebasestorage.app",
  messagingSenderId: "12688530154",
  appId: "1:12688530154:web:da86782e5c3261c6c35593",
  measurementId: "G-WVB4V2T51Y",
  databaseURL: "https://strintox-3a2b8-default-rtdb.firebaseio.com"
};

// Constants for storage keys
const STORAGE = {
    USER: 'chat_user',
    THEME: 'theme'
};

// Глобальные переменные
let currentUser = null;
let database = null;
let currentChatId = null;
let contacts = [];
let chats = {};
let messagesListeners = {};
let onlineStatusListeners = {};

// DOM-элементы
let usernameSetup;
let usernameInput;
let usernameError;
let saveUsernameBtn;
let chatInterface;
let currentUsernameEl;
let userIdEl;
let copyIdBtn;
let contactsList;
let addContactBtn;
let chatRecipient;
let chatMessages;
let messageInput;
let sendMessageBtn;
let addContactModal;
let closeModalBtn;
let contactIdInput;
let contactNameInput;
let contactError;
let addContactSubmitBtn;
let toastsContainer;
let themeSwitch;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    // Кэшируем DOM-элементы
    cacheDOM();
    
    // Настраиваем обработчики событий
    setupEventListeners();
    
    // Инициализируем тему
    initTheme();
    
    // Инициализируем Firebase
    initFirebase();
    
    // Проверяем, есть ли сохраненный пользователь
    const savedUser = localStorage.getItem(STORAGE.USER);
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showChatInterface();
        updateUserInfo();
        
        // Загружаем контакты и настраиваем онлайн-статусы
        loadUserContacts();
        
        // Устанавливаем онлайн-статус и обработчик видимости страницы
        setUserOnline();
        document.addEventListener('visibilitychange', handleVisibilityChange);
    } else {
        showLoginInterface();
    }
});

// Кэширование DOM-элементов
function cacheDOM() {
    usernameSetup = document.getElementById('username-setup');
    usernameInput = document.getElementById('username-input');
    usernameError = document.getElementById('username-error');
    saveUsernameBtn = document.getElementById('save-username');
    chatInterface = document.getElementById('chat-interface');
    currentUsernameEl = document.getElementById('current-username');
    userIdEl = document.getElementById('user-id');
    copyIdBtn = document.getElementById('copy-id');
    contactsList = document.getElementById('contacts-list');
    addContactBtn = document.getElementById('add-contact');
    chatRecipient = document.getElementById('chat-recipient');
    chatMessages = document.getElementById('chat-messages');
    messageInput = document.getElementById('message-input');
    sendMessageBtn = document.getElementById('send-message');
    addContactModal = document.getElementById('add-contact-modal');
    closeModalBtn = document.getElementById('close-modal');
    contactIdInput = document.getElementById('contact-id');
    contactNameInput = document.getElementById('contact-name');
    contactError = document.getElementById('contact-error');
    addContactSubmitBtn = document.getElementById('add-contact-submit');
    toastsContainer = document.getElementById('toasts-container');
    themeSwitch = document.getElementById('theme-switch');
    
    // Добавляем также элемент для отображения ID в приветственном сообщении
    document.getElementById('welcome-user-id').textContent = '';
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Обработчик для кнопки сохранения имени пользователя
    saveUsernameBtn.addEventListener('click', createUser);
    
    // Обработчик для копирования ID пользователя
    copyIdBtn.addEventListener('click', function() {
        copyToClipboard(currentUser.id);
        showToast('ID скопирован в буфер обмена', 'success');
    });
    
    // Обработчики для модального окна добавления контакта
    addContactBtn.addEventListener('click', showContactModal);
    closeModalBtn.addEventListener('click', hideContactModal);
    addContactSubmitBtn.addEventListener('click', addContact);
    
    // Обработчик для ввода сообщения
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Обработчик для кнопки отправки сообщения
    sendMessageBtn.addEventListener('click', sendMessage);
    
    // Обработчик для переключения темы
    themeSwitch.addEventListener('change', function() {
        const isDark = this.checked;
        document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
        localStorage.setItem(STORAGE.THEME, isDark ? 'dark' : 'light');
    });
    
    // Обработчик клика вне модального окна для его закрытия
    window.addEventListener('click', function(e) {
        if (e.target === addContactModal) {
            hideContactModal();
        }
    });
}

// Инициализация темы
function initTheme() {
    const savedTheme = localStorage.getItem(STORAGE.THEME) || 'dark';
    document.body.setAttribute('data-theme', savedTheme);
    themeSwitch.checked = savedTheme === 'dark';
}

// Инициализация Firebase
function initFirebase() {
    // Инициализация Firebase
    firebase.initializeApp(firebaseConfig);
    
    // Включаем отладку для Firestore (при необходимости)
    // firebase.firestore.setLogLevel('debug');
    
    // Получаем доступ к Realtime Database
    database = firebase.database();
    
    // Проверяем правила безопасности
    testDatabaseAccess();
}

// Проверка доступа к базе данных
async function testDatabaseAccess() {
    try {
        // Проверяем доступ к базе данных для чтения
        await database.ref('.info/connected').once('value');
        console.log('Firebase Database подключена успешно');
    } catch (error) {
        console.error('Ошибка при подключении к Firebase Database:', error);
        showToast('Ошибка подключения к базе данных. Проверьте правила безопасности.', 'error');
    }
}

// Настройка онлайн-статуса пользователя
function setupPresence() {
    if (!currentUser) return;
    
    // Получаем ссылку на информацию о подключении
    const connectedRef = database.ref('.info/connected');
    
    // Слушаем изменения состояния подключения
    connectedRef.on('value', (snap) => {
        if (snap.val() === true) {
            console.log('Пользователь подключен к базе данных');
            
            // Устанавливаем статус "онлайн" и обеспечиваем его автоматическое удаление при отключении
            const userStatusRef = database.ref(`users/${currentUser.id}/status`);
            userStatusRef.onDisconnect().set('offline');
            userStatusRef.set('online');
        } else {
            console.log('Пользователь отключен от базы данных');
        }
    });
}

// Установка статуса "онлайн"
function setUserOnline() {
    if (!currentUser) return;
    
    const userStatusRef = database.ref(`users/${currentUser.id}/status`);
    userStatusRef.set('online').catch(error => {
        console.error('Ошибка при установке статуса "онлайн":', error);
    });
}

// Установка статуса "офлайн"
function setUserOffline() {
    if (!currentUser) return;
    
    const userStatusRef = database.ref(`users/${currentUser.id}/status`);
    userStatusRef.set('offline').catch(error => {
        console.error('Ошибка при установке статуса "офлайн":', error);
    });
}

// Обработка изменения видимости страницы
function handleVisibilityChange() {
    if (document.hidden) {
        // Страница скрыта - устанавливаем статус "отошел"
        if (currentUser) {
            database.ref(`users/${currentUser.id}/status`).set('away')
                .catch(error => console.error('Ошибка при изменении статуса:', error));
        }
    } else {
        // Страница видима - устанавливаем статус "онлайн"
        setUserOnline();
    }
}

// Создание нового пользователя
function createUser() {
    const username = usernameInput.value.trim();
    
    // Проверяем валидность имени пользователя
    if (username.length < 3 || username.length > 20) {
        usernameError.textContent = 'Имя должно содержать от 3 до 20 символов';
        return;
    }
    
    // Генерируем уникальный ID
    const userId = generateUniqueId();
    
    // Создаем объект пользователя
    currentUser = {
        id: userId,
        name: username,
        createdAt: new Date().toISOString()
    };
    
    // Сохраняем в локальное хранилище
    localStorage.setItem(STORAGE.USER, JSON.stringify(currentUser));
    
    // Сохраняем в базу данных
    database.ref(`users/${userId}`).set({
        name: username,
        status: 'online',
        createdAt: firebase.database.ServerValue.TIMESTAMP
    }).then(() => {
        // Показываем интерфейс чата
        showChatInterface();
        updateUserInfo();
        
        // Устанавливаем обработчик видимости страницы
        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        // Показываем уведомление
        showToast('Аккаунт успешно создан!', 'success');
    }).catch(error => {
        console.error('Ошибка при создании пользователя:', error);
        usernameError.textContent = 'Ошибка при создании пользователя. Попробуйте еще раз.';
    });
}

// Генерация уникального ID
function generateUniqueId() {
    return Date.now().toString(36) + randomString(5);
}

// Генерация случайной строки заданной длины
function randomString(length) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Копирование текста в буфер обмена
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).catch(err => {
        console.error('Ошибка при копировании текста:', err);
    });
}

// Показ интерфейса входа
function showLoginInterface() {
    usernameSetup.style.display = 'flex';
    chatInterface.style.display = 'none';
}

// Показ интерфейса чата
function showChatInterface() {
    usernameSetup.style.display = 'none';
    chatInterface.style.display = 'block';
}

// Обновление информации о пользователе в интерфейсе
function updateUserInfo() {
    currentUsernameEl.textContent = currentUser.name;
    userIdEl.textContent = currentUser.id;
    document.getElementById('welcome-user-id').textContent = currentUser.id;
}

// Загрузка контактов пользователя
function loadUserContacts() {
    if (!currentUser) return;
    
    // Получаем ссылку на контакты пользователя
    const contactsRef = database.ref(`users/${currentUser.id}/contacts`);
    
    // Слушаем изменения контактов
    contactsRef.on('value', (snapshot) => {
        // Очищаем массив контактов
        contacts = [];
        
        // Если есть контакты, обрабатываем их
        if (snapshot.exists()) {
            snapshot.forEach(childSnapshot => {
                const contactId = childSnapshot.key;
                const contactData = childSnapshot.val();
                
                contacts.push({
                    id: contactId,
                    name: contactData.name,
                    lastMessage: contactData.lastMessage || '',
                    unreadCount: contactData.unreadCount || 0,
                    timestamp: contactData.timestamp || 0
                });
                
                // Слушаем изменения статуса для этого контакта
                setupContactStatusListener(contactId);
            });
            
            // Сортируем контакты по времени последнего сообщения (новые сверху)
            contacts.sort((a, b) => b.timestamp - a.timestamp);
        }
        
        // Отображаем контакты
        renderContacts();
    }, (error) => {
        console.error('Ошибка при загрузке контактов:', error);
        showToast('Ошибка при загрузке контактов', 'error');
    });
}

// Настройка прослушивания статуса контакта
function setupContactStatusListener(contactId) {
    // Если уже слушаем этот контакт, не делаем ничего
    if (onlineStatusListeners[contactId]) return;
    
    // Слушаем изменения статуса контакта
    const statusRef = database.ref(`users/${contactId}/status`);
    onlineStatusListeners[contactId] = statusRef.on('value', (snapshot) => {
        const status = snapshot.val() || 'offline';
        
        // Обновляем статус в DOM, только если элемент существует
        const statusEl = document.querySelector(`.contact-item[data-id="${contactId}"] .status-indicator`);
        if (statusEl) {
            // Удаляем все классы статуса
            statusEl.classList.remove('online', 'away', 'offline');
            // Добавляем актуальный класс
            statusEl.classList.add(status);
        }
    });
}

// Показ модального окна для добавления контакта
function showContactModal() {
    addContactModal.style.display = 'flex';
    contactIdInput.value = '';
    contactNameInput.value = '';
    contactError.textContent = '';
    
    // Устанавливаем фокус на поле ввода ID
    setTimeout(() => contactIdInput.focus(), 100);
}

// Скрытие модального окна
function hideContactModal() {
    addContactModal.style.display = 'none';
}

// Добавление нового контакта
function addContact() {
    const contactId = contactIdInput.value.trim();
    const contactName = contactNameInput.value.trim();
    
    // Проверяем заполненность полей
    if (!contactId) {
        contactError.textContent = 'Введите ID контакта';
        return;
    }
    
    if (!contactName) {
        contactError.textContent = 'Введите имя контакта';
        return;
    }
    
    // Проверяем, не пытается ли пользователь добавить себя
    if (contactId === currentUser.id) {
        contactError.textContent = 'Вы не можете добавить себя в контакты';
        return;
    }
    
    // Проверяем, существует ли такой ID
    database.ref(`users/${contactId}`).once('value')
        .then(snapshot => {
            if (!snapshot.exists()) {
                // Пользователь с таким ID не найден
                contactError.textContent = 'Пользователь с таким ID не найден';
                return;
            }
            
            // Проверяем, не добавлен ли уже этот контакт
            const existingContact = contacts.find(contact => contact.id === contactId);
            if (existingContact) {
                contactError.textContent = 'Этот контакт уже добавлен';
                return;
            }
            
            // Создаем контакт в базе данных
            const contactRef = database.ref(`users/${currentUser.id}/contacts/${contactId}`);
            
            contactRef.set({
                name: contactName,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            }).then(() => {
                // Скрываем модальное окно
                hideContactModal();
                
                // Показываем уведомление
                showToast('Контакт успешно добавлен', 'success');
                
                // Открываем чат с новым контактом
                const newContact = {
                    id: contactId,
                    name: contactName
                };
                
                setTimeout(() => {
                    // Ищем контакт в DOM и кликаем по нему
                    const contactEl = document.querySelector(`.contact-item[data-id="${contactId}"]`);
                    if (contactEl) {
                        contactEl.click();
                    } else {
                        // Если элемент еще не отрендерен, открываем чат программно
                        openChat(newContact);
                    }
                }, 300);
            }).catch(error => {
                console.error('Ошибка при добавлении контакта:', error);
                contactError.textContent = 'Ошибка при добавлении контакта. Попробуйте еще раз.';
            });
        })
        .catch(error => {
            console.error('Ошибка при проверке ID контакта:', error);
            contactError.textContent = 'Ошибка при проверке ID контакта. Попробуйте еще раз.';
        });
}

// Настройка прослушивания сообщений с контактом
function listenForMessages(contactId) {
    // Сначала отписываемся от всех предыдущих слушателей сообщений
    Object.keys(messagesListeners).forEach(key => {
        database.ref(key).off('value', messagesListeners[key]);
        delete messagesListeners[key];
    });
    
    // Получаем ID чата (комбинация ID пользователя и контакта)
    const chatId = getChatId(currentUser.id, contactId);
    currentChatId = chatId;
    
    // Слушаем сообщения
    const messagesRef = database.ref(`chats/${chatId}/messages`);
    
    messagesListeners[`chats/${chatId}/messages`] = messagesRef.on('value', (snapshot) => {
        if (snapshot.exists()) {
            // Получаем все сообщения
            const messages = [];
            snapshot.forEach(childSnapshot => {
                const messageData = childSnapshot.val();
                messages.push({
                    id: childSnapshot.key,
                    text: messageData.text,
                    senderId: messageData.senderId,
                    timestamp: messageData.timestamp
                });
            });
            
            // Сортируем сообщения по времени
            messages.sort((a, b) => a.timestamp - b.timestamp);
            
            // Сохраняем сообщения в локальном кэше
            chats[chatId] = messages;
            
            // Отображаем сообщения
            displayChatHistory(contactId);
        } else {
            // Если сообщений нет, показываем пустой чат
            chatMessages.innerHTML = '';
            
            // Добавляем системное сообщение
            const systemMessage = document.createElement('div');
            systemMessage.className = 'system-message';
            systemMessage.textContent = 'Начните общение прямо сейчас!';
            chatMessages.appendChild(systemMessage);
        }
    }, (error) => {
        console.error('Ошибка при загрузке сообщений:', error);
        
        // Показываем уведомление об ошибке
        chatMessages.innerHTML = '';
        const errorMessage = document.createElement('div');
        errorMessage.className = 'system-message error';
        errorMessage.textContent = 'Ошибка при загрузке сообщений';
        chatMessages.appendChild(errorMessage);
    });
    
    // Отмечаем сообщения как прочитанные
    markMessagesAsRead(contactId);
}

// Отметка сообщений как прочитанных
function markMessagesAsRead(contactId) {
    // Сбрасываем счетчик непрочитанных сообщений
    database.ref(`users/${currentUser.id}/contacts/${contactId}/unreadCount`).set(0)
        .catch(error => {
            console.error('Ошибка при сбросе счетчика непрочитанных сообщений:', error);
        });
    
    // Обновляем контакт в DOM
    const contactEl = document.querySelector(`.contact-item[data-id="${contactId}"] .unread-indicator`);
    if (contactEl) {
        contactEl.textContent = '';
        contactEl.style.display = 'none';
    }
    
    // Обновляем счетчик в массиве контактов
    const contact = contacts.find(c => c.id === contactId);
    if (contact) {
        contact.unreadCount = 0;
    }
}

// Получение ID чата из ID пользователей
function getChatId(id1, id2) {
    // Сортируем ID, чтобы чат имел одинаковый ID независимо от отправителя и получателя
    return [id1, id2].sort().join('_');
}

// Обновление статусов контактов в UI
function updateContactStatusUI() {
    contacts.forEach(contact => {
        const statusRef = database.ref(`users/${contact.id}/status`);
        
        // Проверяем, не подписаны ли мы уже на этот статус
        if (!onlineStatusListeners[contact.id]) {
            onlineStatusListeners[contact.id] = statusRef.on('value', (snapshot) => {
                const status = snapshot.val() || 'offline';
                
                // Обновляем статус в DOM
                const statusEl = document.querySelector(`.contact-item[data-id="${contact.id}"] .status-indicator`);
                if (statusEl) {
                    // Удаляем все классы статуса
                    statusEl.classList.remove('online', 'away', 'offline');
                    // Добавляем актуальный класс
                    statusEl.classList.add(status);
                }
            });
        }
    });
}

// Отрисовка списка контактов
function renderContacts() {
    // Очищаем список контактов
    contactsList.innerHTML = '';
    
    // Если контактов нет, показываем сообщение
    if (contacts.length === 0) {
        const emptyContacts = document.createElement('div');
        emptyContacts.className = 'empty-contacts';
        emptyContacts.innerHTML = `
            <i class="fas fa-user-friends"></i>
            <p>У вас пока нет контактов</p>
            <p>Нажмите "+" чтобы добавить первый контакт</p>
        `;
        contactsList.appendChild(emptyContacts);
        return;
    }
    
    // Добавляем каждый контакт в список
    contacts.forEach(contact => {
        const contactEl = document.createElement('div');
        contactEl.className = 'contact-item';
        contactEl.setAttribute('data-id', contact.id);
        
        contactEl.innerHTML = `
            <div class="contact-avatar">
                <i class="fas fa-user"></i>
                <span class="status-indicator offline"></span>
            </div>
            <div class="contact-details">
                <div class="contact-name">${escapeHtml(contact.name)}</div>
                <div class="contact-status">${contact.lastMessage ? escapeHtml(contact.lastMessage) : 'Нет сообщений'}</div>
            </div>
            <div class="unread-indicator" style="display: ${contact.unreadCount > 0 ? 'flex' : 'none'}">${contact.unreadCount || ''}</div>
        `;
        
        // Обработчик клика для открытия чата
        contactEl.addEventListener('click', () => {
            openChat(contact);
        });
        
        contactsList.appendChild(contactEl);
    });
    
    // Обновляем статусы контактов
    updateContactStatusUI();
}

// Открытие чата с контактом
function openChat(contact) {
    // Снимаем класс 'active' со всех контактов
    document.querySelectorAll('.contact-item').forEach(el => {
        el.classList.remove('active');
    });
    
    // Добавляем класс 'active' выбранному контакту
    const contactEl = document.querySelector(`.contact-item[data-id="${contact.id}"]`);
    if (contactEl) {
        contactEl.classList.add('active');
    }
    
    // Обновляем заголовок чата
    chatRecipient.textContent = contact.name;
    
    // Включаем поле ввода сообщения
    messageInput.disabled = false;
    sendMessageBtn.disabled = false;
    
    // Устанавливаем фокус на поле ввода
    messageInput.focus();
    
    // Слушаем сообщения
    listenForMessages(contact.id);
}

// Отображение истории сообщений
function displayChatHistory(contactId) {
    // Получаем ID чата
    const chatId = getChatId(currentUser.id, contactId);
    
    // Получаем сообщения из кэша
    const messages = chats[chatId] || [];
    
    // Очищаем контейнер сообщений
    chatMessages.innerHTML = '';
    
    // Если сообщений нет
    if (messages.length === 0) {
        const systemMessage = document.createElement('div');
        systemMessage.className = 'system-message';
        systemMessage.textContent = 'Начните общение прямо сейчас!';
        chatMessages.appendChild(systemMessage);
        return;
    }
    
    // Группируем сообщения по дате для добавления разделителей
    let currentDate = null;
    
    // Отображаем сообщения
    messages.forEach(message => {
        const timestamp = new Date(message.timestamp);
        const messageDate = timestamp.toDateString();
        
        // Если дата изменилась, добавляем разделитель
        if (messageDate !== currentDate) {
            currentDate = messageDate;
            
            const dateSeparator = document.createElement('div');
            dateSeparator.className = 'date-separator';
            
            // Форматируем дату
            const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            dateSeparator.textContent = timestamp.toLocaleDateString('ru-RU', dateOptions);
            
            chatMessages.appendChild(dateSeparator);
        }
        
        // Создаем элемент сообщения
        const messageEl = document.createElement('div');
        messageEl.className = `message ${message.senderId === currentUser.id ? 'own' : 'other'}`;
        
        // Форматируем время
        const timeOptions = { hour: '2-digit', minute: '2-digit' };
        const formattedTime = timestamp.toLocaleTimeString('ru-RU', timeOptions);
        
        // Если сообщение от собеседника, добавляем имя
        if (message.senderId !== currentUser.id) {
            const contact = contacts.find(c => c.id === contactId);
            const contactName = contact ? contact.name : 'Собеседник';
            
            messageEl.innerHTML = `
                <div class="message-author">${escapeHtml(contactName)}</div>
                <div class="message-text">${escapeHtml(message.text)}</div>
                <div class="message-time">${formattedTime}</div>
            `;
        } else {
            messageEl.innerHTML = `
                <div class="message-text">${escapeHtml(message.text)}</div>
                <div class="message-time">${formattedTime}</div>
                <div class="message-status"></div>
            `;
        }
        
        chatMessages.appendChild(messageEl);
    });
    
    // Прокручиваем к последнему сообщению
    scrollToBottom();
}

// Отправка сообщения
function sendMessage() {
    // Получаем текст сообщения
    const text = messageInput.value.trim();
    
    // Проверяем, что текст не пустой и чат выбран
    if (!text || !currentChatId) return;
    
    // Получаем ID собеседника
    const contactId = currentChatId.split('_').find(id => id !== currentUser.id);
    
    // Проверяем, что контакт существует
    if (!contactId) {
        showToast('Ошибка: контакт не выбран', 'error');
        return;
    }
    
    // Создаем объект сообщения
    const message = {
        text: text,
        senderId: currentUser.id,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };
    
    // Добавляем сообщение в базу данных
    const messageRef = database.ref(`chats/${currentChatId}/messages`).push();
    
    messageRef.set(message)
        .then(() => {
            // Очищаем поле ввода
            messageInput.value = '';
            
            // Обновляем последнее сообщение и счетчик непрочитанных у собеседника
            const contactRef = database.ref(`users/${contactId}/contacts/${currentUser.id}`);
            
            // Получаем текущие данные о контакте
            contactRef.once('value')
                .then(snapshot => {
                    const contactData = snapshot.val() || {};
                    
                    // Увеличиваем счетчик непрочитанных сообщений
                    const unreadCount = (contactData.unreadCount || 0) + 1;
                    
                    // Обновляем данные контакта
                    contactRef.update({
                        lastMessage: text,
                        unreadCount: unreadCount,
                        timestamp: firebase.database.ServerValue.TIMESTAMP
                    }).catch(error => {
                        console.error('Ошибка при обновлении данных контакта:', error);
                    });
                })
                .catch(error => {
                    console.error('Ошибка при получении данных контакта:', error);
                });
            
            // Обновляем данные контакта у текущего пользователя
            database.ref(`users/${currentUser.id}/contacts/${contactId}`).update({
                lastMessage: text,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            }).catch(error => {
                console.error('Ошибка при обновлении данных контакта текущего пользователя:', error);
            });
        })
        .catch(error => {
            console.error('Ошибка при отправке сообщения:', error);
            showToast('Ошибка при отправке сообщения', 'error');
        });
}

// Экранирование HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Прокрутка к последнему сообщению
function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Отображение toast-уведомления
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    // Добавляем toast в контейнер
    toastsContainer.appendChild(toast);
    
    // Удаляем toast через 3 секунды
    setTimeout(() => {
        toast.classList.add('hide');
        setTimeout(() => {
            toastsContainer.removeChild(toast);
        }, 300);
    }, 3000);
} 
} 