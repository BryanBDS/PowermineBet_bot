// firebase-conf
// firebase-config.js
// Configuración de Firebase - ¡REEMPLAZA CON TUS DATOS!
// firebase-config.js

const firebaseConfig = {
    apiKey: "7866575006:AAGXX3I9UtB60UHAc4IWuEI6UZZUFKlH22w",
    authDomain: "powerminebet-bot.firebaseapp.com",
    projectId: "powerminebet-bot",
    storageBucket: "powerminebet-bot.appspot.com",
    messagingSenderId: "240407528472",
    appId: "1:240407528472:web:fd579ee5bcf211bf20af6d"
};

firebase.initializeApp(firebaseConfig);

// Inicializar Firestore
const db = firebase.firestore();
