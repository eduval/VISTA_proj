import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

function getServiceIdFromUrl() {
    return new URLSearchParams(window.location.search).get("serviceId");
}

function borderByStatus(status) {
    return status === true ? "border-success" : "border-warning";
}

function statusUI(type) {
    switch (type) {
        case "upcoming":
            return `
        <span class="rounded-circle bg-secondary" style="width:10px;height:10px;"></span>
        <span class="text-muted px-3">Not started</span>
      `;
        case "Ongoing":
            return `
        <span class="rounded-circle" style="width:10px;height:10px;background:#2AC421;"></span>
        <span style="color:#2AC421;">Ongoing</span>
        <button id="request-help-btn" type="button" class="btn" style="background:#ff7b00;color:#fff;border-radius:10px;" 
        data-bs-toggle="modal" data-bs-target="#helpModal">
          Request help
        </button>
      `;
        case "past":
            return `
        <span class="rounded-circle bg-secondary" style="width:10px;height:10px;"></span>
        <span class="text-muted px-3">Completed</span>
      `;
    }
}
function formatDate(timestamp) {
    return new Date(timestamp).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
    });
}

onAuthStateChanged(auth, async (user) => {
    if (!user) return window.location.href = "index.html";

    const serviceId = getServiceIdFromUrl();
    if (!serviceId) return;

    /* ---------------- SERVICE ---------------- */
    const serviceSnap = await get(ref(db, `services/${serviceId}`));
    if (!serviceSnap.exists()) return;

    const service = serviceSnap.val();
    document.getElementById("serviceDate").textContent = formatDate(service.date);

    // --- Status UI & Alert 
    const statusContainer = document.getElementById("serviceStatusContainer");
    if (statusContainer) statusContainer.innerHTML = statusUI(service.type);
    const alert = document.getElementById("upcomingAlert");
    if (service.type === "upcoming") {
        alert.classList.remove("d-none");
    }
    else {
        alert.classList.add("d-none");
    }

    /* ---------------- CORE TASKS ---------------- */
    const coreSnap = await get(ref(db, `coreTasks/${serviceId}/${user.uid}`));
    if (!coreSnap.exists()) return;

    const coreTasksByRole = coreSnap.val();

    // user has ONE role per service
    const roleId = Object.keys(coreTasksByRole)[0];
    const coreTasks = coreTasksByRole[roleId];

    /* ---------------- ROLE DEFINITION ---------------- */
    const roleSnap = await get(ref(db, `roles/${roleId}`));
    if (!roleSnap.exists()) return;

    const role = roleSnap.val();
    document.getElementById("roleID").innerText = role.name;

    const taskList = document.getElementById("taskList");

    /* ---------------- RENDER FUNCTION ---------------- */
    function renderPhase(phase) {
        taskList.innerHTML = "";

        // Add phase label
        const labelText = (phase === "during") ? "Reminders" : "Tasks";
        taskList.insertAdjacentHTML("beforeend", `
      <li class="list-group-item border-0 px-0">
        <span class="d-block mb-3 text-muted text-dark fw-small">${labelText}</span>
      </li>
    `);

        const phaseTasks = role.tasks?.[phase];
        if (!phaseTasks) {
            taskList.insertAdjacentHTML("beforeend", `<li class="list-group-item text-muted">No tasks</li>`);
            return;
        }

        Object.entries(phaseTasks)
            .filter(([_, t]) => t.enabled)
            .sort((a, b) => a[1].order - b[1].order)
            .forEach(([taskId, task]) => {
                const completed = coreTasks?.[phase]?.[taskId]?.status === true;
                const showDue =
                    roleId === "ROLE_MEDIA_PROPRESENTER" && phase === "before" && service.type !== "past";
                let taskContent = "";

                if (phase === "during") {
                    // Info SVG for "during" phase
                    taskContent = `
<svg class="me-2" width="43" height="43" viewBox="0 0 43 43" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="43" height="43" rx="21.5" fill="#f1f0fd"/>
  <path d="M20.4574 28.5V18.1364H22.0497V28.5H20.4574ZM21.267 16.4091C20.9567 16.4091 20.689 16.3034 20.4641 16.092C20.2437 15.8806 20.1335 15.6264 20.1335 15.3295C20.1335 15.0327 20.2437 14.7785 20.4641 14.5671C20.689 14.3557 20.9567 14.25 21.267 14.25C21.5774 14.25 21.8428 14.3557 22.0632 14.5671C22.2881 14.7785 22.4006 15.0327 22.4006 15.3295C22.4006 15.6264 22.2881 15.8806 22.0632 16.092C21.8428 16.3034 21.5774 16.4091 21.267 16.4091Z" fill="#2117d7"/>
</svg>`;
                } else {
                    // Checkbox for "before" and "after"
                    taskContent = `<input type="checkbox"
                     class="form-check-input me-2"
                     style="transform:scale(1.4)"
                     ${completed ? "checked" : ""}>`;
                }

                taskList.insertAdjacentHTML("beforeend", `
<li class="list-group-item border-light px-0">
  <div class="d-flex align-items-center p-3 border-start border-3 ${borderByStatus(completed)}">
    ${taskContent}
    <span class="text-dark ms-2">${task.name}</span>
    ${showDue ? `<span class="text-warning ms-auto">Due to Thursday</span>` : ""}
  </div>
</li>
`);
            });
    }


    /* ---------------- NAV HANDLERS ---------------- */
    document.querySelectorAll(".nav-link[data-phase]").forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();

            // UI active state
            document.querySelectorAll(".nav-link").forEach(l => {
                l.classList.remove("active");
                l.classList.add("text-secondary");
            });

            link.classList.add("active");
            link.classList.remove("text-secondary");

            // Render phase
            renderPhase(link.dataset.phase);
        });
    });

    /* ---------------- DEFAULT ---------------- */
    renderPhase("before");
});
