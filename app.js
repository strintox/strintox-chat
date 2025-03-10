// Основной файл приложения
document.addEventListener('DOMContentLoaded', () => {
    // Проверяем, что все нужные объекты загружены
    if (typeof firebase !== 'undefined' && 
        typeof Auth !== 'undefined' && 
        typeof News !== 'undefined' && 
        typeof Admin !== 'undefined') {
        
        console.log('Новостной портал успешно инициализирован');
    } else {
        console.error('Ошибка при инициализации приложения. Проверьте подключение скриптов.');
    }

    // Обработчик закрытия модальных окон при клике вне их содержимого
    window.addEventListener('click', (e) => {
        const authModal = document.getElementById('authModal');
        const registerModal = document.getElementById('registerModal');
        const newsModal = document.getElementById('newsModal');
        
        if (e.target === authModal) {
            authModal.classList.add('hidden');
        }
        
        if (e.target === registerModal) {
            registerModal.classList.add('hidden');
        }
        
        if (e.target === newsModal) {
            newsModal.classList.add('hidden');
        }
    });
    
    // Запрет копирования текста с исключением для редактора
    document.addEventListener('copy', function(e) {
        // Проверяем, происходит ли копирование в редакторе
        if (e.target.closest('.editor-content') || e.target.hasAttribute('contenteditable')) {
            // Разрешаем копирование в редакторе
            return true;
        }
        
        e.preventDefault();
        alert('Копирование контента запрещено!');
    });
    
    document.addEventListener('contextmenu', function(e) {
        // Разрешаем контекстное меню в редакторе
        if (e.target.closest('.editor-content') || e.target.hasAttribute('contenteditable')) {
            return true;
        }
        
        e.preventDefault();
        alert('Контекстное меню отключено!');
    });
    
    // Запрет выделения текста с исключением для редактора
    document.addEventListener('selectstart', function(e) {
        // Разрешаем выделение в редакторе
        if (e.target.closest('.editor-content') || e.target.hasAttribute('contenteditable')) {
            return true;
        }
        
        // Запрещаем выделение в остальных местах
        return false;
    });
    
    // Мобильное меню
    const mobileMenuToggle = document.createElement('button');
    mobileMenuToggle.className = 'mobile-menu-toggle';
    mobileMenuToggle.innerHTML = '<i class="fas fa-bars"></i>';
    
    const nav = document.querySelector('nav');
    const header = document.querySelector('header .container');
    
    // Добавляем кнопку мобильного меню только на мобильных устройствах
    if (window.innerWidth <= 768) {
        header.appendChild(mobileMenuToggle);
    }
    
    // При изменении размера окна
    window.addEventListener('resize', () => {
        if (window.innerWidth <= 768) {
            if (!document.querySelector('.mobile-menu-toggle')) {
                header.appendChild(mobileMenuToggle);
            }
        } else {
            const toggle = document.querySelector('.mobile-menu-toggle');
            if (toggle) {
                toggle.remove();
                nav.classList.remove('active');
            }
        }
    });
    
    // Открытие/закрытие мобильного меню
    mobileMenuToggle.addEventListener('click', () => {
        nav.classList.toggle('active');
        if (nav.classList.contains('active')) {
            mobileMenuToggle.innerHTML = '<i class="fas fa-times"></i>';
            document.body.style.overflow = 'hidden'; // Запрет прокрутки фона
        } else {
            mobileMenuToggle.innerHTML = '<i class="fas fa-bars"></i>';
            document.body.style.overflow = ''; // Разрешение прокрутки
        }
    });
    
    // Закрытие мобильного меню при клике на ссылку
    const navLinks = document.querySelectorAll('nav ul li a');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                nav.classList.remove('active');
                mobileMenuToggle.innerHTML = '<i class="fas fa-bars"></i>';
                document.body.style.overflow = '';
            }
        });
    });
    
    // Закрытие мобильного меню при клике вне его
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && 
            nav.classList.contains('active') && 
            !nav.contains(e.target) && 
            e.target !== mobileMenuToggle) {
            nav.classList.remove('active');
            mobileMenuToggle.innerHTML = '<i class="fas fa-bars"></i>';
            document.body.style.overflow = '';
        }
    });
    
    // Плавная прокрутка для ссылок
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
}); 