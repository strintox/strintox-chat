// Объект для работы с авторизацией
const Auth = {
    currentUser: null,
    isAdmin: false,
    adminEmail: "strintox@gmail.com", // Email администратора

    // Инициализация авторизации
    init: function() {
        // Слушатель изменения состояния авторизации
        auth.onAuthStateChanged(user => {
            if (user) {
                this.currentUser = user;
                this.isAdmin = user.email === this.adminEmail;
                this.updateUI();
            } else {
                this.currentUser = null;
                this.isAdmin = false;
                this.updateUI();
            }
        });

        // Обработчики событий для форм авторизации
        this.setupEventListeners();
    },

    // Обновление пользовательского интерфейса
    updateUI: function() {
        const loginBtn = document.getElementById('loginBtn');
        const registerBtn = document.getElementById('registerBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const profileBtn = document.getElementById('profileBtn');
        const adminPanel = document.getElementById('adminPanel');
        const adminLoginForm = document.getElementById('adminLoginForm');
        const newsEditor = document.getElementById('newsEditor');
        const addCommentForm = document.getElementById('addCommentForm');
        const loginToComment = document.getElementById('loginToComment');

        if (this.currentUser) {
            // Пользователь вошел в систему
            loginBtn.classList.add('hidden');
            registerBtn.classList.add('hidden');
            logoutBtn.classList.remove('hidden');
            profileBtn.classList.remove('hidden');
            
            // Показываем форму комментариев
            if (addCommentForm && loginToComment) {
                addCommentForm.classList.remove('hidden');
                loginToComment.classList.add('hidden');
            }
            
            // Если админ, показываем редактор новостей
            if (this.isAdmin && adminPanel.classList.contains('active')) {
                adminLoginForm.classList.add('hidden');
                newsEditor.classList.remove('hidden');
            }
        } else {
            // Пользователь не вошел в систему
            loginBtn.classList.remove('hidden');
            registerBtn.classList.remove('hidden');
            logoutBtn.classList.add('hidden');
            profileBtn.classList.add('hidden');
            
            // Скрываем форму комментариев
            if (addCommentForm && loginToComment) {
                addCommentForm.classList.add('hidden');
                loginToComment.classList.remove('hidden');
            }
            
            // Скрываем редактор новостей
            if (adminLoginForm && newsEditor) {
                adminLoginForm.classList.remove('hidden');
                newsEditor.classList.add('hidden');
            }
        }
    },

    // Настройка обработчиков событий
    setupEventListeners: function() {
        // Кнопки авторизации
        const loginBtn = document.getElementById('loginBtn');
        const registerBtn = document.getElementById('registerBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const loginLinks = document.querySelectorAll('.login-link');
        
        // Модальные окна
        const authModal = document.getElementById('authModal');
        const registerModal = document.getElementById('registerModal');
        const closeButtons = document.querySelectorAll('.close');
        
        // Формы авторизации и регистрации
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        const adminLoginForm = document.getElementById('admin-login-form');

        // Открытие модальных окон
        loginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            authModal.classList.remove('hidden');
        });

        registerBtn.addEventListener('click', (e) => {
            e.preventDefault();
            registerModal.classList.remove('hidden');
        });

        loginLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                authModal.classList.remove('hidden');
            });
        });

        // Закрытие модальных окон
        closeButtons.forEach(button => {
            button.addEventListener('click', () => {
                authModal.classList.add('hidden');
                registerModal.classList.add('hidden');
            });
        });

        // Выход из системы
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.logout();
        });

        // Обработка формы входа
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            this.login(email, password);
        });

        // Обработка формы регистрации
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('register-name').value;
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            this.register(email, password, name);
        });

        // Обработка формы входа администратора
        adminLoginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('admin-email').value;
            const password = document.getElementById('admin-password').value;
            this.loginAdmin(email, password);
        });
    },

    // Регистрация нового пользователя
    register: function(email, password, name) {
        auth.createUserWithEmailAndPassword(email, password)
            .then(userCredential => {
                // Обновляем профиль пользователя
                return userCredential.user.updateProfile({
                    displayName: name
                }).then(() => {
                    // Сохраняем информацию о пользователе в Firestore
                    return db.collection('users').doc(userCredential.user.uid).set({
                        name: name,
                        email: email,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                });
            })
            .then(() => {
                alert('Регистрация прошла успешно!');
                document.getElementById('registerModal').classList.add('hidden');
                document.getElementById('register-form').reset();
            })
            .catch(error => {
                console.error('Ошибка при регистрации:', error);
                alert('Ошибка при регистрации: ' + error.message);
            });
    },

    // Вход пользователя
    login: function(email, password) {
        auth.signInWithEmailAndPassword(email, password)
            .then(() => {
                alert('Вы успешно вошли в систему!');
                document.getElementById('authModal').classList.add('hidden');
                document.getElementById('login-form').reset();
            })
            .catch(error => {
                console.error('Ошибка при входе:', error);
                alert('Ошибка при входе: ' + error.message);
            });
    },

    // Вход администратора
    loginAdmin: function(email, password) {
        if (email !== this.adminEmail) {
            alert('Доступ запрещен. Вы не являетесь администратором.');
            return;
        }

        auth.signInWithEmailAndPassword(email, password)
            .then(userCredential => {
                if (userCredential.user.email === this.adminEmail) {
                    this.isAdmin = true;
                    alert('Вы вошли как администратор!');
                    document.getElementById('adminLoginForm').classList.add('hidden');
                    document.getElementById('newsEditor').classList.remove('hidden');
                    document.getElementById('admin-login-form').reset();
                } else {
                    alert('Доступ запрещен. Вы не являетесь администратором.');
                }
            })
            .catch(error => {
                console.error('Ошибка при входе администратора:', error);
                alert('Ошибка при входе: ' + error.message);
            });
    },

    // Выход из системы
    logout: function() {
        auth.signOut()
            .then(() => {
                alert('Вы вышли из системы');
            })
            .catch(error => {
                console.error('Ошибка при выходе:', error);
                alert('Ошибка при выходе: ' + error.message);
            });
    },

    // Проверка авторизации
    isAuthenticated: function() {
        return this.currentUser !== null;
    },

    // Получение данных текущего пользователя
    getCurrentUser: function() {
        return this.currentUser;
    }
};

// Ждем загрузки страницы для инициализации
document.addEventListener('DOMContentLoaded', () => {
    Auth.init();
}); 