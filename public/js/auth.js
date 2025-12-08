// js/auth.js
// Handles login, keeps a user record in RTDB, and blocks disabled accounts.

import { auth, db } from "./firebase-config.js";
import {
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    ref,
    get,
    set,
    update,
    push,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const loginForm = document.getElementById("login-form");
const statusMsg = document.getElementById("login-error");

function setStatus(message, isError = true) {
    if (!statusMsg) return;
    statusMsg.style.display = "block";
    statusMsg.textContent = message;
    statusMsg.classList.toggle("text-danger", isError);
    statusMsg.classList.toggle("text-success", !isError);
}

// Login flow
if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("account_email")?.value?.trim() || "";
        const password = document.getElementById("account_passwd")?.value?.trim() || "";
        if (!email || !password) {
            setStatus("Please enter email and password.", true);
            return;
        }

        setStatus("Signing in...", false);

        try {

            const userCred = await signInWithEmailAndPassword(auth, email, password);
            const uid = userCred.user.uid;
            const userRef = ref(db, `users/${uid}`);
            const now = Date.now();

            const snap = await get(userRef);

            if (!snap.exists()) {
                // First login: create user
                await set(userRef, {
                    email,
                    name: userCred.user.displayName || "Unknown",
                    role: "operator",
                    enabled: true,
                    createdAt: now,
                    logins: { lastLogin: now }
                });

                // Push the first history entry
                const historyRef = push(ref(db, `users/${uid}/logins/history`));
                await set(historyRef, now);

            } else {
                // Existing user: update lastLogin only
                await update(userRef, {
                    "logins/lastLogin": now,
                    email  // optional: update email
                });

                // Push login history without overwriting existing entries
                const historyRef = push(ref(db, `users/${uid}/logins/history`));
                await set(historyRef, now);
            }

            // Gate by enabled flag
            const enabledSnap = await get(ref(db, `users/${uid}/enabled`));
            const enabled = enabledSnap.exists() ? !!enabledSnap.val() : true;

            if (!enabled) {
                setStatus("Your account is disabled. Please contact an administrator.", true);
                await signOut(auth);
                window.location.href = "index.html";
                return;
            }

            // Redirect after all updates
            setStatus("Signed in ✓", false);
            window.location.href = "admindashboard.html";

        } catch (err) {
            console.error(err);
            setStatus("Invalid credentials or network error.", true);
        }
    });
}

// Global guard: if a disabled user loads a page, kick them out
onAuthStateChanged(auth, async (user) => {
    if (!user) return;
    try {
        const enabledSnap = await get(ref(db, `users/${user.uid}/enabled`));
        const enabled = enabledSnap.exists() ? !!enabledSnap.val() : true;
        if (!enabled) {
            alert("Your account is disabled. Please contact an administrator.");
            await signOut(auth);
            window.location.href = "index.html";
        }
    } catch (e) {
        console.warn("Enabled check failed:", e);
    }
});
