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

// Mobile detection
const isMobile = window.innerWidth <= 768;

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
    }
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
    
    // Query messages for the chat
    const messagesQuery = db.collection('chats').doc(chatId).collection('messages')
        .orderBy('timestamp', 'asc');
    
    // Listen for real-time updates
    messagesListener = messagesQuery.onSnapshot((snapshot) => {
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
    
    messagesContainer.appendChild(messageElement);
}

// Send message
messageForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const message = messageInput.value.trim();
    
    if (!message || !activeChatId) return;
    
    // Clear input immediately for better UX
    messageInput.value = '';
    
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

// Scroll messages container to bottom
function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
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

// Handle window resize
window.addEventListener('resize', () => {
    const isMobileView = window.innerWidth <= 768;
    
    if (!isMobileView && sidebarElement) {
        // On desktop, always show sidebar
        sidebarElement.classList.remove('show');
    }
});

// Prevent text selection
document.addEventListener('selectstart', (e) => {
    const isInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';
    if (!isInput) {
        e.preventDefault();
        return false;
    }
});

// Prevent context menu
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
});

// Show sidebar when "Show chats" button is clicked
const showChatsBtn = document.getElementById('show-chats-btn');
if (showChatsBtn) {
    showChatsBtn.addEventListener('click', () => {
        sidebarElement.classList.add('show');
    });
}

// Add typing indicator when user is typing
messageInput.addEventListener('input', () => {
    if (!activeChatId || !currentUser) return;
    
    if (!isTyping) {
        isTyping = true;
        // Send typing status to Firestore
        updateTypingStatus(true);
    }
    
    // Clear previous timeout
    if (typingTimeout) clearTimeout(typingTimeout);
    
    // Set new timeout to stop typing indicator after 2 seconds of inactivity
    typingTimeout = setTimeout(() => {
        isTyping = false;
        updateTypingStatus(false);
    }, 2000);
});

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

// Hide typing indicator
function hideTypingIndicator() {
    const existingIndicator = messagesContainer.querySelector('.typing-indicator-wrapper');
    if (existingIndicator) {
        existingIndicator.remove();
    }
} 