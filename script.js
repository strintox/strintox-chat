// Конфигурация Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAAdu7bWt9F2GF1W9qEzfc2f_y6LCqMM14",
    authDomain: "strintox-3a2b8.firebaseapp.com",
    projectId: "strintox-3a2b8",
    storageBucket: "strintox-3a2b8.appspot.com", // Убедитесь, что строка точно соответствует вашему Firebase проекту
    messagingSenderId: "12688530154",
    appId: "1:12688530154:web:da86782e5c3261c6c35593",
    measurementId: "G-WVB4V2T51Y"
};

// Глобальные переменные и флаги для диагностики
let isFirebaseInitialized = false;
let isAuthInitialized = false;
let isFirestoreInitialized = false;
let isStorageInitialized = false;

// Инициализация Firebase с обработкой ошибок
try {
    firebase.initializeApp(firebaseConfig);
    isFirebaseInitialized = true;
    console.log('Firebase успешно инициализирован');
} catch (error) {
    console.error('Ошибка инициализации Firebase:', error);
    alert('Ошибка инициализации Firebase: ' + error.message);
}

// Получение ссылок на сервисы Firebase с проверками
let auth, db, storage;

try {
    auth = firebase.auth();
    isAuthInitialized = true;
    console.log('Firebase Auth успешно инициализирован');
} catch (error) {
    console.error('Ошибка инициализации Firebase Auth:', error);
}

try {
    db = firebase.firestore();
    isFirestoreInitialized = true;
    console.log('Firestore успешно инициализирован');
} catch (error) {
    console.error('Ошибка инициализации Firestore:', error);
}

try {
    storage = firebase.storage();
    isStorageInitialized = true;
    console.log('Firebase Storage успешно инициализирован');
    
    // Проверим доступность Storage
    const testRef = storage.ref().child('test_access');
    testRef.putString('test').then(() => {
        console.log('Firebase Storage доступен для записи');
        // Удаляем тестовый файл
        testRef.delete().catch(e => console.log('Ошибка при удалении тестового файла:', e));
    }).catch(error => {
        console.error('Ошибка доступа к Firebase Storage:', error);
        alert('Проблема с доступом к Firebase Storage. Загрузка изображений может не работать.');
    });
} catch (error) {
    console.error('Ошибка инициализации Firebase Storage:', error);
}

// Простая проверка подключения
if (isFirestoreInitialized) {
    db.collection('users').limit(1).get()
        .then(() => {
            console.log('Успешно подключились к Firestore');
        })
        .catch(error => {
            console.error('Ошибка подключения к Firestore:', error);
        });
}

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

// Добавляем новые DOM элементы для работы с изображениями
const imageUploadBtn = document.getElementById('imageUploadBtn');

// Текущая ссылка на изображение
let currentImageUrl = null;
let imagePreviewContainer = null;

// Создаем HTML для ввода URL и overlay
const urlInputHtml = `
<div class="url-input-overlay"></div>
<div class="url-input-container">
    <h3>Вставьте ссылку на изображение</h3>
    <div class="url-input-group">
        <input type="text" class="url-input" placeholder="https://example.com/image.jpg">
        <div class="url-buttons-row">
            <button class="url-input-btn url-submit-btn">Добавить</button>
            <button class="url-input-btn url-cancel-btn">Отмена</button>
        </div>
    </div>
</div>
`;

// Добавляем HTML для URL ввода в DOM
document.body.insertAdjacentHTML('beforeend', urlInputHtml);

// Получаем ссылки на новые элементы
const urlInputContainer = document.querySelector('.url-input-container');
const urlInputOverlay = document.querySelector('.url-input-overlay');
const urlInput = document.querySelector('.url-input');
const urlSubmitBtn = document.querySelector('.url-submit-btn');
const urlCancelBtn = document.querySelector('.url-cancel-btn');

// Функция для показа окна ввода URL
function showUrlInput() {
    // Покажем оверлей
    urlInputOverlay.classList.add('active');
    
    // Покажем окно ввода
    urlInputContainer.classList.add('active');
    
    // Блокируем скролл на основной странице
    document.body.style.overflow = 'hidden';
    
    // Фокус на поле ввода (с небольшой задержкой для мобильных)
    setTimeout(() => {
        urlInput.focus();
    }, 100);
}

// Функция для скрытия окна ввода URL
function hideUrlInput() {
    urlInputOverlay.classList.remove('active');
    urlInputContainer.classList.remove('active');
    
    // Восстанавливаем скролл
    document.body.style.overflow = '';
    
    // Очищаем поле ввода
    urlInput.value = '';
}

// Обработчик клика по кнопке добавления изображения
imageUploadBtn.addEventListener('click', (e) => {
    e.preventDefault(); // Для предотвращения всплытия события
    console.log('Кнопка добавления изображения нажата');
    showUrlInput();
});

// Обработчики для закрытия окна ввода URL
urlCancelBtn.addEventListener('click', () => {
    hideUrlInput();
});

// Клик по оверлею также закрывает окно
urlInputOverlay.addEventListener('click', () => {
    hideUrlInput();
});

// Нажатие ESC закрывает окно
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && urlInputContainer.classList.contains('active')) {
        hideUrlInput();
    }
});

// Обработчик нажатия на кнопку добавления URL
urlSubmitBtn.addEventListener('click', () => {
    const url = urlInput.value.trim();
    
    if (!url) {
        alert('Пожалуйста, введите URL изображения');
        return;
    }
    
    // Простая валидация URL
    if (!isValidImageUrl(url)) {
        alert('Пожалуйста, введите корректный URL изображения.\nНапример: https://example.com/image.jpg');
        return;
    }
    
    // Закрываем окно ввода URL
    hideUrlInput();
    
    // Сохраняем URL и создаем превью
    currentImageUrl = url;
    createImagePreview(url);
});

// Функция проверки является ли строка URL изображения
function isValidImageUrl(url) {
    // Базовая проверка URL
    try {
        const urlObj = new URL(url);
        // Проверяем расширение файла
        const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
        const path = urlObj.pathname.toLowerCase();
        return validExtensions.some(ext => path.endsWith(ext)) || urlObj.searchParams.has('image');
    } catch (e) {
        return false;
    }
}

// Функция для создания предпросмотра изображения
function createImagePreview(url) {
    // Удаляем предыдущий предпросмотр, если он существует
    if (imagePreviewContainer) {
        imagePreviewContainer.remove();
    }
    
    // Создаем новый контейнер предпросмотра
    imagePreviewContainer = document.createElement('div');
    imagePreviewContainer.className = 'image-preview-container';
    
    // Показываем индикатор загрузки
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'loading';
    loadingIndicator.textContent = 'Загрузка изображения';
    imagePreviewContainer.appendChild(loadingIndicator);
    
    // Добавляем контейнер перед формой отправки сообщения
    messageForm.insertBefore(imagePreviewContainer, messageForm.firstChild);
    
    // Создаем элемент изображения
    const previewImage = document.createElement('img');
    previewImage.className = 'image-preview';
    
    // Обработчик загрузки изображения
    previewImage.onload = function() {
        // Удаляем индикатор загрузки
        loadingIndicator.remove();
        
        // Добавляем изображение в контейнер
        imagePreviewContainer.appendChild(previewImage);
        
        // Создаем кнопку отмены
        const cancelButton = document.createElement('button');
        cancelButton.className = 'cancel-preview';
        cancelButton.textContent = '×';
        imagePreviewContainer.appendChild(cancelButton);
        
        // Создаем кнопку быстрой отправки изображения
        const quickSendButton = document.createElement('button');
        quickSendButton.className = 'quick-send-button';
        quickSendButton.innerHTML = '✓';
        quickSendButton.title = 'Отправить только изображение';
        imagePreviewContainer.appendChild(quickSendButton);
        
        // Показываем контейнер с анимацией
        imagePreviewContainer.classList.add('active');
        
        // Обработчик клика по кнопке отмены
        cancelButton.addEventListener('click', () => {
            imagePreviewContainer.classList.remove('active');
            setTimeout(() => {
                imagePreviewContainer.remove();
                imagePreviewContainer = null;
            }, 300);
            currentImageUrl = null;
        });
        
        // Обработчик клика по кнопке быстрой отправки
        quickSendButton.addEventListener('click', () => {
            console.log('Нажата кнопка быстрой отправки изображения по URL');
            messageForm.dispatchEvent(new Event('submit'));
        });
    };
    
    // Обработчик ошибки загрузки изображения
    previewImage.onerror = function() {
        loadingIndicator.textContent = 'Ошибка загрузки изображения';
        
        // Добавляем кнопку закрытия с ошибкой
        const cancelButton = document.createElement('button');
        cancelButton.className = 'cancel-preview';
        cancelButton.textContent = '×';
        imagePreviewContainer.appendChild(cancelButton);
        
        imagePreviewContainer.classList.add('active');
        
        // Обработчик клика по кнопке отмены
        cancelButton.addEventListener('click', () => {
            imagePreviewContainer.classList.remove('active');
            setTimeout(() => {
                imagePreviewContainer.remove();
                imagePreviewContainer = null;
            }, 300);
            currentImageUrl = null;
        });
    };
    
    // Загружаем изображение
    previewImage.src = url;
}

// Обновленная функция отправки сообщения (с поддержкой изображений по URL)
messageForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    console.log('Форма отправки сообщения запущена');
    
    const messageText = messageInput.value.trim();
    
    // Проверяем, есть ли текст или изображение для отправки
    if ((!messageText && !currentImageUrl) || !currentChatUser) {
        console.log('Нет данных для отправки:', { 
            hasText: Boolean(messageText), 
            hasImage: Boolean(currentImageUrl),
            hasSelectedUser: Boolean(currentChatUser)
        });
        return;
    }
    
    // Показываем пользователю, что идет отправка
    const sendBtn = messageForm.querySelector('.send-btn');
    sendBtn.disabled = true;
    sendBtn.innerHTML = '⌛'; // Меняем текст кнопки на значок песочных часов
    
    // Проверяем, авторизован ли пользователь
    if (!auth.currentUser) {
        alert('Необходимо войти в систему для отправки сообщений');
        sendBtn.disabled = false;
        sendBtn.innerHTML = '→';
        return;
    }
    
    const currentUserId = auth.currentUser.uid;
    const otherUserId = currentChatUser.id;
    
    // Создаем ID чата
    const chatId = [currentUserId, otherUserId].sort().join('_');
    console.log('Отправка сообщения в чат:', chatId);
    
    // Очищаем поле ввода сразу для лучшего UX
    const messageTextCopy = messageText;
    messageInput.value = '';
    
    try {
        // Создаем сообщение
        const messageData = {
            text: messageTextCopy || '',
            senderId: currentUserId,
            receiverId: otherUserId,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Если есть изображение, добавляем его URL
        if (currentImageUrl) {
            messageData.imageUrl = currentImageUrl;
            console.log('Добавляем URL изображения к сообщению:', currentImageUrl);
            
            // Очищаем текущее изображение и предпросмотр
            if (imagePreviewContainer) {
                imagePreviewContainer.classList.remove('active');
                setTimeout(() => {
                    if (imagePreviewContainer) {
                        imagePreviewContainer.remove();
                        imagePreviewContainer = null;
                    }
                }, 300);
            }
            currentImageUrl = null;
        }
        
        console.log('Отправка сообщения в Firestore:', messageData);
        
        // Сохраняем сообщение в Firestore
        const messageRef = await db.collection('chats')
            .doc(chatId)
            .collection('messages')
            .add(messageData);
        
        console.log('Сообщение успешно сохранено в Firestore с ID:', messageRef.id);
        
        // Определяем предпросмотр для последнего сообщения
        let lastMessagePreview = messageTextCopy || (messageData.imageUrl ? 'Изображение' : '');
        
        // Обновляем мета-информацию о чате
        await db.collection('chats').doc(chatId).set({
            lastMessage: lastMessagePreview,
            lastMessageTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
            participants: [currentUserId, otherUserId]
        }, { merge: true });
        
        console.log('Мета-информация о чате обновлена');
    } catch (error) {
        console.error('Ошибка при отправке сообщения:', error);
        alert('Не удалось отправить сообщение: ' + (error.message || 'Неизвестная ошибка'));
    } finally {
        // Восстанавливаем кнопку отправки
        sendBtn.disabled = false;
        sendBtn.innerHTML = '→';
    }
});

// Текущий чат
let currentChatUser = null;
let currentUser = null;
let messagesListener = null;
let chatsListener = null;
let usersCache = {}; // Кэш пользователей для оптимизации
let isMobile = window.innerWidth < 768; // Определение мобильного устройства

// Текущее загружаемое изображение
let currentImageFile = null;

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

// ИСПРАВЛЕНИЕ: Убедимся, что код выполняется после полной загрузки DOM
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM полностью загружен');
    
    // Проверяем наличие всех необходимых элементов
    if (!loginBtn) {
        console.error('Элемент loginBtn не найден!');
    } else {
        console.log('Элемент loginBtn найден');
    }
    
    if (!registerBtn) {
        console.error('Элемент registerBtn не найден!');
    } else {
        console.log('Элемент registerBtn найден');
    }
    
    // ИСПРАВЛЕНИЕ: Добавляем обработчики событий заново
    setupEventListeners();
});

// Функция настройки всех обработчиков событий
function setupEventListeners() {
    console.log('Настройка обработчиков событий');
    
    // ИСПРАВЛЕНИЕ: Убираем тестовую кнопку
    /*
    const testButton = document.getElementById('testButton');
    if (testButton) {
        testButton.onclick = function() {
            alert('JavaScript работает! Кнопка нажата.');
            console.log('Тестовая кнопка нажата');
        };
    }
    */
    
    // ИСПРАВЛЕНИЕ: Используем функцию addEventListener напрямую
    if (loginBtn) {
        loginBtn.onclick = function(e) {
            console.log('Клик по кнопке входа');
            handleLogin();
        };
    }
    
    if (registerBtn) {
        registerBtn.onclick = function(e) {
            console.log('Клик по кнопке регистрации');
            handleRegistration();
        };
    }
    
    if (showRegisterBtn) {
        showRegisterBtn.onclick = function() {
            loginForm.style.display = 'none';
            registerForm.style.display = 'block';
            registerForm.style.animation = 'none';
            registerForm.offsetHeight;
            registerForm.style.animation = 'fadeIn 0.3s ease-out';
        };
    }
    
    if (showLoginBtn) {
        showLoginBtn.onclick = function() {
            registerForm.style.display = 'none';
            loginForm.style.display = 'block';
            loginForm.style.animation = 'none';
            loginForm.offsetHeight;
            loginForm.style.animation = 'fadeIn 0.3s ease-out';
        };
    }
    
    if (browseUsersBtn) {
        browseUsersBtn.onclick = function() {
            showSection('usersSection');
        };
    }
    
    if (logoutBtn) {
        logoutBtn.onclick = function() {
            handleLogout();
        };
    }
    
    // Настройка остальных обработчиков событий
    // ... existing code for other event handlers ...
}

// ИСПРАВЛЕНИЕ: Выделяем логику входа в отдельную функцию
function handleLogin() {
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

    console.log('Попытка входа для пользователя:', username);

    // Проверяем, инициализированы ли необходимые сервисы
    if (!isFirestoreInitialized || !isAuthInitialized) {
        loginError.textContent = 'Сервис Firebase недоступен. Перезагрузите страницу';
        loginError.style.display = 'block';
        loginBtn.disabled = false;
        loginBtn.textContent = 'Войти';
        return;
    }

    // Находим пользователя по логину
    db.collection('users').where('username', '==', username).get()
        .then(snapshot => {
            console.log('Результат поиска пользователя:', snapshot.empty ? 'не найден' : 'найден');
            
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
            console.log('Найден email для пользователя:', email);

            auth.signInWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    console.log('Успешный вход в Firebase Auth:', userCredential.user.uid);
                    // Успешный вход
                    loginForm.reset();
                    showSection('chatsListSection');
                })
                .catch(error => {
                    console.error('Ошибка Firebase Auth при входе:', error.code, error.message);
                    
                    // Более подробные сообщения об ошибках
                    if (error.code === 'auth/wrong-password') {
                        loginError.textContent = 'Неверный пароль';
                    } else if (error.code === 'auth/user-not-found') {
                        loginError.textContent = 'Пользователь не найден';
                    } else if (error.code === 'auth/invalid-email') {
                        loginError.textContent = 'Недействительный формат email';
                    } else if (error.code === 'auth/network-request-failed') {
                        loginError.textContent = 'Проблема с подключением к сети';
                    } else {
                        loginError.textContent = `Ошибка: ${error.message}`;
                    }
                    
                    loginError.style.display = 'block';
                })
                .finally(() => {
                    loginBtn.disabled = false;
                    loginBtn.textContent = 'Войти';
                });
        })
        .catch(error => {
            console.error('Ошибка при поиске пользователя:', error);
            loginError.textContent = `Ошибка при поиске пользователя: ${error.message}`;
            loginError.style.display = 'block';
            loginBtn.disabled = false;
            loginBtn.textContent = 'Войти';
        });
}

// ИСПРАВЛЕНИЕ: Выделяем логику регистрации в отдельную функцию
function handleRegistration() {
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

    // Минимальная длина пароля
    if (password.length < 6) {
        registerError.textContent = 'Пароль должен содержать не менее 6 символов';
        registerError.style.display = 'block';
        return;
    }

    // Отключаем кнопку во время обработки
    registerBtn.disabled = true;
    registerBtn.textContent = 'Обработка...';

    console.log('Попытка регистрации пользователя:', username);

    // Проверяем, инициализированы ли необходимые сервисы
    if (!isFirestoreInitialized || !isAuthInitialized) {
        registerError.textContent = 'Сервис Firebase недоступен. Перезагрузите страницу';
        registerError.style.display = 'block';
        registerBtn.disabled = false;
        registerBtn.textContent = 'Зарегистрироваться';
        return;
    }

    // Проверка на уникальность логина
    db.collection('users').where('username', '==', username).get()
        .then(snapshot => {
            console.log('Проверка уникальности логина:', snapshot.empty ? 'доступен' : 'занят');
            
            if (!snapshot.empty) {
                registerError.textContent = 'Этот логин уже занят';
                registerError.style.display = 'block';
                registerBtn.disabled = false;
                registerBtn.textContent = 'Зарегистрироваться';
                return;
            }

            // Создаем пользователя в Firebase Auth
            const email = `${username}@strintox.app`; // Генерируем email на основе логина
            console.log('Создание пользователя с email:', email);
            
            auth.createUserWithEmailAndPassword(email, password)
                .then(userCredential => {
                    console.log('Пользователь создан в Firebase Auth:', userCredential.user.uid);
                    
                    // Создаем документ пользователя в Firestore
                    const user = userCredential.user;
                    return db.collection('users').doc(user.uid).set({
                        username: username,
                        email: email,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                })
                .then(() => {
                    console.log('Данные пользователя сохранены в Firestore');
                    // Успешная регистрация
                    registerForm.reset();
                    showSection('chatsListSection');
                })
                .catch(error => {
                    console.error('Ошибка при создании пользователя:', error.code, error.message);
                    
                    // Более детальные сообщения об ошибках
                    if (error.code === 'auth/email-already-in-use') {
                        registerError.textContent = 'Этот email уже используется';
                    } else if (error.code === 'auth/invalid-email') {
                        registerError.textContent = 'Недействительный формат email';
                    } else if (error.code === 'auth/weak-password') {
                        registerError.textContent = 'Слишком слабый пароль';
                    } else if (error.code === 'auth/network-request-failed') {
                        registerError.textContent = 'Проблема с подключением к сети';
                    } else {
                        registerError.textContent = `Ошибка: ${error.message}`;
                    }
                    
                    registerError.style.display = 'block';
                })
                .finally(() => {
                    registerBtn.disabled = false;
                    registerBtn.textContent = 'Зарегистрироваться';
                });
        })
        .catch(error => {
            console.error('Ошибка при проверке уникальности логина:', error);
            registerError.textContent = `Ошибка: ${error.message}`;
            registerError.style.display = 'block';
            registerBtn.disabled = false;
            registerBtn.textContent = 'Зарегистрироваться';
        });
}

// Функция выхода из аккаунта
function handleLogout() {
    if (!isAuthInitialized) {
        console.error('Firebase Auth не инициализирован');
        return;
    }
    
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
}

// Слушатель состояния аутентификации
if (isAuthInitialized) {
    auth.onAuthStateChanged(user => {
        if (user) {
            // Пользователь авторизован
            console.log('Пользователь вошел в систему:', user.uid);
            
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
            console.log('Пользователь не авторизован');
            showSection('authSection');
            navTabs.style.display = 'none';
        }
    });
} else {
    console.error('Невозможно установить слушатель аутентификации - Auth не инициализирован');
}

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

// Обновленная функция отправки сообщения (с поддержкой изображений)
messageForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    console.log('Форма отправки сообщения запущена');
    
    const messageText = messageInput.value.trim();
    
    // Проверяем, есть ли текст или изображение для отправки
    if ((!messageText && !currentImageUrl) || !currentChatUser) {
        console.log('Нет данных для отправки:', { 
            hasText: Boolean(messageText), 
            hasImage: Boolean(currentImageUrl),
            hasSelectedUser: Boolean(currentChatUser)
        });
        return;
    }
    
    // Показываем пользователю, что идет отправка
    const sendBtn = messageForm.querySelector('.send-btn');
    sendBtn.disabled = true;
    sendBtn.innerHTML = '⌛'; // Меняем текст кнопки на значок песочных часов
    
    // Проверяем, авторизован ли пользователь
    if (!auth.currentUser) {
        alert('Необходимо войти в систему для отправки сообщений');
        sendBtn.disabled = false;
        sendBtn.innerHTML = '→';
        return;
    }
    
    const currentUserId = auth.currentUser.uid;
    const otherUserId = currentChatUser.id;
    
    // Создаем ID чата
    const chatId = [currentUserId, otherUserId].sort().join('_');
    console.log('Отправка сообщения в чат:', chatId);
    
    // Очищаем поле ввода сразу для лучшего UX
    const messageTextCopy = messageText;
    messageInput.value = '';
    
    try {
        // Создаем сообщение
        const messageData = {
            text: messageTextCopy || '',
            senderId: currentUserId,
            receiverId: otherUserId,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Если есть изображение, добавляем его URL
        if (currentImageUrl) {
            messageData.imageUrl = currentImageUrl;
            console.log('Добавляем URL изображения к сообщению:', currentImageUrl);
            
            // Очищаем текущее изображение и предпросмотр
            if (imagePreviewContainer) {
                imagePreviewContainer.classList.remove('active');
                setTimeout(() => {
                    if (imagePreviewContainer) {
                        imagePreviewContainer.remove();
                        imagePreviewContainer = null;
                    }
                }, 300);
            }
            currentImageUrl = null;
        }
        
        console.log('Отправка сообщения в Firestore:', messageData);
        
        // Сохраняем сообщение в Firestore
        const messageRef = await db.collection('chats')
            .doc(chatId)
            .collection('messages')
            .add(messageData);
        
        console.log('Сообщение успешно сохранено в Firestore с ID:', messageRef.id);
        
        // Определяем предпросмотр для последнего сообщения
        let lastMessagePreview = messageTextCopy || (messageData.imageUrl ? 'Изображение' : '');
        
        // Обновляем мета-информацию о чате
        await db.collection('chats').doc(chatId).set({
            lastMessage: lastMessagePreview,
            lastMessageTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
            participants: [currentUserId, otherUserId]
        }, { merge: true });
        
        console.log('Мета-информация о чате обновлена');
    } catch (error) {
        console.error('Ошибка при отправке сообщения:', error);
        alert('Не удалось отправить сообщение: ' + (error.message || 'Неизвестная ошибка'));
    } finally {
        // Восстанавливаем кнопку отправки
        sendBtn.disabled = false;
        sendBtn.innerHTML = '→';
    }
});

// Обновленная функция renderMessage для отображения изображений
function renderMessage(message, currentUserId, index) {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${message.senderId === currentUserId ? 'message-sent' : 'message-received'}`;
    messageElement.style.setProperty('--index', index);
    
    const date = message.timestamp ? new Date(message.timestamp.toDate()) : new Date();
    const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    
    let messageContent = '';
    
    // Добавляем текст сообщения, если он есть
    if (message.text) {
        messageContent += `<div class="message-text">${message.text}</div>`;
    }
    
    // Добавляем изображение, если оно есть
    if (message.imageUrl) {
        messageContent += `<img src="${message.imageUrl}" alt="Изображение" class="message-image" data-src="${message.imageUrl}">`;
    }
    
    messageContent += `<div class="message-time">${timeStr}</div>`;
    
    messageElement.innerHTML = messageContent;
    
    // Добавляем обработчик клика по изображению для полноэкранного просмотра
    const messageImage = messageElement.querySelector('.message-image');
    if (messageImage) {
        messageImage.addEventListener('click', () => {
            showImageViewer(messageImage.dataset.src);
        });
    }
    
    messagesContainer.appendChild(messageElement);
}

// Создаем элементы для предпросмотра и просмотра изображений
const imageViewerHtml = `
<div class="image-viewer">
    <img src="" alt="Полноэкранное изображение" class="full-image">
    <button class="close-viewer">&times;</button>
</div>
`;

// Добавляем HTML для просмотра изображений в body
document.body.insertAdjacentHTML('beforeend', imageViewerHtml);

// Получаем ссылки на новые элементы
const imageViewer = document.querySelector('.image-viewer');
const fullImage = document.querySelector('.full-image');
const closeViewer = document.querySelector('.close-viewer');

// Функция для показа полноэкранного просмотра изображения
function showImageViewer(src) {
    fullImage.src = src;
    imageViewer.classList.add('active');
    
    // Отключаем скролл на документе
    document.body.style.overflow = 'hidden';
}

// Закрытие просмотрщика изображений
closeViewer.addEventListener('click', () => {
    imageViewer.classList.remove('active');
    
    // Через небольшую задержку очищаем src у изображения
    setTimeout(() => {
        fullImage.src = '';
        // Восстанавливаем скролл
        document.body.style.overflow = '';
    }, 300);
});

// Добавляем обработчик клика по самому просмотрщику
imageViewer.addEventListener('click', (e) => {
    // Закрываем просмотрщик только при клике вне изображения
    if (e.target === imageViewer) {
        closeViewer.click();
    }
});

// Функция для проверки и сжатия изображения перед загрузкой
function compressImage(file) {
    return new Promise((resolve, reject) => {
        // Проверка валидности файла
        if (!file || !(file instanceof File)) {
            reject(new Error('Некорректный файл изображения'));
            return;
        }
        
        // Проверяем, является ли файл изображением
        if (!file.type.startsWith('image/')) {
            reject(new Error('Выбранный файл не является изображением'));
            return;
        }
        
        console.log('Начинаем обработку изображения размером:', (file.size / 1024 / 1024).toFixed(2) + 'MB');
        
        // Если файл меньше максимального размера, не сжимаем его
        if (file.size <= MAX_FILE_SIZE) {
            console.log('Изображение не требует сжатия');
            resolve(file);
            return;
        }
        
        // Начинаем процесс сжатия
        const reader = new FileReader();
        
        reader.onload = function(event) {
            console.log('Файл успешно прочитан');
            
            const img = new Image();
            
            // Обработка ошибки загрузки изображения
            img.onerror = function() {
                console.error('Не удалось загрузить изображение');
                reject(new Error('Не удалось загрузить изображение'));
            };
            
            img.onload = function() {
                console.log('Изображение загружено, размеры:', img.width, 'x', img.height);
                
                try {
                    // Определяем размеры для сжатия
                    let width = img.width;
                    let height = img.height;
                    
                    // Если изображение слишком большое, масштабируем его
                    if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
                        console.log('Масштабирование изображения...');
                        
                        if (width > height) {
                            height *= MAX_IMAGE_DIMENSION / width;
                            width = MAX_IMAGE_DIMENSION;
                        } else {
                            width *= MAX_IMAGE_DIMENSION / height;
                            height = MAX_IMAGE_DIMENSION;
                        }
                        
                        console.log('Новые размеры после масштабирования:', Math.round(width), 'x', Math.round(height));
                    }
                    
                    // Создаем canvas для сжатия
                    const canvas = document.createElement('canvas');
                    canvas.width = Math.round(width);
                    canvas.height = Math.round(height);
                    
                    // Рисуем изображение на canvas
                    const ctx = canvas.getContext('2d');
                    ctx.fillStyle = '#FFFFFF'; // Белый фон для прозрачных PNG
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    
                    // Определяем формат вывода (JPEG для фото, PNG для прозрачных изображений)
                    let outputFormat = 'image/jpeg'; // По умолчанию JPEG для лучшего сжатия
                    let quality = JPEG_QUALITY;
                    
                    if (file.type === 'image/png' && hasTransparency(ctx, canvas.width, canvas.height)) {
                        outputFormat = 'image/png';
                        quality = 0.8; // PNG сжимается хуже
                        console.log('Обнаружено прозрачное PNG изображение');
                    }
                    
                    // Конвертируем canvas в Blob с нужным качеством
                    canvas.toBlob((blob) => {
                        if (!blob) {
                            console.error('Не удалось создать Blob из canvas');
                            reject(new Error('Ошибка при сжатии изображения'));
                            return;
                        }
                        
                        // Создаем файл из blob
                        let fileExtension = outputFormat === 'image/jpeg' ? 'jpg' : 'png';
                        const compressedFile = new File([blob], `compressed_${Date.now()}.${fileExtension}`, {
                            type: outputFormat,
                            lastModified: Date.now()
                        });
                        
                        console.log(`Сжатие изображения: ${(file.size / 1024 / 1024).toFixed(2)}MB -> ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
                        resolve(compressedFile);
                    }, outputFormat, quality);
                } catch (error) {
                    console.error('Ошибка при обработке canvas:', error);
                    reject(error);
                }
            };
            
            // Устанавливаем источник изображения
            img.src = event.target.result;
        };
        
        reader.onerror = function(error) {
            console.error('Ошибка при чтении файла:', error);
            reject(new Error('Не удалось прочитать файл изображения'));
        };
        
        // Начинаем чтение файла
        reader.readAsDataURL(file);
    });
}

// Вспомогательная функция для определения прозрачности PNG
function hasTransparency(ctx, width, height) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    for (let i = 3; i < data.length; i += 4) {
        if (data[i] < 255) {
            return true;
        }
    }
    
    return false;
}

// Функция для загрузки изображения в Firebase Storage
function uploadImage(file) {
    return new Promise((resolve, reject) => {
        try {
            if (!file) {
                console.error('Ошибка: Файл не предоставлен');
                reject(new Error('Файл не выбран'));
                return;
            }
            
            if (!auth.currentUser) {
                console.error('Ошибка: Пользователь не авторизован');
                reject(new Error('Необходимо войти в систему'));
                return;
            }
            
            if (!isStorageInitialized || !storage) {
                console.error('Ошибка: Firebase Storage не инициализирован');
                reject(new Error('Хранилище недоступно'));
                return;
            }
            
            console.log('Начало загрузки изображения. Размер:', (file.size / 1024).toFixed(2) + ' KB, Тип:', file.type);
            
            // Создаем уникальное имя файла с расширением
            let fileExtension = 'jpg';
            if (file.name) {
                const nameParts = file.name.split('.');
                if (nameParts.length > 1) {
                    fileExtension = nameParts[nameParts.length - 1].toLowerCase();
                }
            }
            
            const userId = auth.currentUser.uid;
            const randomId = Math.random().toString(36).substring(2, 8);
            const fileName = `${Date.now()}_${userId.substring(0, 6)}_${randomId}.${fileExtension}`;
            console.log('Имя файла для загрузки:', fileName);
            
            // Создаем ссылку на место хранения файла
            const storageRef = storage.ref();
            const fileRef = storageRef.child(`chat_images/${fileName}`);
            
            // Создаем и показываем индикатор прогресса загрузки
            const uploadProgressContainer = document.createElement('div');
            uploadProgressContainer.className = 'upload-progress active';
            uploadProgressContainer.innerHTML = '<div class="upload-progress-bar"></div>';
            
            // Добавляем индикатор в контейнер предпросмотра или в форму сообщений
            if (imagePreviewContainer) {
                // Удаляем старый индикатор, если есть
                const oldProgress = imagePreviewContainer.querySelector('.upload-progress');
                if (oldProgress) oldProgress.remove();
                
                imagePreviewContainer.appendChild(uploadProgressContainer);
            } else {
                // Если нет контейнера предпросмотра, добавляем индикатор в форму
                messageForm.insertBefore(uploadProgressContainer, messageForm.firstChild);
            }
            
            // Получаем ссылку на индикатор прогресса
            const progressBar = uploadProgressContainer.querySelector('.upload-progress-bar');
            
            // Запускаем загрузку файла с метаданными типа контента
            const metadata = {
                contentType: file.type || 'image/jpeg',
                customMetadata: {
                    'userId': userId,
                    'uploadTime': new Date().toISOString()
                }
            };
            
            // ТЕСТ: Проверяем, что у нас есть доступ к методу put
            if (!fileRef.put) {
                console.error('КРИТИЧЕСКАЯ ОШИБКА: Метод put не найден на объекте fileRef');
                if (uploadProgressContainer) uploadProgressContainer.remove();
                reject(new Error('Неверная версия Firebase SDK'));
                return;
            }
            
            // Запускаем загрузку
            const uploadTask = fileRef.put(file, metadata);
            
            // Следим за прогрессом загрузки
            uploadTask.on('state_changed', 
                // Обработчик прогресса
                (snapshot) => {
                    // Обновляем индикатор прогресса
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    console.log('Прогресс загрузки:', progress.toFixed(1) + '%');
                    
                    if (progressBar) {
                        progressBar.style.width = `${progress}%`;
                    }
                    
                    // Показываем текущее состояние загрузки
                    switch (snapshot.state) {
                        case firebase.storage.TaskState.PAUSED:
                            console.log('Загрузка приостановлена');
                            break;
                        case firebase.storage.TaskState.RUNNING:
                            console.log('Загрузка в процессе');
                            break;
                    }
                }, 
                // Обработчик ошибки
                (error) => {
                    console.error('Ошибка загрузки файла:', error.code, error.message);
                    
                    let errorMessage = 'Не удалось загрузить изображение';
                    
                    // Более детальные сообщения об ошибках
                    switch (error.code) {
                        case 'storage/unauthorized':
                            errorMessage = 'У вас нет прав для загрузки изображения';
                            break;
                        case 'storage/canceled':
                            errorMessage = 'Загрузка отменена';
                            break;
                        case 'storage/unknown':
                            errorMessage = 'Неизвестная ошибка при загрузке';
                            break;
                        case 'storage/quota-exceeded':
                            errorMessage = 'Превышен лимит хранилища';
                            break;
                        default:
                            errorMessage = `Ошибка загрузки: ${error.message || error}`;
                    }
                    
                    console.log('Сообщение об ошибке для пользователя:', errorMessage);
                    
                    if (uploadProgressContainer) {
                        uploadProgressContainer.remove();
                    }
                    reject(new Error(errorMessage));
                }, 
                // Обработчик успешного завершения
                () => {
                    console.log('Загрузка файла завершена успешно!');
                    
                    // Получаем URL загруженного файла
                    uploadTask.snapshot.ref.getDownloadURL()
                        .then((downloadURL) => {
                            console.log('Получен URL для загруженного файла:', downloadURL);
                            
                            if (uploadProgressContainer) {
                                uploadProgressContainer.remove();
                            }
                            
                            // Возвращаем URL как результат успешной загрузки
                            resolve(downloadURL);
                        })
                        .catch(error => {
                            console.error('Ошибка при получении URL загруженного файла:', error);
                            
                            if (uploadProgressContainer) {
                                uploadProgressContainer.remove();
                            }
                            
                            reject(new Error('Файл загружен, но не удалось получить ссылку'));
                        });
                }
            );
        } catch (error) {
            console.error('Непредвиденная ошибка при загрузке изображения:', error);
            reject(new Error('Непредвиденная ошибка при загрузке: ' + (error.message || 'Неизвестная ошибка')));
        }
    });
}

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