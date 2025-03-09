// Упрощенная система новостей для Strintox

// Глобальные переменные
let db, auth;
let newsRefreshInterval; // Интервал для автообновления новостей

// Инициализация Firebase - используем существующее подключение или инициализируем новое
try {
    // Проверяем, инициализирован ли уже Firebase (через firebase-init.js или в другом месте)
    if (firebase.apps.length > 0) {
        console.log("Используем существующее подключение Firebase");
        db = firebase.firestore();
        auth = firebase.auth();
    } else {
        // Если нет, инициализируем с конфигурацией
        const firebaseConfig = {
            apiKey: "AIzaSyAAdu7bWt9F2GF1W9qEzfc2f_y6LCqMM14",
            authDomain: "strintox-3a2b8.firebaseapp.com",
            projectId: "strintox-3a2b8",
            storageBucket: "strintox-3a2b8.appspot.com",
            messagingSenderId: "12688530154",
            appId: "1:12688530154:web:da86782e5c3261c6c35593"
        };
        
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        auth = firebase.auth();
        console.log("Firebase успешно инициализирован");
    }
} catch (error) {
    console.error("Ошибка при подключении к Firebase:", error);
    alert("Произошла ошибка при подключении к базе данных. Пожалуйста, обновите страницу.");
}

// Удостоверимся, что код выполняется только после загрузки DOM
document.addEventListener('DOMContentLoaded', function() {
    console.log('Страница новостей загружена, запускаем показ новостей');
    
    // Загружаем список новостей с небольшой задержкой, чтобы Firebase точно инициализировался
    setTimeout(показатьНовости, 100);
    
    // Добавляем обработчик для очистки интервала при закрытии/перезагрузке страницы
    window.addEventListener('beforeunload', function() {
        if (newsRefreshInterval) {
            clearInterval(newsRefreshInterval);
        }
    });
    
    // Обработчик для модальных окон - останавливаем обновление, когда открыто модальное окно
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.addEventListener('click', function(e) {
            // Если модальное окно активно и кликнули не по .modal-content или его потомкам
            if (modal.classList.contains('active') && !e.target.closest('.modal-content')) {
                setupAutoRefresh(); // Возобновляем автообновление
            }
        });
    });
    
    // Останавливаем обновление при открытии модального окна читателя новости
    document.querySelectorAll('.read-more-btn').forEach(button => {
        button.addEventListener('click', function() {
            if (newsRefreshInterval) {
                clearInterval(newsRefreshInterval);
                newsRefreshInterval = null;
            }
        });
    });
    
    // Возобновляем обновление при закрытии модального окна
    document.querySelectorAll('.close-modal').forEach(button => {
        button.addEventListener('click', function() {
            setupAutoRefresh();
        });
    });
});

// Функция настройки автообновления
function setupAutoRefresh() {
    // Удаляем эту функцию полностью
}

// Функция для тихого обновления новостей (без показа индикатора загрузки)
function показатьНовостиБезИндикатора() {
    // Проверяем, открыто ли модальное окно
    const activeModal = document.querySelector('.modal.active');
    if (activeModal) {
        console.log("Автообновление пропущено: открыто модальное окно");
        return; // Не обновляем новости, если открыто модальное окно
    }
    
    if (!db) {
        console.error("Firestore не инициализирован!");
        return;
    }
    
    // Запрашиваем новости из Firestore
    db.collection('news')
        .orderBy('createdAt', 'desc')
        .get()
        .then(function(результат) {
            if (результат.empty) {
                return; // Если новостей нет, просто выходим
            }
            
            const контейнер = document.getElementById('news-container');
            if (!контейнер) return;
            
            // Находим существующую сетку новостей или создаем новую
            let newsGrid = контейнер.querySelector('.news-grid');
            if (!newsGrid) {
                // Если сетки нет, то полное обновление через основную функцию
                показатьНовости();
                return;
            }
            
            // Формируем HTML для списка новостей
            let html = '';
            
            // Перебираем все новости
            результат.forEach(function(doc) {
                const данные = doc.data();
                let дата;
                
                // Правильная обработка даты из Firestore
                if (данные.createdAt) {
                    if (данные.createdAt.toDate) {
                        // Это Firestore Timestamp объект
                        дата = данные.createdAt.toDate();
                    } else if (данные.createdAt.seconds) {
                        // Это объект с полем seconds
                        дата = new Date(данные.createdAt.seconds * 1000);
                    } else {
                        // Это может быть Date объект или строка
                        дата = new Date(данные.createdAt);
                    }
                } else {
                    дата = new Date();
                }
                
                // Форматирование даты
                const форматДаты = дата.toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                });
                
                // Создаем карточку новости со ссылкой на страницу статьи
                html += `
                    <div class="news-card">
                        <div class="news-header">
                            <h3 class="news-title">${данные.title || 'Без заголовка'}</h3>
                        </div>
                        <div class="news-meta">
                            <span class="news-author"><i class="fas fa-user"></i> ${данные.author || 'Администратор'}</span>
                            <span class="news-date"><i class="fas fa-calendar"></i> ${форматДаты}</span>
                        </div>
                        <div class="news-preview">
                            <p>${обрезатьТекст(данные.content || 'Содержание отсутствует', 150)}</p>
                        </div>
                        <div class="news-actions">
                            <a href="article.html?id=${doc.id}" class="read-more-btn">
                                <i class="fas fa-book-open"></i> Читать полностью
                            </a>
                        </div>
                    </div>
                `;
            });
            
            // Незаметно обновляем содержимое сетки
            newsGrid.innerHTML = html;
            
            // Добавляем маленький эффект, чтобы показать, что произошло обновление
            newsGrid.classList.add('updated');
            setTimeout(() => {
                newsGrid.classList.remove('updated');
            }, 500);
            
            console.log("Новости автоматически обновлены");
        })
        .catch(function(ошибка) {
            console.error("Ошибка при автообновлении новостей:", ошибка);
            // Не показываем ошибку пользователю при автообновлении
        });
}

// Функция отображения списка новостей
function показатьНовости() {
    const контейнер = document.getElementById('news-container');
    if (!контейнер) return;
    
    // Показываем индикатор загрузки
    контейнер.innerHTML = `
        <div class="loading-indicator">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Загрузка новостей...</p>
        </div>
    `;
    
    // Удостоверимся, что Firestore инициализирован
    if (!db) {
        console.error("Firestore не инициализирован!");
        контейнер.innerHTML = `
            <div class="empty-news-container error">
                <i class="fas fa-exclamation-circle"></i>
                <p>Ошибка: база данных не подключена</p>
                <button onclick="location.reload()" class="btn-primary">
                    <i class="fas fa-sync"></i> Перезагрузить страницу
                </button>
            </div>
        `;
        return;
    }
    
    // Проверяем авторизацию пользователя, чтобы добавить кнопку создания новости, если это администратор
    auth.onAuthStateChanged(function(user) {
        if (user) {
            // Проверяем, является ли пользователь администратором
            db.collection('admins').doc(user.uid).get().then(function(doc) {
                if (doc.exists) {
                    // Добавляем кнопку создания новости для админа
                    const createButton = document.createElement('div');
                    createButton.className = 'admin-actions';
                    createButton.innerHTML = `
                        <button class="header-create-news-btn" onclick="открытьРедакторНовостей()">
                            <i class="fas fa-plus"></i> Создать новость
                        </button>
                    `;
                    
                    // Добавляем кнопку перед контейнером новостей
                    контейнер.parentNode.insertBefore(createButton, контейнер);
                }
            });
        }
    });
    
    // Загружаем новости
    db.collection('news')
        .orderBy('createdAt', 'desc')
        .get()
        .then(function(результат) {
            console.log(`Получено ${результат.size} новостей из базы данных`);
            
            // Если новостей нет
            if (результат.empty) {
                контейнер.innerHTML = `
                    <div class="empty-news-container">
                        <i class="fas fa-newspaper"></i>
                        <p>Пока нет опубликованных новостей</p>
                        <a href="admin.html" class="btn-primary">
                            <i class="fas fa-lock"></i> Перейти в админ-панель
                        </a>
                    </div>
                `;
                return;
            }
            
            // Формируем HTML для списка новостей
            let html = '<div class="news-grid">';
            
            // Перебираем все новости
            результат.forEach(function(doc) {
                const данные = doc.data();
                let дата;
                
                // Правильная обработка даты из Firestore
                if (данные.createdAt) {
                    if (данные.createdAt.toDate) {
                        // Это Firestore Timestamp объект
                        дата = данные.createdAt.toDate();
                    } else if (данные.createdAt.seconds) {
                        // Это объект с полем seconds
                        дата = new Date(данные.createdAt.seconds * 1000);
                    } else {
                        // Это может быть Date объект или строка
                        дата = new Date(данные.createdAt);
                    }
                } else {
                    дата = new Date();
                }
                
                // Форматирование даты
                const форматДаты = дата.toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                });
                
                // Создаем карточку новости со ссылкой на страницу статьи
                html += `
                    <div class="news-card">
                        <div class="news-header">
                            <h3 class="news-title">${данные.title || 'Без заголовка'}</h3>
                        </div>
                        <div class="news-meta">
                            <span class="news-author"><i class="fas fa-user"></i> ${данные.author || 'Администратор'}</span>
                            <span class="news-date"><i class="fas fa-calendar"></i> ${форматДаты}</span>
                        </div>
                        <div class="news-preview">
                            <p>${обрезатьТекст(данные.content || 'Содержание отсутствует', 150)}</p>
                        </div>
                        <div class="news-actions">
                            <a href="article.html?id=${doc.id}" class="read-more-btn">
                                <i class="fas fa-book-open"></i> Читать полностью
                            </a>
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
            
            // Индикатор автоматического обновления
            html += `
                <div class="auto-refresh-indicator">
                    <span>Автообновление каждые 5 секунд</span>
                    <i class="fas fa-sync-alt"></i>
                </div>
            `;
            
            // Вставляем HTML в контейнер
            контейнер.innerHTML = html;
            console.log("Новости успешно отображены на странице");
        })
        .catch(function(ошибка) {
            console.error("Ошибка при загрузке новостей:", ошибка);
            контейнер.innerHTML = `
                <div class="empty-news-container error">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Ошибка загрузки новостей: ${ошибка.message}</p>
                    <button onclick="показатьНовости()" class="btn-primary">
                        <i class="fas fa-sync"></i> Попробовать снова
                    </button>
                </div>
            `;
        });
}

// Функция открытия редактора новостей (создание новой новости)
function открытьРедакторНовостей(newsId = null) {
    // Проверяем, авторизован ли пользователь
    if (!auth.currentUser) {
        alert('Для создания новостей необходимо авторизоваться');
        return;
    }
    
    // Создаем модальное окно редактора
    const modalHTML = `
        <div id="news-editor-modal" class="modal active">
            <div class="modal-content" style="max-width: 800px; width: 95%;">
                <div class="modal-header">
                    <h2><i class="fas fa-newspaper"></i> ${newsId ? 'Редактирование' : 'Создание'} новости</h2>
                    <button class="close-modal" onclick="закрытьРедакторНовостей()">×</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label for="news-title">Заголовок</label>
                        <input type="text" id="news-title" placeholder="Введите заголовок новости" required>
                    </div>
                    
                    <!-- Панель инструментов форматирования -->
                    <div class="editor-toolbar">
                        <button type="button" onclick="примеритьФорматирование('bold')" title="Жирный текст">
                            <i class="fas fa-bold"></i>
                        </button>
                        <button type="button" onclick="примеритьФорматирование('italic')" title="Курсив">
                            <i class="fas fa-italic"></i>
                        </button>
                        <button type="button" onclick="примеритьФорматирование('underline')" title="Подчеркнутый">
                            <i class="fas fa-underline"></i>
                        </button>
                        <div class="toolbar-divider"></div>
                        <button type="button" onclick="примеритьФорматирование('alignLeft')" title="По левому краю">
                            <i class="fas fa-align-left"></i>
                        </button>
                        <button type="button" onclick="примеритьФорматирование('alignCenter')" title="По центру">
                            <i class="fas fa-align-center"></i>
                        </button>
                        <button type="button" onclick="примеритьФорматирование('alignRight')" title="По правому краю">
                            <i class="fas fa-align-right"></i>
                        </button>
                        <div class="toolbar-divider"></div>
                        <select id="fontSize" onchange="примеритьФорматирование('fontSize')">
                            <option value="">Размер шрифта</option>
                            <option value="1">Очень маленький</option>
                            <option value="2">Маленький</option>
                            <option value="3">Обычный</option>
                            <option value="4">Средний</option>
                            <option value="5">Большой</option>
                            <option value="6">Очень большой</option>
                            <option value="7">Огромный</option>
                        </select>
                        <input type="color" id="textColor" onchange="примеритьФорматирование('color')" title="Цвет текста">
                        <button type="button" onclick="примеритьФорматирование('removeFormat')" title="Удалить форматирование">
                            <i class="fas fa-eraser"></i>
                        </button>
                    </div>
                    
                    <div class="form-group">
                        <label for="news-content">Содержание</label>
                        <div id="news-content" contenteditable="true" class="rich-text-editor"></div>
                    </div>
                    
                    <div class="form-buttons">
                        <button id="publish-button" class="btn-primary">
                            <i class="fas fa-paper-plane"></i> ${newsId ? 'Сохранить изменения' : 'Опубликовать'}
                        </button>
                        <button onclick="закрытьРедакторНовостей()" class="btn-secondary">
                            <i class="fas fa-times"></i> Отмена
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Добавляем редактор в DOM
    const editorContainer = document.createElement('div');
    editorContainer.innerHTML = modalHTML;
    document.body.appendChild(editorContainer);
    
    // Если это редактирование существующей новости, загружаем её данные
    if (newsId) {
        загрузитьНовостьДляРедактирования(newsId);
    }
    
    // Настраиваем обработчик кнопки публикации
    document.getElementById('publish-button').addEventListener('click', function() {
        const title = document.getElementById('news-title').value.trim();
        const contentElement = document.getElementById('news-content');
        const content = contentElement.innerHTML.trim();
        
        if (!title || !content) {
            alert('Пожалуйста, заполните все поля');
            return;
        }
        
        // Публикуем или обновляем новость
        if (newsId) {
            обновитьНовость(newsId, title, content);
        } else {
            создатьНовость(title, content);
        }
    });
    
    // Делаем страницу непрокручиваемой при открытом модальном окне
    document.body.style.overflow = 'hidden';
}

// Функция применения форматирования к выделенному тексту
function примеритьФорматирование(тип) {
    document.execCommand('styleWithCSS', false, true);
    
    switch (тип) {
        case 'bold':
            document.execCommand('bold', false, null);
            break;
        case 'italic':
            document.execCommand('italic', false, null);
            break;
        case 'underline':
            document.execCommand('underline', false, null);
            break;
        case 'alignLeft':
            document.execCommand('justifyLeft', false, null);
            break;
        case 'alignCenter':
            document.execCommand('justifyCenter', false, null);
            break;
        case 'alignRight':
            document.execCommand('justifyRight', false, null);
            break;
        case 'fontSize':
            const size = document.getElementById('fontSize').value;
            if (size) {
                document.execCommand('fontSize', false, size);
            }
            break;
        case 'color':
            const color = document.getElementById('textColor').value;
            document.execCommand('foreColor', false, color);
            break;
        case 'removeFormat':
            document.execCommand('removeFormat', false, null);
            break;
    }
    
    // Возвращаем фокус в редактор
    document.getElementById('news-content').focus();
}

// Функция закрытия редактора новостей
function закрытьРедакторНовостей() {
    const modal = document.getElementById('news-editor-modal');
    if (modal) {
        modal.parentNode.remove();
    }
    
    // Восстанавливаем прокрутку страницы
    document.body.style.overflow = '';
}

// Функция создания новой новости
function создатьНовость(заголовок, содержание) {
    if (!auth.currentUser) {
        alert('Для создания новостей необходимо авторизоваться');
        return;
    }
    
    // Показываем индикатор загрузки
    const publishButton = document.getElementById('publish-button');
    const originalText = publishButton.innerHTML;
    publishButton.disabled = true;
    publishButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Публикация...';
    
    // Подготавливаем данные для новости
    const newsData = {
        title: заголовок,
        content: содержание,
        author: auth.currentUser.displayName || auth.currentUser.email.split('@')[0],
        authorId: auth.currentUser.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Добавляем новость в базу данных
    db.collection('news').add(newsData)
        .then(function() {
            console.log('Новость успешно создана');
            закрытьРедакторНовостей();
            показатьНовости(); // Обновляем список новостей
            
            // Показываем уведомление об успехе
            alert('Новость успешно опубликована!');
        })
        .catch(function(ошибка) {
            console.error('Ошибка при создании новости:', ошибка);
            alert('Ошибка при публикации новости: ' + ошибка.message);
            
            // Восстанавливаем кнопку
            publishButton.disabled = false;
            publishButton.innerHTML = originalText;
        });
}

// Функция обновления существующей новости
function обновитьНовость(id, заголовок, содержание) {
    if (!auth.currentUser) {
        alert('Для редактирования новостей необходимо авторизоваться');
        return;
    }
    
    // Показываем индикатор загрузки
    const publishButton = document.getElementById('publish-button');
    const originalText = publishButton.innerHTML;
    publishButton.disabled = true;
    publishButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Сохранение...';
    
    // Подготавливаем данные для обновления
    const newsData = {
        title: заголовок,
        content: содержание,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastEditedBy: auth.currentUser.uid
    };
    
    // Обновляем новость в базе данных
    db.collection('news').doc(id).update(newsData)
        .then(function() {
            console.log('Новость успешно обновлена');
            закрытьРедакторНовостей();
            показатьНовости(); // Обновляем список новостей
            
            // Показываем уведомление об успехе
            alert('Изменения успешно сохранены!');
        })
        .catch(function(ошибка) {
            console.error('Ошибка при обновлении новости:', ошибка);
            alert('Ошибка при сохранении изменений: ' + ошибка.message);
            
            // Восстанавливаем кнопку
            publishButton.disabled = false;
            publishButton.innerHTML = originalText;
        });
}

// Функция загрузки новости для редактирования
function загрузитьНовостьДляРедактирования(id) {
    const titleInput = document.getElementById('news-title');
    const contentEditor = document.getElementById('news-content');
    
    // Показываем индикатор загрузки
    titleInput.disabled = true;
    contentEditor.innerHTML = '<div class="loading-indicator"><i class="fas fa-spinner fa-spin"></i> Загрузка содержимого...</div>';
    
    // Загружаем данные новости
    db.collection('news').doc(id).get()
        .then(function(doc) {
            if (doc.exists) {
                const data = doc.data();
                titleInput.value = data.title || '';
                contentEditor.innerHTML = data.content || '';
                titleInput.disabled = false;
            } else {
                alert('Новость не найдена');
                закрытьРедакторНовостей();
            }
        })
        .catch(function(ошибка) {
            console.error('Ошибка при загрузке новости:', ошибка);
            alert('Ошибка при загрузке данных новости: ' + ошибка.message);
            закрытьРедакторНовостей();
        });
}

// Функция просмотра конкретной новости
function показатьДетали(id) {
    console.log("Открываем новость с ID:", id);
    
    // Останавливаем автообновление при открытии детальной страницы
    if (newsRefreshInterval) {
        clearInterval(newsRefreshInterval);
        newsRefreshInterval = null;
    }
    
    const модаль = document.getElementById('news-view-modal');
    const заголовок = document.getElementById('view-news-title');
    const содержание = document.getElementById('news-full-content');
    
    if (!модаль || !заголовок || !содержание) {
        console.error("Не найдены элементы модального окна");
        return;
    }
    
    // Показываем состояние загрузки
    заголовок.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Загрузка...';
    содержание.innerHTML = '<p>Загрузка содержания новости...</p>';
    модаль.classList.add('active');
    
    // Удостоверимся, что Firestore инициализирован
    if (!db) {
        console.error("Firestore не инициализирован!");
        заголовок.textContent = 'Ошибка';
        содержание.innerHTML = `
            <p>Ошибка: база данных не подключена</p>
            <button onclick="location.reload()" class="btn-primary">
                <i class="fas fa-sync"></i> Перезагрузить страницу
            </button>
        `;
        return;
    }
    
    // Загружаем данные новости
    db.collection('news').doc(id).get()
        .then(function(doc) {
            if (!doc.exists) {
                заголовок.textContent = 'Ошибка';
                содержание.innerHTML = '<p>Новость не найдена или была удалена.</p>';
                return;
            }
            
            const данные = doc.data();
            заголовок.textContent = данные.title || 'Без заголовка';
            
            // Правильная обработка даты из Firestore
            let дата;
            if (данные.createdAt) {
                if (данные.createdAt.toDate) {
                    // Это Firestore Timestamp объект
                    дата = данные.createdAt.toDate();
                } else if (данные.createdAt.seconds) {
                    // Это объект с полем seconds
                    дата = new Date(данные.createdAt.seconds * 1000);
                } else {
                    // Это может быть Date объект или строка
                    дата = new Date(данные.createdAt);
                }
            } else {
                дата = new Date();
            }
            
            // Форматирование даты для отображения
            const форматДаты = дата.toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            // Формируем содержание новости
            let htmlСодержание = '';
            
            // Добавляем метаданные
            htmlСодержание += `
                <div class="news-metadata">
                    <span class="news-author"><i class="fas fa-user"></i> ${данные.author || 'Администратор'}</span> • 
                    <span class="news-date"><i class="fas fa-calendar"></i> ${форматДаты}</span>
                </div>
            `;
            
            // Добавляем основное содержание
            htmlСодержание += `
                <div class="news-content-text">
                    ${форматироватьТекст(данные.content || 'Содержание отсутствует')}
                </div>
            `;
            
            содержание.innerHTML = htmlСодержание;
            console.log("Детали новости успешно загружены");
        })
        .catch(function(ошибка) {
            console.error("Ошибка при загрузке новости:", ошибка);
            заголовок.textContent = 'Ошибка';
            содержание.innerHTML = `
                <p>Не удалось загрузить новость: ${ошибка.message}</p>
                <button onclick="показатьНовости()" class="btn-secondary">
                    <i class="fas fa-arrow-left"></i> Вернуться к списку
                </button>
            `;
        });
}

// Вспомогательная функция для обрезки текста
function обрезатьТекст(текст, максДлина) {
    if (текст.length <= максДлина) return текст;
    return текст.substring(0, максДлина) + '...';
}

// Вспомогательная функция для форматирования текста
function форматироватьТекст(текст) {
    // Если текст пустой или не строка
    if (!текст || typeof текст !== 'string') return '';
    
    // Заменяем переносы строк на <br>
    return текст.replace(/\n/g, '<br>');
}

// Делаем функции доступными глобально
window.показатьНовости = показатьНовости;
window.показатьДетали = показатьДетали;
window.loadNews = показатьНовости; 