// firebase-conf
// firebase-config.js
// Configuración de Firebase - ¡REEMPLAZA CON TUS DATOS!
const firebaseConfig = {
    apiKey: "AIzaSyA-dKqUnN2-Czy4OU0j66h4FmRn8qRNfoI",
    authDomain: "powerminebet-bot.firebaseapp.com",
    databaseURL: "https://powerminebet-bot-default-rtdb.firebaseio.com",
    projectId: "powerminebet-bot",
    storageBucket: "powerminebet-bot.firebasestorage.app",
    messagingSenderId: "240407528472",
    appId: "1:240407528472:web:fd579ee5bcf211bf20af6d"
    };
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);

    //obteneruna referencia ala base de datos
    const database = firebase.database();