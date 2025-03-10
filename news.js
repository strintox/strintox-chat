// Объект для работы с новостями
const News = {
    currentNewsId: null,

    // Инициализация новостей
    init: function() {
        this.loadNews();
        this.setupEventListeners();
    },

    // Настройка обработчиков событий
    setupEventListeners: function() {
        // Обработчик для клика по новости
        const newsList = document.getElementById('newsList');
        if (newsList) {
            newsList.addEventListener('click', (e) => {
                const newsItem = e.target.closest('.news-item');
                if (newsItem) {
                    const newsId = newsItem.getAttribute('data-id');
                    this.openNewsPage(newsId);
                }
            });
        }

        // Закрытие модального окна новости
        const closeNewsModal = document.querySelector('#newsModal .close');
        if (closeNewsModal) {
            closeNewsModal.addEventListener('click', () => {
                document.getElementById('newsModal').classList.add('hidden');
            });
        }

        // Отправка комментария
        const submitComment = document.getElementById('submitComment');
        if (submitComment) {
            submitComment.addEventListener('click', () => {
                if (this.currentNewsId) {
                    const commentText = document.getElementById('commentText').value.trim();
                    if (commentText) {
                        this.addComment(this.currentNewsId, commentText);
                    } else {
                        alert('Пожалуйста, введите текст комментария');
                    }
                }
            });
        }
        
        // Обработчик для удаления комментариев (делегирование событий)
        const commentsList = document.getElementById('commentsList');
        if (commentsList) {
            commentsList.addEventListener('click', (e) => {
                const deleteBtn = e.target.closest('.delete-comment-btn');
                if (deleteBtn) {
                    const commentItem = deleteBtn.closest('.comment');
                    const commentId = commentItem.getAttribute('data-id');
                    if (commentId && this.currentNewsId) {
                        this.deleteComment(this.currentNewsId, commentId, commentItem);
                    }
                }
            });
        }
    },

    // Открытие страницы с новостью
    openNewsPage: function(newsId) {
        window.location.href = `news-detail.html?id=${newsId}`;
    },

    // Загрузка всех новостей
    loadNews: function() {
        const newsList = document.getElementById('newsList');
        if (!newsList) return;
        
        newsList.innerHTML = `
            <div class="news-loading">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Загрузка новостей...</span>
            </div>
        `;

        db.collection('news')
            .orderBy('createdAt', 'desc')
            .get()
            .then(snapshot => {
                if (snapshot.empty) {
                    newsList.innerHTML = `
                        <div class="no-news">
                            <i class="far fa-frown"></i>
                            <p>Новостей пока нет</p>
                        </div>
                    `;
                    return;
                }

                newsList.innerHTML = '';
                snapshot.forEach(doc => {
                    const news = doc.data();
                    const newsElement = this.createNewsElement(doc.id, news);
                    newsList.appendChild(newsElement);
                });
            })
            .catch(error => {
                console.error('Ошибка при загрузке новостей:', error);
                newsList.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Ошибка при загрузке новостей</p>
                    </div>
                `;
            });
    },

    // Создание элемента новости для списка
    createNewsElement: function(id, news) {
        const newsItem = document.createElement('div');
        newsItem.className = 'news-item';
        newsItem.setAttribute('data-id', id);

        const date = news.createdAt ? new Date(news.createdAt.toDate()) : new Date();
        const formattedDate = date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

        // Получаем краткое описание (первые 150 символов текстового содержимого)
        // Создаем временный div для извлечения текста из HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = news.content;
        const textContent = tempDiv.textContent || tempDiv.innerText;
        const preview = textContent.length > 150 
            ? textContent.substring(0, 150) + '...' 
            : textContent;

        newsItem.innerHTML = `
            <h3>${news.title}</h3>
            <div class="date"><i class="far fa-calendar-alt"></i> ${formattedDate}</div>
            <div class="preview">${preview}</div>
            <div class="read-more">Читать далее <i class="fas fa-arrow-right"></i></div>
        `;

        return newsItem;
    },

    // Открытие модального окна с новостью
    openNewsModal: function(newsId) {
        this.currentNewsId = newsId;
        const newsModal = document.getElementById('newsModal');
        const newsContent = document.getElementById('newsContent');
        
        if (!newsModal || !newsContent) return;

        // Загружаем данные новости
        db.collection('news').doc(newsId)
            .get()
            .then(doc => {
                if (!doc.exists) {
                    alert('Новость не найдена');
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

                newsContent.innerHTML = `
                    <h2>${news.title}</h2>
                    <div class="date">${formattedDate}</div>
                    <div class="content">${news.content}</div>
                `;

                // Открываем модальное окно
                newsModal.classList.remove('hidden');
                
                // Загружаем комментарии
                this.loadComments(newsId);
            })
            .catch(error => {
                console.error('Ошибка при загрузке новости:', error);
                alert('Ошибка при загрузке новости');
            });
    },

    // Загрузка комментариев к новости
    loadComments: function(newsId) {
        const commentsList = document.getElementById('commentsList');
        if (!commentsList) return;
        
        commentsList.innerHTML = '<div class="comments-loading">Загрузка комментариев...</div>';

        db.collection('news').doc(newsId)
            .collection('comments')
            .orderBy('createdAt', 'desc')
            .get()
            .then(snapshot => {
                if (snapshot.empty) {
                    commentsList.innerHTML = '<div class="no-comments">Комментариев пока нет</div>';
                    return;
                }

                commentsList.innerHTML = '';
                snapshot.forEach(doc => {
                    const comment = doc.data();
                    const commentElement = this.createCommentElement(doc.id, comment);
                    commentsList.appendChild(commentElement);
                });
            })
            .catch(error => {
                console.error('Ошибка при загрузке комментариев:', error);
                commentsList.innerHTML = '<div class="error">Ошибка при загрузке комментариев</div>';
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
    addComment: function(newsId, text) {
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

        db.collection('news').doc(newsId)
            .collection('comments')
            .add(commentData)
            .then(() => {
                document.getElementById('commentText').value = '';
                alert('Комментарий добавлен');
                this.loadComments(newsId);
            })
            .catch(error => {
                console.error('Ошибка при добавлении комментария:', error);
                alert('Ошибка при добавлении комментария');
            });
    },
    
    // Удаление комментария
    deleteComment: function(newsId, commentId, commentElement) {
        if (!Auth.isAuthenticated()) {
            alert('Для удаления комментария необходимо войти в аккаунт');
            return;
        }

        // Сначала проверяем, имеет ли пользователь право удалить этот комментарий
        db.collection('news').doc(newsId)
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
                
                db.collection('news').doc(newsId)
                    .collection('comments').doc(commentId)
                    .delete()
                    .then(() => {
                        commentElement.remove();
                        
                        // Проверяем, остались ли комментарии
                        const commentsList = document.getElementById('commentsList');
                        if (commentsList && commentsList.children.length === 0) {
                            commentsList.innerHTML = '<div class="no-comments">Комментариев пока нет</div>';
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
    },

    // Добавление новой новости (для админа)
    addNews: function(title, content) {
        if (!Auth.isAdmin) {
            alert('Только администратор может добавлять новости');
            return;
        }

        const newsData = {
            title: title,
            content: content,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            authorId: Auth.getCurrentUser().uid
        };

        return db.collection('news')
            .add(newsData)
            .then(() => {
                this.loadNews();
                return true;
            })
            .catch(error => {
                console.error('Ошибка при добавлении новости:', error);
                throw error;
            });
    },
    
    // Обновление существующей новости
    updateNews: function(newsId, title, content) {
        if (!Auth.isAdmin) {
            alert('Только администратор может редактировать новости');
            return Promise.reject('Недостаточно прав');
        }

        return db.collection('news').doc(newsId)
            .update({
                title: title,
                content: content,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            })
            .then(() => {
                return true;
            })
            .catch(error => {
                console.error('Ошибка при обновлении новости:', error);
                throw error;
            });
    }
};

// Ждем загрузки страницы для инициализации
document.addEventListener('DOMContentLoaded', () => {
    News.init();
}); 