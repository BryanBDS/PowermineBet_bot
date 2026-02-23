// script.js
// script.js
// ============================================
// CONFIGURACIÓN INICIAl
// ============================================

// ============================================
// VARIABLES GLOBALES
// ============================================

let userId = null;
let userData = null;
let miningInterval = null;
let isMining = false;
let telegram = null;

// ============================================
// TELEGRAM INIT
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

async function initUser(authUser) {

    try {

        if (!telegram?.initDataUnsafe?.user) {
            showNotification("No se pudo obtener usuario Telegram", "error");
            return;
        }

        const tgUser = telegram.initDataUnsafe.user;
        userId = authUser.uid;

        document.getElementById("user-name").textContent =
            tgUser.first_name || "Usuario";

        document.getElementById("user-avatar").src =
            tgUser.photo_url || "https://via.placeholder.com/50";

        const userRef = db.collection("users").doc(userId);
        const doc = await userRef.get();

        if (!doc.exists) {

            const newUser = {
    // Datos básicos
    nombre: tgUser.first_name || "",
    username: tgUser.username || "",

    // Economía nueva base
    balance: 1000,
    energy: 100,
    maxEnergy: 100,
    stage: 1,
    prestigePoints: 0,
    prestigeMultiplier: 1,
    totalEarned: 1000,
    lastUpdate: Date.now(),

    // Sistema semanal
    weekStats: {
        earnWeek: 0,
        prodAverage: 0,
        prestigeWeek: 0,
        stageProgress: 0,
        weekId: ""
    },

    // Preparado para edificios
    buildings: {},

    // Compatibilidad temporal (NO borrar aún)
    puntos: 1000,
    nivel: 1,
    energia: 100,
    max_energia: 100,
    tasa_minado: 500,

    wallet_ton: "",
    fecha_registro: firebase.firestore.FieldValue.serverTimestamp(),
    ultimo_regen: firebase.firestore.FieldValue.serverTimestamp()
};

            await userRef.set(newUser);
            userData = newUser;

      } else {
    userData = doc.data();

    // MIGRACIÓN AUTOMÁTICA
    await userRef.update({
        balance: userData.balance ?? userData.puntos ?? 0,
        energy: userData.energy ?? userData.energia ?? 100,
        maxEnergy: userData.maxEnergy ?? userData.max_energia ?? 100,
        stage: userData.stage ?? 1,
        prestigePoints: userData.prestigePoints ?? 0,
        prestigeMultiplier: userData.prestigeMultiplier ?? 1,
        totalEarned: userData.totalEarned ?? userData.puntos ?? 0,
        lastUpdate: userData.lastUpdate ?? Date.now()
    });
}  

        updateUI();
        document.getElementById("loader").style.display = "none";

        // Escuchar cambios en tiempo real
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
    formatNumber(userData.balance ?? userData.puntos);

    document.getElementById("user-level").textContent =
        `Nivel ${userData.nivel}`;

    document.getElementById("mining-rate").textContent =
        userData.tasa_minado;

    document.getElementById("energy").textContent =
    userData.energy ?? userData.energia;

    const mineBtn = document.getElementById("mine-btn");

    if (!mineBtn) return;

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

    if (!userData) {
        showNotification("Usuario no listo", "error");
        return;
    }

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

        if (!userData || userData.energia <= 0) {
            stopMining();
            showNotification("Energía agotada", "error");
            return;
        }

        const ganancia = userData.tasa_minado;

        await userRef.update({
            puntos: firebase.firestore.FieldValue.increment(ganancia),
            energia: firebase.firestore.FieldValue.increment(-1),
            ultimo_minado: firebase.firestore.FieldValue.serverTimestamp()
        });

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

    if (!userData) return;

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

    }
}

// ============================================
// RETIRO
// ============================================

async function withdraw() {

    if (!userData) return;

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
// INICIO APP
// ============================================

document.addEventListener("DOMContentLoaded", () => {

    firebase.auth().onAuthStateChanged(async (user) => {

        if (user) {
            console.log("Usuario autenticado:", user.uid);
            await initUser(user);
        } else {
            await firebase.auth().signInAnonymously();
        }

    });

    const mineBtn = document.getElementById("mine-btn");

    if (mineBtn) {
        mineBtn.addEventListener("click", startMining);
    }

});

// Exponer funciones
window.buyUpgrade = buyUpgrade;
window.withdraw = withdraw;










