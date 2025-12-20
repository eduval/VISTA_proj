// services.js
import { auth, db } from './firebase-config.js';
import { getCurrentUserRole } from './auth-helpers.js';
import { ref, get, query, orderByChild } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const isMobile = window.matchMedia("(max-width: 768px)").matches;

const shortStatus = (status) => {
    if (!isMobile) return status;

    return {
        Upcoming: "Up",
        Ongoing: "On",
        Active: "On",
        Completed: "Done"
    }[status] || status;
};


const userIcon = `
<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
<g clip-path="url(#clip0_48_3107)">
<path d="M10.6667 14V12.6667C10.6667 11.9594 10.3858 11.2811 9.88566 10.781C9.38556 10.281 8.70728 10 8.00004 10H4.00004C3.2928 10 2.61452 10.281 2.11442 10.781C1.61433 11.2811 1.33337 11.9594 1.33337 12.6667V14" stroke="#99A1AF" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M10.6666 2.08496C11.2385 2.23321 11.7449 2.56714 12.1064 3.03434C12.4679 3.50153 12.6641 4.07555 12.6641 4.66629C12.6641 5.25703 12.4679 5.83105 12.1064 6.29825C11.7449 6.76545 11.2385 7.09938 10.6666 7.24763" stroke="#99A1AF" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M14.6666 14.0002V12.6669C14.6662 12.0761 14.4695 11.5021 14.1075 11.0351C13.7455 10.5682 13.2387 10.2346 12.6666 10.0869" stroke="#99A1AF" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M6.00004 7.33333C7.4728 7.33333 8.66671 6.13943 8.66671 4.66667C8.66671 3.19391 7.4728 2 6.00004 2C4.52728 2 3.33337 3.19391 3.33337 4.66667C3.33337 6.13943 4.52728 7.33333 6.00004 7.33333Z" stroke="#99A1AF" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
</g>
<defs>
<clipPath id="clip0_48_3107">
<rect width="16" height="16" fill="white"/>
</clipPath>
</defs>
</svg>
`;

const completedIcon = `
<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
<g clip-path="url(#clip0_48_3193)">
<path d="M8 3.5H11V6.5" stroke="#364153" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M11 3.5L6.75 7.75L4.25 5.25L1 8.5" stroke="#364153" stroke-linecap="round" stroke-linejoin="round"/>
</g>
<defs>
<clipPath id="clip0_48_3193">
<rect width="12" height="12" fill="white"/>
</clipPath>
</defs>
</svg>
`;

const calendarBlueIcon = `
<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M0 10C0 4.47715 4.47715 0 10 0H30C35.5228 0 40 4.47715 40 10V30C40 35.5228 35.5228 40 30 40H10C4.47715 40 0 35.5228 0 30V10Z" fill="#DBEAFE" style="fill:#DBEAFE;fill:color(display-p3 0.8588 0.9176 0.9961);fill-opacity:1;"/>
<path d="M16.6666 11.6667V15" stroke="#155DFC" style="stroke:#155DFC;stroke:color(display-p3 0.0824 0.3647 0.9882);stroke-opacity:1;" stroke-width="1.66667" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M23.3334 11.6667V15" stroke="#155DFC" style="stroke:#155DFC;stroke:color(display-p3 0.0824 0.3647 0.9882);stroke-opacity:1;" stroke-width="1.66667" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M25.8333 13.3333H14.1667C13.2462 13.3333 12.5 14.0795 12.5 15V26.6667C12.5 27.5871 13.2462 28.3333 14.1667 28.3333H25.8333C26.7538 28.3333 27.5 27.5871 27.5 26.6667V15C27.5 14.0795 26.7538 13.3333 25.8333 13.3333Z" stroke="#155DFC" style="stroke:#155DFC;stroke:color(display-p3 0.0824 0.3647 0.9882);stroke-opacity:1;" stroke-width="1.66667" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M12.5 18.3333H27.5" stroke="#155DFC" style="stroke:#155DFC;stroke:color(display-p3 0.0824 0.3647 0.9882);stroke-opacity:1;" stroke-width="1.66667" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`;

const calendarGreyIcon = `
<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M0 10C0 4.47715 4.47715 0 10 0H30C35.5228 0 40 4.47715 40 10V30C40 35.5228 35.5228 40 30 40H10C4.47715 40 0 35.5228 0 30V10Z" fill="#F3F4F6" style="fill:#F3F4F6;fill:color(display-p3 0.9529 0.9569 0.9647);fill-opacity:1;"/>
<path d="M16.6666 11.6667V15" stroke="#4A5565" style="stroke:#4A5565;stroke:color(display-p3 0.2902 0.3333 0.3961);stroke-opacity:1;" stroke-width="1.66667" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M23.3334 11.6667V15" stroke="#4A5565" style="stroke:#4A5565;stroke:color(display-p3 0.2902 0.3333 0.3961);stroke-opacity:1;" stroke-width="1.66667" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M25.8333 13.3333H14.1667C13.2462 13.3333 12.5 14.0795 12.5 15V26.6667C12.5 27.5872 13.2462 28.3333 14.1667 28.3333H25.8333C26.7538 28.3333 27.5 27.5872 27.5 26.6667V15C27.5 14.0795 26.7538 13.3333 25.8333 13.3333Z" stroke="#4A5565" style="stroke:#4A5565;stroke:color(display-p3 0.2902 0.3333 0.3961);stroke-opacity:1;" stroke-width="1.66667" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M12.5 18.3333H27.5" stroke="#4A5565" style="stroke:#4A5565;stroke:color(display-p3 0.2902 0.3333 0.3961);stroke-opacity:1;" stroke-width="1.66667" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`;

async function loadServices() {
    const userRole = await getCurrentUserRole(); // 'admin' | 'operator'
    const currentUserUid = auth.currentUser.uid;

    const servicesRef = query(ref(db, 'services'), orderByChild('dateTimestamp'));
    const snap = await get(servicesRef);

    const upcomingContainer = document.getElementById("upcomingServices");
    const pastContainer = document.getElementById("pastServices");

    upcomingContainer.innerHTML = "";
    pastContainer.innerHTML = "";

    // Update column header for role/operator
    const volunteersHeader = userRole === "admin" ? "Volunteers" : "Role";
    const tables = document.querySelectorAll("table");
    tables.forEach(table => {
        table.querySelectorAll("th")[1].textContent = volunteersHeader;
    });

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
        const volunteersText = userRole === "admin" ? (data.type === "upcoming" ? "assigned" : "participated") : "";

        // Get user role if operator
        // Get user role if operator
        let roleOrVolunteers = "";
        if (userRole === "operator") {
            // Fetch coreTasks for this service and current user
            const coreSnap = await get(ref(db, `coreTasks/${serviceId}/${currentUserUid}`));
            if (coreSnap.exists()) {
                const coreTasksByRole = coreSnap.val();
                const roleId = Object.keys(coreTasksByRole)[0]; // user has one role per service

                // Fetch role definition
                const roleSnap = await get(ref(db, `roles/${roleId}`));
                if (roleSnap.exists()) {
                    const role = roleSnap.val();
                    roleOrVolunteers = role.name || "N/A";
                } else {
                    roleOrVolunteers = "N/A";
                }
            } else {
                roleOrVolunteers = "N/A";
            }
        } else {
            roleOrVolunteers = isMobile
                ? `${volunteersCount}`
                : `${volunteersCount} ${volunteersText}`;

        }

        // Default status/action
        let statusText = data.status;
        let statusStyle = "";
        let statusIcon = "";
        let calendarIcon = calendarBlueIcon;
        let actionLabel = "View Details";
        let actionLink = `newServiceAssignment.html?serviceId=${serviceId}`;

        if (data.type === "upcoming") {
            statusText = "Upcoming";
            if (userRole === "operator" || userRole === "admin") statusStyle = "background: #DBEAFE; color: #155DFC;";
        } else if (data.status.toLowerCase() === "ongoing") {
            statusText = userRole === "operator" ? "Active" : "Ongoing";
            statusStyle = "background: #DCFCE7; color: #008235;";
        } else if (data.status.toLowerCase() === "completed") {
            statusStyle = "background: #F3F4F6; color: #364153;";
            statusIcon = completedIcon;
            calendarIcon = calendarGreyIcon;

        }

        // Operator: check coreTasks under their role
        if (userRole === "operator") {
            const coreTasksSnap = await get(ref(db, `coreTasks/${serviceId}/${currentUserUid}`));
            let hasTasks = false;

            if (coreTasksSnap.exists()) {
                const userRolesTasks = coreTasksSnap.val();
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
    <div class="d-flex align-items-center gap-3">
      <div>${calendarIcon}</div>
      <div class="d-flex flex-column">
        <span class="fw-semibold text-dark">${data.title}</span>
        <span class="text-muted small mobile-hide">
          ${data.date} — ${data.time}
        </span>
      </div>
    </div>
  </td>

  <td class="align-middle">
    <div class="icon-only justify-content-center">
      ${userIcon}
      <span>${roleOrVolunteers}</span>
    </div>
  </td>

  <td class="align-middle">
    <button
      class="btn btn-soft rounded-pill status-btn"
      style="${statusStyle}"
    >
      ${statusIcon}
      ${shortStatus(statusText)}
    </button>
  </td>

  <td class="align-middle">
    <a href="${actionLink}" class="text-nowrap">
      ${isMobile ? 'View' : actionLabel}
    </a>
  </td>
</tr>
`;


        container.insertAdjacentHTML("beforeend", row);
    }

    // --- SEARCH FUNCTIONALITY ---
    const searchInput = document.querySelector('#serviceHeader input[placeholder="Search..."]');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const filter = searchInput.value.toLowerCase();
            const tables = [upcomingContainer, pastContainer];

            tables.forEach(table => {
                Array.from(table.rows).forEach(row => {
                    row.style.display = row.textContent.toLowerCase().includes(filter) ? '' : 'none';
                });
            });
        });
    }

}

auth.onAuthStateChanged(async user => {
    if (!user) return window.location.href = "index.html";
    await loadServices();
});

