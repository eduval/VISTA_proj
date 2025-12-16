import { auth, db } from './firebase-config.js';
import { ref, get, query, orderByChild, equalTo } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

export async function getCurrentUserRole() {
    return new Promise(resolve => {
        const unsub = auth.onAuthStateChanged(async user => {
            unsub && unsub();
            if (!user) return resolve('guest');

            try {
                const uidSnap = await get(ref(db, `users/${user.uid}/role`));
                if (uidSnap.exists()) return resolve(String(uidSnap.val()).toLowerCase());

                if (user.email) {
                    const q = query(ref(db, 'users'), orderByChild('email'), equalTo(user.email));
                    const byEmail = await get(q);
                    if (byEmail.exists()) {
                        const firstKey = Object.keys(byEmail.val())[0];
                        const role = byEmail.val()[firstKey]?.role;
                        if (role) return resolve(String(role).toLowerCase());
                    }
                }
            } catch (e) {
                console.warn('[auth-helpers] role lookup failed, defaulting to guest:', e);
            }
            resolve('guest');
        });
    });
}

// Additional helpers
export async function getCurrentUserId() {
    return auth.currentUser?.uid || null;
}

export async function isAdmin() {
    const role = await getCurrentUserRole();
    return role === 'admin';
}

