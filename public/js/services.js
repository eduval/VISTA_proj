import { auth, db } from './firebase-config.js';
import {
    ref,
    get,
    query,
    orderByChild
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// Load services dynamically from Realtime Database
async function loadServices() {
    const servicesRef = query(
        ref(db, 'services'),
        orderByChild('dateTimestamp')
    );

    const snap = await get(servicesRef);

    document.getElementById("upcomingServices").innerHTML = "";
    document.getElementById("pastServices").innerHTML = "";

    if (!snap.exists()) return;

    snap.forEach(service => {
        const data = service.val();

        // Only enabled services
        if (!data.enabled) return;

        const container =
            data.type === "upcoming"
                ? document.getElementById("upcomingServices")
                : document.getElementById("pastServices");

        // Adjust based on type
        const volunteersText = data.type === "upcoming" ? "assigned" : "participated";
        const buttonClass = data.type === "upcoming" ? "btn-success" : "btn-secondary";

        const row = `
        <tr>
            <!-- DATE + TIME -->
            <td class="align-middle">
                <div class="d-flex align-items-center gap-3">
                    <div>${data.icon}</div>
                    <div class="d-flex flex-column">
                        <span class="fw-semibold text-dark">${data.title}</span>
                        <span class="text-muted small">${data.date} — ${data.time}</span>
                    </div>
                </div>
            </td>

            <!-- VOLUNTEERS -->
            <td class="align-middle">
                <div class="d-flex align-items-center gap-3">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M11.0599 14V12.6667C11.0599 11.9594 10.7789 11.2811 10.2788 10.781C9.77875 10.281 9.10047 10 8.39323 10H4.39323C3.68599 10 3.00771 10.281 2.50761 10.781C2.00751 11.2811 1.72656 11.9594 1.72656 12.6667V14" stroke="#99A1AF" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
                      <path d="M10.6666 2.08545C11.2385 2.2337 11.7449 2.56763 12.1064 3.03482C12.4679 3.50202 12.6641 4.07604 12.6641 4.66678C12.6641 5.25752 12.4679 5.83154 12.1064 6.29874C11.7449 6.76594 11.2385 7.09987 10.6666 7.24812" stroke="#99A1AF" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
                      <path d="M14.6666 14V12.6667C14.6662 12.0758 14.4695 11.5019 14.1075 11.0349C13.7455 10.5679 13.2387 10.2344 12.6666 10.0867" stroke="#99A1AF" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
                      <path d="M6.00004 7.33333C7.4728 7.33333 8.66671 6.13943 8.66671 4.66667C8.66671 3.19391 7.4728 2 6.00004 2C4.52728 2 3.33337 3.19391 3.33337 4.66667C3.33337 6.13943 4.52728 7.33333 6.00004 7.33333Z" stroke="#99A1AF" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>

                    ${data.volunteers || 0} ${volunteersText}
                </div>
            </td>

            <!-- STATUS -->
            <td class="align-middle">
                <button class="btn btn-soft ${buttonClass} rounded-pill px-4 py-1 fw-semibold"
                        style="font-size: 0.825rem;">
                    ${data.status}
                </button>
            </td>

            <!-- ACTIONS -->
            <td class="align-middle">
                <a href="#">View Details</a>
            </td>
        </tr>
        `;

        container.insertAdjacentHTML("beforeend", row);
    });
}

loadServices();
