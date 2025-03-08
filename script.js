// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAAdu7bWt9F2GF1W9qEzfc2f_y6LCqMM14",
    authDomain: "strintox-3a2b8.firebaseapp.com",
    projectId: "strintox-3a2b8",
    storageBucket: "strintox-3a2b8.firebasebasestorage.app",
    messagingSenderId: "12688530154",
    appId: "1:12688530154:web:da86782e5c3261c6c35593",
    measurementId: "G-WVB4V2T51Y"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const analytics = firebase.analytics();
const auth = firebase.auth();
const db = firebase.firestore();

// Enable timestamps
db.settings({ timestampsInSnapshots: true });

// DOM Elements
// Auth elements
const authContainer = document.getElementById('auth-container');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginTab = document.getElementById('login-tab');
const registerTab = document.getElementById('register-tab');
const tabBtns = document.querySelectorAll('.tab-btn');
const authError = document.getElementById('auth-error');

// Chat elements
const chatContainer = document.getElementById('chat-container');
const sidebarElement = document.getElementById('sidebar');
const logoutBtn = document.getElementById('logout-btn');
const userNameElement = document.getElementById('user-name');
const chatListElement = document.getElementById('chat-list');
const newChatBtn = document.getElementById('new-chat-btn');
const newChatModal = document.getElementById('new-chat-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const newChatEmail = document.getElementById('new-chat-email');
const newChatUsername = document.getElementById('new-chat-username');
const startChatBtn = document.getElementById('start-chat-btn');
const newChatError = document.getElementById('new-chat-error');
const emptyChat = document.getElementById('empty-chat');
const activeChat = document.getElementById('active-chat');
const chatName = document.getElementById('chat-name');
const messagesContainer = document.getElementById('messages-container');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const searchInput = document.getElementById('search-input');
const menuToggle = document.getElementById('menu-toggle');

// Search by username/email options
const searchByUsername = document.getElementById('search-by-username');
const searchByEmail = document.getElementById('search-by-email');
const usernameSearch = document.getElementById('username-search');
const emailSearch = document.getElementById('email-search');

// Mobile detection and support
const isMobile = window.innerWidth <= 768;
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
const isAndroid = /Android/.test(navigator.userAgent);

// For responsive design
let windowWidth = window.innerWidth;

// If iOS, add specific class for iOS-specific styling
if (isIOS) {
    document.body.classList.add('ios-device');
} else if (isAndroid) {
    document.body.classList.add('android-device');
}

// Current user and active chat info
let currentUser = null;
let activeChatId = null;
let chatsListener = null;
let messagesListener = null;
let currentSearchMethod = 'username'; // Default search method
let typingTimeout = null;
let isTyping = false;

// Mobile menu toggle
if (menuToggle) {
    menuToggle.addEventListener('click', () => {
        sidebarElement.classList.toggle('show');
    });
}

// Close sidebar when a chat is opened on mobile
function hideSidebarOnMobile() {
    if (window.innerWidth <= 768) {
        sidebarElement.classList.remove('show');
        
        // Fix for iOS scrolling
        setTimeout(() => {
            window.scrollTo(0, 0);
            
            // Fix for mobile layout
            if (messagesContainer) {
                scrollToBottom();
            }
        }, 100);
    }
}

// Fix for double tap issues on iOS
if (isIOS || isAndroid) {
    document.addEventListener('touchstart', function() {}, {passive: true});
}

// ===== Authentication functions =====

// Switch between login and register tabs
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const tabId = btn.getAttribute('data-tab');
        
        // Remove active class from all tabs and buttons
        tabBtns.forEach(b => b.classList.remove('active'));
        loginTab.classList.remove('active');
        registerTab.classList.remove('active');
        
        // Add active class to selected tab and button
        btn.classList.add('active');
        if (tabId === 'login') {
            loginTab.classList.add('active');
        } else {
            registerTab.classList.add('active');
        }
        
        // Clear error message
        authError.textContent = '';
    });
});

// Check if username is already taken
async function isUsernameTaken(username) {
    const usersRef = db.collection('users');
    const query = usersRef.where('name', '==', username);
    const snapshot = await query.get();
    return !snapshot.empty;
}

// User registration
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    
    if (!name) {
        showAuthError('Введите имя пользователя');
        return;
    }
    
    try {
        authError.textContent = '';
        
        // Check if username is already taken
        const usernameTaken = await isUsernameTaken(name);
        if (usernameTaken) {
            showAuthError('Этот никнейм уже занят, выберите другой');
            return;
        }
        
        // Create user with email and password
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        
        // Add user to Firestore with display name
        await db.collection('users').doc(userCredential.user.uid).set({
            name: name,
            email: email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Clear form
        registerForm.reset();
    } catch (error) {
        handleAuthError(error);
    }
});

// User login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    
    try {
        authError.textContent = '';
        await auth.signInWithEmailAndPassword(email, password);
        
        // Clear form
        loginForm.reset();
    } catch (error) {
        handleAuthError(error);
    }
});

// Handle authentication errors
function handleAuthError(error) {
    let errorMessage = 'Произошла ошибка. Попробуйте снова.';
    
    if (error.code === 'auth/weak-password') {
        errorMessage = 'Пароль должен содержать не менее 6 символов';
    } else if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Пользователь с таким email уже существует';
    } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Неверный формат email';
    } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = 'Неверный email или пароль';
    }
    
    showAuthError(errorMessage);
}

// Display authentication error
function showAuthError(message) {
    authError.textContent = message;
}

// Listen for authentication state changes
auth.onAuthStateChanged(async (user) => {
    if (user) {
        // User is signed in
        currentUser = user;
        
        // Get user's display name from Firestore
        try {
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                userNameElement.textContent = userData.name;
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
        }
        
        // Show chat UI, hide auth UI
        authContainer.classList.add('hidden');
        chatContainer.classList.remove('hidden');
        
        // Set up initial sidebar state for mobile
        if (window.innerWidth <= 768) {
            sidebarElement.classList.remove('show');
        }
        
        // Load user's chats
        loadChats();
        
        // Check for incoming calls immediately on login
        setTimeout(() => {
            checkForIncomingCalls();
        }, 1000);
    } else {
        // User is signed out
        currentUser = null;
        
        // Show auth UI, hide chat UI
        authContainer.classList.remove('hidden');
        chatContainer.classList.add('hidden');
        
        // Clear active chat
        clearActiveChat();
        
        // Unsubscribe from listeners
        if (chatsListener) chatsListener();
        if (messagesListener) messagesListener();
    }
});

// User logout
logoutBtn.addEventListener('click', async () => {
    try {
        await auth.signOut();
    } catch (error) {
        console.error('Error signing out:', error);
    }
});

// ===== Chat functions =====

// Load user's chats
function loadChats() {
    // Clear previous listener
    if (chatsListener) chatsListener();
    
    // Set loading state
    chatListElement.innerHTML = '<div class="empty-state">Загрузка чатов...</div>';
    
    // Try to get all chats where user is a participant
    try {
        // Query chats where current user is a participant
        const chatsQuery = db.collection('chats')
            .where('participants', 'array-contains', currentUser.uid);
            
        // Listen for real-time updates
        chatsListener = chatsQuery.onSnapshot(async (snapshot) => {
            // Clear chat list
            chatListElement.innerHTML = '';
            
            // Debug info
            console.log('Chats query returned:', snapshot.size, 'results');
            
            if (snapshot.empty) {
                chatListElement.innerHTML = '<div class="empty-state">У вас пока нет чатов</div>';
                return;
            }
            
            // Create an array of chat docs to sort them manually
            const chats = [];
            
            // Process each chat
            for (const chatDoc of snapshot.docs) {
                try {
                    const chatData = chatDoc.data();
                    
                    // Skip invalid chats
                    if (!chatData.participants || !Array.isArray(chatData.participants)) {
                        console.error('Invalid chat data (missing participants):', chatDoc.id);
                        continue;
                    }
                    
                    // Find the other participant
                    const otherParticipantId = chatData.participants.find(id => id !== currentUser.uid);
                    
                    if (!otherParticipantId) {
                        console.error('Could not find other participant in chat:', chatDoc.id);
                        continue;
                    }
                    
                    // Add to chats array with timestamp for sorting
                    chats.push({
                        id: chatDoc.id,
                        data: chatData,
                        otherParticipantId: otherParticipantId,
                        timestamp: chatData.updatedAt || chatData.createdAt || {seconds: 0}
                    });
                } catch (error) {
                    console.error('Error processing chat:', chatDoc.id, error);
                }
            }
            
            // Sort chats by timestamp (newest first)
            chats.sort((a, b) => {
                const timestampA = a.timestamp?.seconds || 0;
                const timestampB = b.timestamp?.seconds || 0;
                return timestampB - timestampA;
            });
            
            // Display each chat
            for (const chat of chats) {
                try {
                    const chatData = chat.data;
                    const chatId = chat.id;
                    const otherParticipantId = chat.otherParticipantId;
                    
                    let userData;
                    let otherUserName;
                    
                    // First try to get name from participantNames for faster rendering
                    if (chatData.participantNames && chatData.participantNames[otherParticipantId]) {
                        otherUserName = chatData.participantNames[otherParticipantId];
                        userData = { name: otherUserName };
                    } else {
                        // Fallback to getting user from database
                        const userDoc = await db.collection('users').doc(otherParticipantId).get();
                        if (userDoc.exists) {
                            userData = userDoc.data();
                            otherUserName = userData.name;
                            
                            // Update participantNames for future reference
                            const updateData = {
                                [`participantNames.${otherParticipantId}`]: otherUserName,
                                [`participantNames.${currentUser.uid}`]: userNameElement.textContent
                            };
                            
                            db.collection('chats').doc(chatId).update(updateData).catch(err => {
                                console.error('Error updating participant names:', err);
                            });
                        } else {
                            otherUserName = 'Неизвестный пользователь';
                        }
                    }
                    
                    // Get unread count with fallback for older chat formats
                    const unreadCount = (chatData.unreadBy && chatData.unreadBy[currentUser.uid]) 
                        ? chatData.unreadBy[currentUser.uid] 
                        : 0;
                    
                    // Create chat item element
                    const chatItem = document.createElement('div');
                    chatItem.className = 'chat-item';
                    chatItem.dataset.chatId = chatId;
                    
                    // Make chat item active if it's the current active chat
                    if (chatId === activeChatId) {
                        chatItem.classList.add('active');
                    }
                    
                    // Add unread indicator if there are unread messages
                    const unreadBadge = unreadCount > 0 ? 
                        `<div class="unread-badge">${unreadCount}</div>` : '';
                    
                    // Format last message with a sensible fallback
                    const lastMessage = chatData.lastMessage || 'Нет сообщений';
                    
                    chatItem.innerHTML = `
                        <div class="avatar">
                            <i class="fas fa-user"></i>
                        </div>
                        <div class="chat-item-info">
                            <div class="chat-item-name">${otherUserName}</div>
                            <div class="chat-item-last-message">${lastMessage}</div>
                        </div>
                        ${unreadBadge}
                    `;
                    
                    // Add click event to open chat - fixed for mobile
                    chatItem.addEventListener('click', (event) => {
                        // Ensure the event doesn't get cancelled
                        event.stopPropagation();
                        openChat(chatId, otherUserName);
                        
                        // Hide sidebar on mobile after selecting a chat
                        hideSidebarOnMobile();
                    });
                    
                    chatListElement.appendChild(chatItem);
                } catch (error) {
                    console.error('Error displaying chat:', chat.id, error);
                }
            }
            
            // If still empty after processing (due to errors)
            if (chatListElement.children.length === 0) {
                chatListElement.innerHTML = '<div class="empty-state">Не удалось загрузить чаты</div>';
            }
        }, error => {
            console.error('Error in chats listener:', error);
            chatListElement.innerHTML = `<div class="empty-state error">Ошибка загрузки чатов: ${error.message}</div>`;
            
            // If the error is about missing indexes, provide a helpful message
            if (error.message && error.message.includes('index')) {
                console.warn('Firebase index error detected. This might need a new composite index.');
                // Try fallback without orderBy
                loadChatsWithoutOrder();
            }
        });
    } catch (error) {
        console.error('Error setting up chats query:', error);
        chatListElement.innerHTML = `<div class="empty-state error">Ошибка: ${error.message}</div>`;
    }
    
    // Also check for notifications
    checkForNotifications();
}

// Fallback method without order
function loadChatsWithoutOrder() {
    console.log('Attempting fallback chat loading method...');
    
    try {
        // Simple query without ordering
        const simpleQuery = db.collection('chats')
            .where('participants', 'array-contains', currentUser.uid);
            
        simpleQuery.onSnapshot(snapshot => {
            console.log('Fallback query returned:', snapshot.size, 'results');
            
            if (snapshot.empty) {
                chatListElement.innerHTML = '<div class="empty-state">У вас пока нет чатов</div>';
                return;
            }
            
            // We'll manually sort the chats after getting them
            const chats = [];
            
            snapshot.forEach(doc => {
                const data = doc.data();
                chats.push({
                    id: doc.id, 
                    data: data,
                    timestamp: data.updatedAt || data.createdAt || {seconds: 0}
                });
            });
            
            // Sort manually by timestamp
            chats.sort((a, b) => {
                const timeA = a.timestamp?.seconds || 0;
                const timeB = b.timestamp?.seconds || 0;
                return timeB - timeA;
            });
            
            // Just show a simplified list for now
            chatListElement.innerHTML = '';
            
            chats.forEach(async (chat) => {
                try {
                    const otherParticipantId = chat.data.participants.find(id => id !== currentUser.uid);
                    
                    if (!otherParticipantId) return;
                    
                    let otherUserName = 'Пользователь';
                    
                    // Try to get name from participantNames first
                    if (chat.data.participantNames && chat.data.participantNames[otherParticipantId]) {
                        otherUserName = chat.data.participantNames[otherParticipantId];
                    } else {
                        try {
                            const userDoc = await db.collection('users').doc(otherParticipantId).get();
                            if (userDoc.exists) {
                                otherUserName = userDoc.data().name;
                            }
                        } catch (e) {
                            console.error('Error getting user info:', e);
                        }
                    }
                    
                    const chatItem = document.createElement('div');
                    chatItem.className = 'chat-item';
                    chatItem.dataset.chatId = chat.id;
                    
                    chatItem.innerHTML = `
                        <div class="avatar">
                            <i class="fas fa-user"></i>
                        </div>
                        <div class="chat-item-info">
                            <div class="chat-item-name">${otherUserName}</div>
                            <div class="chat-item-last-message">${chat.data.lastMessage || 'Нет сообщений'}</div>
                        </div>
                    `;
                    
                    // Fixed for mobile: ensure propagation and add touchstart event
                    chatItem.addEventListener('click', (event) => {
                        event.stopPropagation();
                        openChat(chat.id, otherUserName);
                        hideSidebarOnMobile();
                    });
                    
                    // Add touchend event for mobile
                    chatItem.addEventListener('touchend', (event) => {
                        event.stopPropagation();
                        openChat(chat.id, otherUserName);
                        hideSidebarOnMobile();
                    });
                    
                    chatListElement.appendChild(chatItem);
                } catch (error) {
                    console.error('Error rendering fallback chat item:', error);
                }
            });
        }, error => {
            console.error('Even fallback query failed:', error);
            chatListElement.innerHTML = '<div class="empty-state error">Не удалось загрузить чаты</div>';
        });
    } catch (error) {
        console.error('Error in fallback query:', error);
    }
}

// Check for new notifications
function checkForNotifications() {
    db.collection('notifications')
        .where('userId', '==', currentUser.uid)
        .where('read', '==', false)
        .orderBy('timestamp', 'desc')
        .limit(10)
        .onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const notification = change.doc.data();
                    
                    // Handle new chat notification
                    if (notification.type === 'new_chat' && notification.chatId) {
                        // Mark notification as read
                        db.collection('notifications').doc(change.doc.id).update({
                            read: true
                        }).catch(err => console.error('Error updating notification:', err));
                        
                        // Force refresh chats list
                        loadChats();
                    }
                }
            });
        }, error => {
            console.error('Error getting notifications:', error);
        });
}

// Open chat - Fixed for mobile
function openChat(chatId, participantName) {
    console.log('Opening chat:', chatId, participantName);
    
    // Set active chat ID
    activeChatId = chatId;
    
    // Update UI
    document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.chatId === chatId) {
            item.classList.add('active');
            
            // Remove unread badge if exists
            const unreadBadge = item.querySelector('.unread-badge');
            if (unreadBadge) {
                unreadBadge.remove();
            }
        }
    });
    
    // Show active chat, hide empty state
    emptyChat.classList.add('hidden');
    activeChat.classList.remove('hidden');
    
    // Set chat name
    chatName.textContent = participantName;
    
    // Clear messages container
    messagesContainer.innerHTML = '';
    
    // Load messages
    loadMessages(chatId);
    
    // Mark messages as read
    markChatAsRead(chatId);
    
    // On mobile, show the chat area (it might be hidden by the sidebar)
    if (window.innerWidth <= 768) {
        // Hide the sidebar after selecting a chat
        sidebarElement.classList.remove('show');
    }
}

// Mark chat as read
async function markChatAsRead(chatId) {
    try {
        await db.collection('chats').doc(chatId).update({
            [`unreadBy.${currentUser.uid}`]: 0
        });
    } catch (error) {
        console.error('Error marking chat as read:', error);
    }
}

// Load messages for the active chat
function loadMessages(chatId) {
    // Clear previous listener
    if (messagesListener) messagesListener();
    
    // First check if the chat document exists and has necessary fields
    db.collection('chats').doc(chatId).get().then(doc => {
        if (!doc.exists) {
            console.error('Chat document does not exist');
            return;
        }
        
        // Ensure the chat has necessary fields
        const updateData = {};
        const data = doc.data();
        
        if (!data.hasOwnProperty('lastMessage')) {
            updateData.lastMessage = '';
        }
        
        if (!data.hasOwnProperty('messageCount')) {
            updateData.messageCount = 0;
        }
        
        if (Object.keys(updateData).length > 0) {
            updateData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
            db.collection('chats').doc(chatId).update(updateData);
        }
    }).catch(error => {
        console.error('Error checking chat document:', error);
    });
    
    // Show loading indicator
    messagesContainer.innerHTML = '<div class="message message-system"><div class="message-text">Загрузка сообщений...</div></div>';
    
    // Query messages for the chat
    const messagesQuery = db.collection('chats').doc(chatId).collection('messages')
        .orderBy('timestamp', 'asc');
    
    // Listen for real-time updates
    messagesListener = messagesQuery.onSnapshot((snapshot) => {
        // Clear loading message if it exists
        if (messagesContainer.firstChild && messagesContainer.firstChild.textContent.includes('Загрузка сообщений')) {
            messagesContainer.innerHTML = '';
        }
        
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
                const messageData = change.doc.data();
                displayMessage(messageData);
            }
        });
        
        // Scroll to bottom
        scrollToBottom();
    }, error => {
        console.error('Error in messages listener:', error);
        messagesContainer.innerHTML = '<div class="message message-system error"><div class="message-text">Ошибка загрузки сообщений</div></div>';
    });
    
    // Listen for typing status changes
    const typingListener = listenForTypingStatus(chatId);
    
    // Add typing listener to messagesListener for cleanup
    const originalMessagesListener = messagesListener;
    messagesListener = () => {
        if (originalMessagesListener) originalMessagesListener();
        typingListener();
    };
}

// Display a message in the chat
function displayMessage(messageData) {
    const messageElement = document.createElement('div');
    
    // Handle different message types
    if (messageData.senderId === 'system' || messageData.type === 'system') {
        messageElement.className = 'message message-system';
        
        // Format timestamp
        let timeDisplay = '';
        if (messageData.timestamp) {
            const date = messageData.timestamp.toDate();
            timeDisplay = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        
        messageElement.innerHTML = `
            <div class="message-text">${messageData.content}</div>
            <div class="message-time">${timeDisplay}</div>
        `;
    } else if (messageData.type === 'voice') {
        // Handle voice message
        const isCurrentUser = messageData.senderId === currentUser.uid;
        messageElement.className = `message ${isCurrentUser ? 'message-sent' : 'message-received'}`;
        
        // Format timestamp
        let timeDisplay = '';
        if (messageData.timestamp) {
            const date = messageData.timestamp.toDate();
            timeDisplay = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        
        // Format duration
        const duration = messageData.duration || 0;
        const durationFormatted = formatDuration(duration);
        
        messageElement.innerHTML = `
            <div class="voice-message" data-audio-url="${messageData.audioUrl}" data-duration="${duration}">
                <div class="voice-message-play">
                    <i class="fas fa-play"></i>
                </div>
                <div class="voice-message-waveform">
                    <div class="voice-message-progress"></div>
                </div>
                <div class="voice-message-duration">${durationFormatted}</div>
            </div>
            <div class="message-time">${timeDisplay}</div>
        `;
        
        // Add click event to play voice message
        const playButton = messageElement.querySelector('.voice-message-play');
        playButton.addEventListener('click', () => {
            playVoiceMessage(messageElement, messageData.audioUrl);
        });
    } else {
        const isCurrentUser = messageData.senderId === currentUser.uid;
        messageElement.className = `message ${isCurrentUser ? 'message-sent' : 'message-received'}`;
        
        // Format timestamp
        let timeDisplay = '';
        if (messageData.timestamp) {
            const date = messageData.timestamp.toDate();
            timeDisplay = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        
        // Add status indicator for sent messages
        let statusIndicator = '';
        if (isCurrentUser && messageData.status) {
            let statusIcon = '';
            switch(messageData.status) {
                case 'sent':
                    statusIcon = '<i class="fas fa-check"></i>';
                    break;
                case 'delivered':
                    statusIcon = '<i class="fas fa-check-double"></i>';
                    break;
                case 'read':
                    statusIcon = '<i class="fas fa-check-double" style="color: var(--primary-light);"></i>';
                    break;
            }
            statusIndicator = `<div class="message-status">${statusIcon}</div>`;
        }
        
        messageElement.innerHTML = `
            <div class="message-text">${messageData.content}</div>
            <div class="message-time">${timeDisplay}</div>
            ${statusIndicator}
        `;
    }
    
    // Add some animation delay for smoother appearance
    setTimeout(() => {
        messagesContainer.appendChild(messageElement);
        scrollToBottom();
    }, 10);
}

// Format seconds to MM:SS
function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Play voice message - completely optimized for mobile
function playVoiceMessage(messageElement, audioUrl) {
    try {
        // Stop currently playing audio if exists
        if (currentAudio) {
            currentAudio.pause();
            const previousPlayButton = document.querySelector('.voice-message-play.playing');
            if (previousPlayButton) {
                previousPlayButton.innerHTML = '<i class="fas fa-play"></i>';
                previousPlayButton.classList.remove('playing');
            }
            
            const previousWaveform = document.querySelector('.voice-message-waveform.playing');
            if (previousWaveform) {
                previousWaveform.classList.remove('playing');
            }
        }
        
        const playButton = messageElement.querySelector('.voice-message-play');
        const progressBar = messageElement.querySelector('.voice-message-progress');
        const waveform = messageElement.querySelector('.voice-message-waveform');
        const voiceMessage = messageElement.querySelector('.voice-message');
        const duration = parseFloat(voiceMessage.dataset.duration);
        
        // Create audio element
        const audio = new Audio();
        
        // Preload audio for mobile
        audio.preload = 'auto';
        
        // Fix for some browsers that need to set src after creating the element
        audio.src = audioUrl;
        
        // Force load for reliability
        audio.load();
        
        currentAudio = audio;
        
        // Add play/pause toggle with better mobile handling
        if (playButton.classList.contains('playing')) {
            audio.pause();
            playButton.innerHTML = '<i class="fas fa-play"></i>';
            playButton.classList.remove('playing');
            waveform.classList.remove('playing');
        } else {
            // Mobile-optimized play with timeout fallback
            const playAttempt = setTimeout(() => {
                // If playback didn't start after 1 second, show error
                if (!audio.paused && audio.currentTime === 0) {
                    alert('Воспроизведение не удалось. Пожалуйста, попробуйте еще раз.');
                    playButton.innerHTML = '<i class="fas fa-play"></i>';
                    playButton.classList.remove('playing');
                }
            }, 1000);
            
            // Show loading indicator
            playButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            
            // Play the audio with a promise to handle mobile restrictions
            const playPromise = audio.play();
            
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    // Playback started successfully
                    clearTimeout(playAttempt); // Clear timeout
                    
                    playButton.innerHTML = '<i class="fas fa-pause"></i>';
                    playButton.classList.add('playing');
                    waveform.classList.add('playing');
                    
                    // Fix iOS volume
                    if (isIOS) {
                        audio.volume = 1.0;
                    }
                    
                    // Update progress bar
                    audio.addEventListener('timeupdate', () => {
                        const progress = (audio.currentTime / duration) * 100;
                        progressBar.style.width = `${progress}%`;
                    });
                    
                    // Reset when ended
                    audio.addEventListener('ended', () => {
                        playButton.innerHTML = '<i class="fas fa-play"></i>';
                        playButton.classList.remove('playing');
                        waveform.classList.remove('playing');
                        progressBar.style.width = '0%';
                        currentAudio = null;
                    });
                }).catch(error => {
                    // Playback failed - handle better for mobile
                    clearTimeout(playAttempt); // Clear timeout
                    console.error('Audio playback failed:', error);
                    
                    // Mobile-friendly error
                    playButton.innerHTML = '<i class="fas fa-exclamation"></i>';
                    setTimeout(() => {
                        playButton.innerHTML = '<i class="fas fa-play"></i>';
                    }, 1000);
                    
                    if (isIOS && !document.body.classList.contains('user-interaction')) {
                        // iOS requires user interaction
                        alert('Для воспроизведения аудио на iOS нужно сначала коснуться экрана');
                        document.body.addEventListener('touchstart', function addInteraction() {
                            document.body.classList.add('user-interaction');
                            document.body.removeEventListener('touchstart', addInteraction);
                        });
                    }
                });
            }
        }
    } catch (error) {
        console.error('Error playing voice message:', error);
        alert('Ошибка воспроизведения аудио');
    }
}

// Send message
messageForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const message = messageInput.value.trim();
    
    if (!message || !activeChatId) return;
    
    // Clear input immediately for better UX
    messageInput.value = '';
    
    // Focus the input field again for better mobile experience
    if (!isMobile) {
        messageInput.focus();
    }
    
    try {
        // Stop typing indicator when message is sent
        stopTypingIndicator();
        
        const timestamp = firebase.firestore.FieldValue.serverTimestamp();
        
        // Get chat data to determine recipient
        const chatDoc = await db.collection('chats').doc(activeChatId).get();
        if (!chatDoc.exists) {
            throw new Error('Chat does not exist');
        }
        
        const chatData = chatDoc.data();
        const recipientId = chatData.participants.find(id => id !== currentUser.uid);
        
        // Increment unread count for recipient
        const updateData = {
            lastMessage: message,
            updatedAt: timestamp,
            messageCount: firebase.firestore.FieldValue.increment(1),
            lastMessageBy: currentUser.uid
        };
        
        // Use dot notation for nested update
        updateData[`unreadBy.${recipientId}`] = firebase.firestore.FieldValue.increment(1);
        
        // Add message to Firestore
        await db.collection('chats').doc(activeChatId).collection('messages').add({
            content: message,
            senderId: currentUser.uid,
            timestamp: timestamp,
            status: 'sent'
        });
        
        // Update chat's last message and increment message count
        await db.collection('chats').doc(activeChatId).update(updateData);
        
        // Create notification for the recipient
        await db.collection('notifications').add({
            type: 'new_message',
            chatId: activeChatId,
            userId: recipientId,
            fromUserId: currentUser.uid,
            fromUserName: userNameElement.textContent,
            message: message.length > 30 ? message.substring(0, 30) + '...' : message,
            timestamp: timestamp,
            read: false
        });
        
    } catch (error) {
        console.error('Error sending message:', error);
        // Show error to user
        const errorElement = document.createElement('div');
        errorElement.className = 'message message-error';
        errorElement.textContent = 'Ошибка отправки сообщения. Попробуйте еще раз.';
        messagesContainer.appendChild(errorElement);
        setTimeout(() => {
            errorElement.remove();
        }, 3000);
    }
});

// Scroll messages container to bottom - improved version
function scrollToBottom() {
    // Use RAF for smoother scrolling
    requestAnimationFrame(() => {
        if (messagesContainer) {
            const maxScroll = messagesContainer.scrollHeight - messagesContainer.clientHeight;
            messagesContainer.scrollTo({
                top: maxScroll,
                behavior: 'smooth'
            });
            
            // Additional timeout for reliability
            setTimeout(() => {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }, 50);
        }
    });
}

// Clear active chat
function clearActiveChat() {
    activeChatId = null;
    emptyChat.classList.remove('hidden');
    activeChat.classList.add('hidden');
    messagesContainer.innerHTML = '';
    stopTypingIndicator();
}

// ===== New Chat Modal =====

// Toggle search methods
searchByUsername.addEventListener('click', () => {
    searchByUsername.classList.add('active');
    searchByEmail.classList.remove('active');
    usernameSearch.classList.remove('hidden');
    emailSearch.classList.add('hidden');
    currentSearchMethod = 'username';
    newChatError.textContent = '';
});

searchByEmail.addEventListener('click', () => {
    searchByEmail.classList.add('active');
    searchByUsername.classList.remove('active');
    emailSearch.classList.remove('hidden');
    usernameSearch.classList.add('hidden');
    currentSearchMethod = 'email';
    newChatError.textContent = '';
});

// Open new chat modal
newChatBtn.addEventListener('click', () => {
    newChatModal.classList.remove('hidden');
    newChatEmail.value = '';
    newChatUsername.value = '';
    newChatError.textContent = '';
});

// Close new chat modal
closeModalBtn.addEventListener('click', () => {
    newChatModal.classList.add('hidden');
});

// Start new chat
startChatBtn.addEventListener('click', async () => {
    // Disable button to prevent multiple clicks
    startChatBtn.disabled = true;
    startChatBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Создание чата...';
    newChatError.textContent = '';
    
    let searchQuery;
    let searchField;
    
    if (currentSearchMethod === 'username') {
        searchQuery = newChatUsername.value.trim();
        searchField = 'name';
    } else {
        searchQuery = newChatEmail.value.trim();
        searchField = 'email';
    }
    
    if (!searchQuery) {
        newChatError.textContent = currentSearchMethod === 'username' ? 
            'Введите ник пользователя' : 'Введите email пользователя';
        resetCreateChatButton();
        return;
    }
    
    try {
        // Check if user exists
        const usersSnapshot = await db.collection('users')
            .where(searchField, '==', searchQuery)
            .get();
        
        if (usersSnapshot.empty) {
            newChatError.textContent = currentSearchMethod === 'username' ? 
                'Пользователь с таким ником не найден' : 'Пользователь с таким email не найден';
            resetCreateChatButton();
            return;
        }
        
        // Get user data
        const userData = usersSnapshot.docs[0].data();
        const otherUserId = usersSnapshot.docs[0].id;
        
        // Check if it's not the current user
        if (otherUserId === currentUser.uid) {
            newChatError.textContent = 'Нельзя создать чат с самим собой';
            resetCreateChatButton();
            return;
        }
        
        // Get current user data for the chat
        const currentUserDoc = await db.collection('users').doc(currentUser.uid).get();
        
        if (!currentUserDoc.exists) {
            newChatError.textContent = 'Ошибка: не удалось получить данные пользователя';
            resetCreateChatButton();
            return;
        }
        
        const currentUserData = currentUserDoc.data();
        
        // Check if chat already exists
        const chatsSnapshot = await db.collection('chats')
            .where('participants', 'array-contains', currentUser.uid)
            .get();
        
        let existingChatId = null;
        
        chatsSnapshot.forEach((chatDoc) => {
            const chatData = chatDoc.data();
            if (chatData.participants && chatData.participants.includes(otherUserId)) {
                existingChatId = chatDoc.id;
            }
        });
        
        // If chat exists, open it
        if (existingChatId) {
            openChat(existingChatId, userData.name);
            newChatModal.classList.add('hidden');
            resetCreateChatButton();
            return;
        }
        
        // Create new chat with initial fields
        const timestamp = firebase.firestore.FieldValue.serverTimestamp();
        
        const chatData = {
            participants: [currentUser.uid, otherUserId],
            participantNames: {
                [currentUser.uid]: currentUserData.name,
                [otherUserId]: userData.name
            },
            createdAt: timestamp,
            updatedAt: timestamp,
            lastMessage: '',
            messageCount: 0,
            unreadBy: {
                [currentUser.uid]: 0,
                [otherUserId]: 0
            },
            lastMessageBy: currentUser.uid
        };
        
        // Create the chat document
        const newChatRef = await db.collection('chats').add(chatData);
        
        console.log('Created new chat with ID:', newChatRef.id);
        
        // Create initial system message to make chat visible to both users
        await db.collection('chats').doc(newChatRef.id).collection('messages').add({
            content: `Начало диалога с ${userData.name}`,
            senderId: 'system',
            timestamp: timestamp,
            status: 'delivered',
            type: 'system'
        });
        
        // Create notification for the recipient
        await db.collection('notifications').add({
            type: 'new_chat',
            chatId: newChatRef.id,
            userId: otherUserId,
            fromUserId: currentUser.uid,
            fromUserName: currentUserData.name,
            timestamp: timestamp,
            read: false
        });
        
        // Update the chat document again to ensure it has the latest timestamp
        await db.collection('chats').doc(newChatRef.id).update({
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Open new chat
        openChat(newChatRef.id, userData.name);
        
        // Close modal
        newChatModal.classList.add('hidden');
        resetCreateChatButton();
        
        // Force reload chat list
        setTimeout(() => {
            loadChats();
        }, 500);
        
    } catch (error) {
        console.error('Error creating chat:', error);
        newChatError.textContent = `Ошибка при создании чата: ${error.message}`;
        resetCreateChatButton();
    }
});

// Helper function to reset the create chat button
function resetCreateChatButton() {
    startChatBtn.disabled = false;
    startChatBtn.innerHTML = 'Начать чат';
}

// Search functionality
searchInput.addEventListener('input', () => {
    const searchTerm = searchInput.value.toLowerCase();
    const chatItems = document.querySelectorAll('.chat-item');
    
    chatItems.forEach(item => {
        const name = item.querySelector('.chat-item-name').textContent.toLowerCase();
        const lastMessage = item.querySelector('.chat-item-last-message').textContent.toLowerCase();
        
        if (name.includes(searchTerm) || lastMessage.includes(searchTerm)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
});

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === newChatModal) {
        newChatModal.classList.add('hidden');
    }
});

// Handle window resize with debounce
let resizeTimeout;
window.addEventListener('resize', () => {
    // Clear timeout if it exists
    if (resizeTimeout) clearTimeout(resizeTimeout);
    
    // Set new timeout
    resizeTimeout = setTimeout(() => {
        const newWidth = window.innerWidth;
        const wasMobile = windowWidth <= 768;
        const isMobileNow = newWidth <= 768;
        
        // Update stored width
        windowWidth = newWidth;
        
        // Handle transition between mobile and desktop
        if (wasMobile !== isMobileNow) {
            if (!isMobileNow && sidebarElement) {
                // Switching to desktop
                sidebarElement.classList.remove('show');
            }
        }
        
        // Always check scroll position
        if (activeChatId) {
            scrollToBottom();
        }
    }, 200); // 200ms debounce
});

// Show typing indicator in the chat
function showTypingIndicator() {
    // Remove existing indicator if present
    const existingIndicator = messagesContainer.querySelector('.typing-indicator-wrapper');
    if (existingIndicator) return;
    
    const wrapper = document.createElement('div');
    wrapper.className = 'message message-received typing-indicator-wrapper';
    wrapper.appendChild(typingIndicator.cloneNode(true));
    
    messagesContainer.appendChild(wrapper);
    scrollToBottom();
}

// Stop typing indicator
function stopTypingIndicator() {
    isTyping = false;
    if (typingTimeout) clearTimeout(typingTimeout);
    updateTypingStatus(false);
}

// Listen for typing status changes
function listenForTypingStatus(chatId) {
    return db.collection('chats').doc(chatId)
        .onSnapshot((doc) => {
            if (!doc.exists) return;
            
            const chatData = doc.data();
            
            // Check if someone else is typing
            if (chatData.typing) {
                // Find if any participant other than current user is typing
                const otherParticipantId = chatData.participants.find(id => id !== currentUser.uid);
                
                if (otherParticipantId && chatData.typing[otherParticipantId]) {
                    // Show typing indicator
                    showTypingIndicator();
                } else {
                    // Hide typing indicator
                    hideTypingIndicator();
                }
            } else {
                // No typing data, hide indicator
                hideTypingIndicator();
            }
        });
}

// Hide typing indicator
function hideTypingIndicator() {
    const existingIndicator = messagesContainer.querySelector('.typing-indicator-wrapper');
    if (existingIndicator) {
        existingIndicator.remove();
    }
}

// Update typing status in Firestore
async function updateTypingStatus(isTyping) {
    if (!activeChatId || !currentUser) return;
    
    try {
        await db.collection('chats').doc(activeChatId).update({
            [`typing.${currentUser.uid}`]: isTyping
        });
    } catch (error) {
        console.error('Error updating typing status:', error);
    }
}

// Chat elements
const voiceMsgBtn = document.getElementById('voice-msg-btn');
const voiceRecordingContainer = document.getElementById('voice-recording-container');
const cancelRecordingBtn = document.getElementById('cancel-recording-btn');
const stopRecordingBtn = document.getElementById('stop-recording-btn');
const recordingTime = document.querySelector('.recording-time');

// Call elements
const voiceCallBtn = document.getElementById('voice-call-btn');
const callOverlay = document.getElementById('call-overlay');
const callName = document.getElementById('call-name');
const callStatus = document.getElementById('call-status');
const callTimer = document.querySelector('.call-timer');
const endCallBtn = document.getElementById('end-call-btn');
const answerCallBtn = document.getElementById('answer-call-btn');
const muteCallBtn = document.getElementById('mute-call-btn');

// Define the typingIndicator element that was previously missing
const typingIndicator = document.createElement('div');
typingIndicator.className = 'typing-indicator';
typingIndicator.innerHTML = '<span></span><span></span><span></span>';

// Current user and active chat info
let mediaRecorder = null;
let recordedChunks = [];
let recordingInterval = null;
let recordingStartTime = 0;
let audioContext = null;
let currentAudio = null;

// WebRTC variables
let localStream = null;
let peerConnection = null;
let callId = null;
let callActive = false;
let callParticipantId = null;
let callTimerInterval = null;
let callStartTime = 0;
let isMuted = false;

// ===== Voice Message Recording =====

// Initialize voice message recording
voiceMsgBtn.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        stopVoiceRecording();
    } else {
        startVoiceRecording();
    }
});

// Start voice recording - improved for mobile
async function startVoiceRecording() {
    try {
        // Request microphone access with better constraints for mobile
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            } 
        });
        
        // Show recording interface
        voiceRecordingContainer.classList.remove('hidden');
        messageForm.classList.add('hidden');
        voiceMsgBtn.classList.add('recording');
        
        // Vibrate on mobile devices when recording starts
        if (navigator.vibrate) {
            navigator.vibrate(100);
        }
        
        // Initialize recorder with better settings for mobile
        const options = {
            mimeType: 'audio/webm;codecs=opus', // Better codec for voice
            audioBitsPerSecond: 128000 // Limit bitrate for smaller files
        };
        
        try {
            mediaRecorder = new MediaRecorder(stream, options);
        } catch (e) {
            // Fallback if preferred mime type is not supported
            mediaRecorder = new MediaRecorder(stream);
        }
        
        recordedChunks = [];
        
        // Listen for data
        mediaRecorder.addEventListener('dataavailable', e => {
            if (e.data.size > 0) {
                recordedChunks.push(e.data);
            }
        });
        
        // Start recording
        mediaRecorder.start();
        recordingStartTime = Date.now();
        
        // Update timer
        recordingInterval = setInterval(updateRecordingTime, 500); // Update more often for responsiveness
        
        // Setup stop recording events
        cancelRecordingBtn.addEventListener('click', cancelVoiceRecording);
        stopRecordingBtn.addEventListener('click', stopVoiceRecording);
        
        // Prevent screen from sleeping during recording on mobile
        if (navigator.wakeLock && isMobile) {
            try {
                const wakeLock = await navigator.wakeLock.request('screen');
                // Release wakeLock when recording stops
                const releaseWakeLock = () => {
                    wakeLock.release();
                    mediaRecorder.removeEventListener('stop', releaseWakeLock);
                };
                mediaRecorder.addEventListener('stop', releaseWakeLock);
            } catch (err) {
                console.error('WakeLock error:', err);
            }
        }
        
    } catch (error) {
        console.error('Error starting voice recording:', error);
        alert('Не удалось получить доступ к микрофону. Проверьте разрешения.');
        clearRecordingState();
    }
}

// Update recording time display
function updateRecordingTime() {
    const elapsedTime = Math.floor((Date.now() - recordingStartTime) / 1000);
    recordingTime.textContent = formatDuration(elapsedTime);
    
    // Auto stop at 60 seconds
    if (elapsedTime >= 60) {
        stopVoiceRecording();
    }
}

// Cancel voice recording
function cancelVoiceRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        clearRecordingState();
    }
}

// Stop voice recording and send message
function stopVoiceRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        // Calculate duration
        const duration = (Date.now() - recordingStartTime) / 1000;
        
        // Stop too short recordings (less than 1 second)
        if (duration < 1) {
            cancelVoiceRecording();
            return;
        }
        
        // Stop recorder
        mediaRecorder.stop();
        
        // Process recording when stopped
        mediaRecorder.addEventListener('stop', async () => {
            try {
                // Create blob from chunks
                const audioBlob = new Blob(recordedChunks, { type: 'audio/webm' });
                
                // Upload to Firebase Storage
                const storageRef = firebase.storage().ref();
                const audioRef = storageRef.child(`voice-messages/${currentUser.uid}/${Date.now()}.webm`);
                const uploadTask = audioRef.put(audioBlob);
                
                // Send message when upload completes
                uploadTask.on('state_changed', 
                    null, 
                    (error) => {
                        console.error('Error uploading voice message:', error);
                        alert('Ошибка при отправке голосового сообщения.');
                        clearRecordingState();
                    },
                    async () => {
                        try {
                            // Get download URL
                            const audioUrl = await uploadTask.snapshot.ref.getDownloadURL();
                            
                            // Send voice message
                            await sendVoiceMessage(audioUrl, duration);
                            
                            // Clear recording state
                            clearRecordingState();
                        } catch (error) {
                            console.error('Error getting download URL:', error);
                            clearRecordingState();
                        }
                    }
                );
            } catch (error) {
                console.error('Error processing voice message:', error);
                clearRecordingState();
            }
        });
    }
}

// Clear recording state
function clearRecordingState() {
    // Stop and clear media recorder
    if (mediaRecorder) {
        if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
        }
        
        // Stop all tracks
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        mediaRecorder = null;
    }
    
    // Clear UI
    voiceRecordingContainer.classList.add('hidden');
    messageForm.classList.remove('hidden');
    voiceMsgBtn.classList.remove('recording');
    
    // Clear timer
    clearInterval(recordingInterval);
    recordingTime.textContent = '00:00';
    
    // Remove event listeners
    cancelRecordingBtn.removeEventListener('click', cancelVoiceRecording);
    stopRecordingBtn.removeEventListener('click', stopVoiceRecording);
}

// Optimized version of sendVoiceMessage
async function sendVoiceMessage(audioUrl, duration) {
    if (!activeChatId) return;
    
    try {
        // Show loading indicator in messages area
        const loadingMsg = document.createElement('div');
        loadingMsg.className = 'message message-sent loading-voice';
        loadingMsg.innerHTML = `
            <div class="voice-message">
                <div class="voice-message-play">
                    <i class="fas fa-spinner fa-spin"></i>
                </div>
                <div class="voice-message-waveform">
                    <div class="voice-message-progress"></div>
                </div>
                <div class="voice-message-duration">00:00</div>
            </div>
            <div class="message-time">Отправка...</div>
        `;
        messagesContainer.appendChild(loadingMsg);
        scrollToBottom();
        
        const timestamp = firebase.firestore.FieldValue.serverTimestamp();
        
        // Get chat data to determine recipient
        const chatDoc = await db.collection('chats').doc(activeChatId).get();
        if (!chatDoc.exists) {
            throw new Error('Chat does not exist');
        }
        
        const chatData = chatDoc.data();
        const recipientId = chatData.participants.find(id => id !== currentUser.uid);
        
        // Add message to Firestore
        await db.collection('chats').doc(activeChatId).collection('messages').add({
            type: 'voice',
            audioUrl: audioUrl,
            duration: duration,
            senderId: currentUser.uid,
            timestamp: timestamp,
            status: 'sent'
        });
        
        // Remove loading message after success
        if (loadingMsg) {
            loadingMsg.remove();
        }
        
        // Update chat metadata
        const updateData = {
            lastMessage: '🎤 Голосовое сообщение',
            updatedAt: timestamp,
            messageCount: firebase.firestore.FieldValue.increment(1),
            lastMessageBy: currentUser.uid
        };
        
        // Use dot notation for nested update
        updateData[`unreadBy.${recipientId}`] = firebase.firestore.FieldValue.increment(1);
        
        await db.collection('chats').doc(activeChatId).update(updateData);
        
        // Create notification for the recipient
        await db.collection('notifications').add({
            type: 'new_message',
            chatId: activeChatId,
            userId: recipientId,
            fromUserId: currentUser.uid,
            fromUserName: userNameElement.textContent,
            message: '🎤 Голосовое сообщение',
            timestamp: timestamp,
            read: false
        });
        
        // Vibrate on success for better feedback
        if (navigator.vibrate) {
            navigator.vibrate([50, 50, 50]);
        }
        
    } catch (error) {
        console.error('Error sending voice message:', error);
        
        // Show error message in chat
        const errorMsg = document.createElement('div');
        errorMsg.className = 'message message-error';
        errorMsg.textContent = 'Ошибка отправки голосового сообщения';
        messagesContainer.appendChild(errorMsg);
        scrollToBottom();
        
        // Auto-remove error after delay
        setTimeout(() => {
            errorMsg.remove();
        }, 3000);
    }
}

// ===== Voice Call Functions =====

// Start voice call
voiceCallBtn.addEventListener('click', () => {
    if (!activeChatId) return;
    
    initiateCall();
});

// End call button
endCallBtn.addEventListener('click', endCall);

// Answer call button
answerCallBtn.addEventListener('click', answerCall);

// Mute call button
muteCallBtn.addEventListener('click', toggleMute);

// Initiate a voice call
async function initiateCall() {
    try {
        // Get chat info
        const chatDoc = await db.collection('chats').doc(activeChatId).get();
        if (!chatDoc.exists) throw new Error('Chat not found');
        
        const chatData = chatDoc.data();
        callParticipantId = chatData.participants.find(id => id !== currentUser.uid);
        
        if (!callParticipantId) throw new Error('Call participant not found');
        
        // Get participant name
        let participantName = 'Пользователь';
        
        if (chatData.participantNames && chatData.participantNames[callParticipantId]) {
            participantName = chatData.participantNames[callParticipantId];
        } else {
            const userDoc = await db.collection('users').doc(callParticipantId).get();
            if (userDoc.exists) {
                participantName = userDoc.data().name;
            }
        }
        
        // Create call document
        const callData = {
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            participants: [currentUser.uid, callParticipantId],
            caller: currentUser.uid,
            status: 'outgoing',
            type: 'voice'
        };
        
        const callRef = await db.collection('calls').add(callData);
        callId = callRef.id;
        
        // Setup UI
        callName.textContent = participantName;
        callStatus.textContent = 'Вызов...';
        callOverlay.classList.remove('hidden');
        answerCallBtn.classList.add('hidden');
        
        // Setup WebRTC
        await setupWebRTC();
        
        // Create offer
        const offer = await peerConnection.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: false
        });
        
        await peerConnection.setLocalDescription(offer);
        
        // Update call with offer
        await callRef.update({
            offer: {
                type: offer.type,
                sdp: offer.sdp
            }
        });
        
        // Create notification for recipient
        await db.collection('notifications').add({
            type: 'call',
            callId: callId,
            userId: callParticipantId,
            fromUserId: currentUser.uid,
            fromUserName: userNameElement.textContent,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            read: false
        });
        
        // Listen for call updates
        listenForCallUpdates(callId);
        
    } catch (error) {
        console.error('Error initiating call:', error);
        endCall();
        alert('Не удалось начать звонок. Проверьте подключение к интернету.');
    }
}

// Answer an incoming call
async function answerCall() {
    try {
        // Update call status
        await db.collection('calls').doc(callId).update({
            status: 'connected',
            connectedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Setup WebRTC if not already done
        if (!peerConnection) {
            await setupWebRTC();
        }
        
        // Create and send answer
        const callDoc = await db.collection('calls').doc(callId).get();
        const callData = callDoc.data();
        
        if (callData.offer) {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(callData.offer));
            
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            
            await db.collection('calls').doc(callId).update({
                answer: {
                    type: answer.type,
                    sdp: answer.sdp
                }
            });
        }
        
        // Update UI
        callStatus.textContent = 'Соединение...';
        answerCallBtn.classList.add('hidden');
        
    } catch (error) {
        console.error('Error answering call:', error);
        endCall();
        alert('Не удалось ответить на звонок.');
    }
}

// End the current call
async function endCall() {
    try {
        // Update call status if we have a callId
        if (callId) {
            await db.collection('calls').doc(callId).update({
                status: 'ended',
                endedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    } catch (error) {
        console.error('Error updating call status:', error);
    }
    
    // Clean up WebRTC
    cleanupWebRTC();
    
    // Reset UI
    callOverlay.classList.add('hidden');
    callOverlay.classList.remove('incoming-call');
    callStatus.textContent = 'Вызов...';
    callTimer.textContent = '00:00';
    callTimer.classList.add('hidden');
    
    // Clear variables
    callId = null;
    callActive = false;
    callParticipantId = null;
    
    // Clear timer
    if (callTimerInterval) {
        clearInterval(callTimerInterval);
        callTimerInterval = null;
    }
    
    // Stop ringtone
    stopRingtone();
    
    // Stop vibration if supported
    if (navigator.vibrate) {
        navigator.vibrate(0);
    }
}

// Toggle mute for the call
function toggleMute() {
    if (!localStream) return;
    
    // Toggle audio tracks
    localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
        isMuted = !track.enabled;
    });
    
    // Update UI
    if (isMuted) {
        muteCallBtn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
        muteCallBtn.classList.add('muted');
    } else {
        muteCallBtn.innerHTML = '<i class="fas fa-microphone"></i>';
        muteCallBtn.classList.remove('muted');
    }
}

// Setup WebRTC connection
async function setupWebRTC() {
    try {
        // Get local stream
        localStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false
        });
        
        // Create peer connection
        const configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };
        
        peerConnection = new RTCPeerConnection(configuration);
        
        // Add local stream tracks to peer connection
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });
        
        // Listen for remote stream
        peerConnection.addEventListener('track', event => {
            // Create audio element to play remote stream
            const remoteAudio = document.createElement('audio');
            remoteAudio.srcObject = event.streams[0];
            remoteAudio.autoplay = true;
            remoteAudio.id = 'remote-audio';
            
            // Add to document (hidden)
            remoteAudio.style.display = 'none';
            document.body.appendChild(remoteAudio);
        });
        
        // Listen for ICE candidates
        peerConnection.addEventListener('icecandidate', event => {
            if (event.candidate && callId) {
                // Add candidate to database
                db.collection('calls').doc(callId).collection('candidates')
                    .add(event.candidate.toJSON());
            }
        });
        
        // Listen for connection state changes
        peerConnection.addEventListener('connectionstatechange', () => {
            if (peerConnection.connectionState === 'connected') {
                // Call connected successfully
                callActive = true;
                callStatus.textContent = 'Соединено';
                
                // Start call timer
                callStartTime = Date.now();
                callTimer.classList.remove('hidden');
                callTimerInterval = setInterval(updateCallTimer, 1000);
            }
        });
        
    } catch (error) {
        console.error('Error setting up WebRTC:', error);
        throw error;
    }
}

// Update call timer display
function updateCallTimer() {
    const elapsedSeconds = Math.floor((Date.now() - callStartTime) / 1000);
    callTimer.textContent = formatDuration(elapsedSeconds);
}

// Listen for updates to the call
function listenForCallUpdates(callId) {
    // Listen for call document changes
    const callListener = db.collection('calls').doc(callId)
        .onSnapshot(async (snapshot) => {
            if (!snapshot.exists) {
                endCall();
                return;
            }
            
            const data = snapshot.data();
            
            // Handle call status updates
            switch (data.status) {
                case 'connected':
                    callStatus.textContent = 'Соединение...';
                    break;
                    
                case 'ended':
                    endCall();
                    break;
                    
                case 'rejected':
                    endCall();
                    alert('Звонок отклонен');
                    break;
            }
            
            // Handle answer if we're the caller
            if (data.answer && data.caller === currentUser.uid && peerConnection) {
                try {
                    const answer = new RTCSessionDescription(data.answer);
                    if (peerConnection.signalingState !== 'stable') {
                        await peerConnection.setRemoteDescription(answer);
                    }
                } catch (error) {
                    console.error('Error setting remote description:', error);
                }
            }
        });
    
    // Listen for ICE candidates
    const candidatesListener = db.collection('calls').doc(callId)
        .collection('candidates')
        .onSnapshot((snapshot) => {
            snapshot.docChanges().forEach(async (change) => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    
                    if (peerConnection && peerConnection.remoteDescription) {
                        try {
                            await peerConnection.addIceCandidate(new RTCIceCandidate(data));
                        } catch (error) {
                            console.error('Error adding ICE candidate:', error);
                        }
                    }
                }
            });
        });
        
    // Return cleanup function
    return () => {
        callListener();
        candidatesListener();
    };
}

// Clean up WebRTC resources
function cleanupWebRTC() {
    // Close peer connection
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    
    // Stop local stream tracks
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    
    // Remove remote audio element
    const remoteAudio = document.getElementById('remote-audio');
    if (remoteAudio) {
        remoteAudio.remove();
    }
    
    // Reset mute state
    isMuted = false;
    muteCallBtn.innerHTML = '<i class="fas fa-microphone"></i>';
    muteCallBtn.classList.remove('muted');
}

// Check for incoming calls
function checkForIncomingCalls() {
    // Check for active calls where the user is a participant and status is outgoing
    db.collection('calls')
        .where('participants', 'array-contains', currentUser.uid)
        .where('status', '==', 'outgoing')
        .onSnapshot(async (snapshot) => {
            for (const change of snapshot.docChanges()) {
                if (change.type === 'added') {
                    const callData = change.doc.data();
                    
                    // Only handle if we're not the caller
                    if (callData.caller !== currentUser.uid) {
                        // Handle incoming call directly, without waiting for notification
                        await handleIncomingCallDirectly(change.doc.id, callData);
                    }
                }
            }
        }, error => {
            console.error('Error checking for incoming calls:', error);
        });

    // Also keep the notification listener for backward compatibility
    db.collection('notifications')
        .where('userId', '==', currentUser.uid)
        .where('type', '==', 'call')
        .where('read', '==', false)
        .onSnapshot(async (snapshot) => {
            for (const change of snapshot.docChanges()) {
                if (change.type === 'added') {
                    const notification = change.doc.data();
                    
                    // Mark notification as read
                    await db.collection('notifications').doc(change.doc.id).update({
                        read: true
                    });
                    
                    // Handle incoming call via notification
                    handleIncomingCall(notification);
                }
            }
        });
}

// Handle incoming call directly from call document
async function handleIncomingCallDirectly(callId, callData) {
    try {
        // Ignore if call is already ended or we already have an active call
        if (callData.status === 'ended' || callData.status === 'rejected' || callActive) return;
        
        // Get caller information
        const callerId = callData.caller;
        
        // Set call variables
        window.callId = callId; // Use window to ensure it's global
        callParticipantId = callerId;
        
        let callerName = 'Пользователь';
        
        // Try to get caller name
        try {
            if (callData.participantNames && callData.participantNames[callerId]) {
                callerName = callData.participantNames[callerId];
            } else {
                const userDoc = await db.collection('users').doc(callerId).get();
                if (userDoc.exists) {
                    callerName = userDoc.data().name;
                }
            }
        } catch (error) {
            console.error('Error getting caller name:', error);
        }
        
        // Setup UI for incoming call
        callName.textContent = callerName;
        callStatus.textContent = 'Входящий звонок...';
        callOverlay.classList.remove('hidden');
        callOverlay.classList.add('incoming-call'); // Add class for styling
        answerCallBtn.classList.remove('hidden');
        
        // Play ringtone
        playRingtone();
        
        // Vibrate device if supported (mobile)
        if (navigator.vibrate) {
            const vibratePattern = [300, 100, 300, 100, 300];
            navigator.vibrate(vibratePattern);
        }
        
        // Listen for call updates
        listenForCallUpdates(callId);
        
    } catch (error) {
        console.error('Error handling incoming call:', error);
    }
}

// Play ringtone for incoming call
function playRingtone() {
    // Create audio element
    const ringtone = document.createElement('audio');
    ringtone.src = 'https://cdn.jsdelivr.net/gh/sunnypuri/phone-ring-js@0.1/assets/ringtone.mp3';
    ringtone.loop = true;
    ringtone.id = 'ringtone';
    ringtone.play();
    
    // Stop ringtone when call is answered or ended
    endCallBtn.addEventListener('click', stopRingtone);
    answerCallBtn.addEventListener('click', stopRingtone);
}

// Stop ringtone
function stopRingtone() {
    const ringtone = document.getElementById('ringtone');
    if (ringtone) {
        ringtone.pause();
        ringtone.remove();
    }
}

// Handle incoming call
async function handleIncomingCall(notification) {
    try {
        // Get call data
        const callDoc = await db.collection('calls').doc(notification.callId).get();
        
        if (!callDoc.exists) return;
        
        const callData = callDoc.data();
        
        // Ignore if call is already ended
        if (callData.status === 'ended' || callData.status === 'rejected') return;
        
        // Set call variables
        callId = notification.callId;
        callParticipantId = notification.fromUserId;
        
        // Setup UI for incoming call
        callName.textContent = notification.fromUserName;
        callStatus.textContent = 'Входящий звонок...';
        callOverlay.classList.remove('hidden');
        callOverlay.classList.add('incoming-call'); // Add class for styling
        answerCallBtn.classList.remove('hidden');
        
        // Play ringtone
        playRingtone();
        
    } catch (error) {
        console.error('Error handling incoming call:', error);
    }
}

// Reject incoming call
async function rejectCall() {
    if (!callId) return;
    
    try {
        await db.collection('calls').doc(callId).update({
            status: 'rejected',
            endedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        endCall();
    } catch (error) {
        console.error('Error rejecting call:', error);
    }
}

// Additional event listener for iOS body interaction
document.body.addEventListener('touchstart', function initialInteraction() {
    document.body.classList.add('user-interaction');
    document.body.removeEventListener('touchstart', initialInteraction);
}); 