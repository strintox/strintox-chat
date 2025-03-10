// Объект для работы с админ-панелью
const Admin = {
    // Инициализация админ-панели
    init: function() {
        this.setupEventListeners();
        this.initCustomEditors();
    },

    // Настройка обработчиков событий
    setupEventListeners: function() {
        // Получаем элементы
        const adminButton = document.getElementById('adminButton');
        const adminPanel = document.getElementById('adminPanel');
        const closeAdmin = document.querySelector('.close-admin');
        const newsForm = document.getElementById('news-form');
        const createNewsBtn = document.getElementById('createNewsBtn');
        const editNewsBtn = document.getElementById('editNewsBtn');
        const editNewsForm = document.getElementById('edit-news-form');
        const deleteNewsBtn = document.getElementById('delete-news-btn');

        // Открытие/закрытие админ-панели
        if (adminButton) {
            adminButton.addEventListener('click', () => {
                adminPanel.classList.toggle('hidden');
                adminPanel.classList.toggle('active');
                
                // Если панель открыта и пользователь авторизован как админ
                if (!adminPanel.classList.contains('hidden') && Auth.isAdmin) {
                    document.getElementById('adminLoginForm').classList.add('hidden');
                    document.getElementById('newsEditor').classList.remove('hidden');
                    
                    // По умолчанию показываем форму создания новостей
                    if (createNewsBtn && editNewsBtn) {
                        createNewsBtn.classList.add('active');
                        editNewsBtn.classList.remove('active');
                        document.getElementById('createNewsForm').classList.remove('hidden');
                        document.getElementById('editNewsList').classList.add('hidden');
                    }
                }
            });
        }

        // Закрытие админ-панели
        if (closeAdmin) {
            closeAdmin.addEventListener('click', () => {
                adminPanel.classList.add('hidden');
                adminPanel.classList.remove('active');
            });
        }

        // Обработка формы добавления новости
        if (newsForm) {
            newsForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const title = document.getElementById('news-title').value.trim();
                let content = document.getElementById('news-content').value.trim();
                
                if (title && content) {
                    this.publishNews(title, content);
                } else {
                    alert('Пожалуйста, заполните все поля');
                }
            });
        }

        // Обработка формы редактирования новости
        if (editNewsForm) {
            editNewsForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const newsId = document.getElementById('edit-news-id').value;
                const title = document.getElementById('edit-news-title').value.trim();
                let content = document.getElementById('edit-news-content').value.trim();
                
                if (newsId && title && content) {
                    this.updateNews(newsId, title, content);
                } else {
                    alert('Пожалуйста, заполните все поля');
                }
            });
        }

        // Кнопка удаления новости
        if (deleteNewsBtn) {
            deleteNewsBtn.addEventListener('click', () => {
                const newsId = document.getElementById('edit-news-id').value;
                if (newsId && confirm('Вы уверены, что хотите удалить эту новость? Это действие нельзя отменить.')) {
                    this.deleteNews(newsId);
                }
            });
        }

        // Кнопки переключения между созданием и редактированием новостей
        if (createNewsBtn && editNewsBtn) {
            createNewsBtn.addEventListener('click', () => {
                document.getElementById('createNewsForm').classList.remove('hidden');
                document.getElementById('editNewsList').classList.add('hidden');
                createNewsBtn.classList.add('active');
                editNewsBtn.classList.remove('active');
            });
            
            editNewsBtn.addEventListener('click', () => {
                document.getElementById('createNewsForm').classList.add('hidden');
                document.getElementById('editNewsList').classList.remove('hidden');
                createNewsBtn.classList.remove('active');
                editNewsBtn.classList.add('active');
                this.loadNewsForAdmin();
            });
        }
    },

    // Инициализация редакторов
    initCustomEditors: function() {
        // Ждем загрузки страницы для инициализации всех редакторов
        setTimeout(() => {
            // Находим все textarea для редактирования новостей
            const newsContentEditor = document.getElementById('news-content');
            const editNewsContentEditor = document.getElementById('edit-news-content');
            
            if (newsContentEditor || editNewsContentEditor) {
                CustomEditor.init('textarea[id="news-content"], textarea[id="edit-news-content"]');
            }
        }, 500);
    },

    // Публикация новости
    publishNews: function(title, content) {
        if (!Auth.isAdmin) {
            alert('Только администратор может публиковать новости');
            return;
        }

        News.addNews(title, content)
            .then(() => {
                alert('Новость успешно опубликована!');
                
                // Сбрасываем форму
                document.getElementById('news-form').reset();
                
                // Очищаем редактор
                const editableArea = document.querySelector('.editor-content[data-target="news-content"]');
                if (editableArea) {
                    editableArea.innerHTML = '<p><br></p>';
                }
            })
            .catch(error => {
                alert('Ошибка при публикации новости: ' + error.message);
            });
    },

    // Загрузка новостей для администратора
    loadNewsForAdmin: function() {
        if (!Auth.isAdmin) return;
        
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
                        if (confirm('Вы уверены, что хотите удалить эту новость? Это действие нельзя отменить.')) {
                            this.deleteNews(doc.id);
                        }
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
                
                // Заполняем наш кастомный редактор
                const editableArea = document.querySelector('.editor-content[data-target="edit-news-content"]');
                if (editableArea) {
                    editableArea.innerHTML = news.content;
                } else {
                    // Если редактор еще не инициализирован, создаем его и заполняем контентом
                    setTimeout(() => {
                        CustomEditor.init('textarea[id="edit-news-content"]');
                        
                        setTimeout(() => {
                            const area = document.querySelector('.editor-content[data-target="edit-news-content"]');
                            if (area) {
                                area.innerHTML = news.content;
                            }
                        }, 100);
                    }, 100);
                }
                
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
        if (!Auth.isAdmin) {
            alert('Только администратор может редактировать новости');
            return;
        }
        
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
        if (!Auth.isAdmin) {
            alert('Только администратор может удалять новости');
            return;
        }
        
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
                this.loadNewsForAdmin();
            })
            .catch(error => {
                console.error('Ошибка при удалении новости:', error);
                alert('Ошибка при удалении новости: ' + error.message);
            });
    }
};

// Ждем загрузки страницы для инициализации
document.addEventListener('DOMContentLoaded', () => {
    Admin.init();
}); 