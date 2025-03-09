// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAAdu7bWt9F2GF1W9qEzfc2f_y6LCqMM14",
  authDomain: "strintox-3a2b8.firebaseapp.com",
  projectId: "strintox-3a2b8",
  storageBucket: "strintox-3a2b8.appspot.com",
  messagingSenderId: "12688530154",
  appId: "1:12688530154:web:da86782e5c3261c6c35593",
  measurementId: "G-WVB4V2T51Y"
};

// Объявляем переменные перед инициализацией
let auth, db;

// Initialize Firebase with error handling
try {
  // Проверка, не инициализировано ли Firebase уже
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  } else {
    firebase.app(); // Если уже инициализировано, используем существующее приложение
  }
  
  console.log("Firebase initialized successfully");
  
  // Initialize Firebase services (без storage)
  auth = firebase.auth();
  db = firebase.firestore();
  
  // Set persistence to local to keep user logged in even after page refresh
  auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .then(() => {
      console.log("Auth persistence set to LOCAL");
    })
    .catch(error => {
      console.error("Error setting auth persistence:", error);
    });
    
} catch (error) {
  console.error("Error initializing Firebase:", error);
  // Show a notification to the user if available
  if (typeof showNotification === "function") {
    showNotification('Ошибка инициализации системы. Пожалуйста, обновите страницу.');
  }
} 