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
let onlineUsers = {}; // Для хранения информации о статусе пользователей

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
            updateOnlineStatus(true); // Устанавливаем статус "в сети"
            startOnlineStatusTracking(); // Начинаем отслеживать статус других пользователей
        } else {
            updateOnlineStatus(false); // Устанавливаем статус "не в сети" при выходе
            switchToAuth();
        }
    });

    // Обработчики событий
    setupEventListeners();
    
    // Обработчик закрытия окна/вкладки
    window.addEventListener('beforeunload', () => {
        if (currentUser) {
            updateOnlineStatus(false);
        }
    });
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
                alert('Пожалуйста, выберите изображение (JPG, PNG, GIF)');
                return;
            }
            
            // Проверка размера файла (не более 5MB)
            if (file.size > 5 * 1024 * 1024) {
                alert('Размер файла не должен превышать 5MB');
                return;
            }
            
            selectedAvatarFile = file;
            
            // Отображение превью
            const reader = new FileReader();
            reader.onload = (e) => {
                profileAvatarPreview.src = e.target.result;
                profileAvatarPreview.style.display = 'block';
                profileAvatarPlaceholder.style.display = 'none';
                
                // Преобразуем превью в изображение, чтобы проверить размеры
                const img = new Image();
                img.onload = function() {
                    // Если изображение больше 1000x1000, предупредим о сжатии
                    if (img.width > 1000 || img.height > 1000) {
                        const sizeWarning = document.createElement('div');
                        sizeWarning.className = 'size-warning';
                        sizeWarning.textContent = 'Большое изображение будет сжато при сохранении';
                        
                        // Удаляем предыдущее предупреждение, если оно есть
                        const existingWarning = document.querySelector('.size-warning');
                        if (existingWarning) {
                            existingWarning.remove();
                        }
                        
                        // Добавляем предупреждение после превью
                        const avatarPreview = document.querySelector('.avatar-preview');
                        avatarPreview.parentNode.insertBefore(sizeWarning, avatarPreview.nextSibling);
                    }
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
            
            // Активация кнопки сохранения
            saveAvatarBtn.disabled = false;
        }
    });

    // Сохранение аватара
    saveAvatarBtn.addEventListener('click', () => {
        if (selectedAvatarFile) {
            // Деактивация кнопки и отображение состояния загрузки
            saveAvatarBtn.disabled = true;
            saveAvatarBtn.classList.add('loading');
            saveAvatarBtn.innerHTML = '<span class="material-icons loading-spinner">autorenew</span> Сохранение...';
            
            // Показываем индикатор загрузки в превью
            const uploadProgress = document.querySelector('.upload-progress');
            const avatarPreview = document.querySelector('.avatar-preview');
            if (uploadProgress) uploadProgress.classList.add('active');
            if (avatarPreview) avatarPreview.classList.add('loading');
            
            // Обновляем текст статуса
            const statusText = document.getElementById('status-text');
            if (statusText) statusText.textContent = 'Обработка изображения...';
            
            // Преобразуем изображение в base64
            convertImageToBase64(selectedAvatarFile)
                .then(base64Image => {
                    // Сжимаем изображение, если оно слишком большое
                    if (base64Image.length > 500000) { // Если больше 500KB
                        return compressImage(base64Image);
                    }
                    return base64Image;
                })
                .then(finalImage => {
                    return updateUserAvatar(finalImage);
                })
                .catch(error => {
                    console.error('Ошибка обработки изображения:', error);
                    alert('Не удалось обработать изображение. Пожалуйста, попробуйте другой файл.');
                    
                    // Возвращаем кнопку и индикаторы в исходное состояние
                    saveAvatarBtn.disabled = false;
                    saveAvatarBtn.classList.remove('loading');
                    saveAvatarBtn.innerHTML = 'Сохранить аватар';
                    if (uploadProgress) uploadProgress.classList.remove('active');
                    if (avatarPreview) avatarPreview.classList.remove('loading');
                    if (statusText) statusText.textContent = 'Вы в сети';
                });
        }
    });

    // Выход из аккаунта
    logoutBtn.addEventListener('click', () => {
        updateOnlineStatus(false).then(() => {
            auth.signOut()
                .then(() => {
                    console.log('Выход выполнен успешно');
                })
                .catch(err => {
                    console.error('Ошибка выхода:', err.message);
                });
        }).catch(err => {
            console.error('Ошибка обновления статуса при выходе:', err);
            auth.signOut();
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

// Обновление статуса пользователя (онлайн/офлайн)
function updateOnlineStatus(isOnline) {
    if (!currentUser) return;
    
    const userStatusRef = db.collection('users').doc(currentUser.uid);
    
    userStatusRef.update({
        isOnline: isOnline,
        lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(err => {
        console.error('Ошибка обновления статуса:', err);
    });
}

// Начать отслеживание статуса пользователей
function startOnlineStatusTracking() {
    db.collection('users')
        .where('isOnline', '==', true)
        .onSnapshot(snapshot => {
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added' || change.type === 'modified') {
                    onlineUsers[change.doc.id] = true;
                    updateUserStatusUI(change.doc.id, true);
                }
                if (change.type === 'removed') {
                    onlineUsers[change.doc.id] = false;
                    updateUserStatusUI(change.doc.id, false);
                }
            });
        });
        
    // Также отслеживаем пользователей, которые офлайн
    db.collection('users')
        .where('isOnline', '==', false)
        .onSnapshot(snapshot => {
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added' || change.type === 'modified') {
                    onlineUsers[change.doc.id] = false;
                    updateUserStatusUI(change.doc.id, false);
                }
            });
        });
}

// Обновление UI статуса пользователя
function updateUserStatusUI(userId, isOnline) {
    // Обновление статуса в открытом чате
    if (currentChatId) {
        const chat = userChats.find(c => c.id === currentChatId);
        if (chat) {
            const otherParticipantId = chat.participants.find(id => id !== currentUser.uid);
            if (otherParticipantId === userId) {
                const statusElement = document.getElementById('chat-status');
                statusElement.textContent = isOnline ? 'в сети' : 'не в сети';
                statusElement.className = isOnline ? 'chat-status online' : 'chat-status offline';
            }
        }
    }
    
    // Обновление статуса в списке чатов
    const chatItems = document.querySelectorAll('.chat-item');
    chatItems.forEach(item => {
        const chatId = item.dataset.chatId;
        const chat = userChats.find(c => c.id === chatId);
        if (chat) {
            const otherParticipantId = chat.participants.find(id => id !== currentUser.uid);
            if (otherParticipantId === userId) {
                const statusDot = item.querySelector('.status-dot');
                if (statusDot) {
                    statusDot.className = isOnline ? 'status-dot online' : 'status-dot offline';
                }
            }
        }
    });
}

// Преобразование изображения в Base64
function convertImageToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = () => {
            resolve(reader.result);
        };
        
        reader.onerror = (error) => {
            reject(error);
        };
        
        reader.readAsDataURL(file);
    });
}

// Сжатие изображения с настраиваемым качеством
function compressImage(base64Image, quality = 0.7) {
    return new Promise((resolve, reject) => {
        try {
            const img = new Image();
            img.src = base64Image;
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Определяем максимальные размеры
                const MAX_WIDTH = 300;
                const MAX_HEIGHT = 300;
                
                let width = img.width;
                let height = img.height;
                
                // Изменяем размеры, сохраняя пропорции
                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                
                // Рисуем изображение на канвасе с новыми размерами
                ctx.drawImage(img, 0, 0, width, height);
                
                // Получаем сжатое изображение в формате Base64
                const compressedImage = canvas.toDataURL('image/jpeg', quality);
                
                resolve(compressedImage);
            };
            
            img.onerror = (error) => {
                reject(new Error('Ошибка загрузки изображения'));
            };
        } catch (error) {
            reject(error);
        }
    });
}

// Обновление аватара пользователя
function updateUserAvatar(imageBase64) {
    if (!currentUser) return Promise.reject(new Error('Пользователь не авторизован'));
    
    // Проверяем длину строки с изображением (защита от слишком больших файлов)
    if (imageBase64.length > 1000000) { // Примерно 1MB
        console.warn('Изображение слишком большое, применяем дополнительное сжатие');
        return compressImage(imageBase64, 0.5) // Сильное сжатие
            .then(compressedImage => updateUserAvatar(compressedImage))
            .catch(err => {
                console.error('Ошибка при дополнительном сжатии:', err);
                throw err;
            });
    }
    
    return db.collection('users')
        .doc(currentUser.uid)
        .update({
            avatarUrl: imageBase64
        })
        .then(() => {
            console.log('Аватар обновлен успешно');
            
            // Обновить аватар в интерфейсе
            const currentUserAvatar = document.getElementById('current-user-avatar');
            const currentUserAvatarPlaceholder = document.getElementById('current-user-avatar-placeholder');
            
            currentUserAvatar.src = imageBase64;
            currentUserAvatar.style.display = 'block';
            currentUserAvatarPlaceholder.style.display = 'none';
            
            // Деактивировать кнопку сохранения и убрать индикаторы загрузки
            saveAvatarBtn.disabled = true;
            saveAvatarBtn.classList.remove('loading');
            saveAvatarBtn.innerHTML = 'Сохранить аватар';
            
            const uploadProgress = document.querySelector('.upload-progress');
            const avatarPreview = document.querySelector('.avatar-preview');
            if (uploadProgress) uploadProgress.classList.remove('active');
            if (avatarPreview) avatarPreview.classList.remove('loading');
            
            // Обновить текст статуса
            const statusText = document.getElementById('status-text');
            if (statusText) statusText.textContent = 'Вы в сети';
            
            // Удалить предупреждение о размере, если оно есть
            const sizeWarning = document.querySelector('.size-warning');
            if (sizeWarning) {
                sizeWarning.remove();
            }
            
            // Показать сообщение об успешном обновлении
            setTimeout(() => {
                alert('Аватар успешно обновлен!');
                // Закрыть модальное окно
                profileModal.style.display = 'none';
            }, 500);
            
            // Сбросить выбранный файл
            selectedAvatarFile = null;
            
            return 'success';
        })
        .catch(err => {
            console.error('Ошибка обновления аватара:', err);
            let errorMessage = 'Не удалось обновить аватар. Пожалуйста, попробуйте еще раз.';
            
            // Проверка на специфические ошибки Firestore
            if (err.code === 'permission-denied') {
                errorMessage = 'У вас нет прав для обновления аватара.';
            } else if (err.code === 'resource-exhausted') {
                errorMessage = 'Изображение слишком большое. Пожалуйста, выберите изображение меньшего размера.';
            }
            
            alert(errorMessage);
            
            // Вернуть кнопку в исходное состояние
            saveAvatarBtn.disabled = false;
            saveAvatarBtn.classList.remove('loading');
            saveAvatarBtn.innerHTML = 'Сохранить аватар';
            
            // Убрать индикаторы загрузки
            const uploadProgress = document.querySelector('.upload-progress');
            const avatarPreview = document.querySelector('.avatar-preview');
            if (uploadProgress) uploadProgress.classList.remove('active');
            if (avatarPreview) avatarPreview.classList.remove('loading');
            
            // Обновить текст статуса
            const statusText = document.getElementById('status-text');
            if (statusText) statusText.textContent = 'Вы в сети';
            
            throw err;
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
                        avatarUrl: null,
                        isOnline: true,
                        lastSeen: firebase.firestore.FieldValue.serverTimestamp()
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
    
    // Получаем ID другого участника чата
    const chat = userChats.find(c => c.id === id);
    const otherParticipantId = chat.participants.find(pid => pid !== currentUser.uid);
    
    // Определяем статус (онлайн/офлайн)
    const isOnline = onlineUsers[otherParticipantId] === true;
    const statusClass = isOnline ? 'online' : 'offline';
    
    chatItem.innerHTML = `
        <div class="chat-item-avatar-container">
            ${avatarContent}
            <span class="status-dot ${statusClass}"></span>
        </div>
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
                    
                    // Обновить статус пользователя
                    const isOnline = userData.isOnline === true;
                    const statusElement = document.getElementById('chat-status');
                    statusElement.textContent = isOnline ? 'в сети' : 'не в сети';
                    statusElement.className = isOnline ? 'chat-status online' : 'chat-status offline';
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