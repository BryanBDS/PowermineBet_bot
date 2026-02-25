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
    buildings: { miner1: { level: 0, baseCost: 50, baseProduction: 1 },
            miner2: { level: 0, baseCost: 200, baseProduction: 5 },
            miner3: { level: 0, baseCost: 1000, baseProduction: 25 }
                },

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
    await userRef.set({

    balance: userData.balance ?? userData.puntos ?? 0,
    energy: userData.energy ?? userData.energia ?? 100,
    maxEnergy: userData.maxEnergy ?? userData.max_energia ?? 100,
    stage: userData.stage ?? 1,
    prestigePoints: userData.prestigePoints ?? 0,
    prestigeMultiplier: userData.prestigeMultiplier ?? 1,
    totalEarned: userData.totalEarned ?? userData.puntos ?? 0,
    lastUpdate: userData.lastUpdate ?? Date.now(),

    buildings: userData.buildings ?? {
        miner1: { level: 0, baseCost: 50, baseProduction: 1 },
        miner2: { level: 0, baseCost: 200, baseProduction: 5 },
        miner3: { level: 0, baseCost: 1000, baseProduction: 25 }
    }

}, { merge: true });
                
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

    const levelEl = document.getElementById("user-level");
    if (levelEl) {
    levelEl.textContent = `Nivel ${userData.nivel ?? 1}`;
    }

    const miningRateEl = document.getElementById("mining-rate");
    if (miningRateEl) {
    miningRateEl.textContent = userData.tasa_minado ?? 0;
    }

    const energyBar = document.getElementById("energy-bar");
    const energyText = document.getElementById("energy-text");

    if (energyBar && energyText) {

    const maxEnergy = userData.maxEnergy ?? 100;
    const currentEnergy = userData.energy ?? 0;

    const percent = (currentEnergy / maxEnergy) * 100;

    energyBar.style.width = percent + "%";
    energyText.textContent = `${currentEnergy} / ${maxEnergy}`;
    }

    const mineBtn = document.getElementById("mine-btn");

    if (mineBtn) {
        if (isMining) {
            mineBtn.textContent = "⛏️ Minando...";
            mineBtn.classList.add("mining");
        } else {
            mineBtn.textContent = "⛏️ Iniciar Minería";
            mineBtn.classList.remove("mining");
        }
    }
    
    const minerCard = document.querySelector(".miner-card");

    if (minerCard) {
    if (isMining) {
        minerCard.classList.add("mining");
    } else {
        minerCard.classList.remove("mining");
    }

        // ============================
// ESTADÍSTICAS AVANZADAS
// ============================

const totalEarnedEl = document.getElementById("total-earned");
const totalBuildingsEl = document.getElementById("total-buildings");

if (totalEarnedEl) {
    totalEarnedEl.textContent = formatNumber(userData.totalEarned ?? 0);
}

if (totalBuildingsEl && userData.buildings) {

    let totalBuildings = 0;

    for (let key in userData.buildings) {
        totalBuildings += userData.buildings[key].level;
    }

    totalBuildingsEl.textContent = totalBuildings;
}
}
    // ============================================
    // BUILDINGS
    // ============================================

    if (userData?.buildings) {

        for (let key in userData.buildings) {

            const b = userData.buildings[key];

            const levelElement = document.getElementById(`${key}-level`);
            const costElement = document.getElementById(`${key}-cost`);
            const productionElement = document.getElementById(`${key}-production`);
            const button = document.querySelector(`button[onclick="buyBuilding('${key}')"]`);

            const cost = b.baseCost * (b.level + 1);
            const productionPerSecond = b.level * b.baseProduction;

            if (levelElement) levelElement.textContent = b.level;
            if (costElement) costElement.textContent = formatNumber(cost);
            if (productionElement) productionElement.textContent = formatNumber(productionPerSecond);

            if (button) {
                if (userData.balance >= cost) {
                    button.classList.remove("btn-disabled");
                    button.classList.add("btn-active");
                    button.disabled = false;
                } else {
                    button.classList.remove("btn-active");
                    button.classList.add("btn-disabled");
                    button.disabled = true;
                }
            }
        }
    }

    // ============================================
    // PRODUCCIÓN TOTAL
    // ============================================

    const totalProductionElement = document.getElementById("total-production");

    if (totalProductionElement) {
        const total = calculateProduction();
        totalProductionElement.textContent = formatNumber(total);
    }
}

// ============================================
// CALCULAR PRODUCCIÓN TOTAL
// ============================================

function calculateProduction() {

    if (!userData?.buildings) return 0;

    let total = 0;

    for (let key in userData.buildings) {
        const b = userData.buildings[key];
        total += b.level * b.baseProduction;
    }

    return total * (userData.prestigeMultiplier ?? 1);
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

    if (userData.energy <= 0) {
        showNotification("Sin energía", "error");
        return;
    }

    isMining = true;
    updateUI();

    const userRef = db.collection("users").doc(userId);

    miningInterval = setInterval(async () => {

        if (!userData || userData.energy <= 0) {
            stopMining();
            showNotification("Energía agotada", "error");
            return;
        }

        const ganancia = calculateProduction();

        await userRef.update({
    balance: firebase.firestore.FieldValue.increment(ganancia),
    energy: firebase.firestore.FieldValue.increment(-1),
    lastUpdate: firebase.firestore.FieldValue.serverTimestamp()

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
firebase.auth().signInAnonymously()
.then(() => {
    console.log("Autenticado en Firebase");
})
.catch((error) => {
    console.error("Error auth:", error);
});
    
document.addEventListener("DOMContentLoaded", () => {

    initUser();

    const mineBtn = document.getElementById("mine-btn");
    if (mineBtn) {
        mineBtn.addEventListener("click", startMining);
    }

    setInterval(async () => {

        if (!userData || !userId) return;

        const production = calculateProduction();
        if (production <= 0) return;

        const userRef = db.collection("users").doc(userId);

        await userRef.update({
            balance: firebase.firestore.FieldValue.increment(production)
        });

    }, 5000);

});

    // ============================================
// PRODUCCIÓN AUTOMÁTICA (IDLE)
// ============================================

setInterval(async () => {

    if (!userData || !userId) return;

    const production = calculateProduction();

    if (production <= 0) return;

    const userRef = db.collection("users").doc(userId);

    await userRef.update({
        balance: firebase.firestore.FieldValue.increment(production)
    });

}, 5000);


// ============================================
// COMPRAR EDIFICIO
// ============================================

async function buyBuilding(key) {

    if (!userData || !userData.buildings[key]) return;

    const building = userData.buildings[key];
    const cost = building.baseCost * (building.level + 1);

    if (userData.balance < cost) {
        showNotification("Balance insuficiente", "error");
        return;
    }

    const userRef = db.collection("users").doc(userId);

    await userRef.update({
        balance: firebase.firestore.FieldValue.increment(-cost),
        [`buildings.${key}.level`]: building.level + 1
    });

    showNotification("Edificio mejorado 🚀", "success");
}

// Exponer funciones
window.buyUpgrade = buyUpgrade;
window.withdraw = withdraw;
window.buyBuilding = buyBuilding;



























