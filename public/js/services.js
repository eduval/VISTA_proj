// services.js
import { auth, db } from './firebase-config.js';
import { getCurrentUserRole } from './auth-helpers.js';
import { ref, get, query, orderByChild } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

async function loadServices() {
    const userRole = await getCurrentUserRole(); // 'admin' | 'operator'
    const currentUserUid = auth.currentUser.uid;

    const servicesRef = query(ref(db, 'services'), orderByChild('dateTimestamp'));
    const snap = await get(servicesRef);

    const upcomingContainer = document.getElementById("upcomingServices");
    const pastContainer = document.getElementById("pastServices");

    upcomingContainer.innerHTML = "";
    pastContainer.innerHTML = "";

    if (!snap.exists()) return;

    for (const [serviceId, data] of Object.entries(snap.val())) {
        if (!data.enabled) continue;

        // --- FILTER ---
        if (userRole === "operator") {
            if (!data.assignments || !data.assignments[currentUserUid]) continue;
        }

        // Determine container
        let container;
        if (data.type === "upcoming" || data.status.toLowerCase() === "ongoing") {
            container = upcomingContainer;
        } else {
            container = pastContainer;
        }

        const volunteersCount = data.volunteers || (data.assignments ? Object.keys(data.assignments).length : 0);
        const volunteersText = data.type === "upcoming" ? "assigned" : "participated";

        // Default status/action
        let statusText = data.status;
        let statusStyle = "";
        let actionLabel = "View Details";
        let actionLink = `serviceDetails.html?serviceId=${serviceId}`;

        if (data.type === "upcoming") {
            statusText = "Upcoming";
            if (userRole === "operator") statusStyle = "background: #DBEAFE; color: #155DFC;";
        } else if (data.status.toLowerCase() === "ongoing") {
            statusText = userRole === "operator" ? "Active" : "Ongoing";
            statusStyle = "background: #DCFCE7; color: #008235;";
        }

        // Operator: check coreTasks under their role
        if (userRole === "operator") {
            const coreTasksSnap = await get(ref(db, `coreTasks/${serviceId}/${currentUserUid}`));
            let hasTasks = false;

            if (coreTasksSnap.exists()) {
                const userRolesTasks = coreTasksSnap.val();
                // userRolesTasks = { ROLE_MEDIA_CAMERA_OPERATOR: { before: {...}, during: {...}, after: {...} } }
                for (const roleName in userRolesTasks) {
                    const roleTasks = userRolesTasks[roleName];
                    if (roleTasks.before || roleTasks.during || roleTasks.after) {
                        hasTasks = true;
                        break;
                    }
                }
            }

            actionLabel = hasTasks ? "View Tasks" : "No Tasks";
            actionLink = hasTasks ? `serviceTasks.html?serviceId=${serviceId}` : "#";
        }

        // Admin past service
        if (userRole === "admin" && data.type === "past") {
            actionLabel = "View Analysis";
            actionLink = `serviceAnalysis.html?serviceId=${serviceId}`;
        }

        const row = `
        <tr>
            <td class="align-middle">
                <div class="d-flex align-items-center gap-3" style="${data.type === 'upcoming' && userRole === 'operator' ? 'color:#155DFC;' : ''}">
                    <div>${data.icon || ''}</div>
                    <div class="d-flex flex-column">
                        <span class="fw-semibold text-dark">${data.title}</span>
                        <span class="text-muted small">${data.date} — ${data.time}</span>
                    </div>
                </div>
            </td>
            <td class="align-middle">
                <div class="d-flex align-items-center gap-3">
                    ${volunteersCount} ${volunteersText}
                </div>
            </td>
            <td class="align-middle">
                <button class="btn btn-soft rounded-pill px-4 py-1 fw-semibold" style="font-size: 0.825rem; ${statusStyle}">
                    ${statusText}
                </button>
            </td>
            <td class="align-middle">
                <a href="${actionLink}">${actionLabel}</a>
            </td>
        </tr>
        `;

        container.insertAdjacentHTML("beforeend", row);
    }
}

auth.onAuthStateChanged(async user => {
    if (!user) return window.location.href = "index.html";
    await loadServices();
});
