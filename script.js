// script.js
// script.js
// ============================================
// CONFIGURACIÓN INICIAL
// ============================================
// Variables globales
let userId = null;
let userData = null;
let miningInterval = null;
let isMining = false;
// Inicializar Telegram WebApp
const telegram = window.Telegram.WebApp;
telegram.expand(); // Expande la app a pantalla completa
telegram.enableClosingConfirmation(); // Pide confirmación antes de cerrar
// ============================================
// FUNCIONES DE UTILIDAD
// ============================================
function showNotification(message, type = 'info') {
const notification = document.createElement('div');
notification.className = `notification ${type}`;
notification.textContent = message;
document.body.appendChild(notification);
setTimeout(() => {
notification.remove();
}, 3000);
}
function formatNumber(num) {
return new Intl.NumberFormat().format(Math.floor(num));
}
// ============================================
// INICIALIZACIÓN DEL USUARIO
// ============================================
async function initUser() {
try {
// Obtener datos del usuario de Telegram
const tgUser = telegram.initDataUnsafe?.user;
if (!tgUser) {
showNotification('Error: No se pudo obtener usuario de Telegram', 'error');
return;
}
userId = tgUser.id.toString();
// Mostrar información básica del usuario
document.getElementById('user-name').textContent = tgUser.first_name || 'Usuario';
document.getElementById('user-avatar').src = tgUser.photo_url ||
'https://via.placeholder.com/50';
// Buscar usuario en Firebase o crearlo
const userRef = db.collection('users').doc(userId);
const doc = await userRef.get();

if (!doc.exists) {

    const newUser = {
        nombre: tgUser.first_name || '',
        username: tgUser.username || '',
        puntos: 1000,
        nivel: 1,
        energia: 100,
        max_energia: 100,
        tasa_minado: 500,
        ultimo_minado: firebase.firestore.FieldValue.serverTimestamp(),
        fecha_registro: firebase.firestore.FieldValue.serverTimestamp(),
        referido_por: null,
        wallet_ton: ''
    };

    await userRef.set(newUser);
    userData = newUser;

} else {
    userData = doc.data();
}
// Usuario nuevo - crearlo
const newUser = {
nombre: tgUser.first_name + (tgUser.last_name ? ' ' + tgUser.last_name : ''),
username: tgUser.username || '',
puntos: 1000, // Bono de bienvenida
nivel: 1,
energia: 100,
max_energia: 100,
tasa_minado: 500,
ultimo_minado: new Date().toISOString(),
fecha_registro: new Date().toISOString(),
referido_por: null,
wallet_ton: ''
};
await userRef.set(newUser);
userData = newUser;
showNotification('¡Bienvenido a Bitcoin Miner Pro! Recibiste 1000 puntos de regalo', 'success');
} else {
userData = snapshot.val();
}
// Actualizar UI
updateUI();
// Activar botón de minería
document.getElementById('mine-btn').disabled = false;
// Escuchar cambios en tiempo real
userRef.on('value', (snapshot) => {
userData = snapshot.val();
updateUI();
});
} catch (error) {
console.error('Error inicializando usuario:', error);
showNotification('Error al cargar usuario', 'error');
}
}
function updateUI() {
if (!userData) return;
document.getElementById('user-points').textContent = formatNumber(userData.puntos);
document.getElementById('user-level').textContent = `Nivel ${userData.nivel}`;
document.getElementById('mining-rate').textContent = userData.tasa_minado || 500;
document.getElementById('energy').textContent = Math.floor(userData.energia || 0);
// Actualizar estado del botón de minería
const mineBtn = document.getElementById('mine-btn');
if (isMining) {
mineBtn.textContent = '⛏️ Minando...';
mineBtn.classList.add('mining');
} else {
mineBtn.textContent = '⛏️ Iniciar Minería';
mineBtn.classList.remove('mining');
}
}
// ============================================
// LÓGICA DE MINERÍA
// ============================================
async function startMining() {
if (isMining) {
stopMining();
return;
}
// Verificar energía
if (userData.energia <= 0) {
showNotification('¡Sin energía! Recarga para seguir minando', 'error');
return;
}
isMining = true;
document.getElementById('mine-btn').textContent = '⛏️ Detener Minería';
document.getElementById('mine-btn').classList.add('mining');
// Intervalo de minado (cada 5 segundos)
miningInterval = setInterval(async () => {
if (!isMining) return;
// Verificar energía
if (userData.energia <= 0) {
stopMining();
showNotification('¡Energía agotada!', 'error');
return;
}
// Calcular ganancia (tasa base * nivel)
const ganancia = userData.tasa_minado || 500;
const nuevoPuntos = (userData.puntos || 0) + ganancia;
const nuevaEnergia = (userData.energia || 0) - 1;
// Actualizar en Firebase
try {
const userRef = database.ref('usuarios/' + userId);
await userRef.update({
puntos: nuevoPuntos,
energia: nuevaEnergia,
ultimo_minado: new Date().toISOString()
});
// Feedback visual
showNotification(`+${ganancia} puntos`, 'success');
} catch (error) {
console.error('Error minando:', error);
}
}, 5000); // 5 segundos
}
function stopMining() {
isMining = false;
if (miningInterval) {
clearInterval(miningInterval);
miningInterval = null;
}
updateUI();
}
// ============================================
// TIENDA Y MEJORAS
// ============================================
async function buyUpgrade(tipo) {
if (!userData) return;
const costos = {
'nivel': 1000,
'energia': 100
};
const costo = costos[tipo];
if (userData.puntos < costo) {
showNotification('¡Puntos insuficientes!', 'error');
return;
}
try {
const userRef = database.ref('usuarios/' + userId);
if (tipo === 'nivel') {
// Subir de nivel
const nuevoNivel = (userData.nivel || 1) + 1;
const nuevaTasa = 500 + (nuevoNivel * 100); // Aumenta 100 por nivel
await userRef.update({
puntos: userData.puntos - costo,
nivel: nuevoNivel,
tasa_minado: nuevaTasa
});
showNotification(`¡Subiste a nivel ${nuevoNivel}!`, 'success');
} else if (tipo === 'energia') {
// Recargar energía
await userRef.update({
puntos: userData.puntos - costo,
energia: userData.max_energia || 100
});
showNotification('¡Energía recargada!', 'success');
}
} catch (error) {
console.error('Error comprando mejora:', error);
showNotification('Error al procesar compra', 'error');
}
}
function buyEnergy() {
buyUpgrade('energia');
}
async function buyTurbo() {
if (!userId) return;
try {
// Aquí se integrará con Telegram Stars
// Por ahora simulamos la compra
// Verificar que el usuario puede pagar con Estrellas
if (!telegram.initDataUnsafe?.user) {
showNotification('Error: No se puede procesar pago', 'error');
return;
}
// En un futuro, aquí se integrará el pago real con Estrellas
showNotification('¡Turbo activado! (Modo demo - sin cargo)', 'info');
// Activar turbo temporalmente
const userRef = database.ref('usuarios/' + userId);
const tasaOriginal = userData.tasa_minado;
await userRef.update({
tasa_minado: tasaOriginal * 2
});
// Volver a la normalidad después de 1 hora (3600000 ms)
setTimeout(async () => {
await userRef.update({
tasa_minado: tasaOriginal
});
showNotification('Turbo finalizado', 'info');
}, 60000); // 1 minuto para pruebas (en producción serían 3600000)
} catch (error) {
console.error('Error comprando turbo:', error);
showNotification('Error al activar turbo', 'error');
}
}
// ============================================
// RETIROS A BITCOIN
// ============================================
async function withdraw() {
if (!userData) return;
const walletInput = document.getElementById('wallet-address');
const walletAddress = walletInput.value.trim();
// Validaciones
if (!walletAddress) {
showNotification('Ingresa una dirección de wallet', 'error');
return;
}
if (!walletAddress.startsWith('EQD') && !walletAddress.startsWith('UQ')) {
showNotification('Dirección TON no válida (debe empezar con EQD o UQ)', 'error');
return;
}
const MIN_WITHDRAW = 50000;
if (userData.puntos < MIN_WITHDRAW) {
showNotification(`Mínimo para retirar: ${MIN_WITHDRAW} puntos`, 'error');
return;
}
try {
// Calcular cantidad de BTC (simulado)
const puntosARetirar = Math.floor(userData.puntos / 1000) * 1000; // Redondear a miles
const btcAmount = puntosARetirar * 0.00000001; // Ej: 50,000 puntos = 0.0005 BTC
// Registrar solicitud de retiro en Firebase
const withdrawRef = database.ref('retiros').push();
await withdrawRef.set({
userId: userId,
puntos: puntosARetirar,
btcAmount: btcAmount,
walletAddress: walletAddress,
estado: 'pendiente',
fechaSolicitud: new Date().toISOString()
});
// Actualizar puntos del usuario
const userRef = database.ref('usuarios/' + userId);
await userRef.update({
puntos: userData.puntos - puntosARetirar
});
showNotification(`Solicitud de retiro enviada: ${btcAmount.toFixed(8)} BTC`, 'success');
walletInput.value = ''; // Limpiar campo
// Notificar al admin (tú)
telegram.sendData(JSON.stringify({
type: 'withdraw_request',
userId: userId,
amount: btcAmount,
wallet: walletAddress
}));
} catch (error) {
console.error('Error procesando retiro:', error);
showNotification('Error al procesar retiro', 'error');
}
}
// ============================================
// PROGRAMA DE AFILIADOS
// ============================================
async function handleReferral() {
// Verificar si el usuario llegó por un link de referido
const startParam = telegram.initDataUnsafe?.start_param;
if (startParam && startParam.startsWith('ref_')) {
const referrerId = startParam.replace('ref_', '');
if (referrerId && referrerId !== userId) {
try {
// Actualizar al usuario actual
const userRef = database.ref('usuarios/' + userId);
await userRef.update({
referido_por: referrerId
});
// Dar bono al referidor (10% de los puntos iniciales)
const referrerRef = database.ref('usuarios/' + referrerId);
const referrerSnapshot = await referrerRef.once('value');
if (referrerSnapshot.exists()) {
const referrerData = referrerSnapshot.val();
const bono = 100; // 10% de 1000 puntos de bienvenida
await referrerRef.update({
puntos: (referrerData.puntos || 0) + bono
});
showNotification('¡Gracias por unirte! Tu referido recibió un bono', 'success');
}
} catch (error) {
console.error('Error procesando referido:', error);
}
}
}
}
// ============================================
// EVENTOS Y INICIALIZACIÓN
// ============================================
// Manejar botón de minería
document.getElementById('mine-btn').addEventListener('click', startMining);
// Manejar cierre de la app
window.addEventListener('beforeunload', () => {
if (isMining) {
stopMining();
}
});
// Inicializar cuando cargue la página
document.addEventListener('DOMContentLoaded', async () => {
await initUser();
await handleReferral();
// Regenerar energía cada minuto
setInterval(async () => {
if (userData && userData.energia < userData.max_energia) {
try {
const userRef = database.ref('usuarios/' + userId);
const nuevaEnergia = Math.min(
(userData.energia || 0) + 5,
userData.max_energia || 100
);
await userRef.update({
energia: nuevaEnergia
});
} catch (error) {
console.error('Error regenerando energía:', error);
}
}
}, 60000); // Cada minuto
});
// Exportar funciones globales para los onclick
window.buyUpgrade = buyUpgrade;
window.buyEnergy = buyEnergy;
window.buyTurbo = buyTurbo;

window.withdraw = withdraw;
