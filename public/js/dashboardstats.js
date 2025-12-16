import { auth, db } from "./firebase-config.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";
import { getCurrentUserRole } from './auth-helpers.js'; // centralized helper

const dashboardDiv = document.getElementById("dashboardstats");

dashboardDiv.innerHTML = `
  <li class="text-center py-4">
    <div class="spinner-grow text-primary" role="status">
      <span class="visually-hidden"></span>
    </div>
  </li>
`;

async function loadDashboardStats() {
  const role = await getCurrentUserRole(); // get user role
  const statsRef = ref(db, "dashboardStats");
  const snap = await get(statsRef);

  if (!snap.exists()) return;

  // Convert snapshot to array with keys preserved
  let statsArr = Object.entries(snap.val())
    .map(([key, value]) => ({ key, ...value }))
    .filter(item => item.enabled === true)
    .sort((a, b) => (a.id || 0) - (b.id || 0)); // sort by ID

  // Filter stats for non-admins
  if (role !== 'admin') {
    const allowedKeys = ['totalServices', 'upcomingServices']; // your actual keys in DB
    statsArr = statsArr.filter(item => allowedKeys.includes(item.key));
  }

  dashboardDiv.innerHTML = ""; // clear container

  statsArr.forEach(item => {
    const card = document.createElement("div");
    card.className = "col-lg-3";

    card.innerHTML = `
          <div class="section p-4 text-center">
            <div class="d-flex flex-column align-items-center gap-2">
              ${item.icon}
              <h6 class="mb-2 text-muted">${item.label}</h6>
            </div>
            <div>
              <span class="fs-3 fw-bold">${item.value}</span>
            </div>
          </div>
        `;

    dashboardDiv.appendChild(card);
  });
}


loadDashboardStats();
