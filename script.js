"use strict";

import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";

import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

import { getDatabase, ref, get, set, onValue } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-database.js";

// ======================================== // FIREBASE CONFIGURATION // ========================================

const firebaseConfig = { apiKey: "AIzaSyCMmOj1XKiK5uV1SVWDjlQXpGlYZhJAIVo", authDomain: "smartfix-smart-control.firebaseapp.com", projectId: "smartfix-smart-control", storageBucket: "smartfix-smart-control.firebasestorage.app", messagingSenderId: "290143591521", appId: "1:290143591521:web:c36fc993040087ef36de20", databaseURL: "https://smartfix-smart-control-default-rtdb.asia-southeast1.firebasedatabase.app" };

const app = initializeApp(firebaseConfig); const auth = getAuth(app); const database = getDatabase(app);

// ======================================== // HTML ELEMENTS // ========================================

const authSection = document.getElementById("authSection"); const dashboard = document.getElementById("dashboardSection");

const loginForm = document.getElementById("loginForm"); const loginEmail = document.getElementById("loginEmail"); const loginPassword = document.getElementById("loginPassword"); const loginButton = document.getElementById("loginButton"); const authMessage = document.getElementById("authMessage");

const activityList = document.getElementById("activityList"); const clearHistory = document.getElementById("clearHistory"); const toast = document.getElementById("toast");

let currentHomeId = null; let unsubscribeDevices = null; let unsubscribeHistory = null; let toastTimer = null; let authRequestNumber = 0;

const deviceStates = { livingRoomLight: false, fan: false, bedroomLight: false, mainDoor: false };

// ======================================== // DEVICE CONFIGURATION // ========================================

const devices = { livingRoomLight: { name: "Living Room Light", badge: "livingRoomLightBadge", onLabel: "ON", offLabel: "OFF" }, fan: { name: "Fan", badge: "fanBadge", onLabel: "ON", offLabel: "OFF" }, bedroomLight: { name: "Bedroom Light", badge: "bedroomLightBadge", onLabel: "ON", offLabel: "OFF" }, mainDoor: { name: "Main Door", badge: "mainDoorBadge", onLabel: "UNLOCKED", offLabel: "LOCKED" } };

// ======================================== // MESSAGES // ========================================

function showMessage(message, isError = false) { if (!authMessage) return;

authMessage.textContent = message; authMessage.style.color = isError ? "#fb7185" : "#22c55e"; }

function showToast(message) { if (!toast) { console.log(message); return; }

toast.textContent = message; toast.classList.add("show");

clearTimeout(toastTimer);

toastTimer = setTimeout(() => { toast.classList.remove("show"); }, 3000); }

// ======================================== // HTML ESCAPING // ========================================

function escapeHTML(value) { return String(value) .replace(/&/g, "&") .replace(/</g, "<") .replace(/>/g, ">") .replace(/"/g, """) .replace(/'/g, "'"); }

// ======================================== // CLEANUP // ========================================

function cleanupListeners() { if (unsubscribeDevices) unsubscribeDevices(); if (unsubscribeHistory) unsubscribeHistory();

unsubscribeDevices = null; unsubscribeHistory = null; currentHomeId = null;

Object.keys(deviceStates).forEach(deviceId => { deviceStates[deviceId] = false; }); }

// ======================================== // RENDER DEVICES // ========================================

function renderDevices() { for (const [deviceId, device] of Object.entries(devices)) { const isOn = deviceStates[deviceId] === true;

const badge = document.getElementById(device.badge);

if (badge) { badge.textContent = isOn ? device.onLabel : device.offLabel; }

document.querySelectorAll([data-device="${deviceId}"]) .forEach(button => { button.setAttribute("aria-pressed", String(isOn)); button.classList.toggle("is-on", isOn);

const label = button.querySelector(".device-button-text");

if (label) { if (deviceId === "mainDoor") { label.textContent = isOn ? "LOCK DOOR" : "UNLOCK DOOR"; } else { label.textContent = isOn ? "TURN OFF" : "TURN ON"; } }

const symbol = button.querySelector(".power-symbol");

if (symbol && deviceId === "mainDoor") { symbol.textContent = isOn ? "🔓" : "🔒"; } }); }

const lightOn = deviceStates.livingRoomLight;

const overviewStatus = document.getElementById("overviewStatus"); if (overviewStatus) { overviewStatus.textContent = lightOn ? "ON" : "OFF"; }

const overviewIndicator = document.getElementById("overviewIndicator"); if (overviewIndicator) { overviewIndicator.textContent = lightOn ? "ACTIVE" : "STANDBY"; }

const lightVisual = document.getElementById("lightVisual"); if (lightVisual) { lightVisual.classList.toggle("is-on", lightOn); }

const visualStatus = document.getElementById("visualStatus"); if (visualStatus) { visualStatus.textContent = lightOn ? "LIGHT IS ON" : "LIGHT IS OFF"; }

const visualDescription = document.getElementById("visualDescription"); if (visualDescription) { visualDescription.textContent = lightOn ? "Your living room light is switched on." : "Your living room light is switched off."; }

const extraStatuses = { fanVisualStatus: deviceStates.fan ? "FAN IS ON" : "FAN IS OFF", bedroomVisualStatus: deviceStates.bedroomLight ? "LIGHT IS ON" : "LIGHT IS OFF", doorVisualStatus: deviceStates.mainDoor ? "DOOR IS UNLOCKED" : "DOOR IS LOCKED" };

for (const [elementId, text] of Object.entries(extraStatuses)) { const element = document.getElementById(elementId); if (element) element.textContent = text; }

const extraDescriptions = { fanVisualDescription: deviceStates.fan ? "Your fan status is ON." : "Your fan status is OFF.",

bedroomVisualDescription: deviceStates.bedroomLight ? "Your bedroom light is switched on." : "Your bedroom light is switched off.",

doorVisualDescription: deviceStates.mainDoor ? "The recorded door status is unlocked." : "The recorded door status is locked." };

for (const [elementId, text] of Object.entries(extraDescriptions)) { const element = document.getElementById(elementId); if (element) element.textContent = text; } }

// ======================================== // ACTIVITY HISTORY // ========================================

function renderHistory(items) { if (!activityList) return;

if (items.length === 0) { activityList.innerHTML = <div class="empty-state"> <span>◷</span> <p>No activity yet.</p> </div> ; return; }

activityList.innerHTML = items.map(item => { const isOn = item.state === true; const deviceName = escapeHTML(item.name || "Device"); const timestamp = Number(item.timestamp);

const time = Number.isFinite(timestamp) ? new Date(timestamp).toLocaleString() : "Unknown time";

const isDoor = item.device === "mainDoor";

let actionText;

if (isDoor) { actionText = isOn ? "Door unlocked" : "Door locked"; } else { actionText = ${deviceName} turned ${isOn ? "ON" : "OFF"}; }

return ` <div class="activity-item"> <div> <strong>
𝑒
𝑠
𝑐
𝑎
𝑝
𝑒
𝐻
𝑇
𝑀
𝐿
(
𝑎
𝑐
𝑡
𝑖
𝑜
𝑛
𝑇
𝑒
𝑥
𝑡
)
<
/
𝑠
𝑡
𝑟
𝑜
𝑛
𝑔
>
<
𝑠
𝑚
𝑎
𝑙
𝑙
>
{escapeHTML(time)}</small> </div>

<span class="activity-result ${isOn ? "on" : "off"}"> ${isDoor ? (isOn ? "UNLOCKED" : "LOCKED") : (isOn ? "ON" : "OFF")} </span> </div> `; }).join(""); }

// ======================================== // LOAD CUSTOMER HOME // ========================================

async function loadCustomerHome(user) { cleanupListeners();

const assignmentRef = ref(database, userHomes/${user.uid});

console.log("Logged-in UID:", user.uid); console.log("Assignment path:", assignmentRef.toString());

let assignmentSnapshot;

try { assignmentSnapshot = await get(assignmentRef); } catch (error) { console.error("Assignment error:", error.code, error.message);

throw new Error( error.code === "PERMISSION_DENIED" ? "Database permission denied. Firebase Rules check karo." : "Customer assignment load nahi hua." ); }

console.log("Assignment exists:", assignmentSnapshot.exists()); console.log("Assignment value:", assignmentSnapshot.val());

if (!assignmentSnapshot.exists()) { throw new Error( Is account ko ghar assign nahi hai. Firebase mein userHomes/${user.uid} check karo. ); }

const homeId = assignmentSnapshot.val();

if ( typeof homeId !== "string" || !/^[A-Za-z0-9_-]+$/.test(homeId) ) { throw new Error("Assigned home ID galat hai."); }

let homeSnapshot;

try { homeSnapshot = await get(ref(database, homes/${homeId})); } catch (error) { console.error("Home read error:", error.code, error.message);

throw new Error( error.code === "PERMISSION_DENIED" ? "Home read permission denied. Firebase Rules check karo." : "Home data load nahi hua." ); }

if (!homeSnapshot.exists()) { throw new Error(homes/${homeId} database mein nahi mila.); }

const home = homeSnapshot.val();

currentHomeId = homeId;

const homeTitle = document.querySelector(".welcome-card strong"); if (homeTitle) { homeTitle.textContent = home.homeName || homeId; }

const homeNameDisplay = document.getElementById("homeNameDisplay"); if (homeNameDisplay) { homeNameDisplay.textContent = home.homeName || homeId; }

const connectionText = document.getElementById("connectionText"); if (connectionText) { connectionText.textContent = "Firebase Connected"; }

// Listen to device states. unsubscribeDevices = onValue( ref(database, homes/${homeId}), snapshot => { const currentHome = snapshot.val() || {};

for (const deviceId of Object.keys(devices)) { deviceStates[deviceId] = currentHome[deviceId] === true; }

renderDevices(); }, error => { console.error("Device listener error:", error.code, error.message); showToast("Device status load nahi hua. Firebase Rules check karo."); } );

// Listen to activity history. unsubscribeHistory = onValue( ref(database, homes/${homeId}/history), snapshot => { const value = snapshot.val() || {};

const items = Object.entries(value) .filter(([, item]) => item && typeof item === "object") .map(([id, item]) => ({ id, ...item })) .sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0)) .slice(0, 20);

renderHistory(items); }, error => { console.error("History listener error:", error.code, error.message); } );

console.log("Assigned home loaded:", homeId); renderDevices(); }

// ======================================== // LOGIN // ========================================

if (loginForm) { loginForm.addEventListener("submit", async event => { event.preventDefault();

const email = loginEmail.value.trim(); const password = loginPassword.value;

if (!email || !password) { showMessage("Email aur password dono bharo.", true); return; }

if (loginButton) loginButton.disabled = true;

showMessage("Logging in...");

try { await signInWithEmailAndPassword(auth, email, password); loginForm.reset(); } catch (error) { console.error("Login error:", error.code, error.message);

const messages = { "auth/invalid-credential": "Email ya password galat hai.", "auth/invalid-email": "Email address sahi nahi hai.", "auth/user-not-found": "Is email se account nahi mila.", "auth/wrong-password": "Password galat hai.", "auth/too-many-requests": "Bahut attempts hue. Baad mein try karo.", "auth/network-request-failed": "Internet connection check karo.", "auth/operation-not-allowed": "Firebase mein Email/Password sign-in enable karo.", "auth/invalid-api-key": "Firebase API key check karo." };

showMessage( messages[error.code] || Login failed: ${error.code || error.message}, true ); } finally { if (loginButton) loginButton.disabled = false; } }); } else { console.error("HTML mein loginForm nahi mila."); }

// ======================================== // LOGOUT BUTTON // ========================================

function createLogoutButton() { let button = document.getElementById("logoutButton");

if (button) return;

button = document.createElement("button"); button.id = "logoutButton"; button.type = "button"; button.className = "clear-button"; button.textContent = "Logout";

const topbar = document.querySelector(".topbar");

if (topbar) { topbar.appendChild(button); }

button.addEventListener("click", async () => { cleanupListeners();

try { await signOut(auth); showMessage("Logout successful."); } catch (error) { console.error("Logout error:", error); showToast("Logout nahi hua. Dobara try karo."); } }); }

// ======================================== // AUTHENTICATION STATE // ========================================

onAuthStateChanged( auth, async user => { const requestNumber = ++authRequestNumber;

cleanupListeners();

if (!user) { if (authSection) authSection.hidden = false; if (dashboard) dashboard.hidden = true;

const connectionText = document.getElementById("connectionText"); if (connectionText) { connectionText.textContent = "Login Required"; }

console.log("SmartFix: No user logged in."); return; }

try { await loadCustomerHome(user);

if (requestNumber !== authRequestNumber) return;

if (authSection) authSection.hidden = true; if (dashboard) dashboard.hidden = false;

createLogoutButton();

console.log("SmartFix logged in:", user.email, user.uid); } catch (error) { if (requestNumber !== authRequestNumber) return;

console.error("Home loading error:", error);

showMessage(error.message || "Dashboard load nahi hua.", true);

if (authSection) authSection.hidden = false; if (dashboard) dashboard.hidden = true;

try { await signOut(auth); } catch (logoutError) { console.error("Sign-out error:", logoutError); } } }, error => { console.error("Authentication state error:", error);

showMessage( "Authentication check failed. Page refresh karke try karo.", true ); } );

// ======================================== // MULTI-DEVICE CONTROL // ========================================

document.querySelectorAll("[data-device]").forEach(button => { button.addEventListener("click", async () => { if (!currentHomeId || !auth.currentUser) { showToast("Pehle login karo."); return; }

const deviceId = button.dataset.device;

if (!Object.prototype.hasOwnProperty.call(devices, deviceId)) { showToast("Unknown device."); return; }

const nextState = !deviceStates[deviceId];

button.disabled = true;

try { const timestamp = Date.now();

await set( ref(database, homes/${currentHomeId}/${deviceId}), nextState );

await set( ref(database, homes/${currentHomeId}/history/${timestamp}), { device: deviceId, name: devices[deviceId].name, state: nextState, timestamp } );

showToast( ${devices[deviceId].name}: ${ deviceId === "mainDoor" ? (nextState ? "UNLOCKED" : "LOCKED") : (nextState ? "ON" : "OFF") } ); } catch (error) { console.error("Device update error:", error.code, error.message);

showToast( error.code === "PERMISSION_DENIED" ? "Permission denied. Firebase Rules check karo." : "Device update nahi hua." ); } finally { button.disabled = false; } }); });

// ======================================== // CLEAR HISTORY // ========================================

if (clearHistory) { clearHistory.addEventListener("click", async () => { if (!currentHomeId || !auth.currentUser) { showToast("Pehle login karo."); return; }

try { await set( ref(database, homes/${currentHomeId}/history), null );

showToast("Activity history clear ho gayi."); } catch (error) { console.error("Clear history error:", error.code, error.message); showToast("History clear nahi hui. Firebase Rules check karo."); } }); }

// ======================================== // CURRENT YEAR // ========================================

const currentYear = document.getElementById("currentYear");

if (currentYear) { currentYear.textContent = new Date().getFullYear(); }

console.log("SmartFix Firebase application initialized.");
