import { db } from "./firebase-config.js";
import { ref, get, update } from
    "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

/* ---------- Helpers ---------- */

function getAssignments() {
    return JSON.parse(localStorage.getItem("service_assignments")) || {};
}

function getServiceDate() {
    return localStorage.getItem("service_date");
}

function getServiceTime() {
    return localStorage.getItem("service_time");
}

/* ---------- Main ---------- */

async function createServiceAndTasks() {

    const rawDate = getServiceDate();
    const rawTime = getServiceTime();
    const serviceDate = formatServiceDate(rawDate);
    const serviceTime = formatServiceTime(rawTime);

    if (!serviceDate || !serviceTime) {
        alert("Service date or time is missing");
        return;
    }


    const assignmentsByRole = getAssignments();
    const serviceTimestamp = Date.parse(rawDate);

    const rolesSnap = await get(ref(db, "roles"));
    const roles = rolesSnap.val();

    /* ---------- SERVICE NODE ---------- */

    const serviceAssignments = {};

    Object.values(assignmentsByRole)
        .flat()
        .forEach(uid => {
            serviceAssignments[uid] = true;
        });


    const servicePayload = {
        title: "Sunday Service",
        date: serviceDate,
        time: serviceTime,
        enabled: true,
        status: "Upcoming",
        type: "upcoming",
        dateTimestamp: serviceTimestamp,
        icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M0 10C0 4.47715 4.47715 0 10 0H30C35.5228 0 40 4.47715 40 10V30C40 35.5228 35.5228 40 30 40H10C4.47715 40 0 35.5228 0 30V10Z" fill="#F3F4F6" style="fill:#F3F4F6;fill:color(display-p3 0.9529 0.9569 0.9647);fill-opacity:1;"/> <path d="M16.6666 11.6667V15" stroke="#4A5565" style="stroke:#4A5565;stroke:color(display-p3 0.2902 0.3333 0.3961);stroke-opacity:1;" stroke-width="1.66667" stroke-linecap="round" stroke-linejoin="round"/> <path d="M23.3334 11.6667V15" stroke="#4A5565" style="stroke:#4A5565;stroke:color(display-p3 0.2902 0.3333 0.3961);stroke-opacity:1;" stroke-width="1.66667" stroke-linecap="round" stroke-linejoin="round"/> <path d="M25.8333 13.3333H14.1667C13.2462 13.3333 12.5 14.0795 12.5 15V26.6667C12.5 27.5872 13.2462 28.3333 14.1667 28.3333H25.8333C26.7538 28.3333 27.5 27.5872 27.5 26.6667V15C27.5 14.0795 26.7538 13.3333 25.8333 13.3333Z" stroke="#4A5565" style="stroke:#4A5565;stroke:color(display-p3 0.2902 0.3333 0.3961);stroke-opacity:1;" stroke-width="1.66667" stroke-linecap="round" stroke-linejoin="round"/> <path d="M12.5 18.3333H27.5" stroke="#4A5565" style="stroke:#4A5565;stroke:color(display-p3 0.2902 0.3333 0.3961);stroke-opacity:1;" stroke-width="1.66667" stroke-linecap="round" stroke-linejoin="round"/> </svg>',
        assignments: serviceAssignments
    };

    /* ---------- CORE TASKS NODE ---------- */

    const coreTasksPayload = {};

    Object.entries(assignmentsByRole).forEach(([roleName, userIds]) => {
        const role = Object.values(roles).find(r => r.name === roleName);
        if (!role || !role.tasks) return;

        userIds.forEach(userId => {
            if (!coreTasksPayload[userId]) {
                coreTasksPayload[userId] = {};
            }

            coreTasksPayload[userId][role.id] = {};

            ["before", "during", "after"].forEach(stage => {
                if (!role.tasks[stage]) return;

                coreTasksPayload[userId][role.id][stage] = {};

                Object.entries(role.tasks[stage])
                    .filter(([, task]) => task.enabled)
                    .sort((a, b) => a[1].order - b[1].order)
                    .forEach(([taskId, task]) => {
                        coreTasksPayload[userId][role.id][stage][taskId] = {
                            order: task.order,
                            status: false,
                            completedAt: 0
                        };
                    });
            });
        });
    });

    /* ---------- SAVE BOTH ---------- */

    const updates = {};
    updates[`services/${serviceTimestamp}`] = servicePayload;
    updates[`coreTasks/${serviceTimestamp}`] = coreTasksPayload;

    await Promise.all([
        update(ref(db, `services/${serviceTimestamp}`), servicePayload),
        update(ref(db, `coreTasks/${serviceTimestamp}`), coreTasksPayload)
    ]);


    /* ---------- CLEANUP ---------- */

    localStorage.removeItem("service_assignments");
    localStorage.removeItem("service_date");
    localStorage.removeItem("service_time");

    window.location.href = "newServiceDashboard.html";
}

/* ---------- Button ---------- */

document.getElementById("nextStep").addEventListener("click", e => {
    e.preventDefault();
    createServiceAndTasks();
});


function formatServiceDate(dateStr) {
    // dateStr = "01/04/2026"
    const [month, day, year] = dateStr.split("/").map(Number);

    const date = new Date(year, month - 1, day);

    return date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
    });
}

function formatServiceTime(timeStr) {
    // timeStr = "10:00"
    const [hour, minute] = timeStr.split(":").map(Number);

    const date = new Date();
    date.setHours(hour, minute);

    return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true
    });
}

