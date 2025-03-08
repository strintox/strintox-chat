/**
 * Модуль аутентификации SecureVault
 * 
 * Обеспечивает функционал авторизации и регистрации пользователей
 * на основе уникальных 32-значных ID
 */

// Authentication Module

// Initialize Firebase
document.addEventListener("DOMContentLoaded", function() {
    // Initialize Firebase with config from config.js
    if (typeof firebase !== 'undefined') {
        firebase.initializeApp(CONFIG.FIREBASE_CONFIG);
    } else {
        console.error("Firebase SDK not loaded");
    }
});

// Authentication Manager
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.peer = null;
        
        // DOM элементы для авторизации
        this.loginForm = document.getElementById('login-form');
        this.registerForm = document.getElementById('register-form');
        this.tabBtns = document.querySelectorAll('.tab-btn');
        this.tabContents = document.querySelectorAll('.tab-content');
        this.logoutBtn = document.getElementById('logout-btn');
        
        // Инициализация обработчиков событий
        this.init();
    }
    
    init() {
        // Переключение между вкладками
        this.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.dataset.tab;
                this.switchTab(tabName);
            });
        });
        
        // Обработка отправки формы входа
        this.loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });
        
        // Обработка отправки формы регистрации
        this.registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.register();
        });
        
        // Обработка выхода из аккаунта
        this.logoutBtn.addEventListener('click', () => {
            this.logout();
        });
        
        // Проверка, авторизован ли пользователь
        this.checkAuth();
    }
    
    switchTab(tabName) {
        // Удаляем активный класс у всех вкладок
        this.tabBtns.forEach(btn => btn.classList.remove('active'));
        this.tabContents.forEach(content => content.classList.remove('active'));
        
        // Добавляем активный класс выбранной вкладке
        document.querySelector(`.tab-btn[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}-tab`).classList.add('active');
    }
    
    async login() {
        const login = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        
        if (!login || !password) {
            this.showNotification('Пожалуйста, заполните все поля', 'error');
            return;
        }
        
        try {
            const user = await dbManager.getUserByLogin(login);
            
            if (!user) {
                this.showNotification('Пользователь не найден', 'error');
                return;
            }
            
            if (user.password !== this.hashPassword(password)) {
                this.showNotification('Неверный пароль', 'error');
                return;
            }
            
            // Успешная авторизация
            this.setCurrentUser(user);
            this.showNotification('Вы успешно вошли в аккаунт', 'success');
            
            // Переход на страницу чатов
            this.navigateTo('chats-page');
            
        } catch (error) {
            console.error('Ошибка при входе:', error);
            this.showNotification('Произошла ошибка при входе', 'error');
        }
    }
    
    async register() {
        const firstname = document.getElementById('register-firstname').value.trim();
        const lastname = document.getElementById('register-lastname').value.trim();
        const login = document.getElementById('register-username').value.trim();
        const password = document.getElementById('register-password').value;
        
        if (!firstname || !lastname || !login || !password) {
            this.showNotification('Пожалуйста, заполните все поля', 'error');
            return;
        }
        
        if (password.length < 8) {
            this.showNotification('Пароль должен содержать не менее 8 символов', 'error');
            return;
        }
        
        try {
            // Проверяем, существует ли пользователь с таким логином
            const existingUser = await dbManager.getUserByLogin(login);
            
            if (existingUser) {
                this.showNotification('Пользователь с таким логином уже существует', 'error');
                return;
            }
            
            // Создаем нового пользователя
            const user = {
                id: this.generateId(),
                firstname,
                lastname,
                login,
                password: this.hashPassword(password),
                registrationDate: new Date().toISOString()
            };
            
            // Сохраняем пользователя в базу данных
            await dbManager.saveUser(user);
            
            // Устанавливаем текущего пользователя
            this.setCurrentUser(user);
            
            this.showNotification('Вы успешно зарегистрировались', 'success');
            
            // Переход на страницу чатов
            this.navigateTo('chats-page');
            
        } catch (error) {
            console.error('Ошибка при регистрации:', error);
            this.showNotification('Произошла ошибка при регистрации', 'error');
        }
    }
    
    logout() {
        // Отключаем P2P соединение
        if (this.peer) {
            this.peer.destroy();
            this.peer = null;
        }
        
        // Удаляем текущего пользователя из локального хранилища
        localStorage.removeItem('currentUser');
        this.currentUser = null;
        
        // Очищаем формы
        this.loginForm.reset();
        this.registerForm.reset();
        
        // Переход на страницу авторизации
        this.navigateTo('auth-page');
        this.switchTab('login');
    }
    
    async checkAuth() {
        // Проверяем, есть ли сохраненный пользователь в локальном хранилище
        const savedUser = localStorage.getItem('currentUser');
        
        if (savedUser) {
            try {
                const user = JSON.parse(savedUser);
                const dbUser = await dbManager.getUserById(user.id);
                
                if (dbUser) {
                    this.setCurrentUser(dbUser);
                    this.navigateTo('chats-page');
                    return;
                }
            } catch (error) {
                console.error('Ошибка при проверке авторизации:', error);
            }
        }
        
        // Если пользователь не авторизован, показываем страницу авторизации
        this.navigateTo('auth-page');
    }
    
    setCurrentUser(user) {
        // Исключаем пароль из сохраняемого объекта
        const { password, ...userWithoutPassword } = user;
        this.currentUser = userWithoutPassword;
        
        // Сохраняем пользователя в локальное хранилище
        localStorage.setItem('currentUser', JSON.stringify(userWithoutPassword));
        
        // Обновляем информацию о пользователе в интерфейсе
        document.getElementById('current-user-name').textContent = `${user.firstname} ${user.lastname}`;
        document.getElementById('current-user-id').textContent = `ID: ${user.id}`;
        
        // Инициализируем P2P соединение
        this.initPeer(user.id);
    }
    
    initPeer(userId) {
        this.peer = new Peer(userId);
        
        this.peer.on('open', (id) => {
            console.log('P2P соединение установлено с ID:', id);
        });
        
        this.peer.on('error', (error) => {
            console.error('Ошибка P2P соединения:', error);
        });
    }
    
    navigateTo(pageId) {
        // Скрываем все страницы
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        
        // Показываем выбранную страницу
        document.getElementById(pageId).classList.add('active');
    }
    
    generateId() {
        // Генерируем уникальный ID для пользователя
        return 'user_' + Math.random().toString(36).substr(2, 9);
    }
    
    hashPassword(password) {
        // Простая хеш-функция для пароля
        // В реальном приложении следует использовать более надежные методы хеширования
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString();
    }
    
    showNotification(message, type = 'info') {
        // Можно реализовать отображение уведомлений
        // В данном случае просто выводим в консоль
        console.log(`[${type.toUpperCase()}] ${message}`);
        alert(message);
    }
}

// Экземпляр менеджера аутентификации будет создан в app.js после инициализации базы данных

// Auth Module for Strintox
const Auth = (function() {
    const USER_ID_KEY = 'darkChat_userId';
    let currentUserId = null;

    /**
     * Генерация случайного ID пользователя
     */
    function generateUserId() {
        // Генерируем 10 символов из букв и цифр
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 10; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    /**
     * Проверка наличия существующего ID пользователя
     */
    function checkExistingUserId() {
        const savedUserId = localStorage.getItem(USER_ID_KEY);
        if (savedUserId) {
            currentUserId = savedUserId;
            return true;
        }
        return false;
    }

    /**
     * Создание нового ID пользователя и сохранение в localStorage
     */
    function createNewUserId() {
        currentUserId = generateUserId();
        localStorage.setItem(USER_ID_KEY, currentUserId);
        return currentUserId;
    }

    /**
     * Получение текущего ID пользователя
     */
    function getUserId() {
        if (!currentUserId) {
            if (checkExistingUserId()) {
                return currentUserId;
            } else {
                return createNewUserId();
            }
        }
        return currentUserId;
    }

    /**
     * Инициализация авторизации
     */
    function init() {
        return new Promise((resolve) => {
            // Проверяем наличие сохраненного ID или создаем новый
            if (!checkExistingUserId()) {
                createNewUserId();
            }
            
            console.log('Авторизация пользователя:', currentUserId);
            
            // Имитируем задержку для более плавной анимации загрузки
            setTimeout(() => {
                resolve(currentUserId);
            }, 1000);
        });
    }

    return {
        init,
        getUserId
    };
})(); 