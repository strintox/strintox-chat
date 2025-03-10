// Объект для работы с детальной страницей новости
const NewsDetail = {
    currentNewsId: null,
    
    // Инициализация страницы детальной новости
    init: function() {
        // Получаем ID новости из URL
        const urlParams = new URLSearchParams(window.location.search);
        this.currentNewsId = urlParams.get('id');
        
        if (this.currentNewsId) {
            this.loadNews(this.currentNewsId);
            this.setupEventListeners();
            this.setupMobileMenu();
            this.preventCopying();
        } else {
            alert('Не указан ID новости');
            window.location.href = 'index.html';
        }
    },
    
    // Настройка обработчиков событий
    setupEventListeners: function() {
        // Кнопка отправки комментария
        const submitComment = document.getElementById('submitComment');
        if (submitComment) {
            submitComment.addEventListener('click', () => {
                const commentText = document.getElementById('commentText').value.trim();
                if (commentText) {
                    this.addComment(commentText);
                } else {
                    alert('Пожалуйста, введите текст комментария');
                }
            });
        }
        
        // Ссылка для входа в систему из формы комментариев
        const loginLink = document.querySelector('.login-link');
        if (loginLink) {
            loginLink.addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('authModal').classList.remove('hidden');
            });
        }
        
        // Обработчик закрытия модальных окон при клике вне их содержимого
        window.addEventListener('click', (e) => {
            const authModal = document.getElementById('authModal');
            const registerModal = document.getElementById('registerModal');
            
            if (e.target === authModal) {
                authModal.classList.add('hidden');
            }
            
            if (e.target === registerModal) {
                registerModal.classList.add('hidden');
            }
        });
        
        // Обработчик для удаления комментариев (делегирование событий)
        const commentsList = document.getElementById('commentsList');
        if (commentsList) {
            commentsList.addEventListener('click', (e) => {
                const deleteBtn = e.target.closest('.delete-comment-btn');
                if (deleteBtn) {
                    const commentItem = deleteBtn.closest('.comment');
                    const commentId = commentItem.getAttribute('data-id');
                    if (commentId) {
                        this.deleteComment(commentId, commentItem);
                    }
                }
            });
        }
    },
    
    // Настройка мобильного меню
    setupMobileMenu: function() {
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
    },
    
    // Запрет копирования контента
    preventCopying: function() {
        // Запрет копирования текста
        document.addEventListener('copy', function(e) {
            e.preventDefault();
            alert('Копирование контента запрещено!');
        });
        
        document.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            alert('Контекстное меню отключено!');
        });
        
        // Запрет выделения текста также реализован в CSS через user-select: none
    },
    
    // Загрузка новости
    loadNews: function(newsId) {
        const newsContent = document.getElementById('newsContent');
        
        db.collection('news').doc(newsId)
            .get()
            .then(doc => {
                if (!doc.exists) {
                    alert('Новость не найдена');
                    window.location.href = 'index.html';
                    return;
                }
                
                const news = doc.data();
                const date = news.createdAt ? new Date(news.createdAt.toDate()) : new Date();
                const formattedDate = date.toLocaleDateString('ru-RU', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                // Обновляем заголовок страницы
                document.title = `${news.title} | Новостной портал`;
                
                // Отображаем новость на странице, сохраняя HTML-форматирование
                newsContent.innerHTML = `
                    <div class="news-header">
                        <h1>${news.title}</h1>
                        <div class="news-meta">
                            <span class="news-date"><i class="far fa-calendar-alt"></i> ${formattedDate}</span>
                        </div>
                    </div>
                    <div class="news-body">${news.content}</div>
                `;
                
                // Добавляем анимации для элементов
                setTimeout(() => {
                    const header = document.querySelector('.news-header');
                    const body = document.querySelector('.news-body');
                    
                    if (header) header.style.animation = 'fadeInUp 0.8s ease-out';
                    if (body) body.style.animation = 'fadeInUp 0.8s ease-out 0.3s both';
                }, 100);
                
                // Загружаем комментарии
                this.loadComments();
            })
            .catch(error => {
                console.error('Ошибка при загрузке новости:', error);
                newsContent.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Ошибка при загрузке новости</p>
                    </div>
                `;
            });
    },
    
    // Загрузка комментариев
    loadComments: function() {
        const commentsList = document.getElementById('commentsList');
        
        db.collection('news').doc(this.currentNewsId)
            .collection('comments')
            .orderBy('createdAt', 'desc')
            .get()
            .then(snapshot => {
                if (snapshot.empty) {
                    commentsList.innerHTML = `
                        <div class="no-comments">
                            <i class="far fa-comment-alt"></i>
                            <span>Комментариев пока нет. Будьте первым!</span>
                        </div>
                    `;
                    return;
                }
                
                commentsList.innerHTML = '';
                snapshot.forEach(doc => {
                    const comment = doc.data();
                    commentsList.appendChild(this.createCommentElement(doc.id, comment));
                });
            })
            .catch(error => {
                console.error('Ошибка при загрузке комментариев:', error);
                commentsList.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Ошибка при загрузке комментариев</p>
                    </div>
                `;
            });
    },
    
    // Создание элемента комментария
    createCommentElement: function(commentId, comment) {
        const commentItem = document.createElement('div');
        commentItem.className = 'comment';
        commentItem.setAttribute('data-id', commentId);
        
        const date = comment.createdAt ? new Date(comment.createdAt.toDate()) : new Date();
        const formattedDate = date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // Проверяем, является ли текущий пользователь автором комментария
        const currentUser = Auth.getCurrentUser();
        const isAuthor = currentUser && currentUser.uid === comment.userId;
        const isAdmin = Auth.isAdmin;
        
        // Кнопка удаления комментария (только для авторов или админов)
        const deleteButton = (isAuthor || isAdmin) 
            ? `<button class="delete-comment-btn" title="Удалить комментарий">
                <i class="fas fa-trash"></i>
               </button>` 
            : '';
        
        commentItem.innerHTML = `
            <div class="comment-header">
                <div class="comment-author"><i class="fas fa-user"></i> ${comment.author}</div>
                <div class="comment-date">
                    <i class="far fa-clock"></i> ${formattedDate}
                    ${deleteButton}
                </div>
            </div>
            <div class="comment-text">${comment.text}</div>
        `;
        
        return commentItem;
    },
    
    // Добавление комментария
    addComment: function(text) {
        if (!Auth.isAuthenticated()) {
            alert('Для добавления комментария необходимо войти в аккаунт');
            return;
        }
        
        const user = Auth.getCurrentUser();
        const commentData = {
            author: user.displayName || 'Анонимный пользователь',
            userId: user.uid,
            text: text,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        db.collection('news').doc(this.currentNewsId)
            .collection('comments')
            .add(commentData)
            .then(() => {
                document.getElementById('commentText').value = '';
                alert('Комментарий успешно добавлен');
                this.loadComments();
            })
            .catch(error => {
                console.error('Ошибка при добавлении комментария:', error);
                alert('Ошибка при добавлении комментария: ' + error.message);
            });
    },
    
    // Удаление комментария
    deleteComment: function(commentId, commentElement) {
        if (!Auth.isAuthenticated()) {
            alert('Для удаления комментария необходимо войти в аккаунт');
            return;
        }

        // Сначала проверяем, имеет ли пользователь право удалить этот комментарий
        db.collection('news').doc(this.currentNewsId)
            .collection('comments').doc(commentId)
            .get()
            .then(doc => {
                if (!doc.exists) {
                    alert('Комментарий не найден');
                    return;
                }
                
                const comment = doc.data();
                const currentUser = Auth.getCurrentUser();
                
                // Проверяем, является ли текущий пользователь автором комментария или админом
                if (currentUser.uid !== comment.userId && !Auth.isAdmin) {
                    alert('У вас нет прав для удаления этого комментария');
                    return;
                }
                
                // Запрашиваем подтверждение
                if (!confirm('Вы действительно хотите удалить этот комментарий?')) {
                    return;
                }
                
                // Если все проверки пройдены, удаляем комментарий
                commentElement.style.opacity = '0.5';
                
                db.collection('news').doc(this.currentNewsId)
                    .collection('comments').doc(commentId)
                    .delete()
                    .then(() => {
                        commentElement.remove();
                        
                        // Проверяем, остались ли комментарии
                        const commentsList = document.getElementById('commentsList');
                        if (commentsList && commentsList.children.length === 0) {
                            commentsList.innerHTML = `
                                <div class="no-comments">
                                    <i class="far fa-comment-alt"></i>
                                    <span>Комментариев пока нет. Будьте первым!</span>
                                </div>
                            `;
                        }
                        
                        alert('Комментарий успешно удален');
                    })
                    .catch(error => {
                        console.error('Ошибка при удалении комментария:', error);
                        commentElement.style.opacity = '1';
                        alert('Ошибка при удалении комментария: ' + error.message);
                    });
            })
            .catch(error => {
                console.error('Ошибка при проверке комментария:', error);
                alert('Ошибка при проверке комментария: ' + error.message);
            });
    }
};

// Ждем загрузки страницы для инициализации
document.addEventListener('DOMContentLoaded', () => {
    NewsDetail.init();
}); 