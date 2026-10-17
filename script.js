"use strict";

// ========================================
// FIREBASE IMPORTS
// ========================================

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

const activityList = document.getElementById("activityList");
const clearHistory = document.getElementById("clearHistory");
const toast = document.getElementById("toast");


// ========================================
// GLOBAL VARIABLES
// ========================================

let currentHomeId = null;

let unsubscribeDevices = null;
let unsubscribeHistory = null;

let toastTimer = null;
let authRequestNumber = 0;

const deviceStates = {
    livingRoomLight: false,
    fan: false,
    bedroomLight: false,
    mainDoor: false,
    tv: false,
    waterMotor: false
};


// ========================================
// DEVICE CONFIGURATION
// ========================================

const devices = {
    livingRoomLight: {
        name: "Living Room Light",
        badge: "livingRoomLightBadge",
        onLabel: "ON",
        offLabel: "OFF"
    },

    fan: {
        name: "Fan",
        badge: "fanBadge",
        onLabel: "ON",
        offLabel: "OFF"
    },

    bedroomLight: {
        name: "Bedroom Light",
        badge: "bedroomLightBadge",
        onLabel: "ON",
        offLabel: "OFF"
    },

    mainDoor: {
        name: "Main Door",
        badge: "mainDoorBadge",
        onLabel: "UNLOCKED",
        offLabel: "LOCKED"
    },
    tv: {
    name: "Smart TV",
    badge: "tvBadge",
    onLabel: "ON",
    offLabel: "OFF"
},

waterMotor: {
    name: "Water Motor",
    badge: "motorBadgeText",
    onLabel: "ON",
    offLabel: "OFF"
}

    
};


// ========================================
// MESSAGES
// ========================================

function showMessage(message, isError = false) {
    if (!authMessage) return;

    authMessage.textContent = message;

    authMessage.style.color = isError
        ? "#fb7185"
        : "#22c55e";
}


function showToast(message) {
    if (!toast) {
        console.log(message);
        return;
    }

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}


// ========================================
// HTML ESCAPING
// ========================================

function escapeHTML(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ========================================
// CLEANUP LISTENERS
// ========================================

function cleanupListeners() {
    if (unsubscribeDevices) {
        unsubscribeDevices();
    }

    if (unsubscribeHistory) {
        unsubscribeHistory();
    }

    unsubscribeDevices = null;
    unsubscribeHistory = null;

    currentHomeId = null;

    Object.keys(deviceStates).forEach(deviceId => {
        deviceStates[deviceId] = false;
    });

    renderDevices();
}


// ========================================
// RENDER DEVICES
// ========================================

function renderDevices() {
    for (const [deviceId, device] of Object.entries(devices)) {
        const isOn = deviceStates[deviceId] === true;

        const badge = document.getElementById(device.badge);

        if (badge) {
            badge.textContent = isOn
                ? device.onLabel
                : device.offLabel;
        }

        document
            .querySelectorAll(`[data-device="${deviceId}"]`)
            .forEach(button => {
                button.setAttribute(
                    "aria-pressed",
                    String(isOn)
                );

                button.classList.toggle("is-on", isOn);

                const label = button.querySelector(
                    ".device-button-text"
                );

                if (label) {
                    if (deviceId === "mainDoor") {
                        label.textContent = isOn
                            ? "LOCK DOOR"
                            : "UNLOCK DOOR";
                    } else {
                        label.textContent = isOn
                            ? "TURN OFF"
                            : "TURN ON";
                    }
                }

                const symbol = button.querySelector(
                    ".power-symbol"
                );

                if (symbol && deviceId === "mainDoor") {
                    symbol.textContent = isOn ? "🔓" : "🔒";
                }
            });
    }

    const lightOn = deviceStates.livingRoomLight;

    const overviewStatus =
        document.getElementById("overviewStatus");

    if (overviewStatus) {
        overviewStatus.textContent = lightOn ? "ON" : "OFF";
    }

    const overviewIndicator =
        document.getElementById("overviewIndicator");

    if (overviewIndicator) {
        overviewIndicator.textContent = lightOn
            ? "ACTIVE"
            : "STANDBY";
    }

    const lightVisual =
        document.getElementById("lightVisual");

    if (lightVisual) {
        lightVisual.classList.toggle("is-on", lightOn);
    }

    const visualStatus =
        document.getElementById("visualStatus");

    if (visualStatus) {
        visualStatus.textContent = lightOn
            ? "LIGHT IS ON"
            : "LIGHT IS OFF";
    }

    const visualDescription =
        document.getElementById("visualDescription");

    if (visualDescription) {
        visualDescription.textContent = lightOn
            ? "Your living room light is switched on."
            : "Your living room light is switched off.";
    }

    const extraStatuses = {
        fanVisualStatus: deviceStates.fan
            ? "FAN IS ON"
            : "FAN IS OFF",

        bedroomVisualStatus: deviceStates.bedroomLight
            ? "LIGHT IS ON"
            : "LIGHT IS OFF",

        doorVisualStatus: deviceStates.mainDoor
            ? "DOOR IS UNLOCKED"
            : "DOOR IS LOCKED",

            tvVisualStatus: deviceStates.tv
        ? "TV IS ON"
        : "TV IS OFF",

        waterMotorVisualStatus: deviceStates.waterMotor
    ? "MOTOR IS ON"
    : "MOTOR IS OFF"
    };

    for (const [elementId, text] of Object.entries(extraStatuses)) {
        const element = document.getElementById(elementId);

        if (element) {
            element.textContent = text;
        }
    }

    const extraDescriptions = {
        fanVisualDescription: deviceStates.fan
            ? "Your fan status is ON."
            : "Your fan status is OFF.",

        bedroomVisualDescription: deviceStates.bedroomLight
            ? "Your bedroom light is switched on."
            : "Your bedroom light is switched off.",

        doorVisualDescription: deviceStates.mainDoor
            ? "The recorded door status is unlocked."
            : "The recorded door status is locked.",

            tvVisualDescription: deviceStates.tv
    ? "Your TV is switched on."
    : "Your TV is switched off.",

    waterMotorVisualDescription: deviceStates.waterMotor
    ? "Water motor is running."
    : "Water motor is stopped."
    };

    for (const [elementId, text] of Object.entries(extraDescriptions)) {
        const element = document.getElementById(elementId);

        if (element) {
            element.textContent = text;
        }
    }
}


// ========================================
// ACTIVITY HISTORY
// ========================================

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

        const deviceName = escapeHTML(
            item.name || "Device"
        );

        const timestamp = Number(item.timestamp);

        const time = Number.isFinite(timestamp)
            ? new Date(timestamp).toLocaleString()
            : "Unknown time";

        const isDoor = item.device === "mainDoor";

        const actionText = isDoor
            ? (isOn ? "Door unlocked" : "Door locked")
            : `${deviceName} turned ${isOn ? "ON" : "OFF"}`;

        const statusText = isDoor
            ? (isOn ? "UNLOCKED" : "LOCKED")
            : (isOn ? "ON" : "OFF");

        return `
            <div class="activity-item">
                <div>
                    <strong>${escapeHTML(actionText)}</strong>
                    <small>${escapeHTML(time)}</small>
                </div>

                <span class="activity-result ${isOn ? "on" : "off"}">
                    ${statusText}
                </span>
            </div>
        `;
    }).join("");
}

// ========================================
// KEEP ONLY LATEST 50 HISTORY RECORDS
// ========================================

async function trimHistory(homeId) {
    try {
        const historyRef = ref(
            database,
            `homes/${homeId}/history`
        );

        const snapshot = await get(historyRef);

        if (!snapshot.exists()) {
            return;
        }

        const entries = Object.entries(snapshot.val() || {})
            .filter(([, item]) =>
                item && typeof item === "object"
            )
            .sort((a, b) =>
                Number(b[1].timestamp || 0) -
                Number(a[1].timestamp || 0)
            );

        // Keep the latest 50 records
        const oldEntries = entries.slice(50);

        // Delete records older than the latest 50
        for (const [recordId] of oldEntries) {
            await set(
                ref(
                    database,
                    `homes/${homeId}/history/${recordId}`
                ),
                null
            );
        }

        console.log(
            "History cleanup complete. Records found:",
            Math.min(entries.length, 50)
        );

    } catch (error) {
        console.error(
            "History cleanup error:",
            error.code,
            error.message
        );
    }
}


// ========================================
// LOAD CUSTOMER HOME
// ========================================

async function loadCustomerHome(user) {
    cleanupListeners();

    const assignmentRef = ref(
        database,
        `userHomes/${user.uid}`
    );

    console.log("Logged-in UID:", user.uid);
    console.log("Assignment path:", assignmentRef.toString());

    let assignmentSnapshot;

    // Load customer home assignment
    try {
        assignmentSnapshot = await get(assignmentRef);
    } catch (error) {
        console.error(
            "Assignment error:",
            error.code,
            error.message
        );

        throw new Error(
            error.code === "PERMISSION_DENIED"
                ? "Database permission denied. Firebase Rules check karo."
                : "Customer assignment load nahi hua."
        );
    }

    console.log(
        "Assignment exists:",
        assignmentSnapshot.exists()
    );

    console.log(
        "Assignment value:",
        assignmentSnapshot.val()
    );

    if (!assignmentSnapshot.exists()) {
        throw new Error(
            `Is account ko ghar assign nahi hai. Firebase mein userhomes/${user.uid} check karo.`
        );
    }

    const homeId = assignmentSnapshot.val();

    if (
        typeof homeId !== "string" ||
        !/^[A-Za-z0-9_-]+$/.test(homeId)
    ) {
        throw new Error("Assigned home ID galat hai.");
    }

    // Load home data
    let homeSnapshot;

    try {
        homeSnapshot = await get(
            ref(database, `homes/${homeId}`)
        );
    } catch (error) {
        console.error(
            "Home read error:",
            error.code,
            error.message
        );

        throw new Error(
            error.code === "PERMISSION_DENIED"
                ? "Home read permission denied. Firebase Rules check karo."
                : "Home data load nahi hua."
        );
    }

    if (!homeSnapshot.exists()) {
        throw new Error(
            `homes/${homeId} database mein nahi mila.`
        );
    }

    const home = homeSnapshot.val() || {};

    currentHomeId = homeId;

    // Update home title
    const homeTitle = document.querySelector(
        ".welcome-card strong"
    );

    if (homeTitle) {
        homeTitle.textContent = home.homeName || homeId;
    }

    const homeNameDisplay =
        document.getElementById("homeNameDisplay");

    if (homeNameDisplay) {
        homeNameDisplay.textContent =
            home.homeName || homeId;
    }

    const connectionText =
        document.getElementById("connectionText");

    if (connectionText) {
        connectionText.textContent = "Firebase Connected";
    }

    // Listen to device states
    unsubscribeDevices = onValue(
        ref(database, `homes/${homeId}`),

        snapshot => {
            const currentHome = snapshot.val() || {};

            for (const deviceId of Object.keys(devices)) {
                deviceStates[deviceId] =
                    currentHome[deviceId] === true;
            }

            renderDevices();
        },

        error => {
            console.error(
                "Device listener error:",
                error.code,
                error.message
            );

            showToast(
                "Device status load nahi hua. Firebase Rules check karo."
            );
        }
    );

    // Listen to activity history
    unsubscribeHistory = onValue(
        ref(database, `homes/${homeId}/history`),

        snapshot => {
            const value = snapshot.val() || {};

            const items = Object.entries(value)
                .filter(([, item]) =>
                    item && typeof item === "object"
                )
                .map(([id, item]) => ({
                    id,
                    ...item
                }))
                .sort(
                    (a, b) =>
                        Number(b.timestamp || 0) -
                        Number(a.timestamp || 0)
                )
                .slice(0, 20);

            renderHistory(items);
        },

        error => {
            console.error(
                "History listener error:",
                error.code,
                error.message
            );
        }
    );

    console.log("Assigned home loaded:", homeId);

    renderDevices();
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
            showMessage(
                "Email aur password dono bharo.",
                true
            );

            return;
        }

        if (loginButton) {
            loginButton.disabled = true;
        }

        showMessage("Logging in...");

        try {
            await signInWithEmailAndPassword(
                auth,
                email,
                password
            );

            loginForm.reset();

        } catch (error) {
            console.error(
                "Login error:",
                error.code,
                error.message
            );

            const messages = {
                "auth/invalid-credential":
                    "Email or Password is incorrect.",

                "auth/invalid-email":
                    "Email address is incorrect.",

                "auth/user-not-found":
                    "Email address did't match.",

                "auth/wrong-password":
                    "Password is incorrrect.",

                "auth/too-many-requests":
                    "Maximum attempts reached, try later.",

                "auth/network-request-failed":
                    "Check your Internet connection.",

                "auth/operation-not-allowed":
                    "Enable Email/Password in Firebase for sign-in.",

                "auth/invalid-api-key":
                    "Check Firebase API key."
            };

            showMessage(
                messages[error.code] ||
                `Login failed: ${error.code || error.message}`,
                true
            );

        } finally {
            if (loginButton) {
                loginButton.disabled = false;
            }
        }
    });

} else {
    console.error(
        "HTML mein loginForm nahi mila."
    );
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

            showToast(
                "Logout nahi hua. Dobara try karo."
            );
        }
    });
}


// ========================================
// AUTHENTICATION STATE
// ========================================

onAuthStateChanged(
    auth,

    async user => {
        const requestNumber = ++authRequestNumber;

        cleanupListeners();

        if (!user) {
            document.body.classList.remove("logged-in");

            if (authSection) {
                authSection.hidden = false;
            }

            if (dashboard) {
                dashboard.hidden = true;
            }

            const connectionText =
                document.getElementById("connectionText");

            if (connectionText) {
                connectionText.textContent = "Login Required";
            }

            console.log("SmartFix: No user logged in.");

            return;
        }

        try {
            await loadCustomerHome(user);

            // Ignore outdated authentication requests
            if (requestNumber !== authRequestNumber) {
                cleanupListeners();
                return;
            }

            // Hide login and display dashboard
            document.body.classList.add("logged-in");

            if (authSection) {
                authSection.hidden = true;
            }

            if (dashboard) {
                dashboard.hidden = false;
            }

            const connectionText =
                document.getElementById("connectionText");

            if (connectionText) {
                connectionText.textContent = "Firebase Connected";
            }

            createLogoutButton();

            console.log(
                "SmartFix logged in:",
                user.email,
                user.uid
            );

        } catch (error) {
            if (requestNumber !== authRequestNumber) {
                return;
            }

            console.error("Home loading error:", error);

            document.body.classList.remove("logged-in");

            showMessage(
                error.message || "Dashboard load nahi hua.",
                true
            );

            if (authSection) {
                authSection.hidden = false;
            }

            if (dashboard) {
                dashboard.hidden = true;
            }

            cleanupListeners();

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
            "Authentication check failed. Page refresh karke try karo.",
            true
        );
    }
);
// ========================================
// MULTI-DEVICE CONTROL
// ========================================

document
    .querySelectorAll("[data-device]")
    .forEach(button => {
        button.addEventListener("click", async () => {
            if (!currentHomeId || !auth.currentUser) {
                showToast("Pehle login karo.");
                return;
            }

            const deviceId = button.dataset.device;

            if (
                !Object.prototype.hasOwnProperty.call(
                    devices,
                    deviceId
                )
            ) {
                showToast("Unknown device.");
                return;
            }

            const homeId = currentHomeId;
            const nextState = !deviceStates[deviceId];

            button.disabled = true;

            try {
                const timestamp = Date.now();

                // Update device state
                await set(
                    ref(
                        database,
                        `homes/${homeId}/${deviceId}`
                    ),
                    nextState
                );

                // Save activity history
await set(
    ref(
        database,
        `homes/${homeId}/history/${timestamp}`
    ),
    {
        device: deviceId,
        name: devices[deviceId].name,
        state: nextState,
        timestamp
    }
);

// Keep only the latest 50 history records
await trimHistory(homeId);

const statusText =
    deviceId === "mainDoor"
        ? (nextState ? "UNLOCKED" : "LOCKED")
        : (nextState ? "ON" : "OFF");

showToast(
    `${devices[deviceId].name}: ${statusText}`
);

} catch (error) {
    console.error(
        "Device update error:",
        error.code,
        error.message
    );

    showToast(
        error.code === "PERMISSION_DENIED"
            ? "Permission denied. Firebase Rules check karo."
            : "Device update nahi hua."
    );

} finally {
    button.disabled = false;
}
    });
    });

// ========================================
// CLEAR HISTORY
// ========================================

if (clearHistory) {
    clearHistory.addEventListener("click", async () => {
        if (!currentHomeId || !auth.currentUser) {
            showToast("Pehle login karo.");
            return;
        }

        const homeId = currentHomeId;

        try {
            await set(
                ref(
                    database,
                    `homes/${homeId}/history`
                ),
                null
            );

            showToast("Activity history clear ho gayi.");

        } catch (error) {
            console.error(
                "Clear history error:",
                error.code,
                error.message
            );

            showToast(
                "History clear nahi hui. Firebase Rules check karo."
            );
        }
    });
}


// ========================================
// CURRENT YEAR
// ========================================

const currentYear =
    document.getElementById("currentYear");

if (currentYear) {
    currentYear.textContent =
        new Date().getFullYear();
}


// ========================================
// APPLICATION INITIALIZED
// ========================================

console.log(
    "SmartFix Firebase application initialized."
);
console.log(
    "SmartFix Firebase application initialized."
);


// ==========================================
// WATER MOTOR — UI DEMO ONLY
// Not connected to actual hardware
// ==========================================

let waterMotorOn = false;

function toggleWaterMotor() {
    const button = document.getElementById("motorButton");
    const buttonText = document.getElementById("motorButtonText");
    const motorStatus = document.getElementById("motorStatus");
    const tankDescription = document.getElementById("tankDescription");
    const motorAutoOff = document.getElementById("motorAutoOff");

    if (!button || !buttonText || !motorStatus) {
        return;
    }

    waterMotorOn = !waterMotorOn;

    if (waterMotorOn) {
        buttonText.textContent = "MOTOR OFF";
        motorStatus.textContent = "MOTOR ON";

        button.classList.add("motor-running");

        if (tankDescription) {
            tankDescription.textContent =
                "Demo mode: waiting for sensor connection";
        }

        if (motorAutoOff) {
            motorAutoOff.textContent =
                "Automatic OFF is not active until the ESP32 and tank-full sensor are connected.";
        }
    } else {
        buttonText.textContent = "MOTOR ON";
        motorStatus.textContent = "MOTOR OFF";

        button.classList.remove("motor-running");

        if (tankDescription) {
            tankDescription.textContent =
                "Motor stopped in demo mode";
        }

        if (motorAutoOff) {
            motorAutoOff.textContent =
                "Connect the ESP32 and sensor to enable automatic shutoff.";
        }
    }
}
window.toggleWaterMotor = toggleWaterMotor;

