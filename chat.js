/**
 * P2P Chat - Simulated P2P connections with localStorage
 * 
 * This is a simulation of P2P chat using localStorage as storage.
 * In a real P2P application, WebRTC would be used for direct connections
 * between peers without requiring a central server.
 */

// App State and Constants
const LS = {
    USERNAME: 'p2p_chat_username',
    USER_ID: 'p2p_chat_user_id',
    CONTACTS: 'p2p_chat_contacts',
    THEME: 'theme',
    MSG_PREFIX: 'p2p_chat_messages_',
    ONLINE_STATUS: 'p2p_chat_online_status',
    CHAT_ROOM_PREFIX: 'p2p_chat_room_'
};

const app = {
    user: { name: '', id: '' },
    contacts: [],
    activeChat: null,
    messages: {},
    connectionStatus: {},
    lastActivityTime: {}
};

// DOM elements cache
const $ = {};

// Initialize app on load
document.addEventListener('DOMContentLoaded', () => {
    cacheDOM();
    initTheme();
    loadUserData();
    setupEvents();
    
    // Set user as online and initialize P2P simulation
    if (app.user.id) {
        setUserOnline(app.user.id);
        initP2PSimulation();
    }
});

// Cache all DOM elements
function cacheDOM() {
    const ids = [
        'username-setup', 'chat-interface', 'username-input', 'username-error',
        'save-username', 'current-username', 'user-id', 'welcome-user-id',
        'copy-id', 'contacts-list', 'chat-messages', 'message-input',
        'send-message', 'add-contact', 'add-contact-modal', 'close-modal',
        'contact-id', 'contact-name', 'contact-error', 'add-contact-submit',
        'chat-recipient', 'toasts-container', 'theme-switch'
    ];
    
    ids.forEach(id => {
        $[id.replace(/-/g, '')] = document.getElementById(id);
    });
}

// Set up event handlers
function setupEvents() {
    $.saveusername.addEventListener('click', registerUser);
    $.copyid.addEventListener('click', () => copyToClipboard(app.user.id));
    $.sendmessage.addEventListener('click', sendMessage);
    $.messageinput.addEventListener('keypress', e => { if (e.key === 'Enter') sendMessage(); });
    $.addcontact.addEventListener('click', () => toggleContactModal(true));
    $.closemodal.addEventListener('click', () => toggleContactModal(false));
    $.addcontactsubmit.addEventListener('click', addContact);
    
    // Close modal when clicking outside
    $.addcontactmodal.addEventListener('click', e => {
        if (e.target === $.addcontactmodal) toggleContactModal(false);
    });
    
    // Set offline status when leaving
    window.addEventListener('beforeunload', () => {
        setUserOffline(app.user.id);
    });
}

// Generate a chat room ID for two users (ensures same ID regardless of who initiates)
function getChatRoomId(user1Id, user2Id) {
    // Sort the IDs to ensure the same room ID regardless of order
    const sortedIds = [user1Id, user2Id].sort();
    return `${LS.CHAT_ROOM_PREFIX}${sortedIds[0]}_${sortedIds[1]}`;
}

// Set user as online
function setUserOnline(userId) {
    if (!userId) return;
    
    const onlineUsers = JSON.parse(localStorage.getItem(LS.ONLINE_STATUS) || '{}');
    onlineUsers[userId] = Date.now();
    localStorage.setItem(LS.ONLINE_STATUS, JSON.stringify(onlineUsers));
}

// Set user as offline
function setUserOffline(userId) {
    if (!userId) return;
    
    const onlineUsers = JSON.parse(localStorage.getItem(LS.ONLINE_STATUS) || '{}');
    delete onlineUsers[userId];
    localStorage.setItem(LS.ONLINE_STATUS, JSON.stringify(onlineUsers));
}

// Initialize P2P connection simulation
function initP2PSimulation() {
    // Initial check of online statuses
    checkOnlineStatus();
    
    // Periodically update the online status
    setInterval(() => {
        setUserOnline(app.user.id);
        checkOnlineStatus();
    }, 5000);
    
    // Simulate the "P2P" message checking
    setInterval(() => {
        checkForNewMessages();
    }, 2000);
}

// Check online status of contacts
function checkOnlineStatus() {
    const onlineUsers = JSON.parse(localStorage.getItem(LS.ONLINE_STATUS) || '{}');
    const now = Date.now();
    const timeoutThreshold = 10000; // 10 seconds
    
    // Update connection status for all contacts
    app.contacts.forEach(contact => {
        const lastSeen = onlineUsers[contact.id];
        
        if (lastSeen && (now - lastSeen) < timeoutThreshold) {
            // Contact is online
            app.connectionStatus[contact.id] = 'online';
        } else {
            // Contact is offline
            app.connectionStatus[contact.id] = 'offline';
        }
    });
    
    // Update UI to reflect connection status
    updateContactsOnlineStatus();
}

// Update UI to show online status
function updateContactsOnlineStatus() {
    document.querySelectorAll('.contact-item').forEach(item => {
        const contactId = item.dataset.id;
        const statusText = item.querySelector('.contact-status');
        const statusIndicator = item.querySelector('.status-indicator');
        
        if (!statusIndicator) {
            // Create status indicator if it doesn't exist
            const avatar = item.querySelector('.contact-avatar');
            const indicator = document.createElement('div');
            indicator.className = `status-indicator ${app.connectionStatus[contactId] || 'offline'}`;
            avatar.appendChild(indicator);
        } else {
            // Update existing indicator
            statusIndicator.className = `status-indicator ${app.connectionStatus[contactId] || 'offline'}`;
        }
        
        // Update text to show if online
        if (statusText && app.connectionStatus[contactId] === 'online') {
            statusText.innerHTML = `<span class="online-text">В сети</span>`;
        }
    });
    
    // Also update active chat header if applicable
    if (app.activeChat) {
        const status = app.connectionStatus[app.activeChat.id] === 'online' ? ' (в сети)' : '';
        $.chatrecipient.textContent = app.activeChat.name + status;
    }
}

// Check for new messages (simulate P2P message retrieval)
function checkForNewMessages() {
    // Check for messages in all contact chat rooms
    app.contacts.forEach(contact => {
        const roomId = getChatRoomId(app.user.id, contact.id);
        const savedMessages = localStorage.getItem(roomId);
        
        if (savedMessages) {
            const messages = JSON.parse(savedMessages);
            
            // Compare with our cached messages to see if there are new ones
            const currentMessages = app.messages[contact.id] || [];
            
            // Check if there are new messages addressed to current user
            const newMessages = messages.filter(msg => 
                msg.recipientId === app.user.id && 
                !currentMessages.some(m => m.id === msg.id)
            );
            
            if (newMessages.length > 0) {
                // Add new messages to our cache
                if (!app.messages[contact.id]) {
                    app.messages[contact.id] = [];
                }
                
                // Merge messages and sort by timestamp
                app.messages[contact.id] = [...currentMessages, ...newMessages]
                    .sort((a, b) => a.timestamp - b.timestamp);
                
                // If this is the active chat, refresh the UI
                if (app.activeChat && app.activeChat.id === contact.id) {
                    showChatHistory(contact.id);
                } else {
                    // Show notification for new message
                    showToast(`Новое сообщение от ${contact.name}`, 'info');
                    
                    // Update UI to show unread indicator
                    const contactEl = document.querySelector(`.contact-item[data-id="${contact.id}"]`);
                    if (contactEl && !contactEl.querySelector('.unread-indicator')) {
                        const indicator = document.createElement('div');
                        indicator.className = 'unread-indicator';
                        contactEl.appendChild(indicator);
                    }
                }
            }
        }
    });
}

// Initialize theme
function initTheme() {
    const savedTheme = localStorage.getItem(LS.THEME);
    const isDark = savedTheme === 'dark';
    
    document.body.setAttribute('data-theme', isDark ? 'dark' : '');
    $.themeswitch.checked = isDark;
    
    $.themeswitch.addEventListener('change', () => {
        const darkMode = $.themeswitch.checked;
        document.body.setAttribute('data-theme', darkMode ? 'dark' : '');
        localStorage.setItem(LS.THEME, darkMode ? 'dark' : 'light');
    });
}

// Load user data
function loadUserData() {
    const name = localStorage.getItem(LS.USERNAME);
    const id = localStorage.getItem(LS.USER_ID);
    
    if (name && id) {
        app.user = { name, id };
        showChatUI();
        updateUserInfo();
        loadContacts();
        loadAllMessages();
    } else {
        showLoginUI();
    }
}

// UI visibility functions
function showLoginUI() {
    $.usernamesetup.style.display = 'flex';
    $.chatinterface.style.display = 'none';
}

function showChatUI() {
    $.usernamesetup.style.display = 'none';
    $.chatinterface.style.display = 'flex';
}

// Register new user
function registerUser() {
    const name = $.usernameinput.value.trim();
    
    // Validate
    if (!name || name.length < 3) {
        $.usernameerror.textContent = 'Имя должно содержать минимум 3 символа';
        return;
    }
    
    if (name.length > 20) {
        $.usernameerror.textContent = 'Имя должно быть не длиннее 20 символов';
        return;
    }
    
    // Generate ID and save
    const id = generateUniqueId();
    app.user = { name, id };
    
    localStorage.setItem(LS.USERNAME, name);
    localStorage.setItem(LS.USER_ID, id);
    
    // Update UI
    showChatUI();
    updateUserInfo();
    setUserOnline(id);
    initP2PSimulation();
    showToast(`Добро пожаловать, ${name}!`, 'success');
}

// Update user info in UI
function updateUserInfo() {
    $.currentusername.textContent = app.user.name;
    $.userid.textContent = `ID: ${app.user.id}`;
    $.welcomeuserid.textContent = app.user.id;
}

// Generate unique ID
function generateUniqueId() {
    return `m80c${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
}

// Copy text to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
        .then(() => showToast('ID скопирован в буфер обмена', 'success'))
        .catch(() => showToast('Не удалось скопировать ID', 'error'));
}

// Load contacts from storage
function loadContacts() {
    const saved = localStorage.getItem(LS.CONTACTS);
    app.contacts = saved ? JSON.parse(saved) : [];
    renderContacts();
}

// Render contacts list
function renderContacts() {
    $.contactslist.innerHTML = '';
    
    if (app.contacts.length === 0) {
        $.contactslist.innerHTML = `
            <div class="empty-contacts">
                <i class="fas fa-user-friends"></i>
                <p>У вас пока нет контактов</p>
                <p>Нажмите + чтобы добавить</p>
            </div>`;
        return;
    }
    
    app.contacts.forEach(contact => {
        const el = document.createElement('div');
        el.className = `contact-item${app.activeChat?.id === contact.id ? ' active' : ''}`;
        el.dataset.id = contact.id;
        
        const isOnline = app.connectionStatus[contact.id] === 'online';
        
        el.innerHTML = `
            <div class="contact-avatar">
                <i class="fas fa-user"></i>
                <div class="status-indicator ${isOnline ? 'online' : 'offline'}"></div>
            </div>
            <div class="contact-details">
                <h4 class="contact-name">${contact.name}</h4>
                <p class="contact-status">${isOnline ? '<span class="online-text">В сети</span>' : contact.id}</p>
            </div>`;
        
        el.addEventListener('click', () => openChat(contact));
        $.contactslist.appendChild(el);
    });
}

// Open a chat with contact
function openChat(contact) {
    app.activeChat = contact;
    $.chatrecipient.textContent = contact.name + (app.connectionStatus[contact.id] === 'online' ? ' (в сети)' : '');
    
    // Enable messaging
    $.messageinput.disabled = false;
    $.sendmessage.disabled = false;
    
    // Update active state
    document.querySelectorAll('.contact-item').forEach(item => {
        item.classList.toggle('active', item.dataset.id === contact.id);
        
        // Remove unread indicator if any
        if (item.dataset.id === contact.id) {
            const unreadIndicator = item.querySelector('.unread-indicator');
            if (unreadIndicator) {
                unreadIndicator.remove();
            }
        }
    });
    
    // Show chat history
    showChatHistory(contact.id);
    
    // Focus the input field
    $.messageinput.focus();
}

// Display chat history
function showChatHistory(contactId) {
    $.chatmessages.innerHTML = '';
    const messages = app.messages[contactId] || [];
    
    if (messages.length === 0) {
        $.chatmessages.innerHTML = `
            <div class="system-message">
                Начните общение с ${app.activeChat.name}
            </div>`;
        return;
    }
    
    // Create a container to hold all messages
    const fragment = document.createDocumentFragment();
    
    // Add messages to the fragment
    messages.forEach(msg => {
        const isOwn = msg.senderId === app.user.id;
        const el = document.createElement('div');
        el.className = `message ${isOwn ? 'own' : 'other'}`;
        
        const time = new Date(msg.timestamp).toLocaleTimeString('ru-RU', { 
            hour: '2-digit', minute: '2-digit' 
        });
        
        el.innerHTML = `
            <div class="message-text">${escapeHtml(msg.text)}</div>
            <div class="message-time">${time}</div>`;
        
        fragment.appendChild(el);
    });
    
    // Add all messages at once for better performance
    $.chatmessages.appendChild(fragment);
    scrollToBottom();
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Send a message
function sendMessage() {
    const text = $.messageinput.value.trim();
    
    if (!text || !app.activeChat) return;
    
    // Generate a unique message ID
    const msgId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const msg = {
        id: msgId,
        senderId: app.user.id,
        senderName: app.user.name,
        recipientId: app.activeChat.id,
        recipientName: app.activeChat.name,
        text: text,
        timestamp: Date.now(),
        delivered: false
    };
    
    // Add to local messages cache
    if (!app.messages[app.activeChat.id]) {
        app.messages[app.activeChat.id] = [];
    }
    
    app.messages[app.activeChat.id].push(msg);
    
    // Save to the chat room (localStorage)
    saveToChatRoom(msg);
    
    // Add message to UI
    addMessageToUI(msg);
    
    // Clear input and scroll to bottom
    $.messageinput.value = '';
    scrollToBottom();
}

// Save message to chat room
function saveToChatRoom(msg) {
    // Get or create the chat room
    const roomId = getChatRoomId(msg.senderId, msg.recipientId);
    const existingRoom = localStorage.getItem(roomId);
    
    let roomMessages = [];
    if (existingRoom) {
        roomMessages = JSON.parse(existingRoom);
    }
    
    // Add the new message
    roomMessages.push(msg);
    
    // Save back to localStorage
    localStorage.setItem(roomId, JSON.stringify(roomMessages));
}

// Add message to UI
function addMessageToUI(msg) {
    const isOwn = msg.senderId === app.user.id;
    const el = document.createElement('div');
    el.className = `message ${isOwn ? 'own' : 'other'}`;
    
    const time = new Date(msg.timestamp).toLocaleTimeString('ru-RU', { 
        hour: '2-digit', minute: '2-digit' 
    });
    
    el.innerHTML = `
        <div class="message-text">${escapeHtml(msg.text)}</div>
        <div class="message-time">${time}</div>`;
    
    $.chatmessages.appendChild(el);
}

// Load all message histories
function loadAllMessages() {
    app.messages = {};
    
    // For each contact, load their chat room messages
    app.contacts.forEach(contact => {
        const roomId = getChatRoomId(app.user.id, contact.id);
        const savedRoom = localStorage.getItem(roomId);
        
        if (savedRoom) {
            const roomMessages = JSON.parse(savedRoom);
            
            // Filter messages that are either from or to the current user
            const relevantMessages = roomMessages.filter(msg => 
                msg.senderId === app.user.id || msg.recipientId === app.user.id
            );
            
            // Sort by timestamp
            app.messages[contact.id] = relevantMessages.sort((a, b) => a.timestamp - b.timestamp);
        } else {
            app.messages[contact.id] = [];
        }
    });
}

// Toggle contact modal
function toggleContactModal(show) {
    if (show) {
        $.contactid.value = '';
        $.contactname.value = '';
        $.contacterror.textContent = '';
        $.addcontactmodal.style.display = 'flex';
        setTimeout(() => $.contactid.focus(), 100);
    } else {
        $.addcontactmodal.style.display = 'none';
    }
}

// Add a new contact
function addContact() {
    const id = $.contactid.value.trim();
    const name = $.contactname.value.trim();
    
    // Validate
    if (!id || !name) {
        $.contacterror.textContent = 'Заполните все поля';
        return;
    }
    
    if (id === app.user.id) {
        $.contacterror.textContent = 'Нельзя добавить себя в контакты';
        return;
    }
    
    if (app.contacts.some(c => c.id === id)) {
        $.contacterror.textContent = 'Этот контакт уже добавлен';
        return;
    }
    
    // Add contact
    const contact = { id, name };
    app.contacts.push(contact);
    localStorage.setItem(LS.CONTACTS, JSON.stringify(app.contacts));
    
    // Initialize message history
    app.messages[id] = [];
    
    // Update UI
    renderContacts();
    toggleContactModal(false);
    showToast(`Контакт ${name} добавлен`, 'success');
    openChat(contact);
    
    // Check if contact is online
    checkOnlineStatus();
}

// Scroll to bottom of chat
function scrollToBottom() {
    $.chatmessages.scrollTop = $.chatmessages.scrollHeight;
}

// Show toast notification
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    $.toastscontainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
} 