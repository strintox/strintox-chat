// DOM элементы
const authPage = document.getElementById('auth-page');
const messengerPage = document.getElementById('messenger-page');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const tabBtns = document.querySelectorAll('.tab-btn');
const chatsList = document.getElementById('chats-list');
const emptyChat = document.getElementById('empty-chat');
const activeChat = document.getElementById('active-chat');
const messagesContainer = document.getElementById('messages-container');
const messageText = document.getElementById('message-text');
const sendMessageBtn = document.getElementById('send-message-btn');
const newChatBtn = document.getElementById('new-chat-btn');
const newChatModal = document.getElementById('new-chat-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const userSearch = document.getElementById('user-search');
const usersList = document.getElementById('users-list');
const currentUsername = document.getElementById('current-username');
const backToChatBtn = document.querySelector('.back-to-chats');
const settingsBtn = document.getElementById('settings-btn');
const profileModal = document.getElementById('profile-modal');
const closeProfileModalBtn = document.getElementById('close-profile-modal-btn');
const avatarUploadInput = document.getElementById('avatar-upload');
const profileAvatarPreview = document.getElementById('profile-avatar-preview');
const profileAvatarPlaceholder = document.getElementById('profile-avatar-placeholder');
const saveAvatarBtn = document.getElementById('save-avatar-btn');
const profileUsernameInput = document.getElementById('profile-username');
const profileEmailInput = document.getElementById('profile-email');
const logoutBtn = document.getElementById('logout-btn');
const themeToggle = document.getElementById('theme-toggle');
const currentUserAvatarContainer = document.getElementById('current-user-avatar-container');

// Текущее состояние приложения
let currentUser = null;
let currentChatId = null;
let allUsers = [];
let userChats = [];
let selectedAvatarFile = null;

// Настройки API Imgur
const IMGUR_CLIENT_ID = 'ce9ab178d9a9aed'; // Публичный Client ID для демонстрации (рекомендуется заменить на свой)

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    // Проверка авторизации пользователя
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            getUserProfile();
            switchToMessenger();
            loadChats();
            initTheme();
        } else {
            switchToAuth();
        }
    });

    // Обработчики событий
    setupEventListeners();
});

// Инициализация темы
function initTheme() {
    // Проверка сохраненного значения в localStorage
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // Установка состояния переключателя
    themeToggle.checked = savedTheme === 'dark';
}

// Переключение темы
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Переключение между вкладками входа и регистрации
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const tab = btn.getAttribute('data-tab');
            if (tab === 'login') {
                loginForm.style.display = 'block';
                registerForm.style.display = 'none';
            } else {
                loginForm.style.display = 'none';
                registerForm.style.display = 'block';
            }
        });
    });

    // Обработка формы входа
    loginForm.addEventListener('submit', e => {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        
        loginWithUsernameAndPassword(username, password);
    });

    // Обработка формы регистрации
    registerForm.addEventListener('submit', e => {
        e.preventDefault();
        const username = document.getElementById('register-username').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        
        registerUser(username, email, password);
    });

    // Отправка сообщения
    sendMessageBtn.addEventListener('click', () => {
        sendMessage();
    });

    // Отправка сообщения по Enter (Shift+Enter для новой строки)
    messageText.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Открытие модального окна для нового чата
    newChatBtn.addEventListener('click', () => {
        openNewChatModal();
    });

    // Закрытие модального окна
    closeModalBtn.addEventListener('click', () => {
        newChatModal.style.display = 'none';
    });

    // Закрытие модального окна по клику вне его содержимого
    window.addEventListener('click', e => {
        if (e.target === newChatModal) {
            newChatModal.style.display = 'none';
        }
        if (e.target === profileModal) {
            profileModal.style.display = 'none';
        }
    });

    // Поиск пользователей
    userSearch.addEventListener('input', e => {
        const searchQuery = e.target.value.toLowerCase();
        searchUsers(searchQuery);
    });

    // Кнопка возврата к чатам на мобильных устройствах
    backToChatBtn.addEventListener('click', () => {
        document.querySelector('.sidebar').classList.remove('sidebar-hidden');
        document.querySelector('.chat-area').classList.remove('chat-visible');
    });

    // Открытие настроек профиля
    settingsBtn.addEventListener('click', () => {
        openProfileModal();
    });

    // Клик на аватар пользователя также открывает настройки профиля
    currentUserAvatarContainer.addEventListener('click', () => {
        openProfileModal();
    });

    // Закрытие модального окна настроек профиля
    closeProfileModalBtn.addEventListener('click', () => {
        profileModal.style.display = 'none';
    });

    // Выбор файла аватара
    avatarUploadInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            
            // Проверка типа файла
            if (!file.type.match('image.*')) {
                alert('Пожалуйста, выберите изображение');
                return;
            }
            
            // Проверка размера файла (не более 2MB)
            if (file.size > 2 * 1024 * 1024) {
                alert('Размер файла не должен превышать 2MB');
                return;
            }
            
            selectedAvatarFile = file;
            
            // Отображение превью
            const reader = new FileReader();
            reader.onload = (e) => {
                profileAvatarPreview.src = e.target.result;
                profileAvatarPreview.style.display = 'block';
                profileAvatarPlaceholder.style.display = 'none';
            };
            reader.readAsDataURL(file);
            
            // Активация кнопки сохранения
            saveAvatarBtn.disabled = false;
        }
    });

    // Сохранение аватара
    saveAvatarBtn.addEventListener('click', () => {
        if (selectedAvatarFile) {
            uploadImageToImgur(selectedAvatarFile)
                .then(imageUrl => {
                    updateUserAvatar(imageUrl);
                })
                .catch(error => {
                    console.error('Ошибка загрузки изображения:', error);
                    alert('Не удалось загрузить изображение. Пожалуйста, попробуйте еще раз.');
                });
        }
    });

    // Выход из аккаунта
    logoutBtn.addEventListener('click', () => {
        auth.signOut()
            .then(() => {
                console.log('Выход выполнен успешно');
            })
            .catch(err => {
                console.error('Ошибка выхода:', err.message);
            });
    });

    // Переключение темы
    themeToggle.addEventListener('change', () => {
        toggleTheme();
    });
}

// Открытие модального окна профиля
function openProfileModal() {
    if (currentUser) {
        db.collection('users')
            .doc(currentUser.uid)
            .get()
            .then(doc => {
                if (doc.exists) {
                    const userData = doc.data();
                    
                    // Заполнение полей формы
                    profileUsernameInput.value = userData.username;
                    profileEmailInput.value = userData.email;
                    
                    // Установка аватара или заполнителя
                    if (userData.avatarUrl) {
                        profileAvatarPreview.src = userData.avatarUrl;
                        profileAvatarPreview.style.display = 'block';
                        profileAvatarPlaceholder.style.display = 'none';
                    } else {
                        profileAvatarPreview.style.display = 'none';
                        profileAvatarPlaceholder.style.display = 'flex';
                        profileAvatarPlaceholder.textContent = userData.username.charAt(0).toUpperCase();
                    }
                    
                    // Отображение модального окна
                    profileModal.style.display = 'flex';
                    
                    // Сброс выбранного файла
                    selectedAvatarFile = null;
                    saveAvatarBtn.disabled = true;
                }
            })
            .catch(err => {
                console.error('Ошибка получения данных пользователя:', err);
            });
    }
}

// Загрузка изображения на Imgur
function uploadImageToImgur(imageFile) {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('image', imageFile);
        
        fetch('https://api.imgur.com/3/image', {
            method: 'POST',
            headers: {
                'Authorization': `Client-ID ${IMGUR_CLIENT_ID}`
            },
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Ошибка при загрузке изображения');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                resolve(data.data.link);
            } else {
                reject(new Error('Ошибка при загрузке изображения на Imgur'));
            }
        })
        .catch(error => {
            reject(error);
        });
    });
}

// Обновление аватара пользователя
function updateUserAvatar(imageUrl) {
    if (!currentUser) return;
    
    db.collection('users')
        .doc(currentUser.uid)
        .update({
            avatarUrl: imageUrl
        })
        .then(() => {
            console.log('Аватар обновлен успешно');
            
            // Обновить аватар в интерфейсе
            const currentUserAvatar = document.getElementById('current-user-avatar');
            const currentUserAvatarPlaceholder = document.getElementById('current-user-avatar-placeholder');
            
            currentUserAvatar.src = imageUrl;
            currentUserAvatar.style.display = 'block';
            currentUserAvatarPlaceholder.style.display = 'none';
            
            // Деактивировать кнопку сохранения
            saveAvatarBtn.disabled = true;
            
            // Закрыть модальное окно
            profileModal.style.display = 'none';
            
            // Сбросить выбранный файл
            selectedAvatarFile = null;
        })
        .catch(err => {
            console.error('Ошибка обновления аватара:', err);
            alert('Не удалось обновить аватар. Пожалуйста, попробуйте еще раз.');
        });
}

// Авторизация с логином и паролем
function loginWithUsernameAndPassword(username, password) {
    // Найти email по логину
    db.collection('users')
        .where('username', '==', username)
        .get()
        .then(snapshot => {
            if (snapshot.empty) {
                alert('Пользователь не найден');
                return;
            }
            
            const userData = snapshot.docs[0].data();
            
            // Войти с найденным email и введенным паролем
            auth.signInWithEmailAndPassword(userData.email, password)
                .then(cred => {
                    console.log('Вход выполнен успешно');
                    loginForm.reset();
                })
                .catch(err => {
                    console.error('Ошибка входа:', err.message);
                    alert('Неверный пароль');
                });
        })
        .catch(err => {
            console.error('Ошибка поиска пользователя:', err.message);
            alert('Произошла ошибка при входе');
        });
}

// Регистрация нового пользователя
function registerUser(username, email, password) {
    // Проверка уникальности имени пользователя
    db.collection('users')
        .where('username', '==', username)
        .get()
        .then(snapshot => {
            if (!snapshot.empty) {
                alert('Логин уже занят');
                return;
            }
            
            // Создание пользователя в Firebase Auth
            auth.createUserWithEmailAndPassword(email, password)
                .then(cred => {
                    // Сохранение данных пользователя в Firestore
                    return db.collection('users').doc(cred.user.uid).set({
                        username,
                        email,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        avatarUrl: null
                    });
                })
                .then(() => {
                    console.log('Пользователь зарегистрирован успешно');
                    registerForm.reset();
                })
                .catch(err => {
                    console.error('Ошибка регистрации:', err.message);
                    alert('Ошибка при регистрации: ' + err.message);
                });
        })
        .catch(err => {
            console.error('Ошибка проверки логина:', err.message);
            alert('Произошла ошибка при регистрации');
        });
}

// Получение данных профиля пользователя
function getUserProfile() {
    db.collection('users')
        .doc(currentUser.uid)
        .get()
        .then(doc => {
            if (doc.exists) {
                const userData = doc.data();
                currentUsername.textContent = userData.username;
                
                // Установка аватара или заполнителя
                const avatarImg = document.getElementById('current-user-avatar');
                const avatarPlaceholder = document.getElementById('current-user-avatar-placeholder');
                
                if (userData.avatarUrl) {
                    avatarImg.src = userData.avatarUrl;
                    avatarImg.style.display = 'block';
                    avatarPlaceholder.style.display = 'none';
                } else {
                    avatarImg.style.display = 'none';
                    avatarPlaceholder.textContent = userData.username.charAt(0).toUpperCase();
                    avatarPlaceholder.style.display = 'flex';
                }
            }
        })
        .catch(err => {
            console.error('Ошибка получения профиля:', err.message);
        });
}

// Загрузка чатов пользователя
function loadChats() {
    db.collection('chats')
        .where('participants', 'array-contains', currentUser.uid)
        .onSnapshot(snapshot => {
            userChats = [];
            chatsList.innerHTML = '';
            
            if (snapshot.empty) {
                const emptyMessage = document.createElement('div');
                emptyMessage.className = 'empty-chats-message';
                emptyMessage.textContent = 'У вас пока нет чатов';
                chatsList.appendChild(emptyMessage);
                return;
            }
            
            snapshot.forEach(doc => {
                const chatData = doc.data();
                chatData.id = doc.id;
                userChats.push(chatData);
                
                // Получить информацию о другом участнике чата
                const otherParticipantId = chatData.participants.find(id => id !== currentUser.uid);
                
                if (otherParticipantId) {
                    db.collection('users')
                        .doc(otherParticipantId)
                        .get()
                        .then(userDoc => {
                            if (userDoc.exists) {
                                const userData = userDoc.data();
                                
                                // Создать элемент чата
                                const chatItem = createChatItem(
                                    doc.id,
                                    userData.username,
                                    userData.avatarUrl || '',
                                    chatData.lastMessage,
                                    formatTimestamp(chatData.lastMessageTime)
                                );
                                
                                chatsList.appendChild(chatItem);
                            }
                        });
                }
            });
        });
}

// Создание элемента чата
function createChatItem(id, name, avatarUrl, lastMessage, time) {
    const chatItem = document.createElement('div');
    chatItem.className = 'chat-item';
    chatItem.dataset.chatId = id;
    
    let avatarContent;
    if (avatarUrl) {
        avatarContent = `<img class="chat-item-avatar" src="${avatarUrl}" alt="${name}">`;
    } else {
        avatarContent = `<div class="avatar-placeholder">${name.charAt(0).toUpperCase()}</div>`;
    }
    
    chatItem.innerHTML = `
        ${avatarContent}
        <div class="chat-item-info">
            <div class="chat-item-header">
                <span class="chat-item-name">${name}</span>
                <span class="chat-item-time">${time}</span>
            </div>
            <div class="chat-item-last-message">${lastMessage || 'Нет сообщений'}</div>
        </div>
    `;
    
    // Добавление эффекта пульсации
    chatItem.classList.add('ripple');
    
    // Обработчик клика на чат
    chatItem.addEventListener('click', () => {
        document.querySelectorAll('.chat-item').forEach(item => {
            item.classList.remove('active');
        });
        chatItem.classList.add('active');
        openChat(id);
    });
    
    return chatItem;
}

// Открытие чата
function openChat(chatId) {
    currentChatId = chatId;
    emptyChat.style.display = 'none';
    activeChat.style.display = 'flex';
    
    // Обновить заголовок чата
    const chat = userChats.find(c => c.id === chatId);
    
    if (chat) {
        const otherParticipantId = chat.participants.find(id => id !== currentUser.uid);
        
        db.collection('users')
            .doc(otherParticipantId)
            .get()
            .then(doc => {
                if (doc.exists) {
                    const userData = doc.data();
                    document.getElementById('chat-title').textContent = userData.username;
                    
                    // Проверка существования аватара
                    const chatAvatar = document.getElementById('chat-avatar');
                    let avatarPlaceholder = document.querySelector('.avatar-placeholder-header');
                    
                    // Удалить старый заполнитель, если он существует
                    if (avatarPlaceholder) {
                        avatarPlaceholder.remove();
                    }
                    
                    if (userData.avatarUrl) {
                        chatAvatar.src = userData.avatarUrl;
                        chatAvatar.style.display = 'block';
                    } else {
                        chatAvatar.style.display = 'none';
                        
                        // Создать новый заполнитель
                        avatarPlaceholder = document.createElement('div');
                        avatarPlaceholder.className = 'avatar-placeholder-header';
                        avatarPlaceholder.textContent = userData.username.charAt(0).toUpperCase();
                        
                        // Вставить перед .chat-details
                        document.querySelector('.chat-info').insertBefore(
                            avatarPlaceholder, 
                            document.querySelector('.chat-details')
                        );
                    }
                }
            });
    }
    
    // Загрузить сообщения
    loadMessages(chatId);
    
    // На мобильных устройствах скрыть сайдбар
    if (window.innerWidth <= 768) {
        document.querySelector('.sidebar').classList.add('sidebar-hidden');
        document.querySelector('.chat-area').classList.add('chat-visible');
    }
}

// Загрузка сообщений чата
function loadMessages(chatId) {
    messagesContainer.innerHTML = '';
    
    db.collection('chats')
        .doc(chatId)
        .collection('messages')
        .orderBy('timestamp')
        .onSnapshot(snapshot => {
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                    const messageData = change.doc.data();
                    const messageElement = createMessageElement(
                        messageData.senderId === currentUser.uid,
                        messageData.text,
                        formatTimestamp(messageData.timestamp)
                    );
                    
                    messagesContainer.appendChild(messageElement);
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                }
            });
        });
}

// Создание элемента сообщения
function createMessageElement(isOutgoing, text, time) {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${isOutgoing ? 'message-outgoing' : 'message-incoming'}`;
    
    messageElement.innerHTML = `
        <div class="message-text">${text}</div>
        <div class="message-time">${time}</div>
    `;
    
    return messageElement;
}

// Отправка сообщения
function sendMessage() {
    const text = messageText.value.trim();
    
    if (text && currentChatId) {
        const timestamp = firebase.firestore.FieldValue.serverTimestamp();
        
        // Добавить сообщение в коллекцию messages чата
        db.collection('chats')
            .doc(currentChatId)
            .collection('messages')
            .add({
                text,
                senderId: currentUser.uid,
                timestamp
            })
            .then(() => {
                // Обновить информацию о последнем сообщении в чате
                return db.collection('chats').doc(currentChatId).update({
                    lastMessage: text,
                    lastMessageTime: timestamp
                });
            })
            .then(() => {
                messageText.value = '';
            })
            .catch(err => {
                console.error('Ошибка отправки сообщения:', err.message);
                alert('Не удалось отправить сообщение');
            });
    }
}

// Открытие модального окна для создания нового чата
function openNewChatModal() {
    newChatModal.style.display = 'flex';
    userSearch.value = '';
    loadAllUsers();
}

// Загрузка всех пользователей
function loadAllUsers() {
    usersList.innerHTML = '';
    
    db.collection('users')
        .where(firebase.firestore.FieldPath.documentId(), '!=', currentUser.uid)
        .get()
        .then(snapshot => {
            allUsers = [];
            
            if (snapshot.empty) {
                const emptyMessage = document.createElement('div');
                emptyMessage.className = 'empty-users-message';
                emptyMessage.textContent = 'Пока нет других пользователей';
                usersList.appendChild(emptyMessage);
                return;
            }
            
            snapshot.forEach(doc => {
                const userData = doc.data();
                userData.id = doc.id;
                allUsers.push(userData);
                
                const userItem = createUserItem(userData);
                usersList.appendChild(userItem);
            });
        })
        .catch(err => {
            console.error('Ошибка загрузки пользователей:', err.message);
        });
}

// Создание элемента пользователя
function createUserItem(userData) {
    const userItem = document.createElement('div');
    userItem.className = 'user-item ripple';
    
    let avatarContent;
    if (userData.avatarUrl) {
        avatarContent = `<img src="${userData.avatarUrl}" alt="${userData.username}">`;
    } else {
        avatarContent = `<div class="avatar-placeholder-user">${userData.username.charAt(0).toUpperCase()}</div>`;
    }
    
    userItem.innerHTML = `
        ${avatarContent}
        <span>${userData.username}</span>
    `;
    
    // Обработчик клика на пользователя для создания чата
    userItem.addEventListener('click', () => {
        createOrOpenChat(userData.id);
    });
    
    return userItem;
}

// Поиск пользователей
function searchUsers(query) {
    usersList.innerHTML = '';
    
    const filteredUsers = allUsers.filter(user => 
        user.username.toLowerCase().includes(query)
    );
    
    if (filteredUsers.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-users-message';
        emptyMessage.textContent = 'Пользователи не найдены';
        usersList.appendChild(emptyMessage);
        return;
    }
    
    filteredUsers.forEach(userData => {
        const userItem = createUserItem(userData);
        usersList.appendChild(userItem);
    });
}

// Создание или открытие чата с пользователем
function createOrOpenChat(userId) {
    // Закрыть модальное окно сразу для лучшего UX
    newChatModal.style.display = 'none';
    
    // Проверить, существует ли уже чат с этим пользователем
    db.collection('chats')
        .where('participants', 'array-contains', currentUser.uid)
        .get()
        .then(snapshot => {
            let existingChat = null;
            
            snapshot.forEach(doc => {
                const chatData = doc.data();
                if (chatData.participants.includes(userId)) {
                    existingChat = { id: doc.id, ...chatData };
                }
            });
            
            if (existingChat) {
                // Если чат существует, открыть его
                openChat(existingChat.id);
            } else {
                // Если чата нет, создать новый
                const timestamp = firebase.firestore.FieldValue.serverTimestamp();
                const newChat = {
                    participants: [currentUser.uid, userId],
                    createdAt: timestamp,
                    lastMessageTime: timestamp,
                    lastMessage: ''
                };
                
                db.collection('chats')
                    .add(newChat)
                    .then(docRef => {
                        openChat(docRef.id);
                    })
                    .catch(err => {
                        console.error('Ошибка создания чата:', err.message);
                        alert('Не удалось создать чат');
                    });
            }
        })
        .catch(err => {
            console.error('Ошибка проверки существующих чатов:', err.message);
        });
}

// Форматирование временной метки
function formatTimestamp(timestamp) {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    // Сегодня - вернуть только время
    if (diff < 24 * 60 * 60 * 1000 && date.getDate() === now.getDate()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Вчера
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.getDate() === yesterday.getDate() && 
        date.getMonth() === yesterday.getMonth() && 
        date.getFullYear() === yesterday.getFullYear()) {
        return 'вчера';
    }
    
    // Дата в этом году
    if (date.getFullYear() === now.getFullYear()) {
        return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
    }
    
    // Полная дата
    return date.toLocaleDateString();
}

// Переключение на страницу аутентификации
function switchToAuth() {
    authPage.style.display = 'flex';
    messengerPage.style.display = 'none';
}

// Переключение на страницу мессенджера
function switchToMessenger() {
    authPage.style.display = 'none';
    messengerPage.style.display = 'flex';
    
    // На мобильных устройствах показать сайдбар при входе
    if (window.innerWidth <= 768) {
        document.querySelector('.sidebar').classList.remove('sidebar-hidden');
        document.querySelector('.chat-area').classList.remove('chat-visible');
    }
} 