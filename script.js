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
// CONFIGURACIÓN DEL JUEGO
// ============================================

const Game = {
    version: "1.0.0",
    regenRate: 1,            // Energía que regenera
    regenInterval: 5000,     // Cada 5 segundos
    productionInterval: 5000,
    miningInterval: 5000,
    referralBonus: 0.05      // 5% futuro sistema referido
};

let turboMultiplier = 1;
let turboActive = false;
let turboTimeLeft = 0;
let turboInterval = null;

// ============================================
// TELEGRAM INIT
// ============================================

if (window.Telegram && window.Telegram.WebApp) {
    telegram = window.Telegram.WebApp;
    telegram.ready();
    telegram.expand();
    
window.referralCode = null;

if (telegram.initDataUnsafe && telegram.initDataUnsafe.start_param) {
    window.referralCode = telegram.initDataUnsafe.start_param;
}
    
} else {
    console.log("No está dentro de Telegram");} 


function formatNumber(num) {
    if (num === undefined || num === null) return "0";

    return Number(num).toLocaleString("es-ES", {
        maximumFractionDigits: 2
    });
}

// ============================================
// UTILIDADES
// ============================================


// ============================================
// INICIALIZAR USUARIO
// ============================================

async function initUser() {

    try {

        let tgUser;

if (telegram?.initDataUnsafe?.user) {

    tgUser = telegram.initDataUnsafe.user;

} else {

    console.warn("Modo prueba activado (fuera de Telegram)");

    tgUser = {
        id: "test_user_123",
        first_name: "Usuario Test",
        username: "test",
        photo_url: "https://via.placeholder.com/50"
    };
}

        
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
    vip: false,
    vipExpires: 0,            
    stage: 1,
    xp: 0,
    xpRequired: 100,            
    prestigePoints: 0,
    prestigeMultiplier: 1,
    referrer: window.referralCode && window.referralCode !== userId 
          ? window.referralCode 
          : null,
    referrals: 0,  
    referralRewardsClaimed: [],            
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
  buildings: { 
    miner1: { level: 0, baseCost: 50, baseProduction: 1, requiredLevel: 1 },
    miner2: { level: 0, baseCost: 200, baseProduction: 5, requiredLevel: 3 },
    miner3: { level: 0, baseCost: 1000, baseProduction: 25, requiredLevel: 5 }
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
            
 // ============================================
// RECOMPENSA POR REFERIDO
// ============================================

if (newUser.referrer) {

    const referrerRef = db.collection("users").doc(newUser.referrer);

    await referrerRef.update({
        referrals: firebase.firestore.FieldValue.increment(1),
        balance: firebase.firestore.FieldValue.increment(500)
    });

        }
            

      } else {
    userData = doc.data();

    // MIGRACIÓN AUTOMÁTICA
    await userRef.set({
        
    xp: userData.xp ?? 0,
    xpRequired: userData.xpRequired ?? 100,
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
        userRef.onSnapshot(async (doc) => {

    if (!doc.exists) {

        console.log("Usuario no existe, creando...");

        await userRef.set({
            name: "Jugador",
            balance: 0,
            totalEarned: 0,
            stage: 1,
            xp: 0,
            buildings: {
                miner1: { level: 0, baseCost: 50, baseProduction: 1, requiredLevel: 1 }
            }
        });

        return;
    }

    userData = doc.data();

    document.getElementById("loader").style.display = "none";
    document.getElementById("app").style.display = "block";

    updateUI();
    checkReferralRewards();        
});
        

    } catch (error) {
        console.error("Error initUser:", error);
        showNotification("Error cargando usuario", "error");
    }
}


// ============================================
// 🔔 SISTEMA DE NOTIFICACIONES
// ============================================

function showNotification(message) {

    const notification = document.createElement("div");
    notification.classList.add("game-notification");
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add("show");
    }, 100);

    setTimeout(() => {
        notification.classList.remove("show");
        setTimeout(() => {
            notification.remove();
        }, 500);
    }, 3000);
}

// ============================================
// ACTUALIZAR UI
// ============================================

function updateUI() {

    if (!userData) return;

    document.getElementById("user-points").textContent =
        formatNumber(userData.balance ?? userData.puntos);

    // 🎉 =====================================
// DETECTAR SUBIDA DE NIVEL
// =====================================

if (!window.previousStage) {
    window.previousStage = userData.stage;
}

if (userData.stage > window.previousStage) {

    showNotification(`🎉 ¡Subiste al Nivel ${userData.stage}!`);

    // 🔓 Revisar qué edificios se desbloquean en este nuevo nivel
    if (userData?.buildings) {
        for (let key in userData.buildings) {

            const building = userData.buildings[key];
            const required = Number(building.requiredLevel) || 1;

            if (required === userData.stage) {
                showNotification(`🔓 ¡Has desbloqueado ${key.toUpperCase()}!`);
            }
        }
    }

    window.previousStage = userData.stage;
}

    const levelEl = document.getElementById("user-level");
    if (levelEl) {
    const level = userData.stage ?? 1;
    const totalEarned = userData.totalEarned ?? 0;
        
    const required = calculateMoneyRequired(level);
    const previousRequired = level === 1 ? 0 : calculateMoneyRequired(level - 1);

    const progress = Math.max(0, totalEarned - previousRequired);
    const needed = required - previousRequired;

    const percentage = Math.max(0, Math.min(100, (progress / needed) * 100));

    const bar = document.getElementById("level-progress-bar");
    if (bar) {
    bar.style.width = percentage + "%";
}
       
const progressText = document.getElementById("level-progress-text");
if (progressText) {
    progressText.textContent =
        `${Math.floor(progress)} / ${needed} (${Math.floor(percentage)}%)`;
}
     updateXPBar();   
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

    const percent = (Math.floor(currentEnergy) / maxEnergy) * 100;

    energyBar.style.width = percent + "%";
    energyText.textContent = `${Math.floor(currentEnergy)} / ${maxEnergy}`;
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

        // ============================================
    // BUILDINGS
    // ============================================

    if (userData?.buildings) {

        for (let key in userData.buildings) {

            const b = userData.buildings[key];
            
            // 🔓 SISTEMA DE DESBLOQUEO
            const userLevel = userData.stage ?? 1;
            const requiredLevel = b.requiredLevel ?? 1;

            const buildingCard = document.getElementById(`${key}-card`);

            const levelElement = document.getElementById(`${key}-level`);
            const costElement = document.getElementById(`${key}-cost`);
            const productionElement = document.getElementById(`${key}-production`);
            const button = document.querySelector(`button[onclick="buyBuilding('${key}')"]`);

            const cost = calculateBuildingCost(b.baseCost, b.level);
            const productionPerSecond = b.level * b.baseProduction;

            if (levelElement) levelElement.textContent = b.level;
            if (costElement) costElement.textContent = formatNumber(cost);
            if (productionElement) productionElement.textContent = formatNumber(productionPerSecond);

            // 🔒 Verificar si está bloqueado por nivel
            if (userLevel < requiredLevel) {

            if (buildingCard) {
               buildingCard.classList.add("locked");
             }

         if (button) {
        button.disabled = true;
        button.textContent = `🔒 Nivel ${requiredLevel}`;
        button.classList.remove("btn-active");
        button.classList.add("btn-disabled");
    }

    continue; // IMPORTANTE: salta al siguiente edificio
     } else {

                
    if (buildingCard) {
        buildingCard.classList.remove("locked");
    }

    if (button) {
        button.textContent = "Comprar";
    }
}
            

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
        totalProductionElement.textContent = formatNumber(Math.floor(total));

        // ============================================
// ACTUALIZAR SISTEMA DE REFERIDOS
// ============================================

const refCountEl = document.getElementById("ref-count");
const refLinkEl = document.getElementById("ref-link");

if (refCountEl && userData) {
    refCountEl.textContent = userData.referrals ?? 0;
}

if (refLinkEl && userId) {
    refLinkEl.value = `https://t.me/PowermineBet_bot?start=${userId}`;
}
    }

    // =====================================
// MOSTRAR ESTADO VIP
// =====================================

const vipElement = document.getElementById("vip-status");

if (vipElement) {

    if (userData.vip && Date.now() < userData.vipExpires) {

        const timeLeft = userData.vipExpires - Date.now();
        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

        vipElement.textContent =
            `👑 VIP Activo - ${hours}h ${minutes}m restantes`;

    } else {
        vipElement.textContent = "";
    }
}
}

    // ============================================
// VERIFICAR RECOMPENSAS POR REFERIDOS
// ============================================

async function checkReferralRewards() {

    if (!userData || !userId) return;

    const rewards = [
        { referrals: 5, reward: 2000 },
        { referrals: 10, reward: 5000 }
    ];

    for (let r of rewards) {

        const alreadyClaimed = userData.referralRewardsClaimed?.includes(r.referrals);

        if (userData.referrals >= r.referrals && !alreadyClaimed) {

            const userRef = db.collection("users").doc(userId);

            await userRef.update({
                balance: firebase.firestore.FieldValue.increment(r.reward),
                referralRewardsClaimed: firebase.firestore.FieldValue.arrayUnion(r.referrals)
            });

            showNotification(`🎉 Ganaste ${r.reward} pts por ${r.referrals} referidos!`);
        }
    }
}



function updateXPBar() {

    if (!userData) return;

    const xp = userData.xp ?? 0;
    const xpRequired = userData.xpRequired ?? 100;

    const percent = Math.min((xp / xpRequired) * 100, 100);

    const xpBar = document.getElementById("xp-bar");
    const xpText = document.getElementById("xp-text");

    if (xpBar) {
        xpBar.style.width = percent + "%";
    }

    if (xpText) {
        xpText.textContent = `${xp} / ${xpRequired} XP`;
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

    const level = userData.stage ?? 1;
    const levelBonus = 1 + ((level - 1) * 0.02);

    const prestigeMultiplier = userData.prestigeMultiplier ?? 1;

    let finalProduction = total * levelBonus * prestigeMultiplier;

    // Aplicar VIP correctamente
    if (userData.vip && Date.now() < userData.vipExpires) {
        finalProduction *= 3; // VIP x3
    }

    // ============================================
// ============================================
// BONO POR REFERIDOS (5% CADA UNO - MÁX 50%)
// ============================================

if (userData.referrals && userData.referrals > 0) {

    const referralPercent = 0.05 * userData.referrals;

    // Limitar máximo a 50%
    const cappedPercent = Math.min(referralPercent, 0.5);

    const referralBonus = finalProduction * cappedPercent;

    finalProduction += referralBonus;
        }

    
    return Math.max(0, finalProduction);
}


// ============================================
// DINERO NECESARIO PARA SUBIR DE NIVEL
// ============================================

function calculateMoneyRequired(level) {

    const base = 2000;
    const linear = level * 1500;
    const exponential = Math.pow(level, 1.8) * 800;

    return Math.floor(base + linear + exponential);
}


// ============================================
// COSTO DINÁMICO DE EDIFICIOS
// ============================================

function calculateBuildingCost(baseCost, owned) {

    const growthRate = 1.15; // 15% incremento por compra

    return Math.floor(baseCost * Math.pow(growthRate, owned));
}


// ============================================
// SISTEMA DE NIVELES
// ============================================

async function checkLevelUp() {

    if (!userData || !userId) return;

    const currentLevel = userData.stage ?? 1;
    const totalEarned = userData.totalEarned ?? 0;
    const xp = userData.xp ?? 0;
    const xpRequired = userData.xpRequired ?? 100;

    const moneyRequired = calculateMoneyRequired(currentLevel);
    
    // 🔥 SISTEMA HÍBRIDO PROFESIONAL
    if (totalEarned >= moneyRequired && xp >= xpRequired) {

        const userRef = db.collection("users").doc(userId);

        await userRef.update({
            stage: currentLevel + 1,
            xp: 0,
            xpRequired: xpRequired + 50
        });

        showLevelUpScreen(currentLevel + 1);
        updateXPBar();
        showNotification("🎉 ¡Subiste de nivel!", "success");
        
        
        
        const sound = document.getElementById("level-up-sound");
        if (sound) {
            sound.currentTime = 0;
            sound.play().catch(() => {});
        }

        const levelEl = document.getElementById("user-level");
        if (levelEl) {
            levelEl.classList.add("level-up-effect");
            setTimeout(() => {
                levelEl.classList.remove("level-up-effect");
            }, 1000);
        }

        createLevelParticles();
    }
}
// ============================================
// MINERÍA
// ============================================

async function startMining() {

    if (!userData || !userId) return;
    if (turboActive) return;

    if (userData.energy <= 0) {
        showNotification("Sin energía", "error");
        return;
    }

    const userRef = db.collection("users").doc(userId);

    turboActive = true;
    turboMultiplier = 2;
    turboTimeLeft = 10;

    await userRef.update({
        energy: firebase.firestore.FieldValue.increment(-1)
    });

    const mineBtn = document.getElementById("mine-btn");

    turboInterval = setInterval(() => {

        turboTimeLeft--;

        if (mineBtn) {
            mineBtn.textContent = `🚀 TURBO ACTIVO (${turboTimeLeft}s)`;
            mineBtn.classList.add("mining");
        }

        if (turboTimeLeft <= 0) {
            clearInterval(turboInterval);
            turboMultiplier = 1;
            turboActive = false;

            if (mineBtn) {
                mineBtn.textContent = "⛏️ Iniciar Minería";
                mineBtn.classList.remove("mining");
            }
        }

    }, 1000);
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


async function activateVIP() {

    if (!userId) return;

    // ============================
    // EVITAR DOBLE ACTIVACIÓN
    // ============================

    if (userData.vip && Date.now() < userData.vipExpires) {
        showNotification("Ya tienes VIP activo 👑");
        return;
    }

    const userRef = db.collection("users").doc(userId);

    const vipDuration = 24 * 60 * 60 * 1000; // 24 horas

    await userRef.update({
        vip: true,
        vipExpires: Date.now() + vipDuration
    });

    showNotification("VIP Activado 🚀");
}


// ============================================
// ACTUALIZADOR VIP EN TIEMPO REAL
// ============================================

function startVIPCountdown() {

    setInterval(() => {

        if (!userData) return;

        const vipElement = document.getElementById("vip-status");
        if (!vipElement) return;

        if (userData.vip && Date.now() < userData.vipExpires) {

            const timeLeft = userData.vipExpires - Date.now();
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

            vipElement.textContent =
                `👑 VIP Activo - ${hours}h ${minutes}m ${seconds}s`;

        } else {

            vipElement.textContent = "";

            // Si expiró, desactivar VIP automáticamente
            if (userData.vip && Date.now() >= userData.vipExpires) {
                userData.vip = false;
            }
        }

    }, 1000);
}

// ============================================
// COPIAR ENLACE DE REFERIDO
// ============================================

function copyRefLink() {

    const input = document.getElementById("ref-link");
    if (!input) return;

    input.select();
    input.setSelectionRange(0, 99999);

    navigator.clipboard.writeText(input.value);

    showNotification("Enlace copiado 📋");
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

    firebase.auth().signInAnonymously()
    .then(() => {

        console.log("Autenticado en Firebase");
        // Iniciar usuario siempre
        initUser();

        const mineBtn = document.getElementById("mine-btn");
        if (mineBtn) {
            mineBtn.addEventListener("click", startMining);
        }

        //  PRODUCCIÓN AUTOMÁTICA (solo una vez)
        setInterval(async () => {

            if (!userData || !userId) return;

            const production = calculateProduction() * turboMultiplier;
            if (production <= 0) return;

            const userRef = db.collection("users").doc(userId);

            await userRef.update({
         balance: firebase.firestore.FieldValue.increment(production),
        totalEarned: firebase.firestore.FieldValue.increment(production)
});

await checkLevelUp();

        }, Game.productionInterval);

        // REGENERACIÓN AUTOMÁTICA DE ENERGÍA BALANCEADA
setInterval(async () => {

    if (!userData || !userId) return;

    const maxEnergy = userData.maxEnergy ?? 100;
    const currentEnergy = userData.energy ?? 0;

    if (currentEnergy >= maxEnergy) return;

    // Si está minando, regenera más lento
    const regenAmount = isMining ? 0.3 : 1;

    const userRef = db.collection("users").doc(userId);

    await userRef.update({
        energy: firebase.firestore.FieldValue.increment(regenAmount)
    });

}, Game.productionInterval);

    })
    .catch((error) => {
        console.error("Error auth:", error);
        showNotification("Error autenticando", "error");
    });

});

// ============================================
// COMPRAR EDIFICIO
// ============================================

async function buyBuilding(key) {

    if (!userData || !userData.buildings[key]) return;

    const required = userData.buildings[key].requiredLevel ?? 1;
    const currentStage = userData.stage ?? 1;

if (currentStage < required) {
    showNotification("🔒 Requiere nivel " + required, "error");
    return;
}

    const building = userData.buildings[key];
    const cost = calculateBuildingCost(building.baseCost, building.level);
    
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
    await addXP(10);
    
}



function createLevelParticles() {
    const levelEl = document.getElementById("user-level");
    if (!levelEl) return;

    const rect = levelEl.getBoundingClientRect();

    for (let i = 0; i < 25; i++) {
        const particle = document.createElement("div");
        particle.classList.add("particle");

        particle.style.left = rect.left + rect.width / 2 + "px";
        particle.style.top = rect.top + rect.height / 2 + "px";

        const x = (Math.random() - 0.5) * 250 + "px";
        const y = (Math.random() - 0.5) * 250 + "px";

        particle.style.setProperty("--x", x);
        particle.style.setProperty("--y", y);

        document.body.appendChild(particle);

        setTimeout(() => {
            particle.remove();
        }, 1000);
    }
}


function showLevelUpScreen(newLevel) {

    const screen = document.getElementById("level-up-screen");
    const text = document.getElementById("new-level-text");
    const explosion = document.querySelector(".explosion-bg");

    if (!screen || !text || !explosion) return;

    text.textContent = "Nivel " + newLevel;

    // 🔥 ACTIVAR SLOW MOTION
    document.body.classList.add("slow-motion");

    setTimeout(() => {

        // Desactivar slow motion justo antes del impacto
        document.body.classList.remove("slow-motion");

        // Reiniciar animación explosión
        explosion.style.animation = "none";
        explosion.offsetHeight;
        explosion.style.animation = "explodeGlow 0.8s ease-out forwards";

        screen.classList.add("active");

        // 💥 SHAKE
        document.body.classList.add("shake");

        setTimeout(() => {
            document.body.classList.remove("shake");
        }, 600);

        // Vibración real Android
        if (navigator.vibrate) {
            navigator.vibrate(300);
        }

        // Cerrar pantalla
        setTimeout(() => {
            screen.classList.remove("active");
        }, 2500);

    }, 400); // ← Tiempo del slow motion

}



async function addXP(amount) {

    if (!userId) return;

    const userRef = db.collection("users").doc(userId);

    await db.runTransaction(async (transaction) => {

        const doc = await transaction.get(userRef);
        if (!doc.exists) return;

        const data = doc.data();

        const xp = data.xp ?? 0;
        const xpRequired = data.xpRequired ?? 100;

        // 🚫 Si ya está lleno, no hacer nada
        if (xp >= xpRequired) return;

        const newXP = Math.min(xp + amount, xpRequired);

        transaction.update(userRef, {
            xp: newXP
        });

    });

    await checkLevelUp();
}



startVIPCountdown();

// Exponer funciones
window.buyUpgrade = buyUpgrade;
window.withdraw = withdraw;
window.buyBuilding = buyBuilding;






































































































