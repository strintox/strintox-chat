// Объект для работы с профилем пользователя
const Profile = {
    // Инициализация профиля
    init: function() {
        this.setupEventListeners();
        this.checkAuthState();
        this.setupTabs();
    },

    // Проверка состояния авторизации
    checkAuthState: function() {
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                this.loadUserProfile(user);
            } else {
                document.getElementById('profileNotLoggedIn').classList.remove('hidden');
                document.getElementById('profileData').classList.add('hidden');
            }
        });
    },

    // Загрузка профиля пользователя
    loadUserProfile: function(user) {
        document.getElementById('profileNotLoggedIn').classList.add('hidden');
        document.getElementById('profileData').classList.remove('hidden');
        
        // Отображаем информацию о пользователе
        document.getElementById('profileName').textContent = user.displayName || 'Пользователь';
        document.getElementById('profileEmail').textContent = user.email || '';
        
        // Форма обновления профиля
        document.getElementById('updateName').value = user.displayName || '';
        
        // Дата регистрации
        const createdAt = user.metadata.creationTime;
        const dateJoined = new Date(createdAt);
        const formattedDate = dateJoined.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        document.getElementById('profileDateJoined').innerHTML = `<i class="far fa-calendar-alt"></i> Дата регистрации: ${formattedDate}`;
        
        // Показываем панель администратора, если пользователь админ
        if (Auth.isAdmin) {
            document.getElementById('adminActions').classList.remove('hidden');
        } else {
            document.getElementById('adminActions').classList.add('hidden');
        }
        
        // Загружаем комментарии пользователя
        this.loadUserComments(user.uid);
    },
    
    // Загрузка комментариев пользователя
    loadUserComments: function(userId) {
        const commentsList = document.getElementById('userCommentsList');
        if (!commentsList) return;
        
        commentsList.innerHTML = `
            <div class="loading-comments">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Загрузка комментариев...</span>
            </div>
        `;
        
        // Изменяем подход: сначала загружаем все новости, затем ищем комментарии в них
        db.collection('news')
            .get()
            .then(snapshot => {
                if (snapshot.empty) {
                    commentsList.innerHTML = `
                        <div class="no-comments">
                            <i class="far fa-comment-alt"></i>
                            <span>У вас пока нет комментариев</span>
                        </div>
                    `;
                    return;
                }
                
                const newsPromises = [];
                const newsData = {};
                
                // Для каждой новости загружаем данные и комментарии пользователя
                snapshot.forEach(newsDoc => {
                    const newsId = newsDoc.id;
                    const newsTitle = newsDoc.data().title;
                    
                    // Сохраняем данные новости
                    newsData[newsId] = {
                        title: newsTitle
                    };
                    
                    // Создаем промис для загрузки комментариев к этой новости
                    const commentsPromise = db.collection('news').doc(newsId)
                        .collection('comments')
                        .where('userId', '==', userId)
                        .get()
                        .then(commentsSnapshot => {
                            const comments = [];
                            commentsSnapshot.forEach(commentDoc => {
                                comments.push({
                                    id: commentDoc.id,
                                    newsId: newsId,
                                    data: commentDoc.data()
                                });
                            });
                            return comments;
                        });
                    
                    newsPromises.push(commentsPromise);
                });
                
                // Ждем загрузки всех комментариев
                Promise.all(newsPromises)
                    .then(commentsArrays => {
                        // Объединяем все массивы комментариев
                        let allComments = [];
                        commentsArrays.forEach(commentsArray => {
                            allComments = allComments.concat(commentsArray);
                        });
                        
                        // Если комментариев нет
                        if (allComments.length === 0) {
                            commentsList.innerHTML = `
                                <div class="no-comments">
                                    <i class="far fa-comment-alt"></i>
                                    <span>У вас пока нет комментариев</span>
                                </div>
                            `;
                            return;
                        }
                        
                        // Сортируем комментарии по дате (новые сверху)
                        allComments.sort((a, b) => {
                            const dateA = a.data.createdAt ? a.data.createdAt.toDate() : new Date(0);
                            const dateB = b.data.createdAt ? b.data.createdAt.toDate() : new Date(0);
                            return dateB - dateA;
                        });
                        
                        // Очищаем список
                        commentsList.innerHTML = '';
                        
                        // Создаем элементы комментариев
                        allComments.forEach(comment => {
                            const newsTitle = newsData[comment.newsId] 
                                ? newsData[comment.newsId].title 
                                : 'Новость удалена';
                            
                            const date = comment.data.createdAt 
                                ? new Date(comment.data.createdAt.toDate()) 
                                : new Date();
                            
                            const formattedDate = date.toLocaleDateString('ru-RU', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            });
                            
                            // Создаем элемент комментария
                            const commentItem = document.createElement('div');
                            commentItem.className = 'user-comment-item';
                            commentItem.dataset.commentId = comment.id;
                            commentItem.dataset.newsId = comment.newsId;
                            
                            commentItem.innerHTML = `
                                <div class="comment-news-title">
                                    <a href="news-detail.html?id=${comment.newsId}">${newsTitle}</a>
                                </div>
                                <div class="comment-date">
                                    <i class="far fa-clock"></i> ${formattedDate}
                                    <button class="delete-comment-btn" title="Удалить комментарий">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                                <div class="comment-content">${comment.data.text}</div>
                            `;
                            
                            // Добавляем обработчик для удаления комментария
                            const deleteBtn = commentItem.querySelector('.delete-comment-btn');
                            deleteBtn.addEventListener('click', () => {
                                this.deleteComment(comment.newsId, comment.id, commentItem);
                            });
                            
                            commentsList.appendChild(commentItem);
                        });
                    })
                    .catch(error => {
                        console.error('Ошибка при обработке комментариев:', error);
                        commentsList.innerHTML = `
                            <div class="error-message">
                                <i class="fas fa-exclamation-triangle"></i>
                                <span>Ошибка при обработке комментариев: ${error.message}</span>
                            </div>
                        `;
                    });
            })
            .catch(error => {
                console.error('Ошибка при загрузке новостей:', error);
                commentsList.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        <span>Ошибка при загрузке новостей: ${error.message}</span>
                    </div>
                `;
            });
    },
    
    // Удаление комментария
    deleteComment: function(newsId, commentId, commentElement) {
        if (!confirm('Вы действительно хотите удалить этот комментарий?')) {
            return;
        }
        
        // Показываем индикатор загрузки
        commentElement.style.opacity = '0.5';
        
        // Удаляем комментарий из базы данных
        db.collection('news').doc(newsId)
            .collection('comments').doc(commentId)
            .delete()
            .then(() => {
                // Удаляем элемент из DOM
                commentElement.remove();
                
                // Проверяем, остались ли комментарии
                const commentsList = document.getElementById('userCommentsList');
                if (commentsList && commentsList.children.length === 0) {
                    commentsList.innerHTML = `
                        <div class="no-comments">
                            <i class="far fa-comment-alt"></i>
                            <span>У вас пока нет комментариев</span>
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
    },
    
    // Настройка вкладок профиля
    setupTabs: function() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Убираем активный класс со всех кнопок и контента
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                
                // Добавляем активный класс выбранной вкладке
                button.classList.add('active');
                const tabId = button.getAttribute('data-tab');
                document.getElementById(`tab-${tabId}`).classList.add('active');
            });
        });
    },
    
    // Настройка обработчиков событий
    setupEventListeners: function() {
        // Кнопка входа в профиле, если пользователь не вошел
        const profileLoginBtn = document.getElementById('profileLoginBtn');
        if (profileLoginBtn) {
            profileLoginBtn.addEventListener('click', () => {
                document.getElementById('authModal').classList.remove('hidden');
            });
        }
        
        // Кнопка обновления профиля
        const updateProfileBtn = document.getElementById('updateProfileBtn');
        if (updateProfileBtn) {
            updateProfileBtn.addEventListener('click', () => {
                const newName = document.getElementById('updateName').value.trim();
                if (newName) {
                    this.updateUserProfile(newName);
                } else {
                    alert('Пожалуйста, введите имя');
                }
            });
        }
        
        // Кнопка перехода в панель администратора
        const goToAdminPanelBtn = document.getElementById('goToAdminPanelBtn');
        if (goToAdminPanelBtn) {
            goToAdminPanelBtn.addEventListener('click', () => {
                window.location.href = 'admin.html';
            });
        }
    },
    
    // Обновление профиля пользователя
    updateUserProfile: function(displayName) {
        const user = firebase.auth().currentUser;
        if (!user) return;
        
        user.updateProfile({
            displayName: displayName
        }).then(() => {
            alert('Профиль успешно обновлен');
            // Обновляем отображаемое имя
            document.getElementById('profileName').textContent = displayName;
        }).catch(error => {
            console.error('Ошибка при обновлении профиля:', error);
            alert('Ошибка при обновлении профиля: ' + error.message);
        });
    }
};

// Ждем загрузки страницы для инициализации
document.addEventListener('DOMContentLoaded', () => {
    Profile.init();
}); 