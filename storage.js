/**
 * Модуль для работы с локальным хранилищем данных
 */
const Storage = (function() {
    const DB_NAME = 'darkChat';
    const DB_VERSION = 1;
    let db = null;

    /**
     * Инициализация базы данных
     */
    function init() {
        return new Promise((resolve, reject) => {
            if (db) {
                resolve(db);
                return;
            }

            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = function(event) {
                console.error("Ошибка открытия базы данных:", event.target.error);
                reject(event.target.error);
            };

            request.onsuccess = function(event) {
                db = event.target.result;
                console.log("База данных успешно открыта");
                resolve(db);
            };

            request.onupgradeneeded = function(event) {
                const db = event.target.result;
                
                // Хранилище для чатов
                if (!db.objectStoreNames.contains('chats')) {
                    const chatsStore = db.createObjectStore('chats', { keyPath: 'id' });
                    chatsStore.createIndex('by_lastMessageTime', 'lastMessageTime', { unique: false });
                }
                
                // Хранилище для сообщений
                if (!db.objectStoreNames.contains('messages')) {
                    const messagesStore = db.createObjectStore('messages', { keyPath: 'id', autoIncrement: true });
                    messagesStore.createIndex('by_chatId', 'chatId', { unique: false });
                    messagesStore.createIndex('by_timestamp', 'timestamp', { unique: false });
                }
            };
        });
    }

    /**
     * Добавление нового чата в хранилище
     */
    function addChat(chat) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['chats'], 'readwrite');
            const store = transaction.objectStore('chats');
            
            // Устанавливаем время последнего сообщения, если не задано
            if (!chat.lastMessageTime) {
                chat.lastMessageTime = Date.now();
            }
            
            const request = store.put(chat);
            
            request.onsuccess = function() {
                resolve(chat);
            };
            
            request.onerror = function(event) {
                console.error("Ошибка при добавлении чата:", event.target.error);
                reject(event.target.error);
            };
        });
    }

    /**
     * Получение чата по ID
     */
    function getChat(chatId) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['chats'], 'readonly');
            const store = transaction.objectStore('chats');
            const request = store.get(chatId);
            
            request.onsuccess = function() {
                resolve(request.result);
            };
            
            request.onerror = function(event) {
                console.error("Ошибка при получении чата:", event.target.error);
                reject(event.target.error);
            };
        });
    }

    /**
     * Получение всех чатов, отсортированных по времени последнего сообщения
     */
    function getAllChats() {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['chats'], 'readonly');
            const store = transaction.objectStore('chats');
            const index = store.index('by_lastMessageTime');
            const request = index.openCursor(null, 'prev'); // В обратном порядке, чтобы новые были вверху
            
            const chats = [];
            
            request.onsuccess = function(event) {
                const cursor = event.target.result;
                if (cursor) {
                    chats.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(chats);
                }
            };
            
            request.onerror = function(event) {
                console.error("Ошибка при получении чатов:", event.target.error);
                reject(event.target.error);
            };
        });
    }

    /**
     * Обновление информации о чате
     */
    function updateChat(chat) {
        return addChat(chat); // Используем тот же метод, т.к. put заменяет существующую запись
    }

    /**
     * Добавление нового сообщения
     */
    function addMessage(message) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['messages', 'chats'], 'readwrite');
            const messagesStore = transaction.objectStore('messages');
            const chatsStore = transaction.objectStore('chats');
            
            // Добавляем сообщение
            const messageRequest = messagesStore.add(message);
            
            messageRequest.onsuccess = function(event) {
                // Обновляем время последнего сообщения в чате
                const chatRequest = chatsStore.get(message.chatId);
                
                chatRequest.onsuccess = function() {
                    const chat = chatRequest.result;
                    if (chat) {
                        chat.lastMessage = message.text;
                        chat.lastMessageTime = message.timestamp;
                        chatsStore.put(chat);
                    }
                    
                    resolve(message);
                };
                
                chatRequest.onerror = function(event) {
                    console.error("Ошибка при обновлении чата:", event.target.error);
                    // Всё равно считаем операцию успешной, т.к. сообщение добавлено
                    resolve(message);
                };
            };
            
            messageRequest.onerror = function(event) {
                console.error("Ошибка при добавлении сообщения:", event.target.error);
                reject(event.target.error);
            };
        });
    }

    /**
     * Получение сообщений чата
     */
    function getMessages(chatId) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['messages'], 'readonly');
            const store = transaction.objectStore('messages');
            const index = store.index('by_chatId');
            const range = IDBKeyRange.only(chatId);
            const request = index.openCursor(range);
            
            const messages = [];
            
            request.onsuccess = function(event) {
                const cursor = event.target.result;
                if (cursor) {
                    messages.push(cursor.value);
                    cursor.continue();
                } else {
                    // Сортируем сообщения по времени
                    messages.sort((a, b) => a.timestamp - b.timestamp);
                    resolve(messages);
                }
            };
            
            request.onerror = function(event) {
                console.error("Ошибка при получении сообщений:", event.target.error);
                reject(event.target.error);
            };
        });
    }

    return {
        init,
        addChat,
        getChat,
        getAllChats,
        updateChat,
        addMessage,
        getMessages
    };
})(); 