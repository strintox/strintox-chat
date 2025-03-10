// Конфигурация Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAAdu7bWt9F2GF1W9qEzfc2f_y6LCqMM14",
    authDomain: "strintox-3a2b8.firebaseapp.com",
    projectId: "strintox-3a2b8",
    storageBucket: "strintox-3a2b8.firebasestorage.app",
    messagingSenderId: "12688530154",
    appId: "1:12688530154:web:da86782e5c3261c6c35593",
    measurementId: "G-WVB4V2T51Y"
};

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);

// Получение ссылок на сервисы Firebase
const auth = firebase.auth();
const db = firebase.firestore();

// DOM элементы
const authSection = document.getElementById('authSection');
const usersSection = document.getElementById('usersSection');
const chatsListSection = document.getElementById('chatsListSection');
const chatsListView = document.getElementById('chatsList-view');
const chatView = document.getElementById('chat-view');

const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

const loginUsername = document.getElementById('loginUsername');
const loginPassword = document.getElementById('loginPassword');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');

const registerUsername = document.getElementById('registerUsername');
const registerPassword = document.getElementById('registerPassword');
const confirmPassword = document.getElementById('confirmPassword');
const registerBtn = document.getElementById('registerBtn');
const registerError = document.getElementById('registerError');

const showRegisterBtn = document.getElementById('showRegisterBtn');
const showLoginBtn = document.getElementById('showLoginBtn');

const currentUsername = document.getElementById('currentUsername');
const logoutBtn = document.getElementById('logoutBtn');

const searchInput = document.getElementById('searchInput');
const usersList = document.getElementById('usersList');
const chatsList = document.getElementById('chatsList');
const noChatsMessage = document.getElementById('noChatsMessage');
const browseUsersBtn = document.getElementById('browseUsersBtn');

const chatWithUser = document.getElementById('chatWithUser');
const messagesContainer = document.getElementById('messagesContainer');
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');
const backToChats = document.getElementById('backToChats');

const navTabs = document.getElementById('navTabs');

// Текущий чат
let currentChatUser = null;
let currentUser = null;
let messagesListener = null;
let chatsListener = null;
let usersCache = {}; // Кэш пользователей для оптимизации
let isMobile = window.innerWidth < 768; // Определение мобильного устройства

// Определение мобильного устройства при изменении размера окна
window.addEventListener('resize', () => {
    isMobile = window.innerWidth < 768;
});

// Запрет масштабирования на мобильных устройствах
document.addEventListener('gesturestart', function(e) {
    e.preventDefault();
});

// Запрещаем контекстное меню для защиты от копирования
document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
});

// Функция для переключения между секциями с анимацией
function showSection(sectionId) {
    [authSection, usersSection, chatsListSection].forEach(section => {
        section.classList.remove('active');
    });
    
    // Добавляем анимацию для плавного появления секции
    const targetSection = document.getElementById(sectionId);
    
    // Сбрасываем анимацию и запускаем снова
    targetSection.style.animation = 'none';
    targetSection.offsetHeight; // Сброс анимации
    targetSection.style.animation = 'fadeIn 0.3s ease-out';
    
    targetSection.classList.add('active');

    if (sectionId !== 'authSection') {
        navTabs.style.display = 'flex';
        
        // Обновляем активную вкладку
        document.querySelectorAll('.nav-tab').forEach(tab => {
            if (tab.dataset.section === sectionId) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });

        // Если выбраны чаты, показываем список чатов (скрываем конкретный чат)
        if (sectionId === 'chatsListSection') {
            if (currentChatUser === null) {
                showChatsList();
            }
        }
    } else {
        navTabs.style.display = 'none';
    }
}

// Переключение между списком чатов и выбранным чатом с анимацией
function showChatsList() {
    // Удаляем активный класс с чата
    chatView.classList.remove('active');
    
    setTimeout(() => {
        chatsListView.style.display = 'block';
        chatView.style.display = 'none';
        
        // Восстанавливаем видимость навигации на мобильных
        if (isMobile) {
            navTabs.style.display = 'flex';
        }
    }, 300); // Подождем пока завершится анимация
    
    if (messagesListener) {
        messagesListener();
        messagesListener = null;
    }
    currentChatUser = null;
    
    // Скролл в начало списка чатов
    setTimeout(() => {
        if (chatsListSection.classList.contains('active')) {
            window.scrollTo(0, 0);
        }
    }, 350);
}

function showChat() {
    chatView.style.display = 'block';
    
    // Скрываем навигацию на мобильных устройствах
    if (isMobile) {
        navTabs.style.display = 'none';
    }
    
    setTimeout(() => {
        chatView.classList.add('active');
    }, 10); // Небольшая задержка для корректной анимации
    
    // Добавляем анимацию fadeIn для сообщений
    setTimeout(() => {
        const messages = document.querySelectorAll('.message');
        messages.forEach((msg, index) => {
            msg.style.setProperty('--index', index);
        });
        
        // Прокручиваем к последнему сообщению
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 300);
}

// Функция для переключения между формами входа и регистрации
showRegisterBtn.addEventListener('click', () => {
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
    
    // Анимация для формы регистрации
    registerForm.style.animation = 'none';
    registerForm.offsetHeight;
    registerForm.style.animation = 'fadeIn 0.3s ease-out';
});

showLoginBtn.addEventListener('click', () => {
    registerForm.style.display = 'none';
    loginForm.style.display = 'block';
    
    // Анимация для формы входа
    loginForm.style.animation = 'none';
    loginForm.offsetHeight;
    loginForm.style.animation = 'fadeIn 0.3s ease-out';
});

// Кнопка для перехода к пользователям из пустого списка чатов
browseUsersBtn.addEventListener('click', () => {
    showSection('usersSection');
});

// Функция регистрации пользователя
registerBtn.addEventListener('click', () => {
    const username = registerUsername.value.trim();
    const password = registerPassword.value;
    const confirmPass = confirmPassword.value;

    // Сбросить ошибки
    registerError.style.display = 'none';

    // Валидация
    if (!username || !password || !confirmPass) {
        registerError.textContent = 'Пожалуйста, заполните все поля';
        registerError.style.display = 'block';
        return;
    }

    if (password !== confirmPass) {
        registerError.textContent = 'Пароли не совпадают';
        registerError.style.display = 'block';
        return;
    }

    // Отключаем кнопку во время обработки
    registerBtn.disabled = true;
    registerBtn.textContent = 'Обработка...';

    // Проверка на уникальность логина
    db.collection('users').where('username', '==', username).get()
        .then(snapshot => {
            if (!snapshot.empty) {
                registerError.textContent = 'Этот логин уже занят';
                registerError.style.display = 'block';
                registerBtn.disabled = false;
                registerBtn.textContent = 'Зарегистрироваться';
                return;
            }

            // Создаем пользователя в Firebase Auth
            const email = `${username}@strintox.app`; // Генерируем email на основе логина
            auth.createUserWithEmailAndPassword(email, password)
                .then(userCredential => {
                    // Создаем документ пользователя в Firestore
                    const user = userCredential.user;
                    return db.collection('users').doc(user.uid).set({
                        username: username,
                        email: email,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                })
                .then(() => {
                    // Успешная регистрация
                    registerForm.reset();
                    showSection('chatsListSection');
                })
                .catch(error => {
                    registerError.textContent = error.message;
                    registerError.style.display = 'block';
                })
                .finally(() => {
                    registerBtn.disabled = false;
                    registerBtn.textContent = 'Зарегистрироваться';
                });
        })
        .catch(error => {
            registerError.textContent = error.message;
            registerError.style.display = 'block';
            registerBtn.disabled = false;
            registerBtn.textContent = 'Зарегистрироваться';
        });
});

// Функция входа пользователя
loginBtn.addEventListener('click', () => {
    const username = loginUsername.value.trim();
    const password = loginPassword.value;

    // Сбросить ошибки
    loginError.style.display = 'none';

    // Валидация
    if (!username || !password) {
        loginError.textContent = 'Пожалуйста, заполните все поля';
        loginError.style.display = 'block';
        return;
    }

    // Отключаем кнопку во время обработки
    loginBtn.disabled = true;
    loginBtn.textContent = 'Вход...';

    // Находим пользователя по логину
    db.collection('users').where('username', '==', username).get()
        .then(snapshot => {
            if (snapshot.empty) {
                loginError.textContent = 'Пользователь не найден';
                loginError.style.display = 'block';
                loginBtn.disabled = false;
                loginBtn.textContent = 'Войти';
                return;
            }

            // Получаем email и выполняем вход
            const userDoc = snapshot.docs[0].data();
            const email = userDoc.email;

            auth.signInWithEmailAndPassword(email, password)
                .then(() => {
                    // Успешный вход
                    loginForm.reset();
                    showSection('chatsListSection');
                })
                .catch(error => {
                    loginError.textContent = 'Неверный пароль';
                    loginError.style.display = 'block';
                })
                .finally(() => {
                    loginBtn.disabled = false;
                    loginBtn.textContent = 'Войти';
                });
        })
        .catch(error => {
            loginError.textContent = error.message;
            loginError.style.display = 'block';
            loginBtn.disabled = false;
            loginBtn.textContent = 'Войти';
        });
});

// Функция выхода
logoutBtn.addEventListener('click', () => {
    auth.signOut()
        .then(() => {
            showSection('authSection');
            navTabs.style.display = 'none';
            currentUser = null;
            usersCache = {}; // Очищаем кэш пользователей
            
            // Отключаем слушателей
            if (messagesListener) {
                messagesListener();
                messagesListener = null;
            }
            
            if (chatsListener) {
                chatsListener();
                chatsListener = null;
            }
        })
        .catch(error => {
            console.error('Ошибка при выходе:', error);
        });
});

// Поиск пользователей
searchInput.addEventListener('input', debounce(() => {
    const searchTerm = searchInput.value.trim().toLowerCase();
    
    if (!searchTerm) {
        loadAllUsers();
        return;
    }
    
    db.collection('users')
        .orderBy('username')
        .startAt(searchTerm)
        .endAt(searchTerm + '\uf8ff')
        .get()
        .then(snapshot => {
            renderUsersList(snapshot);
        })
        .catch(error => {
            console.error('Ошибка при поиске пользователей:', error);
        });
}, 500));

// Загрузка всех пользователей
function loadAllUsers() {
    usersList.innerHTML = '<div class="loading">Загрузка пользователей</div>';
    
    db.collection('users')
        .orderBy('username')
        .get()
        .then(snapshot => {
            renderUsersList(snapshot);
        })
        .catch(error => {
            console.error('Ошибка при загрузке пользователей:', error);
            usersList.innerHTML = '<p>Ошибка при загрузке пользователей</p>';
        });
}

// Отображение списка пользователей
function renderUsersList(snapshot) {
    usersList.innerHTML = '';
    
    if (snapshot.empty) {
        usersList.innerHTML = '<p class="text-center">Пользователи не найдены</p>';
        return;
    }
    
    snapshot.forEach((doc, index) => {
        const userData = doc.data();
        const userId = doc.id;
        
        // Кэшируем пользователя для оптимизации
        usersCache[userId] = userData;
        
        // Не показываем текущего пользователя в списке
        if (auth.currentUser && userId === auth.currentUser.uid) {
            return;
        }
        
        const userItem = document.createElement('li');
        userItem.className = 'user-item';
        userItem.style.setProperty('--index', index);
        userItem.style.animationDelay = `${index * 0.05}s`;
        
        userItem.innerHTML = `
            <div class="user-item-username">${userData.username}</div>
            <button class="start-chat-btn" data-user-id="${userId}" data-username="${userData.username}">Начать чат</button>
        `;
        
        // Обработчик нажатия на кнопку "Начать чат"
        userItem.querySelector('.start-chat-btn').addEventListener('click', (e) => {
            const userId = e.target.dataset.userId;
            const username = e.target.dataset.username;
            startChat(userId, username);
        });
        
        usersList.appendChild(userItem);
    });
}

// Улучшенная функция загрузки списка чатов
function loadChats() {
    const currentUserId = auth.currentUser.uid;
    
    // Показываем загрузку
    chatsList.innerHTML = '<div class="loading">Загрузка чатов</div>';
    noChatsMessage.style.display = 'none';
    
    // Устанавливаем таймаут для обработки случая, когда чаты не загружаются
    const timeout = setTimeout(() => {
        if (chatsList.innerHTML === '<div class="loading">Загрузка чатов</div>') {
            chatsList.innerHTML = '';
            noChatsMessage.style.display = 'block';
        }
    }, 10000);
    
    // Отписываемся от предыдущего слушателя, если он существует
    if (chatsListener) {
        chatsListener();
    }
    
    // Подписываемся на обновления в реальном времени, используя более простой подход
    chatsListener = db.collection('chats')
        .where('participants', 'array-contains', currentUserId)
        .onSnapshot(snapshot => {
            clearTimeout(timeout); // Отменяем таймаут, так как данные получены
            
            if (snapshot.empty) {
                chatsList.innerHTML = '';
                noChatsMessage.style.display = 'block';
                return;
            }
            
            // Скрываем сообщение о пустом списке
            noChatsMessage.style.display = 'none';
            
            // Массив для хранения данных о чатах
            const chatsData = [];
            
            // Обработка каждого чата
            snapshot.forEach(doc => {
                const chatData = doc.data();
                const otherUserId = chatData.participants.find(id => id !== currentUserId);
                
                // Добавляем в массив для дальнейшей обработки
                chatsData.push({
                    chatId: doc.id,
                    otherUserId: otherUserId,
                    lastMessage: chatData.lastMessage || 'Нет сообщений',
                    timestamp: chatData.lastMessageTimestamp || firebase.firestore.Timestamp.now()
                });
            });
            
            // Сортировка по времени последнего сообщения
            chatsData.sort((a, b) => {
                const timestampA = a.timestamp instanceof firebase.firestore.Timestamp ? a.timestamp.toMillis() : 0;
                const timestampB = b.timestamp instanceof firebase.firestore.Timestamp ? b.timestamp.toMillis() : 0;
                return timestampB - timestampA;
            });
            
            // Очищаем список
            chatsList.innerHTML = '';
            
            // Функция для отображения чата
            const renderChatItem = (chatInfo, userData, index) => {
                const chatItem = document.createElement('li');
                chatItem.className = 'chat-item';
                chatItem.dataset.userId = chatInfo.otherUserId;
                chatItem.dataset.username = userData.username;
                chatItem.style.setProperty('--index', index);
                
                // Форматируем время
                let timeStr = '';
                if (chatInfo.timestamp instanceof firebase.firestore.Timestamp) {
                    const date = chatInfo.timestamp.toDate();
                    timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
                }
                
                // Создаем аватар из первой буквы имени пользователя
                const firstLetter = userData.username.charAt(0).toUpperCase();
                
                chatItem.innerHTML = `
                    <div class="chat-item-avatar">${firstLetter}</div>
                    <div class="chat-item-info">
                        <div class="chat-item-username">${userData.username}</div>
                        <div class="chat-item-last-message">${chatInfo.lastMessage}</div>
                    </div>
                    <div class="chat-item-time">${timeStr}</div>
                `;
                
                // Обработчик клика по чату
                chatItem.addEventListener('click', () => {
                    startChat(chatInfo.otherUserId, userData.username);
                });
                
                chatsList.appendChild(chatItem);
            };
            
            // Отображение всех чатов
            Promise.all(chatsData.map((chatInfo, index) => {
                // Проверяем, есть ли пользователь в кэше
                if (usersCache[chatInfo.otherUserId]) {
                    renderChatItem(chatInfo, usersCache[chatInfo.otherUserId], index);
                    return Promise.resolve();
                } else {
                    // Если нет в кэше, загружаем из базы
                    return db.collection('users').doc(chatInfo.otherUserId).get()
                        .then(userDoc => {
                            if (userDoc.exists) {
                                const userData = userDoc.data();
                                // Кэшируем пользователя
                                usersCache[chatInfo.otherUserId] = userData;
                                renderChatItem(chatInfo, userData, index);
                            }
                        })
                        .catch(error => {
                            console.error('Ошибка при загрузке пользователя:', error);
                        });
                }
            })).then(() => {
                // Если нет чатов после всей обработки, показываем сообщение
                if (chatsList.children.length === 0) {
                    noChatsMessage.style.display = 'block';
                }
            });
        }, error => {
            console.error('Ошибка при получении чатов:', error);
            chatsList.innerHTML = '<p>Ошибка при загрузке чатов</p>';
            clearTimeout(timeout);
        });
}

// Функция запуска чата с пользователем
function startChat(userId, username) {
    currentChatUser = {
        id: userId,
        username: username
    };
    
    // Отображаем имя собеседника
    chatWithUser.textContent = username;
    
    // Загружаем историю сообщений
    loadMessages(userId);
    
    // Переходим к чату с анимацией
    showChat();
    
    // Если мы находимся в секции пользователей, переключаемся на секцию чатов
    if (document.getElementById('usersSection').classList.contains('active')) {
        showSection('chatsListSection');
    }
}

// Загрузка сообщений
function loadMessages(otherUserId) {
    const currentUserId = auth.currentUser.uid;
    
    // Очищаем контейнер сообщений и показываем индикатор загрузки
    messagesContainer.innerHTML = '<div class="loading">Загрузка сообщений</div>';
    
    // Создаем ID чата (сортируем ID пользователей для уникальности)
    const chatId = [currentUserId, otherUserId].sort().join('_');
    
    // Отписываемся от предыдущего листенера, если он существует
    if (messagesListener) {
        messagesListener();
    }
    
    // Устанавливаем таймаут для обработки случая, когда сообщения не загружаются
    const timeout = setTimeout(() => {
        if (messagesContainer.querySelector('.loading')) {
            messagesContainer.innerHTML = '<div class="no-content-message">Нет сообщений</div>';
        }
    }, 5000);
    
    // Подписываемся на обновления сообщений в реальном времени
    messagesListener = db.collection('chats')
        .doc(chatId)
        .collection('messages')
        .orderBy('timestamp', 'asc')
        .onSnapshot(snapshot => {
            clearTimeout(timeout); // Отменяем таймаут, так как данные получены
            
            if (snapshot.empty) {
                messagesContainer.innerHTML = '<div class="no-content-message">Нет сообщений</div>';
                return;
            }
            
            if (messagesContainer.querySelector('.loading')) {
                messagesContainer.innerHTML = '';
            }
            
            snapshot.docChanges().forEach((change, index) => {
                if (change.type === 'added') {
                    const message = change.doc.data();
                    renderMessage(message, currentUserId, index);
                }
            });
            
            // Прокручиваем к последнему сообщению
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, error => {
            console.error('Ошибка при получении сообщений:', error);
            messagesContainer.innerHTML = '<div class="no-content-message">Ошибка загрузки сообщений</div>';
            clearTimeout(timeout);
        });
}

// Отображение сообщения
function renderMessage(message, currentUserId, index) {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${message.senderId === currentUserId ? 'message-sent' : 'message-received'}`;
    messageElement.style.setProperty('--index', index);
    
    const date = message.timestamp ? new Date(message.timestamp.toDate()) : new Date();
    const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    
    messageElement.innerHTML = `
        <div class="message-text">${message.text}</div>
        <div class="message-time">${timeStr}</div>
    `;
    
    messagesContainer.appendChild(messageElement);
}

// Отправка сообщения
messageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const messageText = messageInput.value.trim();
    if (!messageText || !currentChatUser) return;
    
    // Отключаем кнопку отправки во время обработки
    const sendBtn = messageForm.querySelector('.send-btn');
    sendBtn.disabled = true;
    
    const currentUserId = auth.currentUser.uid;
    const otherUserId = currentChatUser.id;
    
    // Создаем ID чата
    const chatId = [currentUserId, otherUserId].sort().join('_');
    
    // Очищаем поле ввода сразу для лучшего UX
    const messageTextCopy = messageText;
    messageInput.value = '';
    
    // Сохраняем сообщение в Firestore
    db.collection('chats')
        .doc(chatId)
        .collection('messages')
        .add({
            text: messageTextCopy,
            senderId: currentUserId,
            receiverId: otherUserId,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(() => {
            // Обновляем мета-информацию о чате
            return db.collection('chats').doc(chatId).set({
                lastMessage: messageTextCopy,
                lastMessageTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
                participants: [currentUserId, otherUserId]
            }, { merge: true });
        })
        .catch(error => {
            console.error('Ошибка при отправке сообщения:', error);
            alert('Не удалось отправить сообщение');
            messageInput.value = messageTextCopy; // Возвращаем текст в поле ввода в случае ошибки
        })
        .finally(() => {
            sendBtn.disabled = false;
        });
});

// Возврат к списку чатов
backToChats.addEventListener('click', () => {
    showChatsList();
});

// Навигация по вкладкам с анимацией
document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const sectionId = tab.dataset.section;
        
        // Добавляем анимацию пульсации при клике
        tab.style.animation = 'none';
        tab.offsetHeight;
        tab.style.animation = 'pulse 0.5s ease-out';
        
        showSection(sectionId);
    });
});

// Функция debounce для оптимизации поиска
function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            func.apply(context, args);
        }, wait);
    };
}

// Слушатель состояния аутентификации
auth.onAuthStateChanged(user => {
    if (user) {
        // Пользователь авторизован
        db.collection('users').doc(user.uid).get()
            .then(doc => {
                if (doc.exists) {
                    const userData = doc.data();
                    currentUser = {
                        id: user.uid,
                        ...userData
                    };
                    
                    // Кэшируем текущего пользователя
                    usersCache[user.uid] = userData;
                    
                    // Отображаем имя пользователя в хедере
                    currentUsername.textContent = userData.username;
                    
                    // Показываем навигацию
                    navTabs.style.display = 'flex';
                    
                    // Переходим к списку чатов
                    showSection('chatsListSection');
                    showChatsList();
                    
                    // Загружаем чаты и пользователей
                    loadChats();
                    
                    // Загружаем всех пользователей в фоне для кэширования
                    db.collection('users').get().then(snapshot => {
                        snapshot.forEach(doc => {
                            usersCache[doc.id] = doc.data();
                        });
                    });
                }
            })
            .catch(error => {
                console.error('Ошибка при получении данных пользователя:', error);
            });
    } else {
        // Пользователь не авторизован
        showSection('authSection');
        navTabs.style.display = 'none';
    }
}); 