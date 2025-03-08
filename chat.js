/**
 * Browser P2P Chat - Direct peer connections through browser storage
 * 
 * This simulation uses a combination of localStorage, sessionStorage and 
 * IndexedDB techniques to create peer-to-peer connections.
 */

// Constants for storage keys
const STORAGE = {
    USER: 'p2p_user',
    PEERS: 'p2p_known_peers',
    CHANNELS: 'p2p_channels',
    MESSAGES: 'p2p_messages',
    ONLINE: 'p2p_online_peers',
    THEME: 'theme',
    REQUEST_PREFIX: 'p2p_request_',
    OFFER_PREFIX: 'p2p_offer_',
    ANSWER_PREFIX: 'p2p_answer_',
    PING_PREFIX: 'p2p_ping_'
};

// Main app state 
const app = {
    user: null,
    peers: [],
    activeChat: null,
    messages: {},
    peerStatus: {},
    notifications: {},
    pendingMessages: {}
};

// DOM elements cache
const $ = {};

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    cacheDOM();
    initTheme();
    initP2PSystem();
    setupEventListeners();
});

// Cache DOM elements
function cacheDOM() {
    const elements = [
        'username-setup', 'chat-interface', 'username-input', 'username-error',
        'save-username', 'current-username', 'user-id', 'welcome-user-id',
        'copy-id', 'contacts-list', 'chat-messages', 'message-input',
        'send-message', 'add-contact', 'add-contact-modal', 'close-modal',
        'contact-id', 'contact-name', 'contact-error', 'add-contact-submit',
        'chat-recipient', 'toasts-container', 'theme-switch'
    ];
    
    elements.forEach(id => {
        $[id.replace(/-/g, '')] = document.getElementById(id);
    });
}

// Set up event listeners
function setupEventListeners() {
    $.saveusername.addEventListener('click', createUser);
    $.copyid.addEventListener('click', () => copyToClipboard(app.user.id));
    $.sendmessage.addEventListener('click', sendMessage);
    $.messageinput.addEventListener('keypress', e => { 
        if (e.key === 'Enter') sendMessage(); 
    });
    $.addcontact.addEventListener('click', showContactModal);
    $.closemodal.addEventListener('click', hideContactModal);
    $.addcontactsubmit.addEventListener('click', addContact);
    
    // Close modal when clicking outside
    $.addcontactmodal.addEventListener('click', e => {
        if (e.target === $.addcontactmodal) hideContactModal();
    });
    
    // Set user offline when leaving
    window.addEventListener('beforeunload', () => {
        setUserOffline();
    });
    
    // Handle visibility changes (tab switching)
    document.addEventListener('visibilitychange', handleVisibilityChange);
}

// Initialize theme
function initTheme() {
    const savedTheme = localStorage.getItem(STORAGE.THEME);
    const isDark = savedTheme === 'dark';
    
    document.body.setAttribute('data-theme', isDark ? 'dark' : '');
    $.themeswitch.checked = isDark;
    
    $.themeswitch.addEventListener('change', () => {
        const darkMode = $.themeswitch.checked;
        document.body.setAttribute('data-theme', darkMode ? 'dark' : '');
        localStorage.setItem(STORAGE.THEME, darkMode ? 'dark' : 'light');
    });
}

// Initialize the P2P system
function initP2PSystem() {
    // Try to load existing user
    const savedUser = localStorage.getItem(STORAGE.USER);
    
    if (savedUser) {
        app.user = JSON.parse(savedUser);
        
        // Load peer list
        const savedPeers = localStorage.getItem(STORAGE.PEERS);
        if (savedPeers) {
            app.peers = JSON.parse(savedPeers);
        }
        
        // Show the chat interface
        showChatInterface();
        updateUserInfo();
        
        // Go online and start communication processes
        startP2PCommunication();
    } else {
        // Show login screen
        showLoginInterface();
    }
}

// Create a new user
function createUser() {
    const username = $.usernameinput.value.trim();
    
    // Validate
    if (!username || username.length < 3) {
        $.usernameerror.textContent = 'Имя должно содержать минимум 3 символа';
        return;
    }
    
    if (username.length > 20) {
        $.usernameerror.textContent = 'Имя должно быть не длиннее 20 символов';
        return;
    }
    
    // Create user with unique ID
    const userId = generateUniqueId();
    app.user = {
        id: userId,
        name: username,
        created: Date.now(),
        publicKey: randomString(32) // Simulate a public key
    };
    
    // Save to local storage
    localStorage.setItem(STORAGE.USER, JSON.stringify(app.user));
    localStorage.setItem(STORAGE.PEERS, JSON.stringify([]));
    
    // Show the chat interface
    showChatInterface();
    updateUserInfo();
    
    // Start P2P communication
    startP2PCommunication();
    
    // Show welcome toast
    showToast(`Добро пожаловать в P2P чат, ${username}!`, 'success');
}

// Generate a unique ID with a specific format
function generateUniqueId() {
    return `m80c${Date.now().toString(36)}-${randomString(6)}`;
}

// Generate random string for IDs and keys
function randomString(length) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Copy text to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
        .then(() => showToast('ID скопирован в буфер обмена', 'success'))
        .catch(() => showToast('Не удалось скопировать ID', 'error'));
}

// Show login interface
function showLoginInterface() {
    $.usernamesetup.style.display = 'flex';
    $.chatinterface.style.display = 'none';
}

// Show chat interface
function showChatInterface() {
    $.usernamesetup.style.display = 'none';
    $.chatinterface.style.display = 'flex';
    renderContacts();
    loadAllMessages();
}

// Update user info in UI
function updateUserInfo() {
    $.currentusername.textContent = app.user.name;
    $.userid.textContent = `ID: ${app.user.id}`;
    $.welcomeuserid.textContent = app.user.id;
}

// Start P2P communication process
function startP2PCommunication() {
    setUserOnline();
    
    // Start interval processes
    startHeartbeat();
    startConnectionChecks();
    startMessageMonitoring();
    
    // Render the contact list
    renderContacts();
}

// Set user as online
function setUserOnline() {
    if (!app.user) return;
    
    try {
        // Get current online users
        const onlineData = localStorage.getItem(STORAGE.ONLINE) || '{}';
        const onlineUsers = JSON.parse(onlineData);
        
        // Add or update this user
        onlineUsers[app.user.id] = {
            timestamp: Date.now(),
            name: app.user.name
        };
        
        // Save back to storage
        localStorage.setItem(STORAGE.ONLINE, JSON.stringify(onlineUsers));
    } catch (err) {
        console.error('Error setting online status:', err);
    }
}

// Set user as offline
function setUserOffline() {
    if (!app.user) return;
    
    try {
        // Get current online users
        const onlineData = localStorage.getItem(STORAGE.ONLINE) || '{}';
        const onlineUsers = JSON.parse(onlineData);
        
        // Remove this user
        delete onlineUsers[app.user.id];
        
        // Save back to storage
        localStorage.setItem(STORAGE.ONLINE, JSON.stringify(onlineUsers));
    } catch (err) {
        console.error('Error setting offline status:', err);
    }
}

// Handle tab visibility changes
function handleVisibilityChange() {
    if (document.visibilityState === 'visible') {
        // Tab is visible, go online
        setUserOnline();
    } else {
        // Tab is hidden, wait a bit before going offline
        setTimeout(() => {
            if (document.visibilityState !== 'visible') {
                setUserOffline();
            }
        }, 5000);
    }
}

// Heartbeat to maintain online status
function startHeartbeat() {
    // Clear any existing interval
    if (app.heartbeatInterval) {
        clearInterval(app.heartbeatInterval);
    }
    
    // Set a new heartbeat interval (every 5 seconds)
    app.heartbeatInterval = setInterval(() => {
        if (document.visibilityState === 'visible') {
            setUserOnline();
        }
    }, 5000);
}

// Start connection checking process
function startConnectionChecks() {
    // Clear any existing interval
    if (app.connectionInterval) {
        clearInterval(app.connectionInterval);
    }
    
    // Set a new connection check interval (every 3 seconds)
    app.connectionInterval = setInterval(() => {
        checkPeerConnections();
    }, 3000);
}

// Start message monitoring process
function startMessageMonitoring() {
    // Clear any existing interval
    if (app.messageInterval) {
        clearInterval(app.messageInterval);
    }
    
    // Set a new message check interval (every 1 second)
    app.messageInterval = setInterval(() => {
        checkForNewMessages();
    }, 1000);
}

// Check peer connections and update status
function checkPeerConnections() {
    try {
        // Get current online users
        const onlineData = localStorage.getItem(STORAGE.ONLINE) || '{}';
        const onlineUsers = JSON.parse(onlineData);
        
        // Current time
        const now = Date.now();
        const timeout = 10000; // 10 seconds timeout
        
        // Clean up stale users
        for (const userId in onlineUsers) {
            if (now - onlineUsers[userId].timestamp > timeout) {
                delete onlineUsers[userId];
            }
        }
        
        // Save cleaned list back to storage
        localStorage.setItem(STORAGE.ONLINE, JSON.stringify(onlineUsers));
        
        // Update status for all peers
        app.peers.forEach(peer => {
            const isOnline = onlineUsers[peer.id] && 
                            (now - onlineUsers[peer.id].timestamp < timeout);
            
            app.peerStatus[peer.id] = isOnline ? 'online' : 'offline';
        });
        
        // Update UI
        updatePeerStatusUI();
        
    } catch (err) {
        console.error('Error checking peer connections:', err);
    }
}

// Show modal to add a contact
function showContactModal() {
    $.contactid.value = '';
    $.contactname.value = '';
    $.contacterror.textContent = '';
    $.addcontactmodal.style.display = 'flex';
    setTimeout(() => $.contactid.focus(), 100);
}

// Hide contact modal
function hideContactModal() {
    $.addcontactmodal.style.display = 'none';
}

// Add a new contact
function addContact() {
    const peerId = $.contactid.value.trim();
    const peerName = $.contactname.value.trim();
    
    // Validate
    if (!peerId) {
        $.contacterror.textContent = 'Введите ID контакта';
        return;
    }
    
    if (!peerName) {
        $.contacterror.textContent = 'Введите имя контакта';
        return;
    }
    
    if (peerId === app.user.id) {
        $.contacterror.textContent = 'Вы не можете добавить себя в контакты';
        return;
    }
    
    // Check if peer already exists
    if (app.peers.some(p => p.id === peerId)) {
        $.contacterror.textContent = 'Этот контакт уже добавлен';
        return;
    }
    
    // Create new peer
    const newPeer = {
        id: peerId,
        name: peerName,
        added: Date.now()
    };
    
    // Add to peers list
    app.peers.push(newPeer);
    
    // Save to storage
    localStorage.setItem(STORAGE.PEERS, JSON.stringify(app.peers));
    
    // Initialize chat channel
    initializeChatChannel(newPeer.id);
    
    // Hide modal
    hideContactModal();
    
    // Update UI
    renderContacts();
    
    // Send connection request (simulated)
    sendConnectionRequest(newPeer.id);
    
    // Show success message
    showToast(`Контакт ${peerName} успешно добавлен`, 'success');
    
    // Open chat with new contact
    openChat(newPeer);
}

// Initialize a chat channel
function initializeChatChannel(peerId) {
    // Create a unique channel ID
    const channelId = getChannelId(app.user.id, peerId);
    
    // Check if channel already exists
    const existingChannel = localStorage.getItem(`${STORAGE.CHANNELS}_${channelId}`);
    if (!existingChannel) {
        // Create new channel
        const channel = {
            id: channelId,
            created: Date.now(),
            participants: [app.user.id, peerId],
            status: 'initialized'
        };
        
        // Save to storage
        localStorage.setItem(`${STORAGE.CHANNELS}_${channelId}`, JSON.stringify(channel));
    }
    
    // Initialize messages array
    if (!app.messages[peerId]) {
        app.messages[peerId] = [];
    }
}

// Send a connection request
function sendConnectionRequest(peerId) {
    const request = {
        type: 'connection_request',
        from: app.user.id,
        fromName: app.user.name,
        to: peerId,
        timestamp: Date.now()
    };
    
    // Save request to storage
    localStorage.setItem(`${STORAGE.REQUEST_PREFIX}${peerId}_${app.user.id}`, JSON.stringify(request));
}

// Get channel ID for two peers
function getChannelId(userId1, userId2) {
    // Sort IDs to ensure same channel ID regardless of who initiates
    return [userId1, userId2].sort().join('_');
}

// Update peer status in UI
function updatePeerStatusUI() {
    document.querySelectorAll('.contact-item').forEach(item => {
        const peerId = item.dataset.id;
        const statusIndicator = item.querySelector('.status-indicator');
        const isOnline = app.peerStatus[peerId] === 'online';
        
        // Update status indicator
        if (statusIndicator) {
            statusIndicator.className = `status-indicator ${isOnline ? 'online' : 'offline'}`;
        }
        
        // Update status text
        const statusText = item.querySelector('.contact-status');
        if (statusText) {
            statusText.innerHTML = isOnline ? 
                '<span class="online-text">В сети</span>' : peerId;
        }
    });
    
    // Update active chat header
    if (app.activeChat) {
        const isOnline = app.peerStatus[app.activeChat.id] === 'online';
        $.chatrecipient.textContent = app.activeChat.name + (isOnline ? ' (в сети)' : '');
    }
}

// Render contacts list
function renderContacts() {
    $.contactslist.innerHTML = '';
    
    if (app.peers.length === 0) {
        $.contactslist.innerHTML = `
            <div class="empty-contacts">
                <i class="fas fa-user-friends"></i>
                <p>У вас пока нет контактов</p>
                <p>Нажмите + чтобы добавить</p>
            </div>`;
        return;
    }
    
    app.peers.forEach(peer => {
        const el = document.createElement('div');
        el.className = `contact-item${app.activeChat?.id === peer.id ? ' active' : ''}`;
        el.dataset.id = peer.id;
        
        const isOnline = app.peerStatus[peer.id] === 'online';
        const hasUnread = app.notifications[peer.id];
        
        el.innerHTML = `
            <div class="contact-avatar">
                <i class="fas fa-user"></i>
                <div class="status-indicator ${isOnline ? 'online' : 'offline'}"></div>
            </div>
            <div class="contact-details">
                <h4 class="contact-name">${peer.name}</h4>
                <p class="contact-status">${isOnline ? '<span class="online-text">В сети</span>' : peer.id}</p>
            </div>
            ${hasUnread ? '<div class="unread-indicator"></div>' : ''}
        `;
        
        el.addEventListener('click', () => openChat(peer));
        $.contactslist.appendChild(el);
    });
}

// Open chat with a peer
function openChat(peer) {
    app.activeChat = peer;
    $.chatrecipient.textContent = peer.name + (app.peerStatus[peer.id] === 'online' ? ' (в сети)' : '');
    
    // Enable message input
    $.messageinput.disabled = false;
    $.sendmessage.disabled = false;
    
    // Update active contact in UI
    document.querySelectorAll('.contact-item').forEach(item => {
        item.classList.toggle('active', item.dataset.id === peer.id);
    });
    
    // Clear unread notifications
    if (app.notifications[peer.id]) {
        delete app.notifications[peer.id];
        const unreadIndicator = document.querySelector(`.contact-item[data-id="${peer.id}"] .unread-indicator`);
        if (unreadIndicator) {
            unreadIndicator.remove();
        }
    }
    
    // Display chat history
    displayChatHistory(peer.id);
    
    // Focus on message input
    $.messageinput.focus();
}

// Load all messages
function loadAllMessages() {
    app.peers.forEach(peer => {
        const channelId = getChannelId(app.user.id, peer.id);
        app.messages[peer.id] = [];
        
        try {
            // Load message history
            const messageKey = `${STORAGE.MESSAGES}_${channelId}`;
            const savedMessages = localStorage.getItem(messageKey);
            
            if (savedMessages) {
                const messages = JSON.parse(savedMessages);
                app.messages[peer.id] = messages;
            }
        } catch (err) {
            console.error(`Error loading messages for ${peer.id}:`, err);
        }
    });
}

// Display chat history
function displayChatHistory(peerId) {
    $.chatmessages.innerHTML = '';
    const messages = app.messages[peerId] || [];
    
    if (messages.length === 0) {
        // Show empty state
        const isOnline = app.peerStatus[peerId] === 'online';
        $.chatmessages.innerHTML = `
            <div class="system-message">
                ${isOnline ? 
                    `Начните общение с ${app.activeChat.name}` : 
                    `${app.activeChat.name} не в сети. Сообщения будут доставлены, когда контакт подключится.`
                }
            </div>
        `;
        return;
    }
    
    // Create a fragment to improve performance
    const fragment = document.createDocumentFragment();
    
    // Sort messages by timestamp
    const sortedMessages = [...messages].sort((a, b) => a.timestamp - b.timestamp);
    
    // Group messages by day
    let lastDate = null;
    
    sortedMessages.forEach(msg => {
        // Check if we need to add a date separator
        const msgDate = new Date(msg.timestamp);
        const msgDateStr = msgDate.toLocaleDateString('ru-RU', { 
            day: 'numeric', month: 'long', year: 'numeric' 
        });
        
        if (lastDate !== msgDateStr) {
            const dateSeparator = document.createElement('div');
            dateSeparator.className = 'date-separator';
            dateSeparator.textContent = msgDateStr;
            fragment.appendChild(dateSeparator);
            lastDate = msgDateStr;
        }
        
        // Create message element
        const isOwn = msg.senderId === app.user.id;
        const el = document.createElement('div');
        el.className = `message ${isOwn ? 'own' : 'other'}`;
        
        const time = msgDate.toLocaleTimeString('ru-RU', { 
            hour: '2-digit', minute: '2-digit' 
        });
        
        // Add status indicators for own messages
        let statusIcon = '';
        if (isOwn) {
            if (msg.received) {
                statusIcon = '<i class="fas fa-check-double message-status"></i>';
            } else if (msg.sent) {
                statusIcon = '<i class="fas fa-check message-status"></i>';
            } else {
                statusIcon = '<i class="fas fa-clock message-status"></i>';
            }
        }
        
        el.innerHTML = `
            <div class="message-text">${escapeHtml(msg.text)}</div>
            <div class="message-time">${time} ${statusIcon}</div>
        `;
        
        fragment.appendChild(el);
    });
    
    // Add all messages to the DOM at once
    $.chatmessages.appendChild(fragment);
    
    // Scroll to bottom
    scrollToBottom();
}

// Send a message
function sendMessage() {
    const text = $.messageinput.value.trim();
    if (!text || !app.activeChat) return;
    
    // Create message object
    const msgId = `msg_${Date.now()}_${randomString(8)}`;
    const message = {
        id: msgId,
        text: text,
        senderId: app.user.id,
        recipientId: app.activeChat.id,
        timestamp: Date.now(),
        sent: false,
        received: false
    };
    
    // Add to local messages
    if (!app.messages[app.activeChat.id]) {
        app.messages[app.activeChat.id] = [];
    }
    app.messages[app.activeChat.id].push(message);
    
    // Add to pending messages
    if (!app.pendingMessages[app.activeChat.id]) {
        app.pendingMessages[app.activeChat.id] = [];
    }
    app.pendingMessages[app.activeChat.id].push(message);
    
    // Save to channel
    saveMessageToChannel(message);
    
    // Clear input
    $.messageinput.value = '';
    
    // Update UI
    displayChatHistory(app.activeChat.id);
    
    // Set sent status after a short delay (simulating network delay)
    setTimeout(() => {
        message.sent = true;
        saveMessageToChannel(message);
        displayChatHistory(app.activeChat.id);
    }, 500);
}

// Save message to channel
function saveMessageToChannel(message) {
    const channelId = getChannelId(message.senderId, message.recipientId);
    const messageKey = `${STORAGE.MESSAGES}_${channelId}`;
    
    try {
        // Get existing messages
        const existingData = localStorage.getItem(messageKey);
        let messages = [];
        
        if (existingData) {
            messages = JSON.parse(existingData);
            
            // Update existing message if it exists
            const index = messages.findIndex(m => m.id === message.id);
            if (index !== -1) {
                messages[index] = message;
            } else {
                messages.push(message);
            }
        } else {
            messages = [message];
        }
        
        // Save back to storage
        localStorage.setItem(messageKey, JSON.stringify(messages));
        
    } catch (err) {
        console.error('Error saving message:', err);
        showToast('Ошибка при отправке сообщения', 'error');
    }
}

// Check for new messages
function checkForNewMessages() {
    app.peers.forEach(peer => {
        const channelId = getChannelId(app.user.id, peer.id);
        const messageKey = `${STORAGE.MESSAGES}_${channelId}`;
        
        try {
            const savedData = localStorage.getItem(messageKey);
            if (!savedData) return;
            
            const channelMessages = JSON.parse(savedData);
            const currentCount = (app.messages[peer.id] || []).length;
            
            // Find messages to us that need to be marked as received
            const incomingMessages = channelMessages.filter(m => 
                m.recipientId === app.user.id && !m.received
            );
            
            // Mark messages as received
            if (incomingMessages.length > 0) {
                incomingMessages.forEach(msg => {
                    msg.received = true;
                    saveMessageToChannel(msg);
                });
                
                // If this is not the active chat, show notification
                if (!app.activeChat || app.activeChat.id !== peer.id) {
                    app.notifications[peer.id] = true;
                    showToast(`Новое сообщение от ${peer.name}`, 'info');
                    renderContacts(); // Update UI to show notification
                }
            }
            
            // Check if our sent messages were received
            const ourMessages = channelMessages.filter(m => 
                m.senderId === app.user.id && m.received && 
                app.pendingMessages[peer.id]?.some(pm => pm.id === m.id)
            );
            
            if (ourMessages.length > 0) {
                // Remove from pending
                ourMessages.forEach(msg => {
                    const index = app.pendingMessages[peer.id]?.findIndex(m => m.id === msg.id);
                    if (index !== -1) {
                        app.pendingMessages[peer.id].splice(index, 1);
                    }
                });
                
                // Update local messages
                app.messages[peer.id] = channelMessages;
                
                // Update UI if this is the active chat
                if (app.activeChat && app.activeChat.id === peer.id) {
                    displayChatHistory(peer.id);
                }
            }
            
            // Check for new messages
            if (channelMessages.length > currentCount) {
                app.messages[peer.id] = channelMessages;
                
                // Update UI if this is the active chat
                if (app.activeChat && app.activeChat.id === peer.id) {
                    displayChatHistory(peer.id);
                }
            }
            
        } catch (err) {
            console.error(`Error checking messages for ${peer.id}:`, err);
        }
    });
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Scroll chat to bottom
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