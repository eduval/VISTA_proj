import { auth, db } from "./firebase-config.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

async function loadRolesAndUsers() {
    const rolesRef = ref(db, "roles");
    const usersRef = ref(db, "users");

    const [rolesSnap, usersSnap] = await Promise.all([get(rolesRef), get(usersRef)]);
    const rolesData = rolesSnap.val();
    const usersData = usersSnap.val();

    const enabledUsers = Object.values(usersData || {}).filter(u => u.enabled);
    const container = document.getElementById("rolesContainer");
    container.innerHTML = "";

    Object.values(rolesData || {}).forEach(role => {
        if (!role.enabled) return;

        // Column wrapper for col-6
        const colWrapper = document.createElement("div");
        colWrapper.className = "col-6 mb-3 d-flex flex-column";

        // Card HTML
        const cardHTML = `
            <div class="card shadow-md shadow-lg-hover transition-all-ease-250 transition-hover-top 
                rounded-4 border-light bl-0 br-0 bb-0 bw--2">

              <div class="card-body d-flex flex-column position-relative mt-2">

                <div class="d-flex align-items-center gap-2 mb-3 position-relative">
                  <a href="#modal-fmFile" data-bs-toggle="modal"
                     class="position-absolute top-0 end-0 mt-3 me-3 small text-primary fw-medium text-decoration-none">
                      Edit Tasks
                  </a>

                  <div class="d-flex align-items-center justify-content-center text-primary rounded-3" style="width:40px;height:40px">
                    ${role.icon}
                  </div>

                  <div class="flex-grow-1 d-flex align-items-center justify-content-left">
                    <h5 class="mb-0 fw-semibold">${role.name}</h5>
                  </div>
                </div>

                <div class="mt-auto d-flex align-items-center justify-content-between gap-2">
                  <div class="d-flex ms-5 align-items-center gap-2 text-muted small">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    Not Assigned
                  </div>

                  <div class="d-flex gap-2 mb-2">
                    <button class="btn btn-sm btn-outline-primary assign-btn">Assign</button>
                  </div>

                </div>

              </div>
            </div>
        `;
        colWrapper.innerHTML = cardHTML;

        // Panel for this card
        const panel = document.createElement("ul");
        panel.className = "list-group assign-list mt-2";
        panel.style.display = "none";
        panel.innerHTML = enabledUsers.map(u => {
            const roleText = u.role || 'No Role';
            const roleBadge = roleText.toLowerCase() === 'admin'
                ? `<span class="badge bg-primary text-white ms-2" style="font-size:0.75rem;">${roleText}</span>`
                : `<span class="text-muted ms-2" style="font-size:0.8rem;">${roleText}</span>`;
            return `
                <li class="list-group-item d-flex align-items-center">
              <input class="form-check-input me-1" type="checkbox" value="" aria-label="...">
                <span>${u.name} ${roleBadge}</span>
                </li>
            `;
        }).join("");

        colWrapper.appendChild(panel);
        container.appendChild(colWrapper);
    });

    // Assign button toggle
    container.addEventListener('click', function (e) {
        if (e.target && e.target.classList.contains('assign-btn')) {
            const col = e.target.closest('.col-6');
            const panel = col.querySelector('.assign-list');
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        }
    });
}

loadRolesAndUsers();
