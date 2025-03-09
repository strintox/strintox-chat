// Конфигурация Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAAdu7bWt9F2GF1W9qEzfc2f_y6LCqMM14",
    authDomain: "strintox-3a2b8.firebaseapp.com",
    projectId: "strintox-3a2b8",
    storageBucket: "strintox-3a2b8.firebasestorage.app",
    messagingSenderId: "12688530154",
    appId: "1:12688530154:web:da86782e5c3261c6c35593",
    measurementId: "G-WVB4V2T51Y"
};

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);

// Создание экземпляров сервисов Firebase
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Настройки Firestore
db.settings({
    timestampsInSnapshots: true
}); 