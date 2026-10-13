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
let toastTimer;

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
    toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
}

function renderLight() {
    if (lightVisual) lightVisual.classList.toggle("is-on", lightIsOn);

    if (deviceBadge) deviceBadge.textContent = lightIsOn ? "ON" : "OFF";
    if (overviewStatus) overviewStatus.textContent = lightIsOn ? "ON" : "OFF";

    if (overviewIndicator) {
        overviewIndicator.textContent = lightIsOn ? "ACTIVE" : "STANDBY";
    }

    if (visualStatus) visualStatus.textContent = lightIsOn ? "LIGHT IS ON" : "LIGHT IS OFF";

    if (visualDescription) {
        visualDescription.textContent = lightIsOn
            ? "Your light is currently switched on."
            : "Your light is currently switched off.";
    }

    if (buttonText) buttonText.textContent = lightIsOn ? "TURN LIGHT OFF" : "TURN LIGHT ON";

    if (powerButton) {
        powerButton.setAttribute("aria-pressed", String(lightIsOn));
        powerButton.classList.toggle("is-on", lightIsOn);
    }
}

function renderHistory(items) {
    if (!activityList) return;

    if (!items.length) {
        activityList.innerHTML = `
            <div class="empty-state">
                <span>◷</span>
                <p>No activity yet.</p>
            </div>`;
        return;
    }

    activityList.innerHTML = items.map(item => {
        const isOn = item.state === true;
        const time = new Date(item.timestamp).toLocaleString();

        return `
            <div class="activity-item">
                <div>
                    <strong>${isOn ? "💡 Light turned ON" : "🌙 Light turned OFF"}</strong>
                    <small>${time}</small>
                </div>
                <span class="activity-result ${isOn ? "on" : "off"}">
                    ${isOn ? "ON" : "OFF"}
                </span>
            </div>`;
    }).join("");
}

async function loadCustomerHome(user) {
    cleanupListeners();

    // Each Firebase UID must be assigned to its home by an administrator.
    let assignmentSnapshot;

try {
    assignmentSnapshot = await get(
        ref(database, `userHomes/${user.uid}`)
    );
} catch (error) {
    console.error("UID mapping read failed:", error.code, error.message);
    throw new Error(
        error.code === "PERMISSION_DENIED"
            ? "Database permission denied. Firebase Rules check karo."
            : "Customer assignment read nahi ho saka."
    );
}

console.log("Logged-in UID:", user.uid);
console.log("Assignment exists:", assignmentSnapshot.exists());
console.log("Assigned home:", assignmentSnapshot.val());

if (!assignmentSnapshot.exists()) {
    throw new Error(
        "Is UID ke liye userHomes mein ghar assign nahi hai. Database key check karo."
    );
}

    if (!assignmentSnapshot.exists()) {
        throw new Error("Is account ko abhi kisi ghar se assign nahi kiya gaya hai.");
    }

    const homeId = assignmentSnapshot.val();

    if (typeof homeId !== "string" || !/^[A-Za-z0-9_-]+$/.test(homeId)) {
        throw new Error("Ghar ki ID database mein sahi nahi hai.");
    }

    const homeSnapshot = await get(ref(database, `homes/${homeId}`));

    if (!homeSnapshot.exists()) {
        throw new Error("Is ghar ka record database mein nahi mila.");
    }

    currentHomeId = homeId;

    const home = homeSnapshot.val();

    const title = document.querySelector(".welcome-card strong");
    if (title) title.textContent = home.homeName || homeId;

    const deviceName = document.querySelector(".device-title h3");
    if (deviceName) deviceName.textContent = home.deviceName || "Living Room Light";

    const connectionText = document.getElementById("connectionText");
    if (connectionText) connectionText.textContent = "Firebase Connected";

    const lightRef = ref(database, `homes/${homeId}/lightState`);

    unsubscribeLight = onValue(lightRef, snapshot => {
        lightIsOn = snapshot.val() === true;
        renderLight();
    }, error => {
        console.error("Light listener error:", error);
        showToast("Light status load nahi hua.");
    });

    const historyRef = ref(database, `homes/${homeId}/history`);

    unsubscribeHistory = onValue(historyRef, snapshot => {
        const value = snapshot.val() || {};

        const items = Object.entries(value)
            .map(([id, item]) => ({ id, ...item }))
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 20);

        renderHistory(items);
    }, error => {
        console.error("History listener error:", error);
    });

    renderLight();
}

function cleanupListeners() {
    if (unsubscribeLight) unsubscribeLight();
    if (unsubscribeHistory) unsubscribeHistory();

    unsubscribeLight = null;
    unsubscribeHistory = null;
    currentHomeId = null;
}

if (loginForm) {
    loginForm.addEventListener("submit", async event => {
        event.preventDefault();

        const email = loginEmail.value.trim();
        const password = loginPassword.value;

        loginButton.disabled = true;
        showMessage("Logging in...");

        try {
            await signInWithEmailAndPassword(auth, email, password);
            loginForm.reset();
        } catch (error) {
            console.error("Login error:", error.code, error.message);

            const messages = {
                "auth/invalid-credential": "Email ya password galat hai.",
                "auth/invalid-email": "Email sahi nahi hai.",
                "auth/too-many-requests": "Bahut attempts hue. Baad mein try karo.",
                "auth/network-request-failed": "Internet connection check karo.",
                "auth/operation-not-allowed": "Firebase Email/Password sign-in enable karo."
            };

            showMessage(messages[error.code] || `Login failed: ${error.code}`, true);
        } finally {
            loginButton.disabled = false;
        }
    });
}

onAuthStateChanged(auth, async user => {
    cleanupListeners();

    if (!user) {
        if (authSection) authSection.hidden = false;
        if (dashboard) dashboard.hidden = true;
        return;
    }

    try {
        await loadCustomerHome(user);

        if (authSection) authSection.hidden = true;
        if (dashboard) dashboard.hidden = false;

        createLogoutButton();
        console.log("SmartFix login:", user.email, user.uid);
    } catch (error) {
        console.error("Home loading error:", error);
        showMessage(error.message || "Dashboard load nahi hua.", true);

        if (authSection) authSection.hidden = false;
        if (dashboard) dashboard.hidden = true;

        await signOut(auth);
    }
});

function createLogoutButton() {
    let button = document.getElementById("logoutButton");
    if (button) return;

    button = document.createElement("button");
    button.id = "logoutButton";
    button.type = "button";
    button.className = "clear-button";
    button.textContent = "Logout";

    const topbar = document.querySelector(".topbar");
    if (topbar) topbar.appendChild(button);

    button.addEventListener("click", async () => {
        cleanupListeners();
        await signOut(auth);
    });
}

if (powerButton) {
    powerButton.addEventListener("click", async () => {
        if (!currentHomeId) {
            showToast("Pehle login karo.");
            return;
        }

        const nextState = !lightIsOn;
        powerButton.disabled = true;

        try {
            await set(
                ref(database, `homes/${currentHomeId}/lightState`),
                nextState
            );

            const historyRef = ref(database, `homes/${currentHomeId}/history/${Date.now()}`);

            await set(historyRef, {
                state: nextState,
                timestamp: Date.now()
            });

            showToast(nextState ? "Light status ON save hua." : "Light status OFF save hua.");
        } catch (error) {
            console.error("Database update error:", error);
            showToast("Database update nahi hua. Rules check karo.");
        } finally {
            powerButton.disabled = false;
        }
    });
}

if (clearHistory) {
    clearHistory.addEventListener("click", async () => {
        if (!currentHomeId) return;

        try {
            await set(ref(database, `homes/${currentHomeId}/history`), null);
            showToast("History clear ho gayi.");
        } catch (error) {
            console.error("Clear history error:", error);
            showToast("History clear nahi hui.");
        }
    });
}

const currentYear = document.getElementById("currentYear");
if (currentYear) currentYear.textContent = new Date().getFullYear();

console.log("SmartFix Firebase application initialized.");
