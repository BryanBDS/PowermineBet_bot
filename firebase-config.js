// firebase-conf
// firebase-config.js
// Configuración de Firebase - ¡REEMPLAZA CON TUS DATOS!
// firebase-config.js

const firebaseConfig = {
    apiKey: "AIzaSyA-dKqUnN2-Czy4OU0j66h4FmRn8qRNfoI",
    authDomain: "powerminebet-bot.firebaseapp.com",
    projectId: "powerminebet-bot",
    storageBucket: "powerminebet-bot.appspot.com",
    messagingSenderId: "240407528472",
    appId: "1:240407528472:web:fd579ee5bcf211bf20af6d"
};

firebase.initializeApp(firebaseConfig);

// Inicializar Firestore
const db = firebase.firestore();

