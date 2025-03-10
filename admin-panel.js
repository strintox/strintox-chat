// Объект для работы с админ-панелью
const AdminPanel = {
    // Переменные для работы с подтверждениями
    confirmationCallback: null,
    
    // Инициализация админ-панели
    init: function() {
        this.checkAdminAccess();
        this.setupEventListeners();
    },
    
    // Проверка прав администратора
    checkAdminAccess: function() {
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                // Проверяем, является ли пользователь администратором
                const isAdmin = user.email === Auth.adminEmail;
                
                if (isAdmin) {
                    // Показываем панель администратора
                    document.getElementById('adminAccessDenied').classList.add('hidden');
                    document.getElementById('adminControls').classList.remove('hidden');
                    
                    // Отображаем приветствие с именем
                    document.getElementById('adminWelcomeMessage').textContent = 
                        `Добро пожаловать в панель администратора, ${user.displayName || 'Администратор'}!`;
                    
                    // Загружаем список новостей
                    this.loadNewsForAdmin();
                } else {
                    // Показываем сообщение о запрете доступа
                    document.getElementById('adminAccessDenied').classList.remove('hidden');
                    document.getElementById('adminControls').classList.add('hidden');
                }
            } else {
                // Пользователь не вошел в систему
                document.getElementById('adminAccessDenied').classList.remove('hidden');
                document.getElementById('adminControls').classList.add('hidden');
                
                // Перенаправляем на главную через 3 секунды
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 3000);
            }
        });
    },
    
    // Настройка обработчиков событий
    setupEventListeners: function() {
        // Кнопки вкладок
        const createNewsTabBtn = document.getElementById('createNewsTabBtn');
        const manageNewsTabBtn = document.getElementById('manageNewsTabBtn');
        
        if (createNewsTabBtn && manageNewsTabBtn) {
            createNewsTabBtn.addEventListener('click', () => {
                this.switchTab('createNewsTab');
                createNewsTabBtn.classList.add('active');
                manageNewsTabBtn.classList.remove('active');
            });
            
            manageNewsTabBtn.addEventListener('click', () => {
                this.switchTab('manageNewsTab');
                manageNewsTabBtn.classList.add('active');
                createNewsTabBtn.classList.remove('active');
                this.loadNewsForAdmin();
            });
        }
        
        // Форма создания новости
        const newsCreateForm = document.getElementById('newsCreateForm');
        if (newsCreateForm) {
            newsCreateForm.addEventListener('submit', (e) => {
                e.preventDefault();
                
                const title = document.getElementById('news-title').value.trim();
                const content = document.getElementById('news-content').value.trim();
                
                if (title && content) {
                    this.createNews(title, content);
                } else {
                    alert('Пожалуйста, заполните все поля');
                }
            });
        }
        
        // Форма редактирования новости
        const editNewsForm = document.getElementById('edit-news-form');
        if (editNewsForm) {
            editNewsForm.addEventListener('submit', (e) => {
                e.preventDefault();
                
                const newsId = document.getElementById('edit-news-id').value;
                const title = document.getElementById('edit-news-title').value.trim();
                const content = document.getElementById('edit-news-content').value.trim();
                
                if (newsId && title && content) {
                    this.updateNews(newsId, title, content);
                } else {
                    alert('Пожалуйста, заполните все поля');
                }
            });
        }
        
        // Кнопка удаления новости
        const deleteNewsBtn = document.getElementById('delete-news-btn');
        if (deleteNewsBtn) {
            deleteNewsBtn.addEventListener('click', () => {
                const newsId = document.getElementById('edit-news-id').value;
                this.showConfirmationModal(
                    'Вы уверены, что хотите удалить эту новость? Это действие нельзя отменить.',
                    () => this.deleteNews(newsId)
                );
            });
        }
        
        // Закрытие модальных окон
        const closeButtons = document.querySelectorAll('.close');
        closeButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Находим ближайшее модальное окно и скрываем его
                const modal = button.closest('.modal');
                if (modal) {
                    modal.classList.add('hidden');
                }
            });
        });
        
        // Кнопки подтверждения в модальном окне
        const confirmYesBtn = document.getElementById('confirmYesBtn');
        const confirmNoBtn = document.getElementById('confirmNoBtn');
        
        if (confirmYesBtn && confirmNoBtn) {
            confirmNoBtn.addEventListener('click', () => {
                document.getElementById('confirmationModal').classList.add('hidden');
            });
        }
    },
    
    // Переключение вкладок
    switchTab: function(tabId) {
        // Скрываем все вкладки
        document.querySelectorAll('.admin-tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Показываем выбранную вкладку
        document.getElementById(tabId).classList.add('active');
    },
    
    // Создание новости
    createNews: function(title, content) {
        const newsData = {
            title: title,
            content: content,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            authorId: firebase.auth().currentUser.uid
        };
        
        db.collection('news')
            .add(newsData)
            .then(() => {
                alert('Новость успешно опубликована!');
                
                // Сбрасываем форму
                document.getElementById('newsCreateForm').reset();
            })
            .catch(error => {
                console.error('Ошибка при публикации новости:', error);
                alert('Ошибка при публикации новости: ' + error.message);
            });
    },
    
    // Загрузка новостей для администратора
    loadNewsForAdmin: function() {
        const newsList = document.getElementById('adminNewsList');
        if (!newsList) return;
        
        newsList.innerHTML = `
            <div class="loading-spinner">
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
                    const newsElement = document.createElement('div');
                    newsElement.className = 'admin-news-item';
                    
                    const date = news.createdAt ? new Date(news.createdAt.toDate()) : new Date();
                    const formattedDate = date.toLocaleDateString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                    });
                    
                    newsElement.innerHTML = `
                        <div class="admin-news-title">${news.title}</div>
                        <div class="admin-news-date">${formattedDate}</div>
                        <div class="admin-news-actions">
                            <button class="action-btn edit-btn" data-id="${doc.id}" title="Редактировать">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn delete-btn" data-id="${doc.id}" title="Удалить">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    `;
                    
                    newsList.appendChild(newsElement);
                    
                    // Добавляем обработчики событий для кнопок редактирования/удаления
                    const editBtn = newsElement.querySelector('.edit-btn');
                    const deleteBtn = newsElement.querySelector('.delete-btn');
                    
                    editBtn.addEventListener('click', () => {
                        this.openEditNewsModal(doc.id);
                    });
                    
                    deleteBtn.addEventListener('click', () => {
                        this.showConfirmationModal(
                            'Вы уверены, что хотите удалить эту новость? Это действие нельзя отменить.',
                            () => this.deleteNews(doc.id)
                        );
                    });
                });
            })
            .catch(error => {
                console.error('Ошибка при загрузке новостей:', error);
                newsList.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        <span>Ошибка при загрузке новостей</span>
                    </div>
                `;
            });
    },
    
    // Открытие модального окна редактирования новости
    openEditNewsModal: function(newsId) {
        const editNewsModal = document.getElementById('editNewsModal');
        if (!editNewsModal) return;
        
        db.collection('news').doc(newsId)
            .get()
            .then(doc => {
                if (!doc.exists) {
                    alert('Новость не найдена');
                    return;
                }
                
                const news = doc.data();
                
                // Заполняем форму редактирования
                document.getElementById('edit-news-id').value = newsId;
                document.getElementById('edit-news-title').value = news.title;
                document.getElementById('edit-news-content').value = news.content;
                
                // Открываем модальное окно
                editNewsModal.classList.remove('hidden');
            })
            .catch(error => {
                console.error('Ошибка при загрузке новости:', error);
                alert('Ошибка при загрузке новости');
            });
    },
    
    // Обновление новости
    updateNews: function(newsId, title, content) {
        db.collection('news').doc(newsId)
            .update({
                title: title,
                content: content,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            })
            .then(() => {
                alert('Новость успешно обновлена');
                document.getElementById('editNewsModal').classList.add('hidden');
                this.loadNewsForAdmin();
            })
            .catch(error => {
                console.error('Ошибка при обновлении новости:', error);
                alert('Ошибка при обновлении новости: ' + error.message);
            });
    },
    
    // Удаление новости
    deleteNews: function(newsId) {
        // Сначала удаляем все комментарии
        db.collection('news').doc(newsId)
            .collection('comments')
            .get()
            .then(snapshot => {
                const batch = db.batch();
                
                snapshot.forEach(doc => {
                    batch.delete(doc.ref);
                });
                
                return batch.commit();
            })
            .then(() => {
                // Затем удаляем саму новость
                return db.collection('news').doc(newsId).delete();
            })
            .then(() => {
                alert('Новость успешно удалена');
                const editNewsModal = document.getElementById('editNewsModal');
                if (editNewsModal) {
                    editNewsModal.classList.add('hidden');
                }
                document.getElementById('confirmationModal').classList.add('hidden');
                this.loadNewsForAdmin();
            })
            .catch(error => {
                console.error('Ошибка при удалении новости:', error);
                alert('Ошибка при удалении новости: ' + error.message);
            });
    },
    
    // Показать модальное окно подтверждения
    showConfirmationModal: function(message, confirmCallback) {
        const confirmationModal = document.getElementById('confirmationModal');
        const confirmationMessage = document.getElementById('confirmationMessage');
        const confirmYesBtn = document.getElementById('confirmYesBtn');
        
        if (!confirmationModal || !confirmationMessage || !confirmYesBtn) return;
        
        // Устанавливаем сообщение
        confirmationMessage.textContent = message;
        
        // Устанавливаем обработчик для кнопки подтверждения
        // Удаляем предыдущий обработчик, если он был
        const newConfirmYesBtn = confirmYesBtn.cloneNode(true);
        confirmYesBtn.parentNode.replaceChild(newConfirmYesBtn, confirmYesBtn);
        
        newConfirmYesBtn.addEventListener('click', () => {
            confirmCallback();
        });
        
        // Показываем модальное окно
        confirmationModal.classList.remove('hidden');
    }
};

// Ждем загрузки страницы для инициализации
document.addEventListener('DOMContentLoaded', () => {
    AdminPanel.init();
}); 