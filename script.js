// script.js
// script.js
// ============================================
// CONFIGURACIÓN INICIAl
// ============================================
// VARIABLES GLOBALES
// ============================================

let userId = null;
let userData = null;
let miningInterval = null;
let isMining = false;
let telegram = null;

// ============================================
// LOGIN ANÓNIMO FIREBASE
// ============================================

async function loginAnonymous() {
    try {
        await firebase.auth().signInAnonymously();
        console.log("Login anónimo exitoso");
    } catch (error) {
        console.error("Error login anónimo:", error);
    }
}
// ============================================
// TELEGRAM INIT (SEGURO)
// ============================================

if (window.Telegram && window.Telegram.WebApp) {
    telegram = window.Telegram.WebApp;
    telegram.ready();
    telegram.expand();
} else {
    console.log("No está dentro de Telegram");
}

// ============================================
// UTILIDADES
// ============================================

function showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => notification.remove(), 3000);
}

function formatNumber(num) {
    return new Intl.NumberFormat().format(Math.floor(num || 0));
}

// ============================================
// INICIALIZAR USUARIO
// ============================================

async function initUser() {
    try {

        if (!telegram?.initDataUnsafe?.user) {
            showNotification("No se pudo obtener usuario Telegram", "error");
            return;
        }

        const tgUser = telegram.initDataUnsafe.user;
        userId = tgUser.id.toString();

        document.getElementById("user-name").textContent =
            tgUser.first_name || "Usuario";

        document.getElementById("user-avatar").src =
            tgUser.photo_url || "https://via.placeholder.com/50";

        const userRef = db.collection("users").doc(userId);
        const doc = await userRef.get();

        if (!doc.exists) {

            const newUser = {
                nombre: tgUser.first_name || "",
                username: tgUser.username || "",
                puntos: 1000,
                nivel: 1,
                energia: 100,
                max_energia: 100,
                tasa_minado: 500,
                referido_por: null,
                wallet_ton: "",
                fecha_registro: firebase.firestore.FieldValue.serverTimestamp(), 
                ultimo_regen: firebase.firestore.FieldValue.serverTimestamp(), 
            };

            await userRef.set(newUser);
            userData = newUser;

            showNotification("¡Bienvenido! Recibiste 1000 puntos", "success");

        } else {
            userData = doc.data();
        }
        
        updateUI();

        // 🔥 Ocultar mensaje APP CARGANDO
        document.getElementById("loader").style.display = "none";

        userRef.onSnapshot((doc) => {
            if (doc.exists) {
                userData = doc.data();
                updateUI();
            }
        });

    } catch (error) {
        console.error("Error initUser:", error);
        showNotification("Error cargando usuario", "error");
    }
}

// ============================================
// ACTUALIZAR UI
// ============================================

function updateUI() {
    if (!userData) return;

    document.getElementById("user-points").textContent =
        formatNumber(userData.puntos);

    document.getElementById("user-level").textContent =
        `Nivel ${userData.nivel}`;

    document.getElementById("mining-rate").textContent =
        userData.tasa_minado;

    document.getElementById("energy").textContent =
        userData.energia;

    const mineBtn = document.getElementById("mine-btn");

    if (isMining) {
        mineBtn.textContent = "⛏️ Minando...";
        mineBtn.classList.add("mining");
    } else {
        mineBtn.textContent = "⛏️ Iniciar Minería";
        mineBtn.classList.remove("mining");
    }
}

// ============================================
// MINERÍA
// ============================================

async function startMining() {

    if (isMining) {
        stopMining();
        return;
    }

    if (userData.energia <= 0) {
        showNotification("Sin energía", "error");
        return;
    }

    isMining = true;
    updateUI();

    const userRef = db.collection("users").doc(userId);

    miningInterval = setInterval(async () => {

        if (userData.energia <= 0) {
            stopMining();
            showNotification("Energía agotada", "error");
            return;
        }

        const ganancia = userData.tasa_minado;
        const nuevaEnergia = userData.energia - 1;

        await userRef.update({
            puntos: firebase.firestore.FieldValue.increment(ganancia),
            energia: nuevaEnergia,
            ultimo_minado: firebase.firestore.FieldValue.serverTimestamp()
        });

        showNotification(`+${ganancia} puntos`, "success");

    }, 5000);
}

function stopMining() {
    isMining = false;
    clearInterval(miningInterval);
    updateUI();
}

// ============================================
// MEJORAS
// ============================================

async function buyUpgrade(tipo) {

    const userRef = db.collection("users").doc(userId);

    if (tipo === "nivel") {

        if (userData.puntos < 1000) {
            showNotification("Puntos insuficientes", "error");
            return;
        }

        const nuevoNivel = userData.nivel + 1;

        await userRef.update({
            puntos: firebase.firestore.FieldValue.increment(-1000),
            nivel: nuevoNivel,
            tasa_minado: 500 + (nuevoNivel * 100)
        });

        showNotification(`Subiste a nivel ${nuevoNivel}`, "success");

    }

    if (tipo === "energia") {

        if (userData.puntos < 100) {
            showNotification("Puntos insuficientes", "error");
            return;
        }

        await userRef.update({
            puntos: firebase.firestore.FieldValue.increment(-100),
            energia: userData.max_energia
        });

        showNotification("Energía recargada", "success");
    }
}
// ============================================
// REGENERACIÓN INTELIGENTE DE ENERGÍA
// ============================================

async function regenerateEnergy() {

    if (!userData || !userData.ultimo_regen) return;

    const now = Date.now();
    const lastRegen = userData.ultimo_regen.toDate().getTime();

    const diffMinutes = Math.floor((now - lastRegen) / 60000);

    if (diffMinutes <= 0) return;

    const energiaRecuperada = diffMinutes * 5; // 5 energía por minuto

    const nuevaEnergia = Math.min(
        userData.energia + energiaRecuperada,
        userData.max_energia
    );

    if (nuevaEnergia > userData.energia) {

        await db.collection("users").doc(userId).update({
            energia: nuevaEnergia,
            ultimo_regen: firebase.firestore.FieldValue.serverTimestamp()
        });

        console.log("Energía regenerada:", energiaRecuperada);
    }
}
// ============================================
// RETIROS (REGISTRO)
// ============================================

async function withdraw() {

    const wallet = document.getElementById("wallet-address").value.trim();

    if (!wallet) {
        showNotification("Ingresa wallet", "error");
        return;
    }

    if (userData.puntos < 50000) {
        showNotification("Mínimo 50,000 puntos", "error");
        return;
    }

    const puntosARetirar = 50000;

    await db.collection("withdrawals").add({
        userId: userId,
        puntos: puntosARetirar,
        wallet: wallet,
        estado: "pendiente",
        fecha: firebase.firestore.FieldValue.serverTimestamp()
    });

    await db.collection("users").doc(userId).update({
        puntos: firebase.firestore.FieldValue.increment(-puntosARetirar)
    });

    showNotification("Solicitud enviada", "success");
}

// ============================================
// EVENTOS
// ============================================

document.addEventListener("DOMContentLoaded", async () => {
    await loginAnonymous();   // 🔐 primero autenticamos
    await initUser();         // luego cargamos usuario
    await regenerateEnergy();
});

document.getElementById("mine-btn")
    ?.addEventListener("click", startMining);

window.buyUpgrade = buyUpgrade;
window.withdraw = withdraw;    






