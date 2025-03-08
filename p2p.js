/**
 * Модуль для P2P соединения между пользователями
 */
const P2P = (function() {
    let peer = null; // Экземпляр Peer объекта
    let connections = {}; // Хранилище активных соединений
    const listeners = {}; // Слушатели событий
    
    /**
     * Инициализация P2P соединения
     */
    function init(userId) {
        return new Promise((resolve, reject) => {
            // Создаем новый Peer с ID пользователя
            peer = new Peer(userId, {
                // Используем публичный сервер для поиска пиров
                // В реальном приложении лучше использовать свой сервер
                host: 'peerjs-server.herokuapp.com',
                secure: true,
                port: 443,
                debug: 2
            });
            
            // Обработка событий подключения
            peer.on('open', (id) => {
                console.log('P2P соединение установлено с ID:', id);
                setupPeerListeners();
                resolve(id);
            });
            
            peer.on('error', (error) => {
                console.error('Ошибка P2P соединения:', error);
                
                if (error.type === 'unavailable-id') {
                    // Если ID уже занят, создаем новый
                    const newId = Auth.getUserId() + '_' + Math.random().toString(36).substring(2, 5);
                    Auth.createNewUserId(newId);
                    // Пытаемся подключиться снова
                    peer.destroy();
                    init(newId).then(resolve).catch(reject);
                } else {
                    reject(error);
                }
            });
        });
    }
    
    /**
     * Настройка слушателей событий Peer
     */
    function setupPeerListeners() {
        // Обработка входящих соединений
        peer.on('connection', (conn) => {
            console.log('Входящее соединение от:', conn.peer);
            setupConnectionListeners(conn);
            
            // Сохраняем соединение
            connections[conn.peer] = conn;
            
            // Вызываем слушателей
            triggerEvent('connection', conn.peer);
        });
    }
    
    /**
     * Настройка слушателей для соединения
     */
    function setupConnectionListeners(conn) {
        conn.on('data', (data) => {
            console.log('Получены данные от', conn.peer, ':', data);
            
            // Обрабатываем разные типы сообщений
            if (data.type === 'message') {
                triggerEvent('message', {
                    peerId: conn.peer,
                    message: data.message
                });
            } else if (data.type === 'typing') {
                triggerEvent('typing', {
                    peerId: conn.peer,
                    isTyping: data.isTyping
                });
            }
        });
        
        conn.on('close', () => {
            console.log('Соединение закрыто с:', conn.peer);
            delete connections[conn.peer];
            triggerEvent('disconnection', conn.peer);
        });
        
        conn.on('error', (error) => {
            console.error('Ошибка соединения с', conn.peer, ':', error);
            triggerEvent('error', { peerId: conn.peer, error });
        });
    }
    
    /**
     * Подключение к другому пользователю по ID
     */
    function connect(peerId) {
        return new Promise((resolve, reject) => {
            // Проверяем, не подключены ли мы уже
            if (connections[peerId]) {
                resolve(connections[peerId]);
                return;
            }
            
            // Если соединение с peer еще не установлено
            if (!peer) {
                reject(new Error('P2P соединение не инициализировано'));
                return;
            }
            
            // Создаем новое соединение
            const conn = peer.connect(peerId, {
                reliable: true
            });
            
            conn.on('open', () => {
                console.log('Соединение установлено с:', peerId);
                setupConnectionListeners(conn);
                
                // Сохраняем соединение
                connections[peerId] = conn;
                
                resolve(conn);
            });
            
            conn.on('error', (error) => {
                console.error('Ошибка при подключении к', peerId, ':', error);
                reject(error);
            });
        });
    }
    
    /**
     * Отправка сообщения другому пользователю
     */
    function sendMessage(peerId, message) {
        return new Promise((resolve, reject) => {
            const conn = connections[peerId];
            
            if (!conn) {
                reject(new Error('Нет соединения с пользователем'));
                return;
            }
            
            try {
                conn.send({
                    type: 'message',
                    message: message
                });
                resolve();
            } catch (error) {
                console.error('Ошибка при отправке сообщения:', error);
                reject(error);
            }
        });
    }
    
    /**
     * Отправка статуса печатания
     */
    function sendTypingStatus(peerId, isTyping) {
        const conn = connections[peerId];
        
        if (!conn) {
            return;
        }
        
        try {
            conn.send({
                type: 'typing',
                isTyping: isTyping
            });
        } catch (error) {
            console.error('Ошибка при отправке статуса печатания:', error);
        }
    }
    
    /**
     * Закрытие соединения с пользователем
     */
    function disconnect(peerId) {
        const conn = connections[peerId];
        
        if (conn) {
            conn.close();
            delete connections[peerId];
        }
    }
    
    /**
     * Закрытие всех соединений и уничтожение Peer
     */
    function closeAll() {
        // Закрываем все соединения
        Object.values(connections).forEach(conn => {
            conn.close();
        });
        
        connections = {};
        
        // Уничтожаем Peer объект
        if (peer) {
            peer.destroy();
            peer = null;
        }
    }
    
    /**
     * Добавление слушателя событий
     */
    function addEventListener(event, callback) {
        if (!listeners[event]) {
            listeners[event] = [];
        }
        
        listeners[event].push(callback);
    }
    
    /**
     * Удаление слушателя событий
     */
    function removeEventListener(event, callback) {
        if (!listeners[event]) {
            return;
        }
        
        listeners[event] = listeners[event].filter(cb => cb !== callback);
    }
    
    /**
     * Вызов слушателей событий
     */
    function triggerEvent(event, data) {
        if (!listeners[event]) {
            return;
        }
        
        listeners[event].forEach(callback => {
            callback(data);
        });
    }
    
    /**
     * Проверка существования соединения с пользователем
     */
    function hasConnection(peerId) {
        return !!connections[peerId];
    }
    
    return {
        init,
        connect,
        sendMessage,
        sendTypingStatus,
        disconnect,
        closeAll,
        addEventListener,
        removeEventListener,
        hasConnection
    };
})(); 