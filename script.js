"use strict";

import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";

import {
    getAuth,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

import {
    getDatabase,
    ref,
    get,
    set,
    onValue
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-database.js";

// ========================================
// FIREBASE CONFIGURATION
// ========================================

const firebaseConfig = {
    apiKey: "AIzaSyCMmOj1XKiK5uV1SVWDjlQXpGlYZhJAIVo",
    authDomain: "smartfix-smart-control.firebaseapp.com",
    projectId: "smartfix-smart-control",
    storageBucket: "smartfix-smart-control.firebasestorage.app",
    messagingSenderId: "290143591521",
    appId: "1:290143591521:web:c36fc993040087ef36de20",
    databaseURL: "https://smartfix-smart-control-default-rtdb.asia-southeast1.firebasedatabase.app"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// ========================================
// HTML ELEMENTS
// ========================================

const authSection = document.getElementById("authSection");
const dashboard = document.getElementById("dashboardSection");

const loginForm = document.getElementById("loginForm");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginButton = document.getElementById("loginButton");
const authMessage = document.getElementById("authMessage");

const powerButton = document.getElementById("powerButton");
const lightVisual = document.getElementById("lightVisual");
const deviceBadge = document.getElementById("deviceBadge");
const overviewStatus = document.getElementById("overviewStatus");
const overviewIndicator = document.getElementById("overviewIndicator");
const visualStatus = document.getElementById("visualStatus");
const visualDescription = document.getElementById("visualDescription");
const buttonText = document.getElementById("buttonText");
const activityList = document.getElementById("activityList");
const clearHistory = document.getElementById("clearHistory");
const toast = document.getElementById("toast");

let currentHomeId = null;
let lightIsOn = false;
let unsubscribeLight = null;
let unsubscribeHistory = null;
let toastTimer = null;

// ========================================
// MESSAGES
// ========================================

function showMessage(message, isError = false) {
    if (!authMessage) return;

    authMessage.textContent = message;
    authMessage.style.color = isError ? "#fb7185" : "#22c55e";
}

function showToast(message) {
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

// ========================================
// LIGHT UI
// ========================================

function renderLight() {
    if (lightVisual) {
        lightVisual.classList.toggle("is-on", lightIsOn);
    }

    if (deviceBadge) {
        deviceBadge.textContent = lightIsOn ? "ON" : "OFF";
    }

    if (overviewStatus) {
        overviewStatus.textContent = lightIsOn ? "ON" : "OFF";
    }

    if (overviewIndicator) {
        overviewIndicator.textContent = lightIsOn ? "ACTIVE" : "STANDBY";
    }

    if (visualStatus) {
        visualStatus.textContent = lightIsOn ? "LIGHT IS ON" : "LIGHT IS OFF";
    }

    if (visualDescription) {
        visualDescription.textContent = lightIsOn
            ? "Your light is currently switched on."
            : "Your light is currently switched off.";
    }

    if (buttonText) {
        buttonText.textContent = lightIsOn
            ? "TURN LIGHT OFF"
            : "TURN LIGHT ON";
    }

    if (powerButton) {
        powerButton.setAttribute("aria-pressed", String(lightIsOn));
        powerButton.classList.toggle("is-on", lightIsOn);
    }
}

// ========================================
// ACTIVITY HISTORY
// ========================================

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

function renderHistory(items) {
    if (!activityList) return;

    if (items.length === 0) {
        activityList.innerHTML = `
            <div class="empty-state">
                <span>◷</span>
                <p>No activity yet.</p>
            </div>
        `;
        return;
    }

    activityList.innerHTML = items.map(item => {
        const isOn = item.state === true;
        const timestamp = Number(item.timestamp);
        const time = Number.isFinite(timestamp)
            ? new Date(timestamp).toLocaleString()
            : "Unknown time";

        return `
            <div class="activity-item">
                <div>
                    <strong>${isOn ? "💡 Light turned ON" : "🌙 Light turned OFF"}</strong>
                    <small>${escapeHTML(time)}</small>
                </div>
                <span class="activity-result ${isOn ? "on" : "off"}">
                    ${isOn ? "ON" : "OFF"}
                </span>
            </div>
        `;
    }).join("");
}

// ========================================
// CLEANUP DATABASE LISTENERS
// ========================================

function cleanupListeners() {
    if (unsubscribeLight) unsubscribeLight();
    if (unsubscribeHistory) unsubscribeHistory();

    unsubscribeLight = null;
    unsubscribeHistory = null;
    currentHomeId = null;
}

// ========================================
// LOAD CUSTOMER HOME
// ========================================

async function loadCustomerHome(user) {
    cleanupListeners();

    // Step 1: Find the home assigned to this user's UID.
    const assignmentRef = ref(database, "userHomes/" + user.uid);

    console.log("Logged-in UID:", user.uid);
    console.log("Assignment path:", assignmentRef.toString());

    let assignmentSnapshot;

    try {
        assignmentSnapshot = await get(assignmentRef);
    } catch (error) {
        console.error(
            "UID mapping read failed:",
            error.code,
            error.message
        );

        if (error.code === "PERMISSION_DENIED") {
            throw new Error(
                "Database permission denied. Firebase Realtime Database Rules check karo."
            );
        }

        throw new Error(
            "User assignment read nahi hua. Internet aur Firebase configuration check karo."
        );
    }

    console.log("Assignment exists:", assignmentSnapshot.exists());
    console.log("Assignment value:", assignmentSnapshot.val());

    if (!assignmentSnapshot.exists()) {
        throw new Error(
            "Is UID ke liye userHomes mein ghar assign nahi hai. Console mein UID aur database key compare karo."
        );
    }

    const homeId = assignmentSnapshot.val();

    if (
        typeof homeId !== "string" ||
        !/^[A-Za-z0-9_-]+$/.test(homeId)
    ) {
        throw new Error(
            "userHomes mein ghar ki ID galat hai. Value HOME001 honi chahiye."
        );
    }

    // Step 2: Load the assigned home's information.
    let homeSnapshot;

    try {
        homeSnapshot = await get(ref(database, "homes/" + homeId));
    } catch (error) {
        console.error("Home read error:", error.code, error.message);

        throw new Error(
            error.code === "PERMISSION_DENIED"
                ? "Home database permission denied. Firebase Rules check karo."
                : "Ghar ka data load nahi hua."
        );
    }

    if (!homeSnapshot.exists()) {
        throw new Error(
            "homes/" + homeId + " database mein nahi mila."
        );
    }

    const home = homeSnapshot.val();

    currentHomeId = homeId;

    // Update dashboard information.
    const title = document.querySelector(".welcome-card strong");

    if (title) {
        title.textContent = home.homeName || homeId;
    }

    const deviceName = document.querySelector(".device-title h3");

    if (deviceName) {
        deviceName.textContent = home.deviceName || "Living Room Light";
    }

    const connectionText = document.getElementById("connectionText");

    if (connectionText) {
        connectionText.textContent = "Firebase Connected";
    }

    // Step 3: Listen for live light status changes.
    unsubscribeLight = onValue(
        ref(database, `homes/${homeId}/lightState`),
        snapshot => {
            lightIsOn = snapshot.val() === true;
            renderLight();
        },
        error => {
            console.error("Light listener error:", error.code, error.message);
            showToast("Light status load nahi hua. Database Rules check karo.");
        }
    );

    // Step 4: Listen for activity history.
    unsubscribeHistory = onValue(
        ref(database, `homes/${homeId}/history`),
        snapshot => {
            const value = snapshot.val() || {};

            const items = Object.entries(value)
                .map(([id, item]) => ({ id, ...item }))
                .sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
                .slice(0, 20);

            renderHistory(items);
        },
        error => {
            console.error("History listener error:", error.code, error.message);
        }
    );

    console.log("Assigned home loaded:", homeId);
    renderLight();
}

// ========================================
// LOGIN
// ========================================

if (loginForm) {
    loginForm.addEventListener("submit", async event => {
        event.preventDefault();

        const email = loginEmail.value.trim();
        const password = loginPassword.value;

        if (!email || !password) {
            showMessage("Email aur password dono bharo.", true);
            return;
        }

        if (loginButton) loginButton.disabled = true;

        showMessage("Logging in...");

        try {
            await signInWithEmailAndPassword(auth, email, password);
            loginForm.reset();
        } catch (error) {
            console.error("Login error:", error.code, error.message);

            const messages = {
                "auth/invalid-credential": "Email ya password galat hai.",
                "auth/invalid-email": "Email address sahi nahi hai.",
                "auth/user-not-found": "Is email se account nahi mila.",
                "auth/wrong-password": "Password galat hai.",
                "auth/too-many-requests": "Bahut attempts hue. Baad mein try karo.",
                "auth/network-request-failed": "Internet connection check karo.",
                "auth/operation-not-allowed": "Firebase mein Email/Password sign-in enable karo.",
                "auth/invalid-api-key": "Firebase API key check karo."
            };

            showMessage(
                messages[error.code] || `Login failed: ${error.code || error.message}`,
                true
            );
        } finally {
            if (loginButton) loginButton.disabled = false;
        }
    });
} else {
    console.error("HTML mein loginForm nahi mila.");
}

// ========================================
// LOGOUT BUTTON
// ========================================

function createLogoutButton() {
    let button = document.getElementById("logoutButton");

    if (button) return;

    button = document.createElement("button");
    button.id = "logoutButton";
    button.type = "button";
    button.className = "clear-button";
    button.textContent = "Logout";

    const topbar = document.querySelector(".topbar");

    if (topbar) {
        topbar.appendChild(button);
    }

    button.addEventListener("click", async () => {
        cleanupListeners();

        try {
            await signOut(auth);
            showMessage("Logout successful.");
        } catch (error) {
            console.error("Logout error:", error);
            showToast("Logout nahi hua. Dobara try karo.");
        }
    });
}

// ========================================
// AUTHENTICATION STATE
// ========================================

onAuthStateChanged(
    auth,
    async user => {
        cleanupListeners();

        if (!user) {
            if (authSection) authSection.hidden = false;
            if (dashboard) dashboard.hidden = true;

            const connectionText = document.getElementById("connectionText");

            if (connectionText) {
                connectionText.textContent = "Login Required";
            }

            console.log("SmartFix: No user logged in.");
            return;
        }

        try {
            await loadCustomerHome(user);

            if (authSection) authSection.hidden = true;
            if (dashboard) dashboard.hidden = false;

            createLogoutButton();

            console.log("SmartFix logged in:", user.email, user.uid);
        } catch (error) {
            console.error("Home loading error:", error);

            showMessage(
                error.message || "Dashboard load nahi hua.",
                true
            );

            if (authSection) authSection.hidden = false;
            if (dashboard) dashboard.hidden = true;

            try {
                await signOut(auth);
            } catch (logoutError) {
                console.error("Sign-out error:", logoutError);
            }
        }
    },
    error => {
        console.error("Authentication state error:", error);

        showMessage(
            "Authentication check failed. Page refresh karke dobara try karo.",
            true
        );
    }
);

// ========================================
// LIGHT CONTROL: UPDATE FIREBASE
// ========================================

if (powerButton) {
    powerButton.addEventListener("click", async () => {
        if (!currentHomeId) {
            showToast("Pehle login karo.");
            return;
        }

        const nextState = !lightIsOn;

        powerButton.disabled = true;

        try {
            const timestamp = Date.now();

            await set(
                ref(database, `homes/${currentHomeId}/lightState`),
                nextState
            );

            await set(
                ref(database, `homes/${currentHomeId}/history/${timestamp}`),
                {
                    state: nextState,
                    timestamp
                }
            );

            showToast(
                nextState
                    ? "Light status ON save hua."
                    : "Light status OFF save hua."
            );
        } catch (error) {
            console.error(
                "Database update error:",
                error.code,
                error.message
            );

            showToast(
                error.code === "PERMISSION_DENIED"
                    ? "Permission denied. Firebase Rules check karo."
                    : "Database update nahi hua."
            );
        } finally {
            powerButton.disabled = false;
        }
    });
}

// ========================================
// CLEAR ACTIVITY HISTORY
// ========================================

if (clearHistory) {
    clearHistory.addEventListener("click", async () => {
        if (!currentHomeId) {
            showToast("Pehle login karo.");
            return;
        }

        try {
            await set(
                ref(database, `homes/${currentHomeId}/history`),
                null
            );

            showToast("History clear ho gayi.");
        } catch (error) {
            console.error(
                "Clear history error:",
                error.code,
                error.message
            );

            showToast("History clear nahi hui. Database Rules check karo.");
        }
    });
}

// ========================================
// CURRENT YEAR
// ========================================

const currentYear = document.getElementById("currentYear");

if (currentYear) {
    currentYear.textContent = new Date().getFullYear();
}

console.log("SmartFix Firebase application initialized.");
