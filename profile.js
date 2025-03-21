// Добавим в начало файла глобальную переменную
window.firebaseStorageAvailable = false;

// Инициализация Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCxypEXHGW58g4kUJ80qJQDSv_jOHsnh4w",
    authDomain: "chat-5fe0a.firebaseapp.com",
    projectId: "chat-5fe0a",
    storageBucket: "chat-5fe0a.appspot.com",
    messagingSenderId: "494037188866",
    appId: "1:494037188866:web:9eadb1d943535e19dd821b",
    measurementId: "G-W2QDT0QKY5"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();

// Состояние приложения
const state = {
    editMode: false,
    currentUserId: null,
    profileUserId: null,
    userProfile: null,
    isOwnProfile: false,
    hasChanges: false,
    originalAvatarUrl: null,
    avatarFile: null,
    base64Avatar: null
};

// DOM элементы
const elements = {
    userAvatar: document.getElementById('userAvatar'),
    avatarUpload: document.getElementById('avatarUpload'),
    avatarInput: document.getElementById('avatarInput'),
    displayUserId: document.getElementById('displayUserId'),
    userStatus: document.getElementById('userStatus'),
    userBio: document.getElementById('userBio'),
    bioDisplay: document.getElementById('bioDisplay'),
    bioEdit: document.getElementById('bioEdit'),
    bioInput: document.getElementById('bioInput'),
    charCount: document.getElementById('charCount'),
    notificationsToggle: document.getElementById('notificationsToggle'),
    darkModeToggle: document.getElementById('darkModeToggle'),
    editProfileBtn: document.getElementById('editProfileBtn'),
    viewModeSection: document.getElementById('viewModeSection'),
    sendMessageBtn: document.getElementById('sendMessageBtn'),
    saveConfirmModal: document.getElementById('saveConfirmModal'),
    confirmSaveBtn: document.getElementById('confirmSaveBtn'),
    cancelSaveBtn: document.getElementById('cancelSaveBtn')
};

// Инициализация
function init() {
    console.log('Инициализация профиля...');
    
    // Получаем текущий ID пользователя из localStorage
    state.currentUserId = localStorage.getItem('chatUserId');
    
    if (!state.currentUserId) {
        console.error('ID пользователя не найден в localStorage');
        alert('Ошибка: ID пользователя не найден. Пожалуйста, вернитесь в чат.');
        window.location.href = 'index.html';
        return;
    }
    
    console.log('Текущий ID пользователя:', state.currentUserId);
    
    // Получаем ID пользователя из URL (для просмотра чужих профилей)
    const urlParams = new URLSearchParams(window.location.search);
    state.profileUserId = urlParams.get('userId') || state.currentUserId;
    
    console.log('ID профиля для просмотра:', state.profileUserId);
    
    // Проверяем, смотрит ли пользователь свой профиль
    state.isOwnProfile = state.currentUserId === state.profileUserId;
    console.log('Собственный профиль:', state.isOwnProfile);
    
    // Настраиваем интерфейс в зависимости от того, чей профиль просматривается
    setupInterface();
    
    // Загружаем данные профиля
    loadProfileData();
    
    // Добавляем обработчики событий
    setupEventListeners();
    
    // Обновляем статус онлайн
    updateOnlineStatus();
}

// Настройка интерфейса
function setupInterface() {
    console.log('Настройка интерфейса...');
    
    // Скрываем кнопку редактирования, если это чужой профиль
    elements.editProfileBtn.style.display = state.isOwnProfile ? 'block' : 'none';
    
    // Показываем/скрываем определенные разделы
    elements.viewModeSection.style.display = state.isOwnProfile ? 'none' : 'block';
    
    // Настраиваем текст заголовка
    document.querySelector('header h1').textContent = state.isOwnProfile ? 'Мой профиль' : 'Профиль пользователя';
    
    // Проверяем поддержку Service Worker для уведомлений
    if ('serviceWorker' in navigator) {
        console.log('Service Worker поддерживается');
    } else {
        console.log('Service Worker не поддерживается');
        // Можно отключить опцию уведомлений, если они не поддерживаются
    }
}

// Загрузка данных профиля из Firestore
function loadProfileData() {
    console.log('Загрузка данных профиля...');
    
    // Сначала проверяем локальные данные для быстрого отображения
    const cachedAvatarUrl = localStorage.getItem('userAvatarUrl');
    const cachedBio = localStorage.getItem('userBio');
    
    if (cachedAvatarUrl && state.isOwnProfile) {
        console.log('Используем кешированный аватар:', cachedAvatarUrl);
        elements.userAvatar.src = cachedAvatarUrl;
    }
    
    if (cachedBio && state.isOwnProfile) {
        console.log('Используем кешированное описание');
        elements.userBio.textContent = cachedBio;
        elements.bioInput.value = cachedBio;
    }
    
    // Затем получаем актуальные данные из Firestore
    db.collection('users').doc(state.profileUserId).get()
        .then(doc => {
            if (doc.exists) {
                const data = doc.data();
                state.userProfile = data;
                console.log('Данные профиля получены из Firestore:', data);
                
                // Заполняем интерфейс данными
                updateProfileUI(data);
                
                // Обновляем кешированные данные
                if (state.isOwnProfile) {
                    if (data.avatarUrl) localStorage.setItem('userAvatarUrl', data.avatarUrl);
                    if (data.bio) localStorage.setItem('userBio', data.bio);
                }
            } else {
                console.log('Профиль не найден в Firestore, создаем базовый');
                
                // Если профиль не найден, создаем базовый для текущего пользователя
                if (state.isOwnProfile) {
                    createDefaultProfile();
                } else {
                    // Для просмотра чужого профиля
                    if (!doc.exists) {
                        alert('Профиль пользователя не найден');
                        window.location.href = 'index.html';
                    }
                }
            }
        })
        .catch(error => {
            console.error('Ошибка при загрузке профиля из Firestore:', error);
            
            // Если не удалось загрузить данные из Firestore, используем локальные данные
            if (state.isOwnProfile) {
                const localProfile = {
                    userId: state.currentUserId,
                    bio: localStorage.getItem('userBio') || '',
                    avatarUrl: localStorage.getItem('userAvatarUrl') || '',
                    lastSeen: Date.now(),
                    notificationsEnabled: localStorage.getItem('notificationsEnabled') === 'true',
                    darkMode: localStorage.getItem('darkMode') === 'true'
                };
                
                console.log('Используем локальные данные профиля:', localProfile);
                state.userProfile = localProfile;
                updateProfileUI(localProfile);
            } else {
                alert('Ошибка при загрузке профиля: ' + error.message);
            }
        });
}

// Создание базового профиля для нового пользователя
function createDefaultProfile() {
    console.log('Создание базового профиля');
    
    const defaultProfile = {
        userId: state.currentUserId,
        bio: localStorage.getItem('userBio') || '',
        avatarUrl: localStorage.getItem('userAvatarUrl') || '',
        lastSeen: Date.now(),
        notificationsEnabled: localStorage.getItem('notificationsEnabled') === 'true' || true,
        darkMode: localStorage.getItem('darkMode') === 'true' || false
    };
    
    // Гарантируем, что у нас есть ID пользователя
    if (!state.currentUserId) {
        console.error('ID пользователя не определен при создании профиля');
        return;
    }
    
    // Используем метод set с merge: true чтобы не перезаписать существующие данные
    db.collection('users').doc(state.currentUserId).set(defaultProfile, { merge: true })
        .then(() => {
            console.log('Базовый профиль создан');
            state.userProfile = defaultProfile;
            updateProfileUI(defaultProfile);
        })
        .catch(error => {
            console.error('Ошибка при создании профиля:', error);
            alert('Не удалось создать профиль: ' + error.message);
            
            // Все равно используем локальные данные для отображения UI
            updateProfileUI(defaultProfile);
        });
}

// Обновление UI данными профиля
function updateProfileUI(profileData) {
    console.log('Обновление UI профиля');
    
    // Устанавливаем ID пользователя
    elements.displayUserId.textContent = profileData.userId || 'Пользователь';
    
    // Загружаем аватар - сначала проверяем avatarBase64, затем avatarUrl
    if (profileData.avatarBase64) {
        console.log('Используем аватар в формате Base64');
        elements.userAvatar.src = profileData.avatarBase64;
        state.originalAvatarUrl = profileData.avatarBase64;
    } else if (profileData.avatarUrl) {
        console.log('Используем аватар по URL:', profileData.avatarUrl);
        
        // Устанавливаем аватар с обработкой ошибок
        elements.userAvatar.src = profileData.avatarUrl;
        elements.userAvatar.onerror = function() {
            console.error('Ошибка загрузки аватара по URL, используем заглушку');
            elements.userAvatar.src = 'https://via.placeholder.com/150';
        };
        
        state.originalAvatarUrl = profileData.avatarUrl;
    } else {
        // Проверяем localStorage на наличие Base64 аватара
        const localBase64Avatar = localStorage.getItem('userAvatarBase64');
        if (localBase64Avatar) {
            console.log('Используем сохраненный локально Base64 аватар');
            elements.userAvatar.src = localBase64Avatar;
            state.originalAvatarUrl = localBase64Avatar;
        } else {
            // Используем аватар по умолчанию
            console.log('Аватар не задан, используем заглушку');
            elements.userAvatar.src = 'https://via.placeholder.com/150';
            state.originalAvatarUrl = null;
        }
    }
    
    // Устанавливаем статус
    const lastSeen = profileData.lastSeen;
    const isOnline = lastSeen && (Date.now() - lastSeen < 5 * 60 * 1000); // Считаем онлайн, если был в сети не более 5 минут назад
    
    elements.userStatus.textContent = isOnline ? 'Онлайн' : 'Не в сети';
    
    // Заполняем информацию о пользователе
    if (profileData.bio) {
        elements.userBio.textContent = profileData.bio;
        elements.bioInput.value = profileData.bio;
    } else {
        elements.userBio.textContent = state.isOwnProfile 
            ? 'Расскажите о себе...' 
            : 'Пользователь еще не добавил информацию о себе.';
        elements.bioInput.value = '';
    }
    
    // Обновляем счетчик символов
    elements.charCount.textContent = elements.bioInput.value.length;
    
    // Устанавливаем настройки
    elements.notificationsToggle.checked = profileData.notificationsEnabled || false;
    elements.darkModeToggle.checked = profileData.darkMode || false;
    
    // Применяем тему, если это мой профиль
    if (state.isOwnProfile && profileData.darkMode) {
        document.body.classList.add('dark-mode');
    }
    
    // Сохраняем настройки в localStorage для синхронизации с чатом
    if (state.isOwnProfile) {
        localStorage.setItem('darkMode', profileData.darkMode ? 'true' : 'false');
    }
}

// Настройка обработчиков событий
function setupEventListeners() {
    console.log('Настройка обработчиков событий');
    
    // Кнопка редактирования профиля
    elements.editProfileBtn.addEventListener('click', toggleEditMode);
    
    // Загрузка аватара
    elements.avatarInput.addEventListener('change', handleAvatarChange);
    
    // Отслеживание изменений в описании профиля
    elements.bioInput.addEventListener('input', () => {
        const length = elements.bioInput.value.length;
        elements.charCount.textContent = length;
        state.hasChanges = true;
    });
    
    // Обработчики для переключателей
    elements.notificationsToggle.addEventListener('change', () => {
        state.hasChanges = true;
    });
    
    elements.darkModeToggle.addEventListener('change', () => {
        state.hasChanges = true;
        // Применяем тему сразу для наглядности
        document.body.classList.toggle('dark-mode', elements.darkModeToggle.checked);
    });
    
    // Кнопка отправки сообщения (для просмотра чужого профиля)
    if (elements.sendMessageBtn) {
        elements.sendMessageBtn.addEventListener('click', () => {
            startChatWithUser(state.profileUserId);
        });
    }
    
    // Обработчики для модального окна сохранения
    elements.confirmSaveBtn.addEventListener('click', saveProfileChanges);
    elements.cancelSaveBtn.addEventListener('click', () => {
        closeConfirmModal();
        cancelEditing();
    });
    
    // Подписка на изменения профиля (для обновления статуса онлайн)
    if (!state.isOwnProfile) {
        const unsubscribe = db.collection('users').doc(state.profileUserId)
            .onSnapshot(doc => {
                if (doc.exists) {
                    const data = doc.data();
                    const lastSeen = data.lastSeen;
                    const isOnline = lastSeen && (Date.now() - lastSeen < 5 * 60 * 1000);
                    
                    elements.userStatus.textContent = isOnline ? 'Онлайн' : 'Не в сети';
                }
            }, error => {
                console.error('Ошибка при отслеживании изменений профиля:', error);
                // Не показываем ошибку пользователю, просто логируем
            });
            
        // Отписываемся при уходе со страницы
        window.addEventListener('beforeunload', unsubscribe);
    }
    
    // Обработчик для клавиши Escape (отмена редактирования)
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && state.editMode) {
            if (state.hasChanges) {
                showConfirmModal();
            } else {
                cancelEditing();
            }
        }
    });
    
    // Обработчик для клика вне модального окна
    window.addEventListener('click', e => {
        if (e.target === elements.saveConfirmModal) {
            closeConfirmModal();
        }
    });
}

// Переключение режима редактирования
function toggleEditMode() {
    if (!state.isOwnProfile) return;
    
    state.editMode = !state.editMode;
    
    if (state.editMode) {
        // Переходим в режим редактирования
        elements.editProfileBtn.innerHTML = '<i class="fas fa-check"></i>';
        elements.avatarUpload.classList.remove('hidden');
        elements.bioDisplay.classList.add('hidden');
        elements.bioEdit.classList.remove('hidden');
        state.hasChanges = false;
    } else {
        // Если есть изменения, показываем диалог подтверждения
        if (state.hasChanges) {
            showConfirmModal();
            return;
        }
        
        // Применяем изменения
        saveProfileChanges();
    }
}

// Показать модальное окно подтверждения
function showConfirmModal() {
    elements.saveConfirmModal.classList.add('active');
}

// Закрыть модальное окно подтверждения
function closeConfirmModal() {
    elements.saveConfirmModal.classList.remove('active');
}

// Отмена редактирования
function cancelEditing() {
    state.editMode = false;
    elements.editProfileBtn.innerHTML = '<i class="fas fa-edit"></i>';
    elements.avatarUpload.classList.add('hidden');
    elements.bioDisplay.classList.remove('hidden');
    elements.bioEdit.classList.add('hidden');
    
    // Возвращаем начальные значения
    if (state.originalAvatarUrl) {
        elements.userAvatar.src = state.originalAvatarUrl;
    } else {
        elements.userAvatar.src = 'https://via.placeholder.com/150';
    }
    
    elements.bioInput.value = state.userProfile.bio || '';
    elements.notificationsToggle.checked = state.userProfile.notificationsEnabled || false;
    elements.darkModeToggle.checked = state.userProfile.darkMode || false;
    
    // Сбрасываем флаг изменений
    state.hasChanges = false;
    state.avatarFile = null;
    
    // Применяем тему
    document.body.classList.toggle('dark-mode', state.userProfile.darkMode || false);
}

// Альтернативная функция обработки аватара (Base64)
function handleAvatarChangeBase64(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Проверка типа файла
    if (!file.type.match('image.*')) {
        alert('Пожалуйста, выберите изображение');
        return;
    }
    
    // Ограничиваем размер до 100 КБ для Base64
    if (file.size > 100 * 1024) {
        alert('Размер файла не должен превышать 100 КБ при использовании Base64');
        return;
    }
    
    // Читаем файл как Data URL (Base64)
    const reader = new FileReader();
    reader.onload = e => {
        const base64String = e.target.result;
        
        // Показываем изображение
        elements.userAvatar.src = base64String;
        
        // Сохраняем в состоянии
        state.hasChanges = true;
        state.base64Avatar = base64String;
        
        // Также сохраняем в localStorage 
        localStorage.setItem('userAvatarBase64', base64String);
        
        // Обновляем профиль сразу
        const updates = {
            avatarBase64: base64String
        };
        
        // Обновляем профиль
        updateProfileData(updates);
        
        showMessage('Аватар обновлен (в режиме Base64)', 'info');
    };
    
    reader.readAsDataURL(file);
}

// Функция выбора оптимального метода загрузки аватара
function handleAvatarChange(event) {
    // Проверяем, доступен ли Firebase Storage
    if (window.firebaseStorageAvailable) {
        // Используем обычную загрузку
        handleAvatarChangeOriginal(event);
    } else {
        // Используем Base64
        handleAvatarChangeBase64(event);
    }
}

// Переименовываем оригинальную функцию
function handleAvatarChangeOriginal(event) {
    // Оригинальный код для загрузки аватара
    const file = event.target.files[0];
    if (!file) return;
    
    // Проверка типа файла
    if (!file.type.match('image.*')) {
        alert('Пожалуйста, выберите изображение');
        return;
    }
    
    // Проверка размера файла (макс. 5 МБ)
    if (file.size > 5 * 1024 * 1024) {
        alert('Размер файла не должен превышать 5 МБ');
        return;
    }
    
    // Создаем URL для предпросмотра
    const reader = new FileReader();
    reader.onload = e => {
        elements.userAvatar.src = e.target.result;
        state.hasChanges = true;
        state.avatarFile = file;
    };
    reader.readAsDataURL(file);
}

// Сохранение изменений в профиле
function saveProfileChanges() {
    if (!state.isOwnProfile) return;
    
    // Закрываем модальное окно
    elements.saveConfirmModal.classList.remove('active');
    
    // Возвращаемся в режим просмотра
    state.editMode = false;
    elements.editProfileBtn.innerHTML = '<i class="fas fa-edit"></i>';
    elements.avatarUpload.classList.add('hidden');
    elements.bioDisplay.classList.remove('hidden');
    elements.bioEdit.classList.add('hidden');
    
    // Если нет изменений, просто выходим
    if (!state.hasChanges) {
        return;
    }
    
    // Сохраняем описание профиля
    const newBio = elements.bioInput.value.trim();
    elements.userBio.textContent = newBio || 'Расскажите о себе...';
    
    // Формируем объект с обновлениями
    const updates = {
        bio: newBio,
        notificationsEnabled: elements.notificationsToggle.checked,
        darkMode: elements.darkModeToggle.checked,
        lastUpdated: Date.now(),
        lastSeen: Date.now()
    };
    
    // Сохраняем настройки в localStorage
    localStorage.setItem('darkMode', updates.darkMode ? 'true' : 'false');
    localStorage.setItem('notificationsEnabled', updates.notificationsEnabled ? 'true' : 'false');
    
    // Если есть новая аватарка, загружаем ее в Storage
    if (state.avatarFile) {
        uploadAvatar(state.avatarFile, updates);
    } else {
        // Иначе просто обновляем данные профиля
        updateProfileData(updates);
    }
    
    // Сбрасываем флаг изменений
    state.hasChanges = false;
    state.avatarFile = null;
}

// Исправленная функция загрузки аватара в Firebase Storage
function uploadAvatar(avatarFile, profileUpdates) {
    console.log('Начинаем загрузку аватара...');
    
    // Показываем индикатор загрузки
    elements.userAvatar.style.opacity = 0.5;
    
    // Удаляем предыдущий индикатор загрузки, если он есть
    document.querySelector('.loading-indicator')?.remove();
    
    // Создаем новый индикатор загрузки
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading-indicator';
    loadingDiv.innerHTML = 'Загрузка...';
    document.querySelector('.avatar-wrapper').appendChild(loadingDiv);
    
    // Создаем уникальное имя для файла, используя текущее время
    const fileName = `avatars/${state.currentUserId}_${new Date().getTime()}`;
    
    try {
        // Получаем референс на Storage
        const storageRef = storage.ref();
        const avatarRef = storageRef.child(fileName);
        
        // Загружаем файл напрямую
        const uploadTask = avatarRef.put(avatarFile);
        
        // Отслеживаем прогресс загрузки
        uploadTask.on('state_changed', 
            // Обновление прогресса
            (snapshot) => {
                const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                loadingDiv.innerHTML = `${progress}%`;
                console.log('Прогресс загрузки: ' + progress + '%');
            },
            // Обработка ошибки
            (error) => {
                console.error('Ошибка загрузки аватара:', error);
                alert('Не удалось загрузить аватар. Пожалуйста, попробуйте еще раз.');
                
                // Убираем индикатор загрузки
                elements.userAvatar.style.opacity = 1;
                loadingDiv.remove();
                
                // Все равно обновляем остальные данные профиля
                delete profileUpdates.avatarUrl;
                updateProfileData(profileUpdates);
            },
            // Успешное завершение
            () => {
                console.log('Загрузка файла завершена.');
                
                // Получаем URL загруженного файла
                uploadTask.snapshot.ref.getDownloadURL()
                    .then((downloadURL) => {
                        console.log('Файл доступен по URL:', downloadURL);
                        
                        // Сохраняем URL аватара
                        profileUpdates.avatarUrl = downloadURL;
                        localStorage.setItem('userAvatarUrl', downloadURL);
                        
                        // Обновляем данные профиля в Firestore
                        updateProfileData(profileUpdates);
                        
                        // Обновляем UI
                        elements.userAvatar.src = downloadURL;
                        state.originalAvatarUrl = downloadURL;
                        
                        // Скрываем индикатор загрузки
                        elements.userAvatar.style.opacity = 1;
                        loadingDiv.remove();
                        
                        // Показываем сообщение об успехе
                        showMessage('Аватар успешно обновлен', 'success');
                    })
                    .catch(error => {
                        console.error('Ошибка при получении URL аватара:', error);
                        
                        // Убираем индикатор загрузки
                        elements.userAvatar.style.opacity = 1;
                        loadingDiv.remove();
                        
                        // Всё равно обновляем другие данные профиля
                        delete profileUpdates.avatarUrl;
                        updateProfileData(profileUpdates);
                    });
            }
        );
    } catch (error) {
        console.error('Критическая ошибка при загрузке аватара:', error);
        alert('Произошла ошибка при загрузке. Пожалуйста, попробуйте позже.');
        
        // Убираем индикатор загрузки
        elements.userAvatar.style.opacity = 1;
        loadingDiv.remove();
        
        // Все равно обновляем остальные данные профиля
        delete profileUpdates.avatarUrl;
        updateProfileData(profileUpdates);
    }
}

// Исправленная функция обновления данных профиля
function updateProfileData(updates) {
    console.log('Обновление данных профиля:', updates);
    
    // Добавляем userId к обновлениям
    updates.userId = state.currentUserId;
    
    // Сохраняем важные данные в localStorage
    if (updates.bio !== undefined) localStorage.setItem('userBio', updates.bio);
    if (updates.darkMode !== undefined) localStorage.setItem('darkMode', updates.darkMode ? 'true' : 'false');
    if (updates.notificationsEnabled !== undefined) localStorage.setItem('notificationsEnabled', updates.notificationsEnabled ? 'true' : 'false');
    
    // Отображаем сообщение о сохранении
    showMessage('Сохранение профиля...', 'info');
    
    // Обновляем документ в Firestore - используем set с merge вместо update
    db.collection('users').doc(state.currentUserId).set(updates, { merge: true })
        .then(() => {
            console.log('Профиль успешно обновлен в Firestore');
            
            // Обновляем локальное состояние
            state.userProfile = {...state.userProfile, ...updates};
            
            // Показываем сообщение об успехе
            showMessage('Профиль успешно обновлен', 'success');
        })
        .catch(error => {
            console.error('Ошибка при обновлении профиля в Firestore:', error);
            
            // Показываем сообщение об ошибке, но не прерываем работу
            showMessage('Ошибка при сохранении в базе данных, но изменения сохранены локально', 'error');
        });
}

// Функция для начала чата с пользователем
function startChatWithUser(otherUserId) {
    if (otherUserId === state.currentUserId) return;
    
    console.log('Создание чата с пользователем:', otherUserId);
    
    // Создаем ID чата (сортируем ID пользователей)
    const chatId = [state.currentUserId, otherUserId].sort().join('_');
    
    // Проверяем, существует ли уже такой чат
    db.collection('chats').doc(chatId).get()
        .then(doc => {
            if (!doc.exists) {
                console.log('Создание нового чата');
                // Если чата еще нет, создаем его
                return db.collection('chats').doc(chatId).set({
                    participants: [state.currentUserId, otherUserId],
                    createdAt: Date.now(),
                    lastMessage: '',
                    lastMessageTime: Date.now()
                });
            } else {
                console.log('Чат уже существует');
                return Promise.resolve();
            }
        })
        .then(() => {
            // Переходим к чату
            console.log('Переход к чату:', chatId);
            window.location.href = `index.html?chat=${chatId}`;
        })
        .catch(error => {
            console.error('Ошибка при создании чата:', error);
            alert('Не удалось создать чат: ' + error.message);
        });
}

// Обновление индикатора онлайн статуса
function updateOnlineStatus() {
    // Обновляем время последнего посещения
    if (state.isOwnProfile && state.currentUserId) {
        console.log('Обновление статуса онлайн');
        
        db.collection('users').doc(state.currentUserId).update({
            lastSeen: Date.now()
        }).catch(error => {
            console.error('Ошибка при обновлении статуса онлайн:', error);
            // Не показываем ошибку пользователю
        });
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    // Инициализируем главные функции
    init();
    checkAndRestoreSession();
    
    // Проверяем работу Firebase Storage
    checkFirebaseStorage();
    
    // Добавляем стили
    const style = document.createElement('style');
    style.textContent = `
        .loading-indicator {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            font-size: 14px;
            font-weight: bold;
        }
        
        .message-notification {
            animation: fadeIn 0.3s ease;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translate(-50%, 20px); }
            to { opacity: 1; transform: translate(-50%, 0); }
        }
    `;
    document.head.appendChild(style);
});

// Проверка работы Firebase Storage
function checkFirebaseStorage() {
    console.log('Проверка работы Firebase Storage...');
    
    // Создаем тестовый текстовый файл
    const testBytes = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]); // "Hello" в UTF-8
    
    // Загружаем тестовый файл
    const storageRef = storage.ref();
    const testRef = storageRef.child(`test/${state.currentUserId}_test.txt`);
    
    return testRef.put(testBytes)
        .then(snapshot => {
            console.log('Тестовая загрузка прошла успешно. Firebase Storage работает корректно.');
            window.firebaseStorageAvailable = true;
            return true;
        })
        .catch(error => {
            console.error('Firebase Storage недоступен или не работает:', error);
            window.firebaseStorageAvailable = false;
            
            // Показываем сообщение об ошибке
            showMessage('Внимание: используется резервный режим для аватаров', 'warning');
            return false;
        });
}

// Обновляем статус онлайн каждые 5 минут
setInterval(updateOnlineStatus, 5 * 60 * 1000);

// Обновляем статус при фокусе на странице
window.addEventListener('focus', updateOnlineStatus);

// Обработка изменения размера окна для адаптивного интерфейса
window.addEventListener('resize', function() {
    // Можно добавить дополнительную логику для адаптивности
    console.log('Изменение размера окна');
});

// Фикс для мобильных устройств - предотвращаем ресайз при появлении клавиатуры
if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
        viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, height=device-height';
    }
    
    // Для iOS добавляем обработку скролла для лучшего UX
    document.addEventListener('touchmove', function(e) {
        // Это позволяет скроллу работать плавнее
    }, { passive: true });
}

// Добавим проверку и восстановление сессии при загрузке страницы
function checkAndRestoreSession() {
    console.log('Проверка и восстановление сессии...');
    
    // Проверяем, есть ли у нас ID пользователя
    const userId = localStorage.getItem('chatUserId');
    if (!userId) {
        console.error('ID пользователя не найден при восстановлении сессии');
        return;
    }
    
    // Обновляем данные о последнем посещении
    db.collection('users').doc(userId).update({
        lastSeen: Date.now()
    }).catch(error => {
        console.error('Ошибка при обновлении статуса онлайн:', error);
    });
}

// Функция для показа пользователю информационных сообщений
function showMessage(message, type = 'info') {
    // Удаляем предыдущие сообщения
    document.querySelectorAll('.message-notification').forEach(el => el.remove());
    
    // Создаем новое сообщение
    const messageDiv = document.createElement('div');
    messageDiv.className = `message-notification ${type}`;
    messageDiv.textContent = message;
    
    // Стили для разных типов сообщений
    const bgColors = {
        success: '#4CAF50',
        error: '#F44336',
        info: '#2196F3',
        warning: '#FF9800'
    };
    
    // Добавляем стили
    Object.assign(messageDiv.style, {
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '10px 20px',
        backgroundColor: bgColors[type] || bgColors.info,
        color: 'white',
        borderRadius: '5px',
        zIndex: '1000',
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        transition: 'opacity 0.5s ease'
    });
    
    // Добавляем в DOM
    document.body.appendChild(messageDiv);
    
    // Удаляем сообщение через 3 секунды
    setTimeout(() => {
        messageDiv.style.opacity = '0';
        setTimeout(() => messageDiv.remove(), 500);
    }, 3000);
} 