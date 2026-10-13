"use strict";

import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";

import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

// ======================================== // FIREBASE CONFIGURATION // ========================================

const firebaseConfig = { apiKey: "AIzaSyCMmOj1XKiK5uV1SVWDjlQXpGlYZhJAIVo", authDomain: "smartfix-smart-control.firebaseapp.com", projectId: "smartfix-smart-control", storageBucket: "smartfix-smart-control.firebasestorage.app", messagingSenderId: "290143591521", appId: "1:290143591521:web:c36fc993040087ef36de20" };

const app = initializeApp(firebaseConfig); const auth = getAuth(app);

// ======================================== // HTML ELEMENTS // ========================================

const authSection = document.getElementById("authSection"); const dashboard = document.getElementById("dashboardSection");

const loginForm = document.getElementById("loginForm"); const loginEmail = document.getElementById("loginEmail"); const loginPassword = document.getElementById("loginPassword"); const loginButton = document.getElementById("loginButton"); const authMessage = document.getElementById("authMessage");

// ======================================== // MESSAGE HELPER // ========================================

function showMessage(message, isError = false) { if (!authMessage) return;

authMessage.textContent = message; authMessage.style.color = isError ? "#fb7185" : "#22c55e"; }

// ======================================== // FIREBASE LOGIN // ========================================

if (loginForm) { loginForm.addEventListener("submit", async (event) => { event.preventDefault();

const email = loginEmail.value.trim(); const password = loginPassword.value;

if (!email || !password) { showMessage("Email aur password dono bharo.", true); return; }

loginButton.disabled = true; showMessage("Logging in...");

try {
    await signInWithEmailAndPassword(auth, email, password);

    showMessage("Login successful!");

    loginForm.reset();

} catch (error) {
    console.error(
        "Firebase login error:",
        error.code,
        error.message
    );

    const messages = {
        "auth/invalid-email": "Email address sahi nahi hai.",
        "auth/invalid-credential": "Email ya password galat hai.",
        "auth/user-not-found": "Is email se account nahi mila.",
        "auth/wrong-password": "Password galat hai.",
        "auth/too-many-requests": "Bahut attempts hue. Thodi der baad try karo.",
        "auth/network-request-failed": "Internet connection check karo.",
        "auth/operation-not-allowed": "Firebase mein Email/Password sign-in enable karo.",
        "auth/invalid-api-key": "Firebase API key check karo."
    };

    showMessage(
        messages[error.code] ||
        `Login failed: ${error.code || error.message}`,
        true
    );

} finally {
    loginButton.disabled = false;
}
// ======================================== // AUTHENTICATION STATE // ========================================

onAuthStateChanged(auth, (user) => { if (user) { if (authSection) authSection.hidden = true; if (dashboard) dashboard.hidden = false;

console.log("SmartFix logged in:", user.email);

// Logged-in user ke liye logout button let logoutButton = document.getElementById("logoutButton");

if (!logoutButton && dashboard) { logoutButton = document.createElement("button"); logoutButton.id = "logoutButton"; logoutButton.type = "button"; logoutButton.textContent = "Logout"; logoutButton.className = "clear-button";

const topbar = document.querySelector(".topbar");

if (topbar) { topbar.appendChild(logoutButton); }

logoutButton.addEventListener("click", logoutUser); }

} else { if (authSection) authSection.hidden = false; if (dashboard) dashboard.hidden = true;

console.log("SmartFix: No user logged in."); } });

// ======================================== // LOGOUT // ========================================

async function logoutUser() { try { await signOut(auth); showMessage("Logout successful."); } catch (error) { console.error("Logout error:", error); showMessage("Logout nahi hua. Dobara try karo.", true); } }

// ======================================== // BASIC DASHBOARD DEMO // ========================================

const powerButton = document.getElementById("powerButton"); const lightVisual = document.getElementById("lightVisual"); const deviceBadge = document.getElementById("deviceBadge"); const overviewStatus = document.getElementById("overviewStatus"); const overviewIndicator = document.getElementById("overviewIndicator"); const visualStatus = document.getElementById("visualStatus"); const visualDescription = document.getElementById("visualDescription"); const buttonText = document.getElementById("buttonText"); const activityList = document.getElementById("activityList"); const clearHistory = document.getElementById("clearHistory"); const toast = document.getElementById("toast");

let lightIsOn = false; let history = [];

function showToast(message) { if (!toast) return;

toast.textContent = message; toast.classList.add("show");

setTimeout(() => toast.classList.remove("show"), 3000); }

function renderLight() { if (lightVisual) lightVisual.classList.toggle("is-on", lightIsOn);

if (deviceBadge) { deviceBadge.textContent = lightIsOn ? "ON" : "OFF"; }

if (overviewStatus) { overviewStatus.textContent = lightIsOn ? "ON" : "OFF"; }

if (overviewIndicator) { overviewIndicator.textContent = lightIsOn ? "ACTIVE" : "STANDBY"; }

if (visualStatus) { visualStatus.textContent = lightIsOn ? "LIGHT IS ON" : "LIGHT IS OFF"; }

if (visualDescription) { visualDescription.textContent = lightIsOn ? "Your light is currently switched on." : "Your light is currently switched off."; }

if (buttonText) { buttonText.textContent = lightIsOn ? "TURN OFF LIGHT" : "TURN ON LIGHT"; }

if (powerButton) { powerButton.setAttribute("aria-pressed", String(lightIsOn)); powerButton.classList.toggle("is-on", lightIsOn); } }

function renderHistory() { if (!activityList) return;

if (history.length === 0) 
    activityList.innerHTML = `
    <div class="empty-state">
        <span>◷</span>
        <p>No activity yet.</p>
    </div>
`; return; }

activityList.innerHTML = history.map(item => <div class="activity-item"> <div> <strong>${item.on ? "💡 Light turned ON" : "🌙 Light turned OFF"}</strong> <small>${item.time}</small> </div> <span class="activity-result ${item.on ? "on" : "off"}"> ${item.on ? "ON" : "OFF"} </span> </div> ).join(""); }

if (powerButton) { powerButton.addEventListener("click", () => { lightIsOn = !lightIsOn; renderLight();

history.unshift({ on: lightIsOn, time: new Date().toLocaleString() });

history = history.slice(0, 20); renderHistory();

showToast( lightIsOn ? "Demo: Light switched ON." : "Demo: Light switched OFF." ); }); }

if (clearHistory) { clearHistory.addEventListener("click", () => { history = []; renderHistory(); showToast("Activity history cleared."); }); }

renderLight(); renderHistory();

const currentYear = document.getElementById("currentYear");

if (currentYear) { currentYear.textContent = new Date().getFullYear(); }

console.log("SmartFix application initialized.");
