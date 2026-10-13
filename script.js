"use strict";

// ======================================== // FIREBASE SDK IMPORTS // ========================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import {
    getDatabase,
    ref,
    set,
    onValue
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-database.js";

import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

// ======================================== // FIREBASE CONFIGURATION // ========================================

const firebaseConfig = { apiKey: "AIzaSyCMmOj1XKiK5uV1SVWDjlQXpGlYZhJAIVo", authDomain: "smartfix-smart-control.firebaseapp.com", projectId: "smartfix-smart-control", storageBucket: "smartfix-smart-control.firebasestorage.app", messagingSenderId: "290143591521", appId: "1:290143591521:web:c36fc993040087ef36de20" };

const app = initializeApp(firebaseConfig); const auth = getAuth(app);

// ========================================
// FIREBASE REALTIME DATABASE
// ========================================

const database = getDatabase(
    app,
    "https://smartfix-smart-control-default-rtdb.asia-southeast1.firebasedatabase.app"
);

// ======================================== // HTML ELEMENTS // ========================================

const authSection = document.getElementById("authSection"); const dashboard = document.getElementById("dashboardSection");

const loginForm = document.getElementById("loginForm"); const loginEmail = document.getElementById("loginEmail"); const loginPassword = document.getElementById("loginPassword"); const loginButton = document.getElementById("loginButton"); const authMessage = document.getElementById("authMessage");

const powerButton = document.getElementById("powerButton"); const lightVisual = document.getElementById("lightVisual"); const deviceBadge = document.getElementById("deviceBadge");

const overviewStatus = document.getElementById("overviewStatus"); const overviewIndicator = document.getElementById("overviewIndicator");

const visualStatus = document.getElementById("visualStatus"); const visualDescription = document.getElementById("visualDescription"); const buttonText = document.getElementById("buttonText");

const activityList = document.getElementById("activityList"); const clearHistory = document.getElementById("clearHistory"); const toast = document.getElementById("toast");

const connectionText = document.getElementById("connectionText"); const currentYear = document.getElementById("currentYear");

// ======================================== // APPLICATION STATE // ========================================

let lightIsOn = false; let activityHistory = [];

let toastTimer = null;

// ======================================== // AUTHENTICATION MESSAGE // ========================================

function showMessage(message, isError = false) { if (!authMessage) return;

authMessage.textContent = message;

authMessage.style.color = isError ? "#fb7185" : "#22c55e"; }

// ========================================
// FRIENDLY FIREBASE ERRORS
// ========================================

function getFriendlyError(code) {
    const messages = {
        "auth/invalid-email": "Email address sahi nahi hai.",
        "auth/invalid-credential": "Email ya password galat hai.",
        "auth/user-not-found": "Is email se account nahi mila.",
        "auth/wrong-password": "Password galat hai.",
        "auth/too-many-requests": "Bahut attempts hue. Thodi der baad try karo.",
        "auth/network-request-failed": "Internet connection check karo.",
        "auth/operation-not-allowed": "Firebase mein Email/Password sign-in enable karo.",
        "auth/invalid-api-key": "Firebase API key check karo.",
        "auth/unauthorized-domain": "Firebase Authentication ke Authorized domains mein website ka domain add karo.",
        "auth/internal-error": "Firebase mein internal error aaya. Console check karo."
    };

    if (messages[code]) {
        return messages[code];
    }

    return "Login failed: " + String(code || "Unknown error");
}

// ======================================== // LOGIN FORM // ========================================

if (loginForm) { loginForm.addEventListener("submit", async (event) => { event.preventDefault();

const email = loginEmail.value.trim(); const password = loginPassword.value;

if (!email || !password) { showMessage( "Email aur password dono bharo.", true ); return; }

if (loginButton) { loginButton.disabled = true; loginButton.textContent = "Logging in..."; }

showMessage("Firebase se login verify ho raha hai...");

try { await signInWithEmailAndPassword( auth, email, password );

showMessage("Login successful!");

loginForm.reset();

// Dashboard visibility onAuthStateChanged handle karega.

} catch (error) { console.error( "Firebase login error:", error.code, error.message );

showMessage( getFriendlyError(error.code), true );

} finally { if (loginButton) { loginButton.disabled = false; loginButton.textContent = "Login"; } } });

} else { console.error("HTML mein loginForm nahi mila."); }

// ======================================== // AUTHENTICATION STATE // ========================================

onAuthStateChanged( auth, (user) => { if (user) { // User logged in.

if (authSection) { authSection.hidden = true; }

if (dashboard) { dashboard.hidden = false; }

if (connectionText) { connectionText.textContent = "Demo Mode"; }

console.log( "SmartFix logged in:", user.email );

createLogoutButton();

} else { // User logged out.

if (authSection) { authSection.hidden = false; }

if (dashboard) { dashboard.hidden = true; }

console.log("SmartFix: No user logged in."); } }, (error) => { console.error( "Authentication state error:", error );

showMessage( "Authentication check failed. Page refresh karke dobara try karo.", true ); } );

// ======================================== // LOGOUT BUTTON // ========================================

function createLogoutButton() { let logoutButton = document.getElementById("logoutButton");

if (logoutButton) return;

const topbar = document.querySelector(".topbar");

if (!topbar) { console.error("Topbar nahi mila."); return; }

logoutButton = document.createElement("button");

logoutButton.id = "logoutButton"; logoutButton.type = "button"; logoutButton.textContent = "Logout"; logoutButton.className = "clear-button";

logoutButton.style.marginLeft = "12px";

topbar.appendChild(logoutButton);

logoutButton.addEventListener( "click", logoutUser ); }

async function logoutUser() { try { await signOut(auth);

showMessage("Logout successful.");

} catch (error) { console.error("Logout error:", error);

showMessage( "Logout nahi hua. Dobara try karo.", true ); } }

// ======================================== // TOAST NOTIFICATION // ========================================

function showToast(message) { if (!toast) { console.log(message); return; }

toast.textContent = message; toast.classList.add("show");

clearTimeout(toastTimer);

toastTimer = setTimeout(() => { toast.classList.remove("show"); }, 3000); }

// ======================================== // UPDATE LIGHT INTERFACE // ========================================

function renderLight() { if (lightVisual) { lightVisual.classList.toggle( "is-on", lightIsOn ); }

if (deviceBadge) { deviceBadge.textContent = lightIsOn ? "ON" : "OFF";

deviceBadge.style.color = lightIsOn ? "#22c55e" : "#fbbf24"; }

if (overviewStatus) { overviewStatus.textContent = lightIsOn ? "ON" : "OFF"; }

if (overviewIndicator) { overviewIndicator.textContent = lightIsOn ? "ACTIVE" : "STANDBY"; }

if (visualStatus) { visualStatus.textContent = lightIsOn ? "LIGHT IS ON" : "LIGHT IS OFF"; }

if (visualDescription) { visualDescription.textContent = lightIsOn ? "Your light is currently switched on." : "Your light is currently switched off."; }

if (buttonText) { buttonText.textContent = lightIsOn ? "TURN OFF LIGHT" : "TURN ON LIGHT"; }

if (powerButton) { powerButton.setAttribute( "aria-pressed", String(lightIsOn) );

powerButton.classList.toggle( "is-on", lightIsOn ); } }

// ========================================
// ACTIVITY HISTORY
// ========================================

function renderHistory() {
    if (!activityList) return;

    if (activityHistory.length === 0) {
        activityList.innerHTML = `
            <div class="empty-state">
                <span>◷</span>
                <p>No activity yet.</p>
            </div>
        `;
        return;
    }

    activityList.innerHTML = activityHistory.map(item => {
        const isOn = item.on === true;

        return `
            <div class="activity-item">
                <div>
                    <strong>
                        ${isOn ? "💡 Light turned ON" : "🌙 Light turned OFF"}
                    </strong>
                    <small>${escapeHTML(item.time)}</small>
                </div>

                <span class="activity-result ${isOn ? "on" : "off"}">
                    ${isOn ? "ON" : "OFF"}
                </span>
            </div>
        `;
    }).join("");
}


// ========================================
// ESCAPE HTML
// ========================================

function escapeHTML(value) {
    const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    };

    return String(value).replace(/[&<>"']/g, character => {
        return entities[character];
    });
}
// ======================================== // LIGHT CONTROL - DEMO ONLY // ========================================

if (powerButton) { powerButton.addEventListener("click", () => { lightIsOn = !lightIsOn;

renderLight();

activityHistory.unshift({ on: lightIsOn, time: new Date().toLocaleString() });

activityHistory = activityHistory.slice(0, 20);

renderHistory();

showToast( lightIsOn ? "Demo: Light switched ON." : "Demo: Light switched OFF." ); }); }

// ======================================== // CLEAR HISTORY // ========================================

if (clearHistory) { clearHistory.addEventListener("click", () => { activityHistory = [];

renderHistory();

showToast("Activity history cleared."); }); }

// ======================================== // INITIALIZE DASHBOARD // ========================================

if (currentYear) { currentYear.textContent = new Date().getFullYear(); }

renderLight(); renderHistory();

console.log("SmartFix application initialized.");
