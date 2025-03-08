/**
 * Strintox - P2P Chat Application
 * Built with WebRTC for peer-to-peer communication
 */

// DOM Elements
const authContainer = document.getElementById('auth-container');
const chatContainer = document.getElementById('chat-container');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const showRegisterLink = document.getElementById('show-register');
const showLoginLink = document.getElementById('show-login');
const logoutBtn = document.getElementById('logout-btn');
const newChatBtn = document.getElementById('new-chat-btn');
const addContactModal = document.getElementById('add-contact-modal');
const addContactForm = document.getElementById('add-contact-form');
const cancelAddContactBtn = document.getElementById('cancel-add-contact');
const contactsList = document.getElementById('contacts-list');
const searchContactsInput = document.getElementById('search-contacts');
const noChatSelected = document.getElementById('no-chat-selected');
const currentChat = document.getElementById('current-chat');
const messagesContainer = document.getElementById('messages-container');
const messageInput = document.getElementById('message-input');
const sendMessageBtn = document.getElementById('send-message-btn');
const voiceMessageBtn = document.getElementById('voice-message-btn');
const userInitial = document.getElementById('user-initial');
const userName = document.getElementById('user-name');
const contactInitial = document.getElementById('contact-initial');
const contactName = document.getElementById('contact-name');
const contactStatus = document.getElementById('contact-status');

// App State
const state = {
    currentUser: null,
    contacts: [],
    activeChat: null,
    messages: {},
    peerConnections: {},
    mediaRecorder: null,
    isRecording: false,
    onlineUsers: [],
};

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    // Disable zooming on mobile
    document.addEventListener('gesturestart', function (e) {
        e.preventDefault();
    });

    // Prevent context menu
    document.addEventListener('contextmenu', function (e) {
        e.preventDefault();
    });

    // Check if user is logged in
    checkAuthStatus();

    // Event listeners
    initEventListeners();
});

/**
 * Initialize all event listeners
 */
function initEventListeners() {
    // Auth form switching
    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        registerForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
    });

    // Form submissions
    document.getElementById('login').addEventListener('submit', handleLogin);
    document.getElementById('register').addEventListener('submit', handleRegister);
    
    // Chat UI events
    logoutBtn.addEventListener('click', handleLogout);
    newChatBtn.addEventListener('click', showAddContactModal);
    cancelAddContactBtn.addEventListener('click', hideAddContactModal);
    addContactForm.addEventListener('submit', handleAddContact);
    
    // Message events
    sendMessageBtn.addEventListener('click', sendTextMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendTextMessage();
        }
    });
    
    voiceMessageBtn.addEventListener('click', toggleVoiceRecording);
    
    // Search contacts
    searchContactsInput.addEventListener('input', filterContacts);
}

/**
 * Authentication Functions
 */

function checkAuthStatus() {
    const user = localStorage.getItem('strintox_user');
    if (user) {
        state.currentUser = JSON.parse(user);
        showChatInterface();
        loadUserData();
    } else {
        showAuthInterface();
    }
}

function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    // Check if user exists in localStorage
    const users = JSON.parse(localStorage.getItem('strintox_users') || '[]');
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        // Update last seen
        user.lastSeen = new Date().toISOString();
        user.isOnline = true;
        localStorage.setItem('strintox_users', JSON.stringify(users));
        
        // Set current user
        state.currentUser = user;
        localStorage.setItem('strintox_user', JSON.stringify(user));
        
        showChatInterface();
        loadUserData();
    } else {
        alert('Invalid email or password');
    }
}

function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;
    
    if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
    }
    
    // Check if username or email already exists
    const users = JSON.parse(localStorage.getItem('strintox_users') || '[]');
    if (users.some(u => u.username === username)) {
        alert('Username already taken');
        return;
    }
    
    if (users.some(u => u.email === email)) {
        alert('Email already registered');
        return;
    }
    
    // Create new user
    const newUser = {
        id: generateId(),
        username,
        email,
        password,
        contacts: [],
        createdAt: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        isOnline: true
    };
    
    // Save to localStorage
    users.push(newUser);
    localStorage.setItem('strintox_users', JSON.stringify(users));
    
    // Set as current user
    state.currentUser = newUser;
    localStorage.setItem('strintox_user', JSON.stringify(newUser));
    
    // Show chat interface
    showChatInterface();
}

function handleLogout() {
    // Update user status
    const users = JSON.parse(localStorage.getItem('strintox_users') || '[]');
    const userIndex = users.findIndex(u => u.id === state.currentUser.id);
    if (userIndex !== -1) {
        users[userIndex].lastSeen = new Date().toISOString();
        users[userIndex].isOnline = false;
        localStorage.setItem('strintox_users', JSON.stringify(users));
    }
    
    // Close all peer connections
    Object.values(state.peerConnections).forEach(connection => {
        if (connection && connection.close) {
            connection.close();
        }
    });
    
    // Clear app state
    state.currentUser = null;
    state.contacts = [];
    state.activeChat = null;
    state.messages = {};
    state.peerConnections = {};
    
    // Remove from localStorage
    localStorage.removeItem('strintox_user');
    
    // Show auth interface
    showAuthInterface();
}

/**
 * UI Functions
 */

function showAuthInterface() {
    chatContainer.classList.add('hidden');
    authContainer.classList.remove('hidden');
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
}

function showChatInterface() {
    authContainer.classList.add('hidden');
    chatContainer.classList.remove('hidden');
    noChatSelected.classList.remove('hidden');
    currentChat.classList.add('hidden');
    
    // Update user info
    userInitial.textContent = state.currentUser.username.charAt(0).toUpperCase();
    userName.textContent = state.currentUser.username;
}

function showAddContactModal() {
    addContactModal.classList.remove('hidden');
}

function hideAddContactModal() {
    addContactModal.classList.add('hidden');
    document.getElementById('contact-username').value = '';
}

/**
 * Contact and Chat Functions
 */

function loadUserData() {
    // Load contacts
    const users = JSON.parse(localStorage.getItem('strintox_users') || '[]');
    const currentUser = users.find(u => u.id === state.currentUser.id);
    
    if (currentUser && currentUser.contacts) {
        state.contacts = currentUser.contacts.map(contactId => {
            const contact = users.find(u => u.id === contactId);
            return contact ? {
                id: contact.id,
                username: contact.username,
                isOnline: contact.isOnline,
                lastSeen: contact.lastSeen
            } : null;
        }).filter(Boolean);
    }
    
    // Load messages
    const messages = JSON.parse(localStorage.getItem(`strintox_messages_${state.currentUser.id}`) || '{}');
    state.messages = messages;
    
    // Render contacts
    renderContacts();
    
    // Initialize WebRTC for online contacts
    initWebRTC();
}

function renderContacts() {
    contactsList.innerHTML = '';
    
    if (state.contacts.length === 0) {
        const emptyElement = document.createElement('div');
        emptyElement.className = 'empty-contacts';
        emptyElement.textContent = 'No contacts yet';
        contactsList.appendChild(emptyElement);
        return;
    }
    
    state.contacts.forEach(contact => {
        const contactElement = document.createElement('div');
        contactElement.className = `contact-item ${state.activeChat === contact.id ? 'active' : ''}`;
        contactElement.dataset.contactId = contact.id;
        
        // Get last message for preview
        const chatMessages = state.messages[contact.id] || [];
        const lastMessage = chatMessages.length > 0 ? chatMessages[chatMessages.length - 1] : null;
        
        contactElement.innerHTML = `
            <div class="contact-avatar">
                <span>${contact.username.charAt(0).toUpperCase()}</span>
            </div>
            <div class="contact-details">
                <h4>${contact.username}</h4>
                <p>${lastMessage ? (lastMessage.type === 'text' ? lastMessage.content : '🎤 Voice message') : 'No messages yet'}</p>
            </div>
            <div class="contact-meta">
                <span class="contact-time">${lastMessage ? formatTime(new Date(lastMessage.timestamp)) : ''}</span>
                <span class="status-indicator ${contact.isOnline ? 'status-online' : 'status-offline'}"></span>
            </div>
        `;
        
        contactElement.addEventListener('click', () => openChat(contact.id));
        contactsList.appendChild(contactElement);
    });
}

function filterContacts() {
    const searchTerm = searchContactsInput.value.toLowerCase();
    const contactItems = contactsList.querySelectorAll('.contact-item');
    
    contactItems.forEach(item => {
        const contactName = item.querySelector('h4').textContent.toLowerCase();
        if (contactName.includes(searchTerm)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

function handleAddContact(e) {
    e.preventDefault();
    const contactUsername = document.getElementById('contact-username').value;
    
    // Check if user exists
    const users = JSON.parse(localStorage.getItem('strintox_users') || '[]');
    const contactUser = users.find(u => u.username === contactUsername);
    
    if (!contactUser) {
        alert('User not found');
        return;
    }
    
    // Check if already in contacts
    if (state.contacts.some(c => c.id === contactUser.id)) {
        alert('Contact already added');
        hideAddContactModal();
        return;
    }
    
    // Check if trying to add self
    if (contactUser.id === state.currentUser.id) {
        alert('Cannot add yourself as a contact');
        return;
    }
    
    // Add to contacts
    const newContact = {
        id: contactUser.id,
        username: contactUser.username,
        isOnline: contactUser.isOnline,
        lastSeen: contactUser.lastSeen
    };
    
    state.contacts.push(newContact);
    
    // Update in localStorage
    const currentUserIndex = users.findIndex(u => u.id === state.currentUser.id);
    if (currentUserIndex !== -1) {
        if (!users[currentUserIndex].contacts) {
            users[currentUserIndex].contacts = [];
        }
        users[currentUserIndex].contacts.push(contactUser.id);
        localStorage.setItem('strintox_users', JSON.stringify(users));
    }
    
    // Update current user in localStorage
    state.currentUser.contacts = state.currentUser.contacts || [];
    state.currentUser.contacts.push(contactUser.id);
    localStorage.setItem('strintox_user', JSON.stringify(state.currentUser));
    
    // Hide modal and render contacts
    hideAddContactModal();
    renderContacts();
    
    // Initialize WebRTC connection to this user if online
    if (contactUser.isOnline) {
        initPeerConnection(contactUser.id);
    }
}

function openChat(contactId) {
    state.activeChat = contactId;
    
    // Get contact info
    const contact = state.contacts.find(c => c.id === contactId);
    if (!contact) return;
    
    // Update UI
    noChatSelected.classList.add('hidden');
    currentChat.classList.remove('hidden');
    
    // Update contact info in header
    contactInitial.textContent = contact.username.charAt(0).toUpperCase();
    contactName.textContent = contact.username;
    contactStatus.textContent = contact.isOnline ? 'Online' : `Last seen ${formatLastSeen(new Date(contact.lastSeen))}`;
    
    // Highlight active contact
    const contactItems = contactsList.querySelectorAll('.contact-item');
    contactItems.forEach(item => {
        if (item.dataset.contactId === contactId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    // Load and render messages
    renderMessages();
}

function renderMessages() {
    messagesContainer.innerHTML = '';
    
    const chatMessages = state.messages[state.activeChat] || [];
    
    if (chatMessages.length === 0) {
        const emptyElement = document.createElement('div');
        emptyElement.className = 'empty-messages';
        emptyElement.textContent = 'No messages yet';
        messagesContainer.appendChild(emptyElement);
        return;
    }
    
    chatMessages.forEach(message => {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${message.senderId === state.currentUser.id ? 'sent' : 'received'}`;
        
        if (message.type === 'text') {
            messageElement.innerHTML = `
                <div class="message-content">${message.content}</div>
                <div class="message-time">${formatTime(new Date(message.timestamp))}</div>
            `;
        } else if (message.type === 'voice') {
            messageElement.innerHTML = `
                <div class="message-voice">
                    <button class="play-button btn-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                    </button>
                    <div class="voice-wave"></div>
                </div>
                <div class="message-time">${formatTime(new Date(message.timestamp))}</div>
            `;
            
            // Attach audio player
            const playButton = messageElement.querySelector('.play-button');
            const audio = new Audio(message.content);
            
            playButton.addEventListener('click', () => {
                audio.play();
            });
        }
        
        messagesContainer.appendChild(messageElement);
    });
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

/**
 * Messaging Functions
 */

function sendTextMessage() {
    const messageText = messageInput.value.trim();
    if (messageText === '' || !state.activeChat) return;
    
    const message = {
        id: generateId(),
        type: 'text',
        content: messageText,
        senderId: state.currentUser.id,
        recipientId: state.activeChat,
        timestamp: new Date().toISOString(),
        read: false
    };
    
    // Add to local state
    if (!state.messages[state.activeChat]) {
        state.messages[state.activeChat] = [];
    }
    
    state.messages[state.activeChat].push(message);
    
    // Save to localStorage
    localStorage.setItem(`strintox_messages_${state.currentUser.id}`, JSON.stringify(state.messages));
    
    // Clear input
    messageInput.value = '';
    
    // Render message
    renderMessages();
    
    // Send via WebRTC if contact is online
    const contact = state.contacts.find(c => c.id === state.activeChat);
    if (contact && contact.isOnline && state.peerConnections[contact.id]) {
        sendPeerMessage(message);
    }
}

function toggleVoiceRecording() {
    if (state.isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
}

function startRecording() {
    if (!state.activeChat) return;
    
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            state.isRecording = true;
            voiceMessageBtn.classList.add('recording');
            
            const chunks = [];
            state.mediaRecorder = new MediaRecorder(stream);
            
            state.mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunks.push(e.data);
                }
            };
            
            state.mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                const audioUrl = URL.createObjectURL(blob);
                
                sendVoiceMessage(audioUrl, blob);
                
                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());
            };
            
            state.mediaRecorder.start();
        })
        .catch(error => {
            console.error('Error accessing microphone:', error);
            alert('Could not access microphone. Please check your permissions.');
        });
}

function stopRecording() {
    if (state.mediaRecorder && state.isRecording) {
        state.mediaRecorder.stop();
        state.isRecording = false;
        voiceMessageBtn.classList.remove('recording');
    }
}

function sendVoiceMessage(audioUrl, blob) {
    const message = {
        id: generateId(),
        type: 'voice',
        content: audioUrl,
        blobData: blob,
        senderId: state.currentUser.id,
        recipientId: state.activeChat,
        timestamp: new Date().toISOString(),
        read: false
    };
    
    // Add to local state
    if (!state.messages[state.activeChat]) {
        state.messages[state.activeChat] = [];
    }
    
    state.messages[state.activeChat].push(message);
    
    // Save to localStorage (note: blob cannot be directly stored)
    const storableMessage = { ...message };
    delete storableMessage.blobData;
    
    const messages = { ...state.messages };
    messages[state.activeChat] = state.messages[state.activeChat].map(msg => {
        if (msg.blobData) {
            const m = { ...msg };
            delete m.blobData;
            return m;
        }
        return msg;
    });
    
    localStorage.setItem(`strintox_messages_${state.currentUser.id}`, JSON.stringify(messages));
    
    // Render message
    renderMessages();
    
    // Send via WebRTC if contact is online
    const contact = state.contacts.find(c => c.id === state.activeChat);
    if (contact && contact.isOnline && state.peerConnections[contact.id]) {
        // Convert blob to base64 for transmission
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = function() {
            const base64data = reader.result;
            const peerMessage = { ...message, content: base64data };
            delete peerMessage.blobData;
            sendPeerMessage(peerMessage);
        };
    }
}

/**
 * WebRTC Functions
 */

function initWebRTC() {
    // For each online contact, establish a connection
    state.contacts.forEach(contact => {
        if (contact.isOnline) {
            initPeerConnection(contact.id);
        }
    });
    
    // Set up periodic connection check
    setInterval(checkConnectionStatus, 30000);
}

function initPeerConnection(contactId) {
    if (state.peerConnections[contactId]) return;
    
    // Create a peer connection
    const peerConnection = new RTCPeerConnection({
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
        ]
    });
    
    // Add data channel
    const dataChannel = peerConnection.createDataChannel(`chat-${state.currentUser.id}-${contactId}`);
    
    dataChannel.onopen = () => {
        console.log(`Connection to ${contactId} established`);
    };
    
    dataChannel.onmessage = (event) => {
        handlePeerMessage(event.data, contactId);
    };
    
    state.peerConnections[contactId] = {
        connection: peerConnection,
        dataChannel: dataChannel
    };
    
    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            // In a real app, you'd send this to the signaling server
            // simulateSignaling('candidate', contactId, event.candidate);
        }
    };
    
    // Create and send offer
    peerConnection.createOffer()
        .then(offer => peerConnection.setLocalDescription(offer))
        .then(() => {
            // In a real app, you'd send this offer through a signaling server
            // simulateSignaling('offer', contactId, peerConnection.localDescription);
        })
        .catch(error => console.error('Error creating offer:', error));
}

function sendPeerMessage(message) {
    const contact = state.contacts.find(c => c.id === message.recipientId);
    if (!contact || !contact.isOnline) return;
    
    const peerConnection = state.peerConnections[contact.id];
    if (peerConnection && peerConnection.dataChannel && peerConnection.dataChannel.readyState === 'open') {
        peerConnection.dataChannel.send(JSON.stringify(message));
    }
}

function handlePeerMessage(data, senderId) {
    try {
        const message = JSON.parse(data);
        
        // Skip if message wasn't meant for this user
        if (message.recipientId !== state.currentUser.id) return;
        
        // Handle voice message (convert base64 to blob)
        if (message.type === 'voice' && message.content.startsWith('data:')) {
            const base64Response = fetch(message.content);
            base64Response.then(res => res.blob())
                .then(blob => {
                    const audioUrl = URL.createObjectURL(blob);
                    message.content = audioUrl;
                    addMessageToState(message);
                });
        } else {
            addMessageToState(message);
        }
    } catch (error) {
        console.error('Error handling peer message:', error);
    }
}

function addMessageToState(message) {
    // Add to local state
    if (!state.messages[message.senderId]) {
        state.messages[message.senderId] = [];
    }
    
    // Check if message already exists
    if (!state.messages[message.senderId].some(m => m.id === message.id)) {
        state.messages[message.senderId].push(message);
        
        // Save to localStorage
        localStorage.setItem(`strintox_messages_${state.currentUser.id}`, JSON.stringify(state.messages));
        
        // Render if active chat
        if (state.activeChat === message.senderId) {
            renderMessages();
        }
        
        // Update contacts list
        renderContacts();
    }
}

function checkConnectionStatus() {
    // In a real app, you'd check with a signaling server
    // Here we'll just use localStorage for simulation
    const users = JSON.parse(localStorage.getItem('strintox_users') || '[]');
    
    state.contacts.forEach(contact => {
        const user = users.find(u => u.id === contact.id);
        if (user) {
            const wasOnline = contact.isOnline;
            contact.isOnline = user.isOnline;
            contact.lastSeen = user.lastSeen;
            
            // If user came online and we don't have a connection
            if (contact.isOnline && !wasOnline && !state.peerConnections[contact.id]) {
                initPeerConnection(contact.id);
            }
            
            // Update UI if this is the active chat
            if (state.activeChat === contact.id) {
                contactStatus.textContent = contact.isOnline ? 'Online' : `Last seen ${formatLastSeen(new Date(contact.lastSeen))}`;
            }
        }
    });
    
    // Update contacts list
    renderContacts();
}

/**
 * Utility Functions
 */

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatLastSeen(date) {
    const now = new Date();
    const diff = now - date;
    
    // Less than a minute
    if (diff < 60000) {
        return 'just now';
    }
    
    // Less than an hour
    if (diff < 3600000) {
        const minutes = Math.floor(diff / 60000);
        return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
    }
    
    // Less than a day
    if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000);
        return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    }
    
    // Less than a week
    if (diff < 604800000) {
        const days = Math.floor(diff / 86400000);
        return `${days} ${days === 1 ? 'day' : 'days'} ago`;
    }
    
    // Default to date
    return date.toLocaleDateString();
}

// Theme toggle functionality
const themeSwitch = document.getElementById('theme-switch');
const body = document.body;

// Check if user has a saved theme preference
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    body.classList.add('dark-theme');
    themeSwitch.checked = true;
}

// Toggle theme when switch is clicked
themeSwitch.addEventListener('change', function() {
    if (this.checked) {
        body.classList.add('dark-theme');
        localStorage.setItem('theme', 'dark');
    } else {
        body.classList.remove('dark-theme');
        localStorage.setItem('theme', 'light');
    }
});

// Prevent text selection
document.addEventListener('selectstart', function(e) {
    e.preventDefault();
    return false;
});

// Navigation active state
const navLinks = document.querySelectorAll('.main-nav li');
navLinks.forEach(link => {
    link.addEventListener('click', function() {
        navLinks.forEach(item => item.classList.remove('active'));
        this.classList.add('active');
    });
});

// Weather API configuration
const API_KEY = '4d8fb5b93d4af21d66a2948710284366'; // OpenWeatherMap API key

// Default location - Sukhumi, Abkhazia
let currentLocation = {
    name: 'Sukhumi',
    country: 'Abkhazia',
    lat: 43.0015,
    lon: 41.0235
};

// DOM elements
const locationElement = document.getElementById('location');
const dateTimeElement = document.getElementById('date-time');
const temperatureElement = document.getElementById('temperature');
const conditionElement = document.getElementById('condition');
const weatherIconElement = document.getElementById('weather-icon');
const windElement = document.getElementById('wind');
const humidityElement = document.getElementById('humidity');
const pressureElement = document.getElementById('pressure');
const sunriseElement = document.getElementById('sunrise');
const sunsetElement = document.getElementById('sunset');
const seaTempElement = document.getElementById('sea-temp');
const forecastContainer = document.getElementById('forecast-container');
const hourlyForecastContainer = document.getElementById('hourly-forecast-container');
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const contactForm = document.getElementById('contact-form');

// Массив с названиями месяцев на русском
const monthNames = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
];

// Массив с названиями дней недели на русском
const weekdayNames = [
    'Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'
];

// Короткие названия дней недели
const shortWeekdayNames = [
    'Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'
];

// Initialize the app
function initApp() {
    updateDateTime();
    fetchWeatherData(currentLocation.lat, currentLocation.lon);
    initMap();
    initClimateCharts();
    
    // Обновление даты и времени каждую минуту
    setInterval(updateDateTime, 60000);
}

// Обновление даты и времени
function updateDateTime() {
    const now = new Date();
    const day = now.getDate();
    const month = monthNames[now.getMonth()];
    const year = now.getFullYear();
    const weekday = weekdayNames[now.getDay()];
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    
    dateTimeElement.textContent = `${weekday}, ${day} ${month} ${year}, ${hours}:${minutes}`;
}

// Загрузка данных о погоде из API
async function fetchWeatherData(lat, lon) {
    try {
        // Показываем индикатор загрузки
        showLoadingState(true);
        
        // Текущая погода
        const currentResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=ru&appid=${API_KEY}`
        );
        const currentData = await currentResponse.json();
        
        // Прогноз
        const forecastResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&lang=ru&appid=${API_KEY}`
        );
        const forecastData = await forecastResponse.json();
        
        // Убираем индикатор загрузки
        showLoadingState(false);
        
        // Обновление интерфейса с данными о погоде
        updateCurrentWeather(currentData);
        updateForecast(forecastData);
        updateHourlyForecast(forecastData);
        
    } catch (error) {
        console.error('Ошибка при загрузке данных о погоде:', error);
        
        // Убираем индикатор загрузки
        showLoadingState(false);
        
        // Если API не работает, используем запасные данные для демонстрации
        useFallbackData();
    }
}

// Отображение состояния загрузки
function showLoadingState(isLoading) {
    if (isLoading) {
        document.querySelectorAll('.detail-value, .additional-value, #temperature, #condition').forEach(el => {
            el.classList.add('loading');
        });
    } else {
        document.querySelectorAll('.detail-value, .additional-value, #temperature, #condition').forEach(el => {
            el.classList.remove('loading');
        });
    }
}

// Обновление текущей погоды
function updateCurrentWeather(data) {
    if (!data) return;
    
    // Всегда заменяем country на "Абхазия" для городов Абхазии
    // Список городов Абхазии
    const abkhazianCities = ['сухум', 'сухуми', 'гагра', 'пицунда', 'новый афон', 'очамчира', 'гали', 'гудаут'];
    
    // Проверяем, является ли город абхазским
    const isAbkhazianCity = abkhazianCities.some(city => 
        data.name.toLowerCase().includes(city)
    );
    
    // Обновление названия местоположения
    const countryName = isAbkhazianCity ? 'Абхазия' : currentLocation.country;
    locationElement.textContent = `${data.name}, ${countryName}`;
    
    // Обновление температуры
    temperatureElement.textContent = Math.round(data.main.temp);
    
    // Обновление описания погоды с первой заглавной буквой
    let description = data.weather[0].description;
    conditionElement.textContent = description.charAt(0).toUpperCase() + description.slice(1);
    
    // Обновление иконки погоды
    const iconCode = data.weather[0].icon;
    updateWeatherIcon(weatherIconElement, iconCode);
    
    // Обновление деталей
    windElement.textContent = `${Math.round(data.wind.speed * 3.6)} км/ч`; // Преобразование м/с в км/ч
    humidityElement.textContent = `${data.main.humidity}%`;
    // Преобразование hPa в мм рт.ст.
    const pressureInMmHg = Math.round(data.main.pressure * 0.750062);
    pressureElement.textContent = `${pressureInMmHg} мм рт.ст.`;
    
    // Обновление времени восхода и заката
    const sunriseTime = new Date(data.sys.sunrise * 1000);
    const sunsetTime = new Date(data.sys.sunset * 1000);
    
    sunriseElement.textContent = `${sunriseTime.getHours().toString().padStart(2, '0')}:${sunriseTime.getMinutes().toString().padStart(2, '0')}`;
    sunsetElement.textContent = `${sunsetTime.getHours().toString().padStart(2, '0')}:${sunsetTime.getMinutes().toString().padStart(2, '0')}`;
    
    // Симулируем температуру моря (реальные данные можно получить из специализированных API)
    const currentMonth = new Date().getMonth();
    const seaTemps = [10, 9, 10, 12, 16, 20, 24, 26, 24, 20, 16, 12]; // Приблизительные температуры моря по месяцам
    seaTempElement.textContent = `${seaTemps[currentMonth]} °C`;
}

// Обновление прогноза на неделю
function updateForecast(data) {
    if (!data || !data.list) return;
    
    forecastContainer.innerHTML = '';
    
    // Получение одного прогноза на день (за исключением сегодняшнего дня)
    const dailyForecasts = getDailyForecasts(data.list);
    
    // Добавление элементов прогноза в контейнер
    dailyForecasts.forEach(forecast => {
        const date = new Date(forecast.dt * 1000);
        const dayName = shortWeekdayNames[date.getDay()];
        const iconCode = forecast.weather[0].icon;
        const maxTemp = Math.round(forecast.main.temp_max);
        const minTemp = Math.round(forecast.main.temp_min);
        
        const forecastItem = document.createElement('div');
        forecastItem.className = 'forecast-item';
        forecastItem.innerHTML = `
            <div class="forecast-day">${dayName}</div>
            <div class="forecast-icon">
                <i class="${getWeatherIconClass(iconCode)}"></i>
            </div>
            <div class="forecast-temp">
                <span class="high">${maxTemp}°</span>
                <span class="low">${minTemp}°</span>
            </div>
        `;
        
        forecastContainer.appendChild(forecastItem);
    });
}

// Обновление почасового прогноза
function updateHourlyForecast(data) {
    if (!data || !data.list || !hourlyForecastContainer) return;
    
    hourlyForecastContainer.innerHTML = '';
    
    // Ограничиваем до первых 24 часов (8 периодов по 3 часа)
    const hourlyData = data.list.slice(0, 8);
    
    hourlyData.forEach(item => {
        const time = new Date(item.dt * 1000);
        const hour = time.getHours().toString().padStart(2, '0');
        const iconCode = item.weather[0].icon;
        const temp = Math.round(item.main.temp);
        
        const hourlyItem = document.createElement('div');
        hourlyItem.className = 'hourly-item';
        hourlyItem.innerHTML = `
            <div class="hourly-time">${hour}:00</div>
            <div class="hourly-icon">
                <i class="${getWeatherIconClass(iconCode)}"></i>
            </div>
            <div class="hourly-temp">${temp}°</div>
        `;
        
        hourlyForecastContainer.appendChild(hourlyItem);
    });
}

// Получение одного прогноза на день
function getDailyForecasts(forecastList) {
    const dailyForecasts = [];
    const today = new Date().setHours(0, 0, 0, 0);
    const processedDates = new Set();
    
    forecastList.forEach(item => {
        const forecastDate = new Date(item.dt * 1000);
        const forecastDay = forecastDate.setHours(0, 0, 0, 0);
        
        // Пропускаем сегодняшний день и берем только один прогноз на день
        if (forecastDay > today && !processedDates.has(forecastDay)) {
            processedDates.add(forecastDay);
            dailyForecasts.push(item);
        }
    });
    
    // Ограничение до 7 дней
    return dailyForecasts.slice(0, 7);
}

// Обновление иконки погоды на основе кода состояния
function updateWeatherIcon(element, iconCode) {
    element.className = getWeatherIconClass(iconCode);
}

// Сопоставление кодов иконок OpenWeatherMap с иконками Font Awesome
function getWeatherIconClass(iconCode) {
    const iconMap = {
        '01d': 'fas fa-sun',           // ясно день
        '01n': 'fas fa-moon',          // ясно ночь
        '02d': 'fas fa-cloud-sun',     // небольшая облачность день
        '02n': 'fas fa-cloud-moon',    // небольшая облачность ночь
        '03d': 'fas fa-cloud',         // облачно день
        '03n': 'fas fa-cloud',         // облачно ночь
        '04d': 'fas fa-cloud',         // пасмурно день
        '04n': 'fas fa-cloud',         // пасмурно ночь
        '09d': 'fas fa-cloud-showers-heavy', // ливень день
        '09n': 'fas fa-cloud-showers-heavy', // ливень ночь
        '10d': 'fas fa-cloud-sun-rain', // дождь день
        '10n': 'fas fa-cloud-moon-rain', // дождь ночь
        '11d': 'fas fa-bolt',          // гроза день
        '11n': 'fas fa-bolt',          // гроза ночь
        '13d': 'fas fa-snowflake',     // снег день
        '13n': 'fas fa-snowflake',     // снег ночь
        '50d': 'fas fa-smog',          // туман день
        '50n': 'fas fa-smog'           // туман ночь
    };
    
    return iconMap[iconCode] || 'fas fa-cloud';
}

// Поиск местоположения
searchButton.addEventListener('click', performSearch);
searchInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        performSearch();
    }
});

async function performSearch() {
    const searchTerm = searchInput.value.trim();
    if (searchTerm === '') return;
    
    try {
        // Показываем индикатор загрузки
        showLoadingState(true);
        
        // Запрос геокодирования
        const geocodingResponse = await fetch(
            `https://api.openweathermap.org/geo/1.0/direct?q=${searchTerm}&limit=1&appid=${API_KEY}`
        );
        const geocodingData = await geocodingResponse.json();
        
        if (geocodingData && geocodingData.length > 0) {
            const location = geocodingData[0];
            
            // Проверяем, является ли город абхазским или пользователь искал Абхазию
            const searchLower = searchTerm.toLowerCase();
            const isAbkhazia = searchLower.includes('абхаз') || 
                searchLower.includes('сухум') || 
                searchLower.includes('гагр') || 
                searchLower.includes('пицунд') ||
                searchLower.includes('гудаут') ||
                searchLower.includes('очамчыр') ||
                searchLower.includes('гал');
            
            currentLocation = {
                name: location.name,
                country: isAbkhazia ? 'Абхазия' : location.country,
                lat: location.lat,
                lon: location.lon
            };
            
            fetchWeatherData(currentLocation.lat, currentLocation.lon);
        } else {
            showLoadingState(false);
            showNotification('Местоположение не найдено. Пожалуйста, попробуйте снова.');
        }
    } catch (error) {
        console.error('Ошибка при поиске местоположения:', error);
        showLoadingState(false);
        showNotification('Ошибка при поиске местоположения. Пожалуйста, попробуйте снова.');
    }
}

// Показ уведомлений
function showNotification(message) {
    // Удаляем предыдущее уведомление, если оно есть
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        document.body.removeChild(existingNotification);
    }
    
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Инициализация карты с достопримечательностями
function initMap() {
    // Проверяем, загружено ли API Яндекс Карт
    if (typeof ymaps !== 'undefined') {
        ymaps.ready(function() {
            var map = new ymaps.Map('attractions-map-container', {
                center: [43.0015, 41.0235], // Координаты Сухума
                zoom: 9,
                controls: ['zoomControl', 'typeSelector', 'fullscreenControl']
            });
            
            // Добавляем достопримечательности на карту
            var attractions = [
                {
                    coords: [43.0971, 40.8237],
                    name: 'Новоафонская пещера',
                    description: 'Одна из крупнейших пещер в мире'
                },
                {
                    coords: [43.2812, 40.2750],
                    name: 'Пляжи Гагры',
                    description: 'Знаменитые пляжи с кристально чистой водой'
                },
                {
                    coords: [43.1611, 40.3434],
                    name: 'Пицунда',
                    description: 'Известный курорт с красивыми пляжами'
                },
                {
                    coords: [43.4789, 40.5382],
                    name: 'Озеро Рица',
                    description: 'Живописное горное озеро'
                },
                {
                    coords: [43.0053, 41.0230],
                    name: 'Сухумский ботанический сад',
                    description: 'Один из старейших ботанических садов'
                }
            ];
            
            attractions.forEach(function(attraction) {
                var placemark = new ymaps.Placemark(attraction.coords, {
                    hintContent: attraction.name,
                    balloonContent: `<h3>${attraction.name}</h3><p>${attraction.description}</p>`
                }, {
                    preset: 'islands#blueCircleDotIconWithCaption',
                    iconCaptionMaxWidth: '200'
                });
                
                map.geoObjects.add(placemark);
            });
        });
    } else {
        console.log('Яндекс Карты API не загружено');
        // Если API недоступно, скрываем раздел карты
        const mapContainer = document.querySelector('.attractions-map');
        if (mapContainer) {
            mapContainer.style.display = 'none';
        }
    }
}

// Инициализация графиков климата
function initClimateCharts() {
    // Проверяем, загружен ли Chart.js
    if (typeof Chart !== 'undefined') {
        // Данные для графика температуры
        const tempCtx = document.getElementById('temperature-chart');
        if (tempCtx) {
            new Chart(tempCtx, {
                type: 'line',
                data: {
                    labels: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
                    datasets: [{
                        label: 'Средняя температура (°C)',
                        data: [9, 10, 12, 16, 20, 24, 26, 26, 23, 19, 15, 11],
                        fill: false,
                        borderColor: '#2a6898',
                        tension: 0.1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'top',
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: false
                        }
                    }
                }
            });
        }
        
        // Данные для графика осадков
        const precipCtx = document.getElementById('precipitation-chart');
        if (precipCtx) {
            new Chart(precipCtx, {
                type: 'bar',
                data: {
                    labels: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
                    datasets: [{
                        label: 'Осадки (мм)',
                        data: [150, 130, 120, 110, 90, 100, 110, 120, 140, 160, 180, 170],
                        backgroundColor: '#5da860',
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'top',
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }
    } else {
        console.log('Chart.js не загружен');
        // Если Chart.js недоступен, скрываем раздел с графиками
        const chartsContainer = document.querySelector('.climate-charts');
        if (chartsContainer) {
            chartsContainer.style.display = 'none';
        }
    }
}

// Обработка формы контактов
if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const message = document.getElementById('message').value;
        
        // Симуляция отправки данных на сервер
        console.log(`Отправка данных: Имя - ${name}, Email - ${email}, Сообщение - ${message}`);
        
        // Отображение уведомления об успешной отправке
        showNotification('Ваше сообщение успешно отправлено!');
        
        // Очистка формы
        contactForm.reset();
    });
}

// Запасные данные, если API не работает
function useFallbackData() {
    // Текущая погода (запасные данные)
    const currentFallback = {
        name: currentLocation.name,
        sys: { 
            country: currentLocation.country,
            sunrise: Math.floor(Date.now() / 1000) - 10800, // 3 часа назад
            sunset: Math.floor(Date.now() / 1000) + 10800   // 3 часа вперед
        },
        main: {
            temp: 25,
            humidity: 68,
            pressure: 1014
        },
        weather: [
            { description: 'переменная облачность', icon: '02d' }
        ],
        wind: { speed: 3.5 }
    };
    
    // Прогноз погоды (запасные данные)
    const forecastFallback = {
        list: [
            {
                dt: Math.floor(Date.now() / 1000) + 86400,
                main: { temp_max: 27, temp_min: 21 },
                weather: [{ icon: '01d' }]
            },
            {
                dt: Math.floor(Date.now() / 1000) + 172800,
                main: { temp_max: 29, temp_min: 22 },
                weather: [{ icon: '02d' }]
            },
            {
                dt: Math.floor(Date.now() / 1000) + 259200,
                main: { temp_max: 28, temp_min: 23 },
                weather: [{ icon: '10d' }]
            },
            {
                dt: Math.floor(Date.now() / 1000) + 345600,
                main: { temp_max: 25, temp_min: 20 },
                weather: [{ icon: '10d' }]
            },
            {
                dt: Math.floor(Date.now() / 1000) + 432000,
                main: { temp_max: 24, temp_min: 19 },
                weather: [{ icon: '03d' }]
            },
            {
                dt: Math.floor(Date.now() / 1000) + 518400,
                main: { temp_max: 26, temp_min: 21 },
                weather: [{ icon: '01d' }]
            },
            {
                dt: Math.floor(Date.now() / 1000) + 604800,
                main: { temp_max: 25, temp_min: 20 },
                weather: [{ icon: '02d' }]
            }
        ]
    };
    
    // Создаем запасные данные для почасового прогноза
    const hourlyFallbackList = [];
    for (let i = 0; i < 8; i++) {
        const hourOffset = i * 3; // Каждые 3 часа
        const currentTime = new Date();
        currentTime.setHours(currentTime.getHours() + hourOffset);
        
        hourlyFallbackList.push({
            dt: Math.floor(currentTime.getTime() / 1000),
            main: { temp: Math.round(22 + Math.sin(i / 2) * 3) }, // Синусоида для температуры
            weather: [{ icon: i % 2 === 0 ? '01d' : '02d' }]
        });
    }
    
    const hourlyForecastFallback = { list: hourlyFallbackList };
    
    updateCurrentWeather(currentFallback);
    updateForecast(forecastFallback);
    updateHourlyForecast(hourlyForecastFallback);
}

// Плавная прокрутка для навигационных ссылок
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        
        const targetId = this.getAttribute('href');
        const targetElement = document.querySelector(targetId);
        
        if (targetElement) {
            window.scrollTo({
                top: targetElement.offsetTop - 80, // Корректировка для шапки
                behavior: 'smooth'
            });
        }
    });
});

// Предотвращение зума при двойном тапе на мобильных устройствах
document.addEventListener('dblclick', function(e) {
    e.preventDefault();
});

// Добавляем стили для анимации загрузки
const loadingStyle = document.createElement('style');
loadingStyle.textContent = `
    .loading {
        position: relative;
        color: transparent !important;
    }
    
    .loading::after {
        content: '';
        position: absolute;
        left: 0;
        right: 0;
        top: 0;
        bottom: 0;
        background: linear-gradient(90deg, var(--card-bg), var(--hover-color), var(--card-bg));
        background-size: 200% 100%;
        border-radius: 5px;
        animation: loadingAnimation 1.5s infinite;
    }
    
    @keyframes loadingAnimation {
        0% { background-position: 100% 0; }
        100% { background-position: -100% 0; }
    }
`;
document.head.appendChild(loadingStyle);

// Инициализация приложения при загрузке страницы
window.addEventListener('load', initApp);

// Добавляем индикаторы прокрутки для прогноза
if (forecastContainer) {
    const scrollIndicator = document.createElement('div');
    scrollIndicator.className = 'scroll-indicator';
    scrollIndicator.innerHTML = '<i class="fas fa-chevron-right"></i>';
    forecastContainer.parentNode.insertBefore(scrollIndicator, forecastContainer.nextSibling);
    
    // Скрываем индикатор, если прокрутка не нужна или пользователь уже прокрутил
    forecastContainer.addEventListener('scroll', function() {
        const isScrollable = this.scrollWidth > this.clientWidth;
        const isScrolledToEnd = this.scrollLeft + this.clientWidth >= this.scrollWidth - 50;
        
        if (!isScrollable || isScrolledToEnd) {
            scrollIndicator.style.display = 'none';
        }
    });
}

if (hourlyForecastContainer) {
    const hourlyScrollIndicator = document.createElement('div');
    hourlyScrollIndicator.className = 'scroll-indicator';
    hourlyScrollIndicator.innerHTML = '<i class="fas fa-chevron-right"></i>';
    hourlyForecastContainer.parentNode.insertBefore(hourlyScrollIndicator, hourlyForecastContainer.nextSibling);
    
    // Скрываем индикатор, если прокрутка не нужна или пользователь уже прокрутил
    hourlyForecastContainer.addEventListener('scroll', function() {
        const isScrollable = this.scrollWidth > this.clientWidth;
        const isScrolledToEnd = this.scrollLeft + this.clientWidth >= this.scrollWidth - 50;
        
        if (!isScrollable || isScrolledToEnd) {
            hourlyScrollIndicator.style.display = 'none';
        }
    });
} 