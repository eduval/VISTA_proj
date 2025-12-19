import { auth, db } from "./firebase-config.js";
import { ref, get, update } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

/* ---------- Helpers ---------- */

function getServiceIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("serviceId"); // null if creating
}

const SERVICE_ID = getServiceIdFromURL();
const IS_EDIT_MODE = !!SERVICE_ID;

function getAssignments() {
  return JSON.parse(localStorage.getItem("service_assignments")) || {};
}

function saveAssignments(data) {
  localStorage.setItem("service_assignments", JSON.stringify(data));
}

function isUserAssignedElsewhere(userId, currentRole) {
  const assignments = getAssignments();
  return Object.entries(assignments).some(
    ([role, users]) => role !== currentRole && users.includes(userId)
  );
}

function renderAssignmentLabel(count) {
  const green = count > 0;

  const iconColor = green ? "#28a745" : "#364153";
  const textClass = green ? "text-success fw-semibold" : "text-muted";

  const icon = `
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M14.3333 16V14.6667C14.3333 13.9594 14.0524 13.2811 13.5523 12.781C13.0522 12.281 12.3739 12 11.6667 12H7.66667C6.95942 12 6.28115 12.281 5.78105 12.781C5.28095 13.2811 5 13.9594 5 14.6667V16"
      stroke="${iconColor}" stroke-width="1.33333"/>
    <path d="M9.27311 9.33333C10.7459 9.33333 11.9398 8.13943 11.9398 6.66667C11.9398 5.19391 10.7459 4 9.27311 4C7.80035 4 6.60645 5.19391 6.60645 6.66667C6.60645 8.13943 7.80035 9.33333 9.27311 9.33333Z"
      stroke="${iconColor}" stroke-width="1.33333"/>
  </svg>`;

  if (!count) return `${icon} <span class="text-muted">Not Assigned</span>`;

  return `
    ${icon}
    <span class="${textClass}">
      ${count} Volunteer${count > 1 ? "s" : ""}
    </span>
  `;
}

/* ---------- Next Button ---------- */

async function setupNextButtonFromFirebase() {
  const nextBtn = document.getElementById("nextStep");
  if (!nextBtn) return;

  if (IS_EDIT_MODE && SERVICE_ID) {
    // Editing an existing service → go to dashboard
    nextBtn.classList.remove("btn-primary");
    nextBtn.classList.add("btn-warning");
    nextBtn.querySelector("span").textContent = "Go to Service Dashboard";

    nextBtn.onclick = e => {
      e.preventDefault();
      // window.location.href = "newServiceDashboard.html";
      window.location.href = `newServiceDashboard.html?serviceId=${SERVICE_ID}`;

    };
  } else {
    // Creating a new service → CREATE Service
    nextBtn.classList.remove("btn-warning");
    nextBtn.classList.add("btn-primary");
    nextBtn.querySelector("span").textContent = "CREATE Service";

    nextBtn.onclick = e => {
      e.preventDefault();
      console.log("CREATE Service clicked");
      // TODO: add logic to create service
    };
  }
}

/* ---------- Load Assignments from Firebase (using coreTasks for roles) ---------- */

/* ---------- Load Assignments from Firebase (coreTasks-based) ---------- */
async function loadAssignmentsFromFirebase(serviceId) {
  if (!serviceId) {
    localStorage.removeItem("service_assignments");
    return;
  }

  const rolesSnap = await get(ref(db, "roles"));
  const roles = rolesSnap.val(); // { ROLE_ID: { name, enabled, icon } }

  const usersSnap = await get(ref(db, "users"));
  const users = usersSnap.val(); // { uid: { name, enabled } }

  const coreTasksSnap = await get(ref(db, `coreTasks/${serviceId}`));
  const coreTasks = coreTasksSnap.exists() ? coreTasksSnap.val() : {};

  const assignmentsByRole = {};

  // Initialize empty arrays for all enabled roles
  Object.entries(roles || {}).forEach(([roleId, roleData]) => {
    if (roleData.enabled) assignmentsByRole[roleData.name] = [];
  });

  // Loop through each user in coreTasks
  Object.entries(coreTasks).forEach(([userId, roleTasks]) => {
    if (!users[userId]) return; // skip if user doesn't exist

    // roleTasks is an object keyed by role ids (ROLE_MEDIA_CAMERA_OPERATOR etc.)
    Object.keys(roleTasks).forEach(roleId => {
      const roleData = roles[roleId];
      if (!roleData || !roleData.enabled) return;

      assignmentsByRole[roleData.name].push(userId);
    });
  });

  localStorage.setItem(
    "service_assignments",
    JSON.stringify(assignmentsByRole)
  );

  //console.log("Assignments loaded from coreTasks:", assignmentsByRole);
}


/* ---------- Main: Load Roles and Users ---------- */

async function loadRolesAndUsers() {
  const [rolesSnap, usersSnap] = await Promise.all([
    get(ref(db, "roles")),
    get(ref(db, "users"))
  ]);

  const rolesData = rolesSnap.val();
  const usersData = usersSnap.val();
  const savedAssignments = getAssignments();

  const enabledUsers = Object.entries(usersData || {})
    .filter(([, u]) => u.enabled)
    .map(([id, u]) => ({ id, ...u }));

  //console.log("Enabled users:", enabledUsers);

  const container = document.getElementById("rolesContainer");
  container.innerHTML = "";

  Object.values(rolesData || {}).forEach(role => {
    if (!role.enabled) return;

    const roleName = role.name;
    const assignedCount = savedAssignments[roleName]?.length || 0;

    /* ---- Column ---- */
    const col = document.createElement("div");
    col.className = "col-12 col-md-6 mb-3";

    col.innerHTML = `
      <div class="card rounded-4 shadow-sm ${assignedCount ? "assigned" : ""}">
        <div class="card-body d-flex flex-column">

          <div class="d-flex align-items-center gap-2 mb-3">
            <div style="width:40px;height:40px" class="text-primary">
              ${role.icon}
            </div>
            <h5 class="mb-0">${roleName}</h5>
            <a href="#" class="edit-tasks-link ms-auto small text-primary"
            data-role="${roleName}">Edit Tasks</a>
          </div>

          <div class="mt-auto ms-5 d-flex justify-content-between align-items-center">
            <span class="assignment-label small text-muted">
              ${renderAssignmentLabel(assignedCount)}
            </span>
            <button class="btn btn-sm btn-outline-primary assign-btn">
              Assign
            </button>
          </div>
        </div>
      </div>
    `;

    /* ---- Panel ---- */
    const panel = document.createElement("div");
    panel.className = "assign-list mt-2 p-2 border rounded-3 bg-light";
    panel.style.display = "none";

    panel.innerHTML = `
      <ul class="list-group mb-2">
        ${enabledUsers.map(u => {
      const assignedHere = savedAssignments[roleName]?.includes(u.id);
      const disabled = isUserAssignedElsewhere(u.id, roleName);

      const roleBadge =
        u.role?.toLowerCase() === "admin"
          ? `<span class="badge bg-primary ms-2">Admin</span>`
          : `<span class="text-muted ms-2 small">${u.role || ""}</span>`;

      return `
            <li class="list-group-item d-flex align-items-center">
              <input class="form-check-input me-2"
                     type="checkbox"
                     data-user="${u.id}"
                     data-role="${roleName}"
                     ${assignedHere ? "checked" : ""}
                     ${disabled ? "disabled" : ""}>
              <span>${u.name} ${roleBadge}</span>
            </li>
          `;
    }).join("")}
      </ul>
      <div class="d-flex justify-content-end">
        <button class="btn btn-primary btn-sm save-assignments"
                data-role="${roleName}">
          Save Assignments
        </button>
      </div>
    `;

    col.appendChild(panel);
    container.appendChild(col);
  });

  /* ---------- Events ---------- */

  container.onclick = e => {
    const assignBtn = e.target.closest(".assign-btn");
    if (assignBtn) {
      const panel = assignBtn.closest(".col-12, .col-md-6")
        .querySelector(".assign-list");
      panel.style.display = panel.style.display === "none" ? "block" : "none";
      return;
    }

    const saveBtn = e.target.closest(".save-assignments");
    if (!saveBtn) return;

    const roleName = saveBtn.dataset.role;
    const assignments = getAssignments();
    const checked = container.querySelectorAll(`input[data-role="${roleName}"]:checked`);

    assignments[roleName] = [...checked].map(cb => cb.dataset.user);
    saveAssignments(assignments);

    if (IS_EDIT_MODE && SERVICE_ID) {
      const serviceAssignments = {};
      Object.values(assignments).flat().forEach(uid => serviceAssignments[uid] = true);
      update(ref(db, `services/${SERVICE_ID}/assignments`), serviceAssignments)
        .catch(err => console.error("Firebase update failed:", err));
    }

    const count = assignments[roleName].length;
    saveBtn.textContent = "Saved ✓";
    saveBtn.classList.replace("btn-primary", "btn-success");

    const card = saveBtn.closest(".col-12, .col-md-6").querySelector(".card");
    const label = card.querySelector(".assignment-label");
    label.innerHTML = renderAssignmentLabel(count);
    card.classList.toggle("assigned", count > 0);

    setTimeout(() => {
      saveBtn.textContent = "Save Assignments";
      saveBtn.classList.replace("btn-success", "btn-primary");
      saveBtn.closest(".assign-list").style.display = "none";
    }, 700);

    refreshDisabledUsers();
  };

  container.addEventListener("click", e => {
    const editLink = e.target.closest(".edit-tasks-link");
    if (!editLink) return;

    e.preventDefault();
    const roleName = editLink.dataset.role;
    const usersMap = Object.fromEntries(
      Object.entries(usersData || {}).map(([id, u]) => [id, u])
    );
    const assignedUsers = getAssignedUsersForRole(roleName, usersMap);

    if (!assignedUsers.length) {
      localStorage.setItem("edit_tasks_role", roleName);
      localStorage.setItem("edit_tasks_user", "all");
      new bootstrap.Modal(document.getElementById("modal-fmFile")).show();
      return;
    }

    const preview = document.createElement("div");
    preview.className = "border rounded-3 bg-white shadow-sm p-2 mt-2";
    preview.style.maxWidth = "100%";

    preview.innerHTML = `
      <ul class="list-group mb-2">
        ${assignedUsers.map(u => `
          <li class="list-group-item list-group-item-action edit-task-user"
              data-user="${u.id}" data-role="${roleName}">
            <svg width="20" height="20" viewBox="0 0 20 20" class="me-2">
              <path d="M14.3333 16V14.6667C14.3333 13.9594 14.0524 13.2811 13.5523 12.781C13.0522 12.281 12.3739 12 11.6667 12H7.66667C6.95942 12 6.28115 12.281 5.78105 12.781C5.28095 13.2811 5 13.9594 5 14.6667V16"
                stroke="#364153" stroke-width="1.33333"/>
              <path d="M9.27311 9.33333C10.7459 9.33333 11.9398 8.13943 11.9398 6.66667C11.9398 5.19391 10.7459 4 9.27311 4C7.80035 4 6.60645 5.19391 6.60645 6.66667C6.60645 8.13943 7.80035 9.33333 9.27311 9.33333Z"
                stroke="#364153" stroke-width="1.33333"/>
            </svg>
            ${u.name}
          </li>
        `).join("")}

        <li class="list-group-item list-group-item-action fw-semibold text-primary edit-task-all"
            data-role="${roleName}">
          All assigned
        </li>
      </ul>
    `;

    const card = editLink.closest(".card");
    const existing = card.querySelector(".tasks-preview");
    if (existing) { existing.remove(); return; }
    closeAllTaskPreviews();

    preview.classList.add("tasks-preview");
    editLink.closest(".card").appendChild(preview);
  });

  document.addEventListener("click", e => {
    if (e.target.closest(".edit-tasks-link") || e.target.closest(".tasks-preview")) return;
    closeAllTaskPreviews();
  });
}

/* ---------- Lock users across roles ---------- */

function refreshDisabledUsers() {
  const assignments = getAssignments();

  document.querySelectorAll("input[data-user]").forEach(cb => {
    const user = cb.dataset.user;
    const role = cb.dataset.role;

    const assignedElsewhere = Object.entries(assignments)
      .some(([r, users]) => r !== role && users.includes(user));

    cb.disabled = assignedElsewhere && !cb.checked;
  });
}

function getAssignedUsersForRole(roleName, usersMap) {
  const assignments = getAssignments();
  const ids = assignments[roleName] || [];
  return ids.map(id => usersMap[id]).filter(Boolean);
}

document.addEventListener("click", e => {
  const userItem = e.target.closest(".edit-task-user");
  const allItem = e.target.closest(".edit-task-all");
  if (!userItem && !allItem) return;

  const role = (userItem || allItem).dataset.role;
  const user = userItem ? userItem.dataset.user : "all";

  localStorage.setItem("edit_tasks_role", role);
  localStorage.setItem("edit_tasks_user", user);

  new bootstrap.Modal(document.getElementById("modal-fmFile")).show();
  document.querySelectorAll(".tasks-preview").forEach(p => p.remove());
});

function closeAllTaskPreviews() {
  document.querySelectorAll(".tasks-preview").forEach(p => p.remove());
}

/* ---------- Main ---------- */

(async () => {
  if (IS_EDIT_MODE && SERVICE_ID) {
    await loadAssignmentsFromFirebase(SERVICE_ID);
  } else {
    localStorage.removeItem("service_assignments");
  }

  await loadRolesAndUsers();
  setupNextButtonFromFirebase();
})();
