// service-dashboard.js - Fixed with service status and working collapse
import { db } from "./firebase-config.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

let serviceId = null;
let serviceData = null;
let coreTasksData = null;
let volunteersData = new Map();
let roleNames = new Map();

const serviceDateElement = document.getElementById('serviceDate');
const mainContent = document.getElementById('middle');
const serviceStatusElement = document.getElementById('status');

function getAssignmentKeys(assignments) {
    if (!assignments) return [];
    return Object.keys(assignments).filter(key => assignments[key]);
}


function getServiceIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('serviceId');
}

async function initDashboard() {
    try {
        serviceId = getServiceIdFromURL();

        if (!serviceId) {
            console.error('No serviceId provided in URL');
            showErrorMessage('Service ID not found in URL parameters');
            return;
        }

        // 1️⃣ Load service first
        await loadServiceData();

        // 2️⃣ Load core tasks (source of volunteer IDs)
        await loadCoreTasks();

        // 3️⃣ NOW load volunteers (depends on coreTasksData)
        await loadVolunteerData();

        // 4️⃣ Load roles (independent)
        await loadRoleNames();

        // 5️⃣ Render UI
        updateServiceInfo();
        createRoleCards();

        const nextBtn = document.getElementById("moveBack");
        nextBtn.onclick = e => {
            e.preventDefault();
            window.location.href = `newServiceAssignment.html?serviceId=${serviceId}`;
        };

    } catch (error) {
        console.error('Error initializing dashboard:', error);
        showErrorMessage('Failed to load service data. Please try again.');
    }
}


async function loadServiceData() {
    try {
        const serviceRef = ref(db, `services/${serviceId}`);
        const snapshot = await get(serviceRef);

        if (snapshot.exists()) {
            serviceData = snapshot.val();
            console.log('Service data loaded:', serviceData);
        } else {
            throw new Error('Service not found');
        }
    } catch (error) {
        console.error('Error loading service data:', error);
        throw error;
    }
}

async function loadCoreTasks() {
    try {
        const coreTasksRef = ref(db, `coreTasks/${serviceId}`);
        const snapshot = await get(coreTasksRef);

        if (snapshot.exists()) {
            coreTasksData = snapshot.val();
            console.log('Core tasks loaded:', coreTasksData);
        } else {
            console.log('No core tasks found for this service');
            coreTasksData = {};
        }
    } catch (error) {
        console.error('Error loading core tasks:', error);
        coreTasksData = {};
    }
}

async function loadVolunteerData() {
    try {
        if (!coreTasksData || Object.keys(coreTasksData).length === 0) {
            console.log('No core tasks found – no volunteers to load');
            return;
        }

        const volunteerIds = Object.keys(coreTasksData);
        console.log('Volunteer IDs from coreTasks:', volunteerIds);

        const userPromises = volunteerIds.map(async (userId) => {
            try {
                const userRef = ref(db, `users/${userId}`);
                const snapshot = await get(userRef);

                if (snapshot.exists()) {
                    const userData = snapshot.val();
                    volunteersData.set(userId, userData);
                    console.log(`Loaded volunteer: ${userId}`, userData);
                } else {
                    console.warn(`User ${userId} not found in database`);
                    volunteersData.set(userId, {
                        name: `User ${userId.substring(0, 8)}...`,
                        email: 'Unknown'
                    });
                }
            } catch (error) {
                console.error(`Error loading user ${userId}:`, error);
                volunteersData.set(userId, {
                    name: `User ${userId.substring(0, 8)}...`,
                    email: 'Error loading'
                });
            }
        });

        await Promise.all(userPromises);
        console.log(`Loaded ${volunteersData.size} volunteer profiles`);

    } catch (error) {
        console.error('Error loading volunteer data:', error);
    }
}

async function loadRoleNames() {
    try {
        const rolesRef = ref(db, 'roles');
        const snapshot = await get(rolesRef);

        if (snapshot.exists()) {
            const roles = snapshot.val();
            Object.entries(roles).forEach(([roleKey, roleData]) => {
                roleNames.set(roleKey, roleData.name || roleKey);
            });
            console.log('Role names loaded:', Array.from(roleNames.entries()));
        } else {
            console.log('No roles found in database');
        }
    } catch (error) {
        console.error('Error loading role names:', error);
    }
}

function updateServiceInfo() {
    if (!serviceData) return;

    if (serviceDateElement && serviceData.date) {
        serviceDateElement.textContent = serviceData.date;
    }

    if (serviceStatusElement && serviceData.status) {
        serviceStatusElement.textContent = serviceData.status;
        updateServiceStatusIndicator(serviceData.status);
    }
}

function updateServiceStatusIndicator(status) {
    const notStartedBtn = document.getElementById('notstarted');
    const startServiceBtn = document.getElementById('startService');

    if (!notStartedBtn || !startServiceBtn) return;

    switch (status.toLowerCase()) {
        case 'completed':
            notStartedBtn.innerHTML = `<span>Completed</span>`;
            notStartedBtn.style.backgroundColor = '#28a745';
            notStartedBtn.style.color = '#ffffff';
            startServiceBtn.style.display = 'none';
            break;
        case 'in progress':
            notStartedBtn.innerHTML = `<span>In Progress</span>`;
            notStartedBtn.style.backgroundColor = '#ffc107';
            notStartedBtn.style.color = '#000000';
            break;
        case 'not started':
        default:
            notStartedBtn.innerHTML = `<span>Not Started</span>`;
            notStartedBtn.style.backgroundColor = '#F3F4F6';
            notStartedBtn.style.color = '#364153';
            break;
    }
}

function createRoleCards() {
    // Clear any existing content except the original service monitor card
    const existingContainer = mainContent.querySelector('.container-fluid.mt-4');
    if (existingContainer) {
        existingContainer.remove();
    }

    const assignmentKeys = getAssignmentKeys(serviceData.assignments);

    if (assignmentKeys.length === 0) {
        showNoAssignmentsMessage();
        return;
    }

    // Group volunteers by role
    const roleGroups = groupVolunteersByRole();

    if (Object.keys(roleGroups).length === 0) {
        showNoAssignmentsMessage();
        return;
    }

    const container = document.createElement('div');
    container.className = 'container-fluid mt-4';

    const row = document.createElement('div');
    row.className = 'row';

    let cardCount = 0;

    // Create a card for each role
    Object.entries(roleGroups).forEach(([roleKey, roleData]) => {
        const card = createRoleCard(roleKey, roleData);
        if (card) {
            row.appendChild(card);
            cardCount++;
        }
    });

    if (cardCount === 0) {
        showNoAssignmentsMessage(row);
    } else {
        container.appendChild(row);

        // Insert cards after the existing service monitor card
        const existingServiceMonitor = mainContent.querySelector('.card.my-3');
        if (existingServiceMonitor) {
            existingServiceMonitor.insertAdjacentElement('afterend', container);
        } else {
            mainContent.prepend(container);
        }
    }
}






function groupVolunteersByRole() {
    const roleGroups = {};

    if (!coreTasksData || Object.keys(coreTasksData).length === 0) {
        return roleGroups;
    }

    // Iterate through all volunteers with core tasks
    Object.entries(coreTasksData).forEach(([volunteerId, volunteerRoles]) => {
        Object.keys(volunteerRoles).forEach(roleKey => {
            if (!roleGroups[roleKey]) {
                roleGroups[roleKey] = {
                    volunteers: [],
                    tasks: []
                };
            }


            const volunteer = volunteersData.get(volunteerId);

            roleGroups[roleKey].volunteers.push({
                id: volunteerId,
                name: volunteer?.name || `Volunteer ${volunteerId.substring(0, 6)}...`
            });

            // Add tasks for this volunteer-role combination
            const roleTasks = volunteerRoles[roleKey];
            roleGroups[roleKey].tasks.push(roleTasks);
        });
    });

    console.log('Role groups:', roleGroups);
    return roleGroups;
}

function createRoleCard(roleKey, roleData) {
    const roleDisplayName = roleNames.get(roleKey) ||
        roleKey.replace('ROLE_', '').replace(/_/g, ' ');

    const volunteerCount = roleData.volunteers.length;
    const allTaskStats = calculateAggregateTaskStatistics(roleData.tasks);

    // Get service status from serviceData
    const serviceStatus = serviceData?.status || 'Not Started';

    // Create safe ID for collapse target (remove special characters)
    const safeRoleId = roleKey.replace(/[^a-zA-Z0-9]/g, '-');

    // Create card
    const col = document.createElement('div');
    col.className = 'col-12 col-md-6 col-lg-4 my-3';

    col.innerHTML = `
        <div class="card">
            <div class="card-header border-0 d-flex align-items-center">
                <a href="#!" class="w-100 text-wrap fw-medium link-normal">
                    ${escapeHtml(roleDisplayName)}
                    <span class="d-block mt-1 fw-light text-muted small">${escapeHtml(serviceStatus)}</span>
                </a>

                <div class="flex-none dropdown z-index-1 align-self-baseline">
                    <button
                        class="btn btn-sm btn-icon btn-light btn-ghost rounded-circle dropdown-toggle float-end"
                        type="button" data-bs-toggle="dropdown" aria-expanded="false">
                        <span>
                            <svg height="18px" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"
                                fill="currentColor">
                                <path fill-rule="evenodd"
                                    d="M9.5 13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z">
                                </path>
                            </svg>
                        </span>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-clean end-0">
                        <li>
                            <a class="dropdown-item" href="#">
                                <svg class="text-muted" width="18px" height="18px" viewBox="0 0 16 16"
                                    xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                                    <path fill-rule="evenodd"
                                        d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z">
                                    </path>
                                    <path fill-rule="evenodd"
                                        d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z">
                                    </path>
                                </svg>
                                <span>Task Details</span>
                            </a>
                        </li>
                        <li>
                            <a class="dropdown-item" href="#">
                                <svg class="text-muted" xmlns="http://www.w3.org/2000/svg" width="18px"
                                    height="18px" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M12 20h9"></path>
                                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                                </svg>
                                <span>Edit Role</span>
                            </a>
                        </li>
                        <li>
                            <a class="dropdown-item" href="#">
                                <svg class="text-muted" xmlns="http://www.w3.org/2000/svg" width="18px"
                                    height="18px" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                                    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                                    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
                                </svg>
                                <span>Archive</span>
                            </a>
                        </li>
                        <li class="dropdown-divider"></li>
                        <li>
                            <a class="dropdown-item" href="#">
                                <svg class="text-danger" xmlns="http://www.w3.org/2000/svg" width="18px"
                                    height="18px" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path
                                        d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2">
                                    </path>
                                    <line x1="10" y1="11" x2="10" y2="17"></line>
                                    <line x1="14" y1="11" x2="14" y2="17"></line>
                                </svg>
                                <span>Delete</span>
                            </a>
                        </li>
                    </ul>
                </div>
            </div>
            <div class="card-body px-lg-4">

                <!-- assigned -->
                <div class="avatar-group mb-4 d-flex justify-content-center align-items-center">
                    <div
                        class="avatar avatar-sm avatar-border rounded-circle bg-gray-200 d-flex justify-content-center align-items-center">
                        <svg width="18px" height="18px" xmlns="http://www.w3.org/2000/svg" fill="#574FEC"
                            class="bi bi-person-fill" viewBox="0 0 16 16">
                            <path
                                d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H3zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6z">
                            </path>
                        </svg>
                    </div>
                    <small class="ps-3">${volunteerCount} Volunteer${volunteerCount !== 1 ? 's' : ''}</small>
                </div>

                <!-- tasks -->
                <div class="row text-center mb-3">
                    <div class="col lh-sm text-dark">
                        <span class="fs-5">${allTaskStats.totalTasks}</span>
                        <p class="small mb-0">total tasks</p>
                    </div>
                    <div class="col lh-sm text-dark">
                        <span class="fs-5">${allTaskStats.completedTasks}</span>
                        <p class="small mb-0">completed</p>
                    </div>
                    <div class="col lh-sm text-dark">
                        <span class="fs-5">${allTaskStats.pendingTasks}</span>
                        <p class="small mb-0">left</p>
                    </div>
                </div>

                <!-- progress -->
                <div class="progress" style="height: 6px;">
                    <div class="progress-bar ${allTaskStats.progressColor}" role="progressbar" style="width: ${allTaskStats.progressPercent}%;"
                        aria-valuenow="${allTaskStats.progressPercent}" aria-valuemin="0" aria-valuemax="100"></div>
                </div>
                
                <!-- Volunteer list (collapsed by default) -->
                <div class="mt-3">
                    <button
  class="btn btn-sm btn-link p-0 text-decoration-none volunteer-toggle"
  type="button"
  data-bs-toggle="collapse"
  data-bs-target="#volunteers-${safeRoleId}">
                            
                        <small class="text-muted">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1 toggle-icon">
                                <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                            Show ${volunteerCount} volunteer${volunteerCount !== 1 ? 's' : ''}
                        </small>
                    </button>
                    <div class="collapse mt-2" id="volunteers-${safeRoleId}">
                        <div class="small">
                            ${roleData.volunteers.map(vol =>
        `<div class="d-flex align-items-center mb-1">
                                    <div class="me-2">
                                        <svg width="12" height="12" fill="#574FEC" viewBox="0 0 16 16">
                                            <path d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H3zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
                                        </svg>
                                    </div>
                                    <span>${escapeHtml(vol.name)}</span>
                                </div>`
    ).join('')}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    return col;
}

function calculateAggregateTaskStatistics(allRoleTasks) {
    let totalTasks = 0;
    let completedTasks = 0;

    // Aggregate across all volunteers for this role
    allRoleTasks.forEach(roleTasks => {
        const phases = ['before', 'during', 'after'];

        phases.forEach(phase => {
            if (roleTasks[phase]) {
                const phaseTasks = roleTasks[phase];
                const taskKeys = Object.keys(phaseTasks);

                totalTasks += taskKeys.length;

                taskKeys.forEach(taskKey => {
                    const task = phaseTasks[taskKey];
                    if (task.status === true) {
                        completedTasks++;
                    }
                });
            }
        });
    });

    const pendingTasks = totalTasks - completedTasks;
    const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    let progressColor = 'bg-primary';
    if (progressPercent === 100) progressColor = 'bg-success';
    else if (progressPercent >= 50) progressColor = 'bg-info';
    else if (progressPercent > 0) progressColor = 'bg-warning';

    return {
        totalTasks,
        completedTasks,
        pendingTasks,
        progressPercent,
        progressColor
    };
}

function showNoAssignmentsMessage(row = null) {
    const emptyMessage = document.createElement('div');
    emptyMessage.className = 'col-12 text-center py-5';
    emptyMessage.innerHTML = `
        <h4 class="text-muted">No volunteer assignments found</h4>
        <p class="text-muted">Add volunteers to this service to see their tasks here.</p>
        <div class="mt-3">
            <button id="retryLoadBtn" class="btn btn-sm btn-primary">Retry Loading</button>
        </div>
    `;

    if (row) {
        row.appendChild(emptyMessage);
    } else {
        const container = document.createElement('div');
        container.className = 'container-fluid mt-4';
        const rowDiv = document.createElement('div');
        rowDiv.className = 'row';
        rowDiv.appendChild(emptyMessage);
        container.appendChild(rowDiv);

        const existingServiceMonitor = mainContent.querySelector('.card.my-3');
        if (existingServiceMonitor) {
            existingServiceMonitor.insertAdjacentElement('afterend', container);
        } else {
            mainContent.prepend(container);
        }
    }

    document.getElementById('retryLoadBtn')?.addEventListener('click', () => {
        location.reload();
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger m-4';
    errorDiv.innerHTML = `
        <strong>Error:</strong> ${escapeHtml(message)}
        <button type="button" class="btn-close float-end" data-bs-dismiss="alert"></button>
    `;

    mainContent.insertBefore(errorDiv, mainContent.firstChild);
}

function setupEventListeners() {
    const startServiceBtn = document.getElementById('startService');
    if (startServiceBtn) {
        startServiceBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            // Implement service start functionality here
            alert('Starting service functionality would be implemented here');
        });
    }

    const nextStepBtn = document.getElementById('nextStep');
    if (nextStepBtn) {
        nextStepBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // Implement next step functionality
            alert('Next step functionality would be implemented here');
        });
    }
}

// Reinitialize Bootstrap components after DOM updates


// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    initDashboard();
});

export { initDashboard, getServiceIdFromURL, loadServiceData };