// menu.js — role-aware dynamic menu with unread Alerts badge

import { auth, db } from './firebase-config.js';
import { getCurrentUserRole, isAdmin } from './auth-helpers.js';
import { ref, get } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const currentPath = window.location.pathname
  .split('/').pop()
  .split('?')[0]
  .split('#')[0];
const dynamicMenu = document.getElementById('dynamicMenu');
const role = await getCurrentUserRole();
if (await isAdmin()) console.log("You can manage services");

// ----------------------------
// Initial loading placeholder
// ----------------------------
dynamicMenu.innerHTML = `
  <li class="text-center py-4">
    <div class="spinner-grow text-primary" role="status">
      <span class="visually-hidden"></span>
    </div>
  </li>
`;

// ----------------------------
// Helpers
// ----------------------------
function safeIconSvg(item) {
  const svg = item?.iconSvg || item?.iconsvg;
  return svg ? `<span class="nav-link-icon" style="margin-right:12px;display:inline-flex;align-items:center;">${svg}</span>` : '';
}

function userCanSee(item, role) {
  const r = item?.roles;
  if (!r) return true;
  const norm = v => String(v).toLowerCase();
  if (typeof r === 'string') return norm(r) === role;
  if (Array.isArray(r)) return r.map(norm).includes(role);
  if (typeof r === 'object') return Object.values(r).map(norm).includes(role);
  return false;
}

// New: Check active status including childrenPages
function normalizePath(path) {
  if (!path) return '';
  return path
    .split('/').pop()   // filename
    .split('?')[0]      // remove query
    .split('#')[0];     // remove hash
}

function isActiveMenuItem(item) {
  if (!item) return false;

  const current = normalizePath(currentPath);

  // 🔹 Direct link match
  if (item.link) {
    const itemPath = normalizePath(item.link);
    if (itemPath === current) return true;
  }

  // 🔹 childrenPages match
  if (item.childrenPages) {
    const pages = item.childrenPages
      .split(',')
      .map(p => normalizePath(p.trim()));

    if (pages.includes(current)) return true;
  }

  return false;
}

// ----------------------------
// Renderers
// ----------------------------
function renderMenuItem(key, item) {
  if (!item?.enable || !userCanSee(item, role)) return '';

  const iconHtml = safeIconSvg(item);
  const hasChildren = item?.children && Object.values(item.children).some(c => c && c.enable && userCanSee(c, role));
  const isActive = isActiveMenuItem(item);

  const badgeHtml = item.title === "Alerts"
    ? `<span class="notification-count-alerts"
             style="position:absolute;top:-10px;right:-20px;background:red;color:white;border-radius:50%;padding:5px 5px;font-size:12px;${unreadAlertCount > 0 ? '' : 'display:none;'}">
             ${unreadAlertCount}
           </span>`
    : '';

  if (hasChildren) {
    const childrenHTML = Object.entries(item.children)
      .filter(([_, c]) => c && c.enable && userCanSee(c, role))
      .sort(([, a], [, b]) => (a.id || 0) - (b.id || 0))
      .map(([childKey, childItem]) => renderMenuItem(childKey, childItem))
      .join('');

    return `
<li class="nav-item${isActive ? ' active' : ''}" style="position:relative;">
  <a class="nav-link" href="#">
    ${iconHtml}<span style="line-height:1;position:relative;">${item.title}${badgeHtml}</span>
    <span class="group-icon float-end">
      <i class="fi fi-arrow-end${isActive ? ' d-none' : ''}"></i>
      <i class="fi fi-arrow-down${isActive ? '' : ' d-none'}"></i>
    </span>
  </a>
  <ul class="nav flex-column ms-3${isActive ? '' : ' d-none'}"
      style="${isActive ? 'display:block;visibility:visible;height:auto;overflow:visible;' : ''} margin-left:0;padding-left:20px;">
    ${childrenHTML}
  </ul>
</li>`;
  }

  return `
<li class="nav-item${isActive ? ' active' : ''}" style="position:relative;">
  <a class="nav-link" href="${item.link || '#'}" style="display:flex;align-items:center;position:relative;">
    ${iconHtml}<span style="line-height:1;position:relative;">${item.title}${badgeHtml}</span>
  </a>
</li>`;
}

// ----------------------------
// Init: get role → load menu → render → wire toggles
// ----------------------------
(async function initMenu() {
  const menuRef = ref(db, 'menu');

  try {
    const snap = await get(menuRef);
    if (!snap.exists()) {
      dynamicMenu.innerHTML = `<li class="text-center py-3 text-muted">No menu data found</li>`;
      return;
    }

    const menu = snap.val();

    const sortedMenuEntries = Object.entries(menu)
      .filter(([, it]) => it && it.enable && userCanSee(it, role))
      .sort(([, a], [, b]) => (a.id || 0) - (b.id || 0));

    const apiCanvasKeys = ["999999999", "anotherCanvasApiKey"];
    const settingsKeys = ["settingsCriteria", "anotherSettingsKey"];
    let settingsDividerAdded = false;

    const API_DIVIDER_HTML = `
<li class="nav-title mt-3">
  <h6 class="mb-0 smaller text-muted text-uppercase">ADMIN AREA</h6>
</li>`;

    const SETTINGS_DIVIDER_HTML = `
<li class="nav-title mt-3">
  <h6 class="mb-0 smaller text-muted text-uppercase">Settings</h6>
</li>`;

    const menuHTML = sortedMenuEntries.map(([key, item]) => {
      let dividerHTML = '';
      if (apiCanvasKeys.includes(key)) dividerHTML = API_DIVIDER_HTML;
      if (settingsKeys.includes(key) && !settingsDividerAdded) {
        dividerHTML += SETTINGS_DIVIDER_HTML;
        settingsDividerAdded = true;
      }
      return dividerHTML + renderMenuItem(key, item);
    }).join('');

    dynamicMenu.innerHTML = menuHTML;

    // Wire submenu toggles
    setTimeout(() => {
      dynamicMenu
        .querySelectorAll(':scope > li.nav-item > a.nav-link')
        .forEach(link => {

          link.addEventListener('click', function (e) {

            const href = this.getAttribute('href');

            // ✅ Ignore hash navigation (Before / During / After)
            if (!href || href.startsWith('#')) return;

            const parentLi = this.closest('li.nav-item');
            const submenu = parentLi?.querySelector(':scope > ul.nav');

            if (!submenu) return;

            e.preventDefault();

            submenu.classList.toggle('d-none');

            if (!submenu.classList.contains('d-none')) {
              submenu.style.display = 'block';
              submenu.style.visibility = 'visible';
              submenu.style.height = 'auto';
              submenu.style.overflow = 'visible';
            } else {
              submenu.style.display = '';
              submenu.style.visibility = '';
              submenu.style.height = '';
              submenu.style.overflow = '';
            }

            dynamicMenu
              .querySelectorAll('li.nav-item')
              .forEach(li => li.classList.remove('active'));

            parentLi.classList.add('active');
          });
        });

    }, 0);

  } catch (err) {
    console.error('[menu] error loading menu:', err);
    dynamicMenu.innerHTML = `<li class="text-center py-3 text-danger">Error loading menu</li>`;
  }
})();
