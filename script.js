const state = {
  user: readStoredUser(),
  dashboard: null,
  kioskMode: false,
  autoScrollTimer: null
};

const elements = {
  activeUser: document.querySelector("#active-user"),
  openAuth: document.querySelector("#open-auth"),
  openAuthHero: document.querySelector("#open-auth-hero"),
  logoutButton: document.querySelector("#logout-button"),
  authHero: document.querySelector("#auth-hero"),
  authModal: document.querySelector("#auth-modal"),
  authBackdrop: document.querySelector("#auth-backdrop"),
  closeAuth: document.querySelector("#close-auth"),
  authMessage: document.querySelector("#auth-message"),
  authTabs: document.querySelectorAll(".auth-tab"),
  loginForm: document.querySelector("#login-form"),
  registerForm: document.querySelector("#register-form"),
  registerRole: document.querySelector("#register-role"),
  authRoleFields: document.querySelector("#auth-role-fields"),
  heroTitle: document.querySelector("#hero-title"),
  heroText: document.querySelector("#hero-text"),
  summaryGrid: document.querySelector("#summary-grid"),
  dashboardMain: document.querySelector("#dashboard-main"),
  dashboardSide: document.querySelector("#dashboard-side"),
  managementSection: document.querySelector("#manage-section"),
  aiForm: document.querySelector("#ai-form"),
  aiDataInput: document.querySelector("#ai-data-input"),
  aiPrompt: document.querySelector("#ai-prompt"),
  aiOutput: document.querySelector("#ai-output"),
  aiStatus: document.querySelector("#ai-status"),
  refreshAi: document.querySelector("#refresh-ai"),
  toggleKiosk: document.querySelector("#toggle-kiosk"),
  exitKiosk: document.querySelector("#exit-kiosk"),
  kioskFeed: document.querySelector("#kiosk-feed"),
  navLinks: document.querySelectorAll(".nav-link")
};

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("aqbobek-user") || "null");
  } catch {
    return null;
  }
}

function saveStoredUser(user) {
  localStorage.setItem("aqbobek-user", JSON.stringify(user));
}

function clearStoredUser() {
  localStorage.removeItem("aqbobek-user");
}

function currentRole() {
  return state.user?.role || "guest";
}

function roleDisplayName(role) {
  const map = {
    student: "РЈС‡РµРЅРёРє",
    teacher: "РЈС‡РёС‚РµР»СЊ",
    parent: "Р РѕРґРёС‚РµР»СЊ",
    admin: "РђРґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂ",
    guest: "Р“РѕСЃС‚СЊ"
  };
  return map[role] || role;
}

function setAuthMessage(message, tone = "info") {
  elements.authMessage.textContent = message || "";
  elements.authMessage.dataset.tone = tone;
}

function openAuthModal(tab = "login") {
  resetAuthForms();
  elements.authModal.classList.remove("is-hidden");
  setActiveAuthTab(tab);
}

function closeAuthModal() {
  elements.authModal.classList.add("is-hidden");
  resetAuthForms();
  setAuthMessage("");
}

function setActiveAuthTab(tab) {
  elements.authTabs.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.authTab === tab);
  });
  elements.loginForm.classList.toggle("is-hidden", tab !== "login");
  elements.registerForm.classList.toggle("is-hidden", tab !== "register");
  setAuthMessage("");
}

function renderRoleFields(role) {
  const templates = {
    student: `
      <label>
        РљР»Р°СЃСЃ
        <input type="text" name="className" placeholder="9B" required>
      </label>
      <label>
        ID СѓС‡РµРЅРёРєР°
        <input type="text" name="studentId" placeholder="ST-2026-001" required>
      </label>
    `,
    teacher: `
      <label>
        РџСЂРµРґРјРµС‚
        <input type="text" name="subject" placeholder="РњР°С‚РµРјР°С‚РёРєР°" required>
      </label>
      <label>
        РўР°Р±РµР»СЊРЅС‹Р№ РЅРѕРјРµСЂ
        <input type="text" name="staffId" placeholder="T-041" required>
      </label>
    `,
    parent: `
      <label>
        РРјСЏ СЂРµР±С‘РЅРєР°
        <input type="text" name="childName" placeholder="РђР»РёСЏ РќСѓСЂР¶Р°РЅ">
      </label>
      <label>
        Email СЂРµР±С‘РЅРєР°
        <input type="email" name="childEmail" placeholder="student@aqbobek.edu" required>
      </label>
    `
  };

  elements.authRoleFields.innerHTML = templates[role] || "";
}

function resetAuthForms() {
  elements.loginForm?.reset();
  elements.registerForm?.reset();
  if (elements.registerRole) {
    elements.registerRole.value = "student";
  }
  renderRoleFields("student");
  setAuthMessage("");
}

async function apiRequest(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || "Request failed");
  }
  return result;
}

async function loadDashboard() {
  state.dashboard = await apiRequest("/api/dashboard-data", {
    user: state.user
  });
  renderDashboard();
}

function updateUserChrome() {
  const label = state.user
    ? `${state.user.fullName} - ${roleDisplayName(state.user.role)}`
    : "Р“РѕСЃС‚СЊ";

  elements.activeUser.textContent = label;
  elements.openAuth.classList.toggle("is-hidden", Boolean(state.user));
  elements.logoutButton.classList.toggle("is-hidden", !state.user);
  elements.authHero.classList.toggle("is-hidden", Boolean(state.user));
}

function renderHero() {
  const content = {
    guest: {
      title: "Р•РґРёРЅС‹Р№ РїРѕСЂС‚Р°Р» С€РєРѕР»СЊРЅС‹С… РґР°РЅРЅС‹С…",
      text: "Р’РѕР№РґРёС‚Рµ РІ СЃРёСЃС‚РµРјСѓ, С‡С‚РѕР±С‹ СѓРІРёРґРµС‚СЊ РїРµСЂСЃРѕРЅР°Р»СЊРЅС‹Р№ СЌРєСЂР°РЅ Рё СЂР°Р±РѕС‚Р°С‚СЊ С‚РѕР»СЊРєРѕ СЃ СЂРµР°Р»СЊРЅС‹РјРё РґР°РЅРЅС‹РјРё, РґРѕР±Р°РІР»РµРЅРЅС‹РјРё РІ РїРѕСЂС‚Р°Р»."
    },
    student: {
      title: "Р”Р°С€Р±РѕСЂРґ СѓС‡РµРЅРёРєР°",
      text: "Р—РґРµСЃСЊ РѕС‚РѕР±СЂР°Р¶Р°СЋС‚СЃСЏ С‚РѕР»СЊРєРѕ С‚Рµ РѕС†РµРЅРєРё, РїРѕСЃРµС‰Р°РµРјРѕСЃС‚СЊ Рё РґРѕСЃС‚РёР¶РµРЅРёСЏ, РєРѕС‚РѕСЂС‹Рµ СЂРµР°Р»СЊРЅРѕ РІРЅРµСЃР»Рё СѓС‡РёС‚РµР»СЏ РёР»Рё Р°РґРјРёРЅРёСЃС‚СЂР°С†РёСЏ."
    },
    parent: {
      title: "Р”Р°С€Р±РѕСЂРґ СЂРѕРґРёС‚РµР»СЏ",
      text: "Р’С‹ РІРёРґРёС‚Рµ РґРёРЅР°РјРёРєСѓ СЂРµР±С‘РЅРєР° РїРѕ СЂРµР°Р»СЊРЅС‹Рј С€РєРѕР»СЊРЅС‹Рј Р·Р°РїРёСЃСЏРј Р±РµР· СЃРєСЂС‹С‚С‹С… РёР»Рё РІС‹РґСѓРјР°РЅРЅС‹С… РїРѕРєР°Р·Р°С‚РµР»РµР№."
    },
    teacher: {
      title: "Р”Р°С€Р±РѕСЂРґ СѓС‡РёС‚РµР»СЏ",
      text: "Р”РѕР±Р°РІР»СЏР№С‚Рµ РѕС†РµРЅРєРё, РїРѕСЃРµС‰Р°РµРјРѕСЃС‚СЊ Рё РґРѕСЃС‚РёР¶РµРЅРёСЏ СѓС‡РµРЅРёРєРѕРІ, Р° СЃРёСЃС‚РµРјР° СЃСЂР°Р·Сѓ СЃРѕР±РёСЂР°РµС‚ РµРґРёРЅСѓСЋ РєР°СЂС‚РёРЅСѓ РєР»Р°СЃСЃР°."
    },
    admin: {
      title: "Р”Р°С€Р±РѕСЂРґ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂР°",
      text: "РџСѓР±Р»РёРєСѓР№С‚Рµ РѕР±СЉСЏРІР»РµРЅРёСЏ, СЃРѕР±С‹С‚РёСЏ Рё РєРѕРЅС‚РµРЅС‚ РґР»СЏ СЃС‚РµРЅРіР°Р·РµС‚С‹, Р° С‚Р°РєР¶Рµ РєРѕРЅС‚СЂРѕР»РёСЂСѓР№С‚Рµ РѕР±С‰СѓСЋ РєР°СЂС‚РёРЅСѓ С€РєРѕР»С‹."
    }
  };

  const role = currentRole();
  elements.heroTitle.textContent = content[role].title;
  elements.heroText.textContent = content[role].text;
}

function renderSummary() {
  const items = state.dashboard?.summary || [];
  if (!items.length) {
    elements.summaryGrid.innerHTML = `
      <article class="summary-card summary-card--empty">
        <strong>РџРѕРєР° РЅРµС‚ РїРµСЂСЃРѕРЅР°Р»СЊРЅС‹С… РґР°РЅРЅС‹С…</strong>
        <p>РџРѕСЃР»Рµ РІС…РѕРґР° Рё РїРµСЂРІС‹С… Р·Р°РїРёСЃРµР№ РІ СЃРёСЃС‚РµРјРµ Р·РґРµСЃСЊ РїРѕСЏРІСЏС‚СЃСЏ РєР»СЋС‡РµРІС‹Рµ РїРѕРєР°Р·Р°С‚РµР»Рё.</p>
      </article>
    `;
    return;
  }

  elements.summaryGrid.innerHTML = items
    .map((item) => `
      <article class="summary-card">
        <span>${item.label}</span>
        <strong>${item.value}</strong>
      </article>
    `)
    .join("");
}

function renderEmptyState(title, text) {
  return `
    <div class="empty-state">
      <strong>${title}</strong>
      <p>${text}</p>
    </div>
  `;
}

function formatDate(value) {
  if (!value) {
    return "Р‘РµР· РґР°С‚С‹";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function renderGradesPanel(grades, title = "РћС†РµРЅРєРё") {
  const canDelete = ["teacher", "admin"].includes(currentRole());

  if (!grades?.length) {
    return `
      <article class="panel">
        <div class="panel__head"><h3>${title}</h3></div>
        ${renderEmptyState("РџРѕРєР° РЅРµС‚ РѕС†РµРЅРѕРє", "РЈС‡РёС‚РµР»СЊ РµС‰С‘ РЅРµ РґРѕР±Р°РІРёР» Р·Р°РїРёСЃРё СѓСЃРїРµРІР°РµРјРѕСЃС‚Рё.")}
      </article>
    `;
  }

  return `
    <article class="panel">
      <div class="panel__head"><h3>${title}</h3></div>
      <div class="table-list">
        ${grades
          .map((item) => `
            <div class="table-row">
              <div>
                <strong>${item.subject}</strong>
                <span>${item.studentName || "РЈС‡РµРЅРёРє"} - ${formatDate(item.createdAt)}</span>
              </div>
              <div><span class="pill pill--blue">${item.score} / ${item.maxScore}</span></div>
              <div><span class="pill ${item.scorePercent >= 75 ? "pill--green" : item.scorePercent >= 60 ? "pill--orange" : "pill--red"}">${item.scorePercent}%</span></div>
              <div><span>${item.comment || "Р‘РµР· РєРѕРјРјРµРЅС‚Р°СЂРёСЏ"}</span></div>
              <div>${canDelete ? `<button class="record-delete" type="button" data-delete-type="grade" data-delete-id="${item.id}">РЈРґР°Р»РёС‚СЊ</button>` : ""}</div>
            </div>
          `)
          .join("")}
      </div>
    </article>
  `;
}

function renderAttendancePanel(attendance) {
  if (!attendance?.length) {
    return `
      <article class="panel">
        <div class="panel__head"><h3>РџРѕСЃРµС‰Р°РµРјРѕСЃС‚СЊ</h3></div>
        ${renderEmptyState("РќРµС‚ РѕС‚РјРµС‚РѕРє РїРѕСЃРµС‰Р°РµРјРѕСЃС‚Рё", "РЈС‡РёС‚РµР»СЊ РµС‰С‘ РЅРµ РІРЅС‘СЃ Р·Р°РїРёСЃРё РїРѕСЃРµС‰Р°РµРјРѕСЃС‚Рё.")}
      </article>
    `;
  }

  return `
    <article class="panel">
      <div class="panel__head"><h3>РџРѕСЃРµС‰Р°РµРјРѕСЃС‚СЊ</h3></div>
      <div class="feed-list">
        ${attendance
          .map((item) => `
            <article class="feed-item">
              <strong>${item.studentName || "РЈС‡РµРЅРёРє"} - ${item.date}</strong>
              <p>РЎС‚Р°С‚СѓСЃ: ${item.status === "present" ? "РџСЂРёСЃСѓС‚СЃС‚РІРѕРІР°Р»" : item.status === "late" ? "РћРїРѕР·РґР°Р»" : "РћС‚СЃСѓС‚СЃС‚РІРѕРІР°Р»"}${item.comment ? `. ${item.comment}` : ""}</p>
            </article>
          `)
          .join("")}
      </div>
    </article>
  `;
}

function renderAnnouncementsPanel(items, title = "РћР±СЉСЏРІР»РµРЅРёСЏ") {
  const canDelete = currentRole() === "admin";
  if (!items?.length) {
    return `
      <article class="panel">
        <div class="panel__head"><h3>${title}</h3></div>
        ${renderEmptyState("РџРѕРєР° РЅРµС‚ РїСѓР±Р»РёРєР°С†РёР№", "РђРґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂ РµС‰С‘ РЅРµ РґРѕР±Р°РІРёР» РЅРѕРІРѕСЃС‚Рё РёР»Рё РѕР±СЉСЏРІР»РµРЅРёСЏ.")}
      </article>
    `;
  }

  return `
    <article class="panel">
      <div class="panel__head"><h3>${title}</h3></div>
      <div class="feed-list">
        ${items
          .map((item) => `
            <article class="feed-item">
              <div class="record-head">
                <strong>${item.title}</strong>
                ${canDelete ? `<button class="record-delete" type="button" data-delete-type="announcement" data-delete-id="${item.id}">РЈРґР°Р»РёС‚СЊ</button>` : ""}
              </div>
              <p>${item.body || "Р‘РµР· РѕРїРёСЃР°РЅРёСЏ"}</p>
              <span class="meta-line">${formatDate(item.createdAt)}</span>
            </article>
          `)
          .join("")}
      </div>
    </article>
  `;
}

function renderAchievementsPanel(items) {
  if (!items?.length) {
    return `
      <article class="panel">
        <div class="panel__head"><h3>Р”РѕСЃС‚РёР¶РµРЅРёСЏ</h3></div>
        ${renderEmptyState("РџРѕРєР° РЅРµС‚ РґРѕСЃС‚РёР¶РµРЅРёР№", "РЈС‡РёС‚РµР»СЊ РёР»Рё Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂ РµС‰С‘ РЅРµ РґРѕР±Р°РІРёР»Рё РґРѕСЃС‚РёР¶РµРЅРёСЏ.")}
      </article>
    `;
  }

  return `
    <article class="panel">
      <div class="panel__head"><h3>Р”РѕСЃС‚РёР¶РµРЅРёСЏ</h3></div>
      <div class="feed-list">
        ${items
          .map((item) => `
            <article class="feed-item">
              <strong>${item.studentName || ""} ${item.title}</strong>
              <p>${item.body || "Р‘РµР· РѕРїРёСЃР°РЅРёСЏ"}</p>
              <span class="meta-line">Р”РѕР±Р°РІРёР»: ${item.createdByName} - ${formatDate(item.createdAt)}</span>
            </article>
          `)
          .join("")}
      </div>
    </article>
  `;
}

function renderRiskPanel(items) {
  if (!items?.length) {
    return `
      <article class="panel">
        <div class="panel__head"><h3>Р—РѕРЅР° СЂРёСЃРєР°</h3></div>
        ${renderEmptyState("РљСЂРёС‚РёС‡РµСЃРєРёС… СЃРёРіРЅР°Р»РѕРІ РЅРµС‚", "РџРѕ С‚РµРєСѓС‰РёРј РґР°РЅРЅС‹Рј СЃРёСЃС‚РµРјР° РЅРµ РІРёРґРёС‚ СѓС‡РµРЅРёРєРѕРІ РІ Р·РѕРЅРµ СЂРёСЃРєР°.")}
      </article>
    `;
  }

  return `
    <article class="panel">
      <div class="panel__head"><h3>Р—РѕРЅР° СЂРёСЃРєР°</h3></div>
      <div class="feed-list">
        ${items
          .map((item) => `
            <article class="feed-item">
              <strong>${item.studentName} - ${item.className}</strong>
              <p>${item.note}</p>
              <span class="meta-line">РЈСЂРѕРІРµРЅСЊ: ${item.riskLevel === "high" ? "Р’С‹СЃРѕРєРёР№" : "РЎСЂРµРґРЅРёР№"}</span>
            </article>
          `)
          .join("")}
      </div>
    </article>
  `;
}

function renderEventsPanel(items) {
  const canDelete = currentRole() === "admin";
  if (!items?.length) {
    return `
      <article class="panel">
        <div class="panel__head"><h3>РЎРѕР±С‹С‚РёСЏ</h3></div>
        ${renderEmptyState("РџРѕРєР° РЅРµС‚ СЃРѕР±С‹С‚РёР№", "РђРґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂ РµС‰С‘ РЅРµ РѕРїСѓР±Р»РёРєРѕРІР°Р» С€РєРѕР»СЊРЅС‹Рµ СЃРѕР±С‹С‚РёСЏ.")}
      </article>
    `;
  }

  return `
    <article class="panel">
      <div class="panel__head"><h3>РЎРѕР±С‹С‚РёСЏ</h3></div>
      <div class="feed-list">
        ${items
          .map((item) => `
            <article class="feed-item">
              <div class="record-head">
                <strong>${item.title}</strong>
                ${canDelete ? `<button class="record-delete" type="button" data-delete-type="event" data-delete-id="${item.id}">РЈРґР°Р»РёС‚СЊ</button>` : ""}
              </div>
              <p>${item.body || "Р‘РµР· РѕРїРёСЃР°РЅРёСЏ"}</p>
              <span class="meta-line">${item.eventDate}</span>
            </article>
          `)
          .join("")}
      </div>
    </article>
  `;
}

function renderGuestDashboard() {
  elements.dashboardMain.innerHTML = `
    <article class="panel">
      <div class="panel__head"><h3>Р”РѕР±СЂРѕ РїРѕР¶Р°Р»РѕРІР°С‚СЊ</h3></div>
      ${renderEmptyState("Р’РѕР№РґРёС‚Рµ РІ РїРѕСЂС‚Р°Р»", "РџРѕСЃР»Рµ РІС…РѕРґР° РІС‹ СѓРІРёРґРёС‚Рµ СЃРІРѕР№ СЂРѕР»РµРІРѕР№ РґР°С€Р±РѕСЂРґ Рё СЂРµР°Р»СЊРЅС‹Рµ Р·Р°РїРёСЃРё СЃРёСЃС‚РµРјС‹.")}
    </article>
  `;
  elements.dashboardSide.innerHTML = `
    <article class="panel">
      <div class="panel__head"><h3>РљР°Рє СѓСЃС‚СЂРѕРµРЅ РїРѕСЂС‚Р°Р»</h3></div>
      <div class="feed-list">
        <article class="feed-item"><strong>РЈС‡РёС‚РµР»СЊ</strong><p>Р”РѕР±Р°РІР»СЏРµС‚ РѕС†РµРЅРєРё, РїРѕСЃРµС‰Р°РµРјРѕСЃС‚СЊ Рё РґРѕСЃС‚РёР¶РµРЅРёСЏ.</p></article>
        <article class="feed-item"><strong>РђРґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂ</strong><p>РџСѓР±Р»РёРєСѓРµС‚ РѕР±СЉСЏРІР»РµРЅРёСЏ, СЃРѕР±С‹С‚РёСЏ Рё РјР°С‚РµСЂРёР°Р»С‹ СЃС‚РµРЅРіР°Р·РµС‚С‹.</p></article>
        <article class="feed-item"><strong>РЈС‡РµРЅРёРє Рё СЂРѕРґРёС‚РµР»СЊ</strong><p>Р’РёРґСЏС‚ С‚РѕР»СЊРєРѕ СЂРµР°Р»СЊРЅС‹Рµ Р·Р°РїРёСЃРё, РєРѕС‚РѕСЂС‹Рµ СѓР¶Рµ РІРЅРµСЃРµРЅС‹ РІ СЃРёСЃС‚РµРјСѓ.</p></article>
      </div>
    </article>
  `;
}

function renderStudentDashboard(records) {
  elements.dashboardMain.innerHTML = [
    renderGradesPanel(records.grades, "РњРѕРё РѕС†РµРЅРєРё"),
    renderAttendancePanel(records.attendance)
  ].join("");

  elements.dashboardSide.innerHTML = [
    renderAchievementsPanel(records.achievements),
    renderAnnouncementsPanel(records.announcements),
    renderEventsPanel(records.events)
  ].join("");
}

function renderParentDashboard(records) {
  const childPanel = records.child
    ? `
      <article class="panel">
        <div class="panel__head"><h3>РЎРІСЏР·Р°РЅРЅС‹Р№ СЂРµР±С‘РЅРѕРє</h3></div>
        <div class="feed-item">
          <strong>${records.child.fullName}</strong>
          <p>РљР»Р°СЃСЃ: ${records.child.className || "РќРµ СѓРєР°Р·Р°РЅ"}</p>
        </div>
      </article>
    `
    : `
      <article class="panel">
        <div class="panel__head"><h3>РЎРІСЏР·Р°РЅРЅС‹Р№ СЂРµР±С‘РЅРѕРє</h3></div>
        ${renderEmptyState("Р РµР±С‘РЅРѕРє РЅРµ РЅР°Р№РґРµРЅ", "РџСЂРѕРІРµСЂСЊС‚Рµ email СЂРµР±С‘РЅРєР° РІ РїСЂРѕС„РёР»Рµ СЂРµРіРёСЃС‚СЂР°С†РёРё.")}
      </article>
    `;

  elements.dashboardMain.innerHTML = [
    childPanel,
    renderGradesPanel(records.grades, "РЈСЃРїРµРІР°РµРјРѕСЃС‚СЊ СЂРµР±С‘РЅРєР°"),
    renderAttendancePanel(records.attendance)
  ].join("");

  elements.dashboardSide.innerHTML = [
    renderAchievementsPanel(records.achievements),
    renderAnnouncementsPanel(records.announcements),
    renderEventsPanel(records.events)
  ].join("");
}

function renderTeacherDashboard(records) {
  elements.dashboardMain.innerHTML = [
    renderRiskPanel(records.riskList),
    renderGradesPanel(records.grades, "РџРѕСЃР»РµРґРЅРёРµ РІРЅРµСЃС‘РЅРЅС‹Рµ РѕС†РµРЅРєРё"),
    renderAttendancePanel(records.attendance)
  ].join("");

  elements.dashboardSide.innerHTML = [
    renderAchievementsPanel(records.achievements),
    renderAnnouncementsPanel(records.announcements),
    renderEventsPanel(records.events)
  ].join("");
}

function renderAdminDashboard(records) {
  elements.dashboardMain.innerHTML = [
    renderAnnouncementsPanel(records.announcements, "РќРѕРІРѕСЃС‚Рё Рё РѕР±СЉСЏРІР»РµРЅРёСЏ"),
    renderEventsPanel(records.events),
    renderRiskPanel(records.riskList)
  ].join("");

  elements.dashboardSide.innerHTML = [
    renderGradesPanel(records.grades, "РџРѕСЃР»РµРґРЅРёРµ РѕС†РµРЅРєРё"),
    renderAchievementsPanel(records.achievements)
  ].join("");
}

function buildStudentOptions() {
  const students = state.dashboard?.students || [];
  if (!students.length) {
    return `<option value="">РЎРЅР°С‡Р°Р»Р° Р·Р°СЂРµРіРёСЃС‚СЂРёСЂСѓР№С‚Рµ СѓС‡РµРЅРёРєРѕРІ</option>`;
  }

  return students
    .map((student) => `<option value="${student.email}">${student.fullName}${student.className ? ` - ${student.className}` : ""}</option>`)
    .join("");
}

function managementFormCard(title, fields, type, buttonLabel) {
  return `
    <article class="panel manage-card">
      <div class="panel__head"><h3>${title}</h3></div>
      <form class="manage-form" data-create-type="${type}">
        ${fields}
        <button class="button button--primary" type="submit">${buttonLabel}</button>
      </form>
    </article>
  `;
}

function renderManagementSection() {
  const role = currentRole();
  if (role === "guest" || role === "student" || role === "parent") {
    elements.managementSection.innerHTML = "";
    return;
  }

  const studentOptions = buildStudentOptions();
  const teacherForms = [
    managementFormCard(
      "Р”РѕР±Р°РІРёС‚СЊ РѕС†РµРЅРєСѓ",
      `
        <label>РЈС‡РµРЅРёРє<select name="studentEmail" required>${studentOptions}</select></label>
        <label>РџСЂРµРґРјРµС‚<input type="text" name="subject" placeholder="РњР°С‚РµРјР°С‚РёРєР°" required></label>
        <div class="manage-form__split">
          <label>Р‘Р°Р»Р»<input type="number" name="score" min="0" required></label>
          <label>РњР°РєСЃРёРјСѓРј<input type="number" name="maxScore" min="1" required></label>
        </div>
        <label>РљРѕРјРјРµРЅС‚Р°СЂРёР№<input type="text" name="comment" placeholder="Р§С‚Рѕ СЃС‚РѕРёС‚ РїРѕРґС‚СЏРЅСѓС‚СЊ"></label>
      `,
      "grade",
      "РЎРѕС…СЂР°РЅРёС‚СЊ РѕС†РµРЅРєСѓ"
    ),
    managementFormCard(
      "РћС‚РјРµС‚РёС‚СЊ РїРѕСЃРµС‰Р°РµРјРѕСЃС‚СЊ",
      `
        <label>РЈС‡РµРЅРёРє<select name="studentEmail" required>${studentOptions}</select></label>
        <div class="manage-form__split">
          <label>Р”Р°С‚Р°<input type="date" name="date" required></label>
          <label>РЎС‚Р°С‚СѓСЃ
            <select name="status" required>
              <option value="present">РџСЂРёСЃСѓС‚СЃС‚РІРѕРІР°Р»</option>
              <option value="late">РћРїРѕР·РґР°Р»</option>
              <option value="absent">РћС‚СЃСѓС‚СЃС‚РІРѕРІР°Р»</option>
            </select>
          </label>
        </div>
        <label>РљРѕРјРјРµРЅС‚Р°СЂРёР№<input type="text" name="comment" placeholder="РџСЂРёС‡РёРЅР° РёР»Рё РїРѕСЏСЃРЅРµРЅРёРµ"></label>
      `,
      "attendance",
      "РЎРѕС…СЂР°РЅРёС‚СЊ РїРѕСЃРµС‰Р°РµРјРѕСЃС‚СЊ"
    ),
    managementFormCard(
      "Р”РѕР±Р°РІРёС‚СЊ РґРѕСЃС‚РёР¶РµРЅРёРµ",
      `
        <label>РЈС‡РµРЅРёРє<select name="studentEmail" required>${studentOptions}</select></label>
        <label>Р—Р°РіРѕР»РѕРІРѕРє<input type="text" name="title" placeholder="РџРѕР±РµРґР° РІ РѕР»РёРјРїРёР°РґРµ" required></label>
        <label>РћРїРёСЃР°РЅРёРµ<textarea name="body" rows="3" placeholder="РљРѕСЂРѕС‚РєРѕРµ РѕРїРёСЃР°РЅРёРµ РґРѕСЃС‚РёР¶РµРЅРёСЏ"></textarea></label>
      `,
      "achievement",
      "РЎРѕС…СЂР°РЅРёС‚СЊ РґРѕСЃС‚РёР¶РµРЅРёРµ"
    )
  ];

  const adminForms = [
    managementFormCard(
      "РћРїСѓР±Р»РёРєРѕРІР°С‚СЊ РѕР±СЉСЏРІР»РµРЅРёРµ",
      `
        <label>Р—Р°РіРѕР»РѕРІРѕРє<input type="text" name="title" placeholder="Р РѕРґРёС‚РµР»СЊСЃРєРѕРµ СЃРѕР±СЂР°РЅРёРµ" required></label>
        <label>РўРµРєСЃС‚<textarea name="body" rows="3" placeholder="РўРµРєСЃС‚ РѕР±СЉСЏРІР»РµРЅРёСЏ" required></textarea></label>
        <label>РђСѓРґРёС‚РѕСЂРёСЏ
          <select name="audience">
            <option value="school">Р’СЃСЏ С€РєРѕР»Р°</option>
            <option value="students">РЈС‡РµРЅРёРєРё</option>
            <option value="parents">Р РѕРґРёС‚РµР»Рё</option>
            <option value="teachers">РЈС‡РёС‚РµР»СЏ</option>
          </select>
        </label>
      `,
      "announcement",
      "РћРїСѓР±Р»РёРєРѕРІР°С‚СЊ РѕР±СЉСЏРІР»РµРЅРёРµ"
    ),
    managementFormCard(
      "Р”РѕР±Р°РІРёС‚СЊ СЃРѕР±С‹С‚РёРµ",
      `
        <label>РќР°Р·РІР°РЅРёРµ<input type="text" name="title" placeholder="STEM Week" required></label>
        <div class="manage-form__split">
          <label>Р”Р°С‚Р°<input type="date" name="eventDate" required></label>
          <span></span>
        </div>
        <label>РћРїРёСЃР°РЅРёРµ<textarea name="body" rows="3" placeholder="Р§С‚Рѕ Р±СѓРґРµС‚ РїСЂРѕРёСЃС…РѕРґРёС‚СЊ"></textarea></label>
      `,
      "event",
      "РЎРѕС…СЂР°РЅРёС‚СЊ СЃРѕР±С‹С‚РёРµ"
    ),
    managementFormCard(
      "РљР°СЂС‚РѕС‡РєР° РґР»СЏ СЃС‚РµРЅРіР°Р·РµС‚С‹",
      `
        <label>Р—Р°РіРѕР»РѕРІРѕРє<input type="text" name="title" placeholder="РўРѕРї СѓС‡РµРЅРёС†Р° РЅРµРґРµР»Рё" required></label>
        <label>РћРїРёСЃР°РЅРёРµ<textarea name="body" rows="3" placeholder="РљСЂР°С‚РєРёР№ С‚РµРєСЃС‚ РґР»СЏ РѕР±С‰РµРіРѕ СЌРєСЂР°РЅР°"></textarea></label>
      `,
      "kiosk",
      "Р”РѕР±Р°РІРёС‚СЊ РІ СЃС‚РµРЅРіР°Р·РµС‚Сѓ"
    )
  ];

  elements.managementSection.innerHTML = `
    <div class="management-header">
      <p class="eyebrow">РЈРїСЂР°РІР»РµРЅРёРµ РґР°РЅРЅС‹РјРё</p>
      <h2>${role === "teacher" ? "РЈС‡РёС‚РµР»СЊ РґРѕР±Р°РІР»СЏРµС‚ СЂРµР°Р»СЊРЅС‹Рµ Р·Р°РїРёСЃРё РєР»Р°СЃСЃР°" : "РђРґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂ СѓРїСЂР°РІР»СЏРµС‚ РїСѓР±Р»РёРєР°С†РёСЏРјРё С€РєРѕР»С‹"}</h2>
    </div>
    <div class="management-grid">
      ${(role === "teacher" ? teacherForms : adminForms).join("")}
    </div>
    <div class="manage-feedback" id="manage-feedback" aria-live="polite"></div>
  `;

  bindManagementForms();
}

function renderDashboard() {
  updateUserChrome();
  renderHero();
  renderSummary();

  if (!state.dashboard || currentRole() === "guest") {
    renderGuestDashboard();
    renderManagementSection();
    renderKiosk();
    renderStoredInsight(null);
    return;
  }

  const records = state.dashboard.records || {};
  const role = currentRole();
  if (role === "student") {
    renderStudentDashboard(records);
  } else if (role === "parent") {
    renderParentDashboard(records);
  } else if (role === "teacher") {
    renderTeacherDashboard(records);
  } else if (role === "admin") {
    renderAdminDashboard(records);
  }

  renderManagementSection();
  renderKiosk();

  if (role === "student" || role === "parent") {
    renderStoredInsight(records.latestInsight || null);
  } else {
    renderStoredInsight(null);
  }
}

function renderAiResponse(result) {
  const sections = result.sections || {
    diagnosis: result.text,
    actions: [],
    outlook: "РџСЂРѕРґРѕР»Р¶Р°Р№С‚Рµ РѕС‚СЃР»РµР¶РёРІР°С‚СЊ РёР·РјРµРЅРµРЅРёСЏ РІ СЃРёСЃС‚РµРјРµ."
  };

  elements.aiOutput.innerHTML = `
    <div class="ai-response">
      <article class="ai-response__card">
        <span class="ai-response__label">Р”РёР°РіРЅРѕР·</span>
        <div class="ai-response__text">${formatAiText(sections.diagnosis || "РќРµРґРѕСЃС‚Р°С‚РѕС‡РЅРѕ РґР°РЅРЅС‹С…")}</div>
      </article>
      <article class="ai-response__card">
        <span class="ai-response__label">Р”РµР№СЃС‚РІРёСЏ РЅР° РЅРµРґРµР»СЋ</span>
        <ul class="ai-response__list">
          ${(sections.actions || []).map((item) => `<li>${formatAiText(item)}</li>`).join("") || "<li>РќРµС‚ РєРѕРЅРєСЂРµС‚РЅС‹С… РґРµР№СЃС‚РІРёР№.</li>"}
        </ul>
      </article>
      <article class="ai-response__card">
        <span class="ai-response__label">РџСЂРѕС„РѕСЂРёРµРЅС‚Р°С†РёСЏ / РјРѕС‚РёРІР°С†РёСЏ</span>
        <div class="ai-response__text">${formatAiText(sections.outlook || "РџСЂРѕРґРѕР»Р¶Р°Р№С‚Рµ СЂР°Р·РІРёРІР°С‚СЊ СЃРёР»СЊРЅС‹Рµ СЃС‚РѕСЂРѕРЅС‹.")}</div>
      </article>
    </div>
  `;
}

function renderStoredInsight(insight) {
  if (!insight) {
    elements.aiStatus.textContent = "Mock";
    elements.aiOutput.innerHTML = `
      <strong>Р§С‚Рѕ СѓРјРµРµС‚ Р±Р»РѕРє</strong>
      <p>Р‘РµСЂС‘С‚ СЂРµР°Р»СЊРЅС‹Рµ Р·Р°РїРёСЃРё РїРѕСЂС‚Р°Р»Р° РїРѕ С‚РµРєСѓС‰РµРјСѓ РїРѕР»СЊР·РѕРІР°С‚РµР»СЋ Рё С„РѕСЂРјРёСЂСѓРµС‚ СЃС‚СЂСѓРєС‚СѓСЂРёСЂРѕРІР°РЅРЅС‹Рµ СЂРµРєРѕРјРµРЅРґР°С†РёРё.</p>
    `;
    return;
  }

  elements.aiStatus.textContent = `Auto - ${new Date(insight.createdAt).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  })}`;

  renderAiResponse({
    sections: {
      diagnosis: insight.diagnosis,
      actions: insight.actions || [],
      outlook: insight.outlook
    }
  });
}

function parseManualGrades(input) {
  const text = String(input || "");
  const subjectMatches = [...text.matchAll(/([\p{L}][\p{L}\s]{1,30})[:\- ]+((?:\d{1,3}(?:[.,]\d+)?)(?:\s*[,/;]\s*\d{1,3}(?:[.,]\d+)?)*)/gu)];

  return subjectMatches.flatMap((match) => {
    const subject = match[1].trim();
    const numbers = match[2]
      .split(/[,/;]+/)
      .map((value) => Number(value.trim().replace(",", ".")))
      .filter((value) => Number.isFinite(value));

    return numbers.map((scorePercent) => ({
      subject,
      scorePercent
    }));
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatAiText(text) {
  const escaped = escapeHtml(text);
  const withoutMarkdownBullets = escaped.replace(/^\s*[\*\-]\s+/gm, "");
  const strongFormatted = withoutMarkdownBullets.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  const emphasisFormatted = strongFormatted.replace(/\*(.+?)\*/g, "<span class=\"ai-response__emphasis\">$1</span>");
  return emphasisFormatted.replace(/\n/g, "<br>");
}

async function requestAiAdvice(customPrompt) {
  elements.aiStatus.textContent = "Loading";

  const records = state.dashboard?.records || {};
  const portalGrades = (records.grades || []).map((item) => ({
    subject: item.subject,
    scorePercent: item.scorePercent
  }));
  const manualContext = elements.aiDataInput?.value.trim() || "";
  const manualGrades = parseManualGrades(manualContext);
  const grades = [...portalGrades, ...manualGrades];

  try {
    const result = await apiRequest("/api/ai-advice", {
      role: currentRole(),
      prompt: customPrompt,
      grades,
      manualContext,
      attendance: records.attendance || [],
      achievements: records.achievements || [],
      events: state.dashboard?.events || []
    });

    elements.aiStatus.textContent = result.source === "gemini"
      ? `Gemini - ${result.model}`
      : result.source === "openai"
        ? `OpenAI - ${result.model}`
        : "Fallback";
    renderAiResponse(result);
  } catch (error) {
    elements.aiStatus.textContent = "Error";
    elements.aiOutput.innerHTML = `
      <div class="ai-response">
        <article class="ai-response__card ai-response__card--error">
          <span class="ai-response__label">РћС€РёР±РєР° AI</span>
          <strong>${error.message}</strong>
        </article>
      </div>
    `;
  }
}

function renderKiosk() {
  const items = state.dashboard?.kioskHighlights || [];
  if (!items.length) {
    elements.kioskFeed.innerHTML = renderEmptyState(
      "РЎС‚РµРЅРіР°Р·РµС‚Р° РїРѕРєР° РїСѓСЃС‚Р°",
      "РђРґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂ РµС‰С‘ РЅРµ РґРѕР±Р°РІРёР» РєР°СЂС‚РѕС‡РєРё РґР»СЏ РѕР±С‰РµРіРѕ СЌРєСЂР°РЅР°."
    );
    return;
  }

  elements.kioskFeed.innerHTML = items
    .map((item) => `
      <article class="kiosk-item">
        <div class="record-head">
          <strong>${item.title}</strong>
          ${currentRole() === "admin" ? `<button class="record-delete record-delete--dark" type="button" data-delete-type="kiosk" data-delete-id="${item.id}">РЈРґР°Р»РёС‚СЊ</button>` : ""}
        </div>
        <p>${item.body || "Р‘РµР· РѕРїРёСЃР°РЅРёСЏ"}</p>
      </article>
    `)
    .join("");
}

async function createRecord(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const type = form.dataset.createType;
  const formData = new FormData(form);
  const payload = {};

  formData.forEach((value, key) => {
    payload[key] = String(value).trim();
  });

  if (payload.score) {
    payload.score = Number(payload.score);
  }
  if (payload.maxScore) {
    payload.maxScore = Number(payload.maxScore);
  }

  const feedback = document.querySelector("#manage-feedback");

  try {
    const result = await apiRequest("/api/data/create", {
      actor: state.user,
      type,
      data: payload
    });
    if (feedback) {
      feedback.textContent = result.message;
      feedback.dataset.tone = "success";
    }
    form.reset();
    await loadDashboard();
  } catch (error) {
    if (feedback) {
      feedback.textContent = error.message;
      feedback.dataset.tone = "error";
    }
  }
}

function bindManagementForms() {
  document.querySelectorAll(".manage-form").forEach((form) => {
    form.addEventListener("submit", createRecord);
  });
}

async function deleteRecord(button) {
  const type = button.dataset.deleteType;
  const id = button.dataset.deleteId;
  const feedback = document.querySelector("#manage-feedback");

  try {
    button.disabled = true;
    const result = await apiRequest("/api/data/delete", {
      actor: state.user,
      type,
      id
    });
    if (feedback) {
      feedback.textContent = result.message;
      feedback.dataset.tone = "success";
    }
    await loadDashboard();
  } catch (error) {
    if (feedback) {
      feedback.textContent = error.message;
      feedback.dataset.tone = "error";
    }
  } finally {
    button.disabled = false;
  }
}

function handleDocumentClick(event) {
  const deleteButton = event.target.closest(".record-delete");
  if (deleteButton) {
    deleteRecord(deleteButton);
  }
}

async function registerUser(event) {
  event.preventDefault();
  const formData = new FormData(elements.registerForm);
  const role = String(formData.get("role"));
  const payload = {
    fullName: String(formData.get("fullName") || "").trim(),
    email: String(formData.get("email") || "").trim(),
    password: String(formData.get("password") || ""),
    role,
    profile: {}
  };

  if (role === "student") {
    payload.profile.className = String(formData.get("className") || "").trim();
    payload.profile.studentId = String(formData.get("studentId") || "").trim();
  } else if (role === "teacher") {
    payload.profile.subject = String(formData.get("subject") || "").trim();
    payload.profile.staffId = String(formData.get("staffId") || "").trim();
  } else if (role === "parent") {
    payload.profile.childName = String(formData.get("childName") || "").trim();
    payload.profile.childEmail = String(formData.get("childEmail") || "").trim();
  }

  try {
    const result = await apiRequest("/api/auth/register", payload);
    setAuthMessage(result.message, "success");
    setActiveAuthTab("login");
    elements.loginForm.elements.email.value = payload.email;
  } catch (error) {
    setAuthMessage(error.message, "error");
  }
}

async function loginUser(event) {
  event.preventDefault();
  const formData = new FormData(elements.loginForm);
  try {
    const result = await apiRequest("/api/auth/login", {
      email: String(formData.get("email") || "").trim(),
      password: String(formData.get("password") || "")
    });

    state.user = result.user;
    saveStoredUser(result.user);
    closeAuthModal();
    await loadDashboard();
  } catch (error) {
    setAuthMessage(error.message, "error");
  }
}

async function logoutUser() {
  state.user = null;
  state.dashboard = null;
  clearStoredUser();
  elements.aiStatus.textContent = "Mock";
  elements.aiOutput.innerHTML = `
    <strong>Р§С‚Рѕ СѓРјРµРµС‚ Р±Р»РѕРє</strong>
    <p>Р‘РµСЂС‘С‚ СЂРµР°Р»СЊРЅС‹Рµ Р·Р°РїРёСЃРё РїРѕСЂС‚Р°Р»Р° РїРѕ С‚РµРєСѓС‰РµРјСѓ РїРѕР»СЊР·РѕРІР°С‚РµР»СЋ Рё С„РѕСЂРјРёСЂСѓРµС‚ СЃС‚СЂСѓРєС‚СѓСЂРёСЂРѕРІР°РЅРЅС‹Рµ СЂРµРєРѕРјРµРЅРґР°С†РёРё.</p>
  `;
  await loadDashboard();
}

function scrollToSection(section) {
  const map = {
    overview: "#overview-section",
    records: "#records-section",
    manage: "#manage-section",
    ai: "#ai-section",
    wall: "#wall-section"
  };
  document.querySelector(map[section] || "#overview-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function startKioskAutoScroll() {
  stopKioskAutoScroll();
  state.autoScrollTimer = window.setInterval(() => {
    if (!state.kioskMode) {
      return;
    }
    const max = elements.kioskFeed.scrollHeight - elements.kioskFeed.clientHeight;
    if (elements.kioskFeed.scrollTop >= max - 2) {
      elements.kioskFeed.scrollTop = 0;
      return;
    }
    elements.kioskFeed.scrollTop += 1;
  }, 35);
}

function stopKioskAutoScroll() {
  if (state.autoScrollTimer) {
    window.clearInterval(state.autoScrollTimer);
    state.autoScrollTimer = null;
  }
}

function toggleKioskMode() {
  state.kioskMode = !state.kioskMode;
  document.body.classList.toggle("kiosk-mode", state.kioskMode);
  elements.exitKiosk?.classList.toggle("is-hidden", !state.kioskMode);
  elements.toggleKiosk.textContent = state.kioskMode ? "Back to dashboard" : "Kiosk mode";
  if (state.kioskMode) {
    startKioskAutoScroll();
  } else {
    stopKioskAutoScroll();
  }
}

function bindEvents() {
  elements.openAuth?.addEventListener("click", () => openAuthModal("login"));
  elements.openAuthHero?.addEventListener("click", () => openAuthModal("register"));
  elements.closeAuth?.addEventListener("click", closeAuthModal);
  elements.authBackdrop?.addEventListener("click", closeAuthModal);
  elements.logoutButton?.addEventListener("click", logoutUser);
  elements.authTabs.forEach((button) => {
    button.addEventListener("click", () => setActiveAuthTab(button.dataset.authTab));
  });
  elements.registerRole?.addEventListener("change", (event) => renderRoleFields(event.target.value));
  elements.loginForm?.addEventListener("submit", loginUser);
  elements.registerForm?.addEventListener("submit", registerUser);
  elements.aiForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    await requestAiAdvice(elements.aiPrompt.value.trim() || "РџСЂРѕР°РЅР°Р»РёР·РёСЂСѓР№ С‚РµРєСѓС‰РёРµ Р·Р°РїРёСЃРё Рё РїСЂРµРґР»РѕР¶Рё РїР»Р°РЅ РґРµР№СЃС‚РІРёР№ РЅР° РЅРµРґРµР»СЋ.");
  });
  elements.refreshAi?.addEventListener("click", async () => {
    await requestAiAdvice("РџСЂРѕР°РЅР°Р»РёР·РёСЂСѓР№ С‚РµРєСѓС‰РёРµ РґР°РЅРЅС‹Рµ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ Рё РІС‹РґРµР»Рё Р±Р»РёР¶Р°Р№С€РёРµ РґРµР№СЃС‚РІРёСЏ.");
  });
  elements.toggleKiosk?.addEventListener("click", toggleKioskMode);
  elements.exitKiosk?.addEventListener("click", toggleKioskMode);
  document.addEventListener("click", handleDocumentClick);
  elements.navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      elements.navLinks.forEach((item) => item.classList.remove("is-active"));
      link.classList.add("is-active");
      scrollToSection(link.dataset.section);
    });
  });
}

async function init() {
  renderRoleFields("student");
  bindEvents();
  await loadDashboard();
}

init();

function roleDisplayName(role) {
  const map = {
    student: "Student",
    teacher: "Teacher",
    parent: "Parent",
    admin: "Administrator",
    guest: "Guest"
  };
  return map[role] || role;
}

function renderRoleFields(role) {
  const templates = {
    student: `
      <label>
        Class
        <input type="text" name="className" placeholder="9B" required>
      </label>
      <label>
        Student ID
        <input type="text" name="studentId" placeholder="ST-2026-001" required>
      </label>
    `,
    teacher: `
      <label>
        Subject
        <input type="text" name="subject" placeholder="Mathematics" required>
      </label>
      <label>
        Staff ID
        <input type="text" name="staffId" placeholder="T-041" required>
      </label>
    `,
    parent: `
      <label>
        Child Name
        <input type="text" name="childName" placeholder="Aliya Nurzhan">
      </label>
      <label>
        Child Email
        <input type="email" name="childEmail" placeholder="student@aqbobek.edu" required>
      </label>
    `
  };

  elements.authRoleFields.innerHTML = templates[role] || "";
}

function updateUserChrome() {
  const label = state.user
    ? `${state.user.fullName} · ${roleDisplayName(state.user.role)}`
    : "Guest";

  elements.activeUser.textContent = label;
  elements.openAuth.classList.toggle("is-hidden", Boolean(state.user));
  elements.logoutButton.classList.toggle("is-hidden", !state.user);
  elements.authHero.classList.toggle("is-hidden", Boolean(state.user));
}

function renderHero() {
  const content = {
    guest: {
      title: "Unified school data portal",
      text: "Sign in to open a personal workspace and work only with real records from the portal."
    },
    student: {
      title: "Student dashboard",
      text: "This screen shows only the grades, attendance, and achievements that were actually added by a teacher or administrator."
    },
    parent: {
      title: "Parent dashboard",
      text: "You see your child's progress through real school records without fake metrics."
    },
    teacher: {
      title: "Teacher dashboard",
      text: "Add grades, attendance, and achievements for students while the portal builds a complete picture of class progress."
    },
    admin: {
      title: "Administrator dashboard",
      text: "Publish announcements, events, and kiosk content while monitoring the overall picture across the school."
    }
  };

  const role = currentRole();
  elements.heroTitle.textContent = content[role].title;
  elements.heroText.textContent = content[role].text;
}

function renderSummary() {
  const items = state.dashboard?.summary || [];
  if (!items.length) {
    elements.summaryGrid.innerHTML = `
      <article class="summary-card summary-card--empty">
        <strong>No personal data yet</strong>
        <p>After sign-in and the first records in the system, key indicators will appear here.</p>
      </article>
    `;
    return;
  }

  elements.summaryGrid.innerHTML = items
    .map((item) => `
      <article class="summary-card">
        <span>${item.label}</span>
        <strong>${item.value}</strong>
      </article>
    `)
    .join("");
}

function formatDate(value) {
  if (!value) {
    return "No date";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function renderGradesPanel(grades, title = "Grades") {
  const canDelete = ["teacher", "admin"].includes(currentRole());

  if (!grades?.length) {
    return `
      <article class="panel">
        <div class="panel__head"><h3>${title}</h3></div>
        ${renderEmptyState("No grades yet", "A teacher has not added performance records yet.")}
      </article>
    `;
  }

  return `
    <article class="panel">
      <div class="panel__head"><h3>${title}</h3></div>
      <div class="table-list">
        ${grades
          .map((item) => `
            <div class="table-row">
              <div>
                <strong>${item.subject}</strong>
                <span>${item.studentName || "Student"} · ${formatDate(item.createdAt)}</span>
              </div>
              <div><span class="pill pill--blue">${item.score} / ${item.maxScore}</span></div>
              <div><span class="pill ${item.scorePercent >= 75 ? "pill--green" : item.scorePercent >= 60 ? "pill--orange" : "pill--red"}">${item.scorePercent}%</span></div>
              <div><span>${item.comment || "No comment"}</span></div>
              <div>${canDelete ? `<button class="record-delete" type="button" data-delete-type="grade" data-delete-id="${item.id}">Delete</button>` : ""}</div>
            </div>
          `)
          .join("")}
      </div>
    </article>
  `;
}

function renderAttendancePanel(attendance) {
  if (!attendance?.length) {
    return `
      <article class="panel">
        <div class="panel__head"><h3>Attendance</h3></div>
        ${renderEmptyState("No attendance records yet", "A teacher has not added attendance records yet.")}
      </article>
    `;
  }

  return `
    <article class="panel">
      <div class="panel__head"><h3>Attendance</h3></div>
      <div class="feed-list">
        ${attendance
          .map((item) => `
            <article class="feed-item">
              <strong>${item.studentName || "Student"} · ${item.date}</strong>
              <p>Status: ${item.status === "present" ? "Present" : item.status === "late" ? "Late" : "Absent"}${item.comment ? `. ${item.comment}` : ""}</p>
            </article>
          `)
          .join("")}
      </div>
    </article>
  `;
}

function renderAnnouncementsPanel(items, title = "Announcements") {
  const canDelete = currentRole() === "admin";
  if (!items?.length) {
    return `
      <article class="panel">
        <div class="panel__head"><h3>${title}</h3></div>
        ${renderEmptyState("No publications yet", "An administrator has not added announcements or news yet.")}
      </article>
    `;
  }

  return `
    <article class="panel">
      <div class="panel__head"><h3>${title}</h3></div>
      <div class="feed-list">
        ${items
          .map((item) => `
            <article class="feed-item">
              <div class="record-head">
                <strong>${item.title}</strong>
                ${canDelete ? `<button class="record-delete" type="button" data-delete-type="announcement" data-delete-id="${item.id}">Delete</button>` : ""}
              </div>
              <p>${item.body || "No description"}</p>
              <span class="meta-line">${formatDate(item.createdAt)}</span>
            </article>
          `)
          .join("")}
      </div>
    </article>
  `;
}

function renderAchievementsPanel(items) {
  if (!items?.length) {
    return `
      <article class="panel">
        <div class="panel__head"><h3>Achievements</h3></div>
        ${renderEmptyState("No achievements yet", "A teacher or administrator has not added achievements yet.")}
      </article>
    `;
  }

  return `
    <article class="panel">
      <div class="panel__head"><h3>Achievements</h3></div>
      <div class="feed-list">
        ${items
          .map((item) => `
            <article class="feed-item">
              <strong>${item.studentName || ""} ${item.title}</strong>
              <p>${item.body || "No description"}</p>
              <span class="meta-line">Added by: ${item.createdByName} · ${formatDate(item.createdAt)}</span>
            </article>
          `)
          .join("")}
      </div>
    </article>
  `;
}

function renderRiskPanel(items) {
  if (!items?.length) {
    return `
      <article class="panel">
        <div class="panel__head"><h3>Risk zone</h3></div>
        ${renderEmptyState("No critical signals", "The current records do not show students in the risk zone.")}
      </article>
    `;
  }

  return `
    <article class="panel">
      <div class="panel__head"><h3>Risk zone</h3></div>
      <div class="feed-list">
        ${items
          .map((item) => `
            <article class="feed-item">
              <strong>${item.studentName} · ${item.className}</strong>
              <p>${item.note}</p>
              <span class="meta-line">Level: ${item.riskLevel === "high" ? "High" : "Medium"}</span>
            </article>
          `)
          .join("")}
      </div>
    </article>
  `;
}

function renderEventsPanel(items) {
  const canDelete = currentRole() === "admin";
  if (!items?.length) {
    return `
      <article class="panel">
        <div class="panel__head"><h3>Events</h3></div>
        ${renderEmptyState("No events yet", "An administrator has not published school events yet.")}
      </article>
    `;
  }

  return `
    <article class="panel">
      <div class="panel__head"><h3>Events</h3></div>
      <div class="feed-list">
        ${items
          .map((item) => `
            <article class="feed-item">
              <div class="record-head">
                <strong>${item.title}</strong>
                ${canDelete ? `<button class="record-delete" type="button" data-delete-type="event" data-delete-id="${item.id}">Delete</button>` : ""}
              </div>
              <p>${item.body || "No description"}</p>
              <span class="meta-line">${item.eventDate}</span>
            </article>
          `)
          .join("")}
      </div>
    </article>
  `;
}

function renderGuestDashboard() {
  elements.dashboardMain.innerHTML = `
    <article class="panel">
      <div class="panel__head"><h3>Welcome</h3></div>
      ${renderEmptyState("Sign in to continue", "After sign-in you will see a role-based dashboard and real portal data.")}
    </article>
  `;
  elements.dashboardSide.innerHTML = `
    <article class="panel">
      <div class="panel__head"><h3>How the portal works</h3></div>
      <div class="feed-list">
        <article class="feed-item"><strong>Teacher</strong><p>Adds grades, attendance, and achievements.</p></article>
        <article class="feed-item"><strong>Administrator</strong><p>Publishes announcements, events, and kiosk materials.</p></article>
        <article class="feed-item"><strong>Student and Parent</strong><p>See only the real records already entered into the system.</p></article>
      </div>
    </article>
  `;
}

function renderStudentDashboard(records) {
  elements.dashboardMain.innerHTML = [
    renderGradesPanel(records.grades, "My grades"),
    renderAttendancePanel(records.attendance)
  ].join("");

  elements.dashboardSide.innerHTML = [
    renderAchievementsPanel(records.achievements),
    renderAnnouncementsPanel(records.announcements),
    renderEventsPanel(records.events)
  ].join("");
}

function renderParentDashboard(records) {
  const childPanel = records.child
    ? `
      <article class="panel">
        <div class="panel__head"><h3>Linked child</h3></div>
        <div class="feed-item">
          <strong>${records.child.fullName}</strong>
          <p>Class: ${records.child.className || "Not specified"}</p>
        </div>
      </article>
    `
    : `
      <article class="panel">
        <div class="panel__head"><h3>Linked child</h3></div>
        ${renderEmptyState("Child not found", "Check the child's email in the profile and registration data.")}
      </article>
    `;

  elements.dashboardMain.innerHTML = [
    childPanel,
    renderGradesPanel(records.grades, "Child performance"),
    renderAttendancePanel(records.attendance)
  ].join("");

  elements.dashboardSide.innerHTML = [
    renderAchievementsPanel(records.achievements),
    renderAnnouncementsPanel(records.announcements),
    renderEventsPanel(records.events)
  ].join("");
}

function renderTeacherDashboard(records) {
  elements.dashboardMain.innerHTML = [
    renderRiskPanel(records.riskList),
    renderGradesPanel(records.grades, "Latest grades"),
    renderAttendancePanel(records.attendance)
  ].join("");

  elements.dashboardSide.innerHTML = [
    renderAchievementsPanel(records.achievements),
    renderAnnouncementsPanel(records.announcements),
    renderEventsPanel(records.events)
  ].join("");
}

function renderAdminDashboard(records) {
  elements.dashboardMain.innerHTML = [
    renderAnnouncementsPanel(records.announcements, "News and announcements"),
    renderEventsPanel(records.events),
    renderRiskPanel(records.riskList)
  ].join("");

  elements.dashboardSide.innerHTML = [
    renderGradesPanel(records.grades, "Latest grades"),
    renderAchievementsPanel(records.achievements)
  ].join("");
}

function buildStudentOptions() {
  const students = state.dashboard?.students || [];
  if (!students.length) {
    return `<option value="">Register students first</option>`;
  }

  return students
    .map((student) => `<option value="${student.email}">${student.fullName}${student.className ? ` · ${student.className}` : ""}</option>`)
    .join("");
}

function renderManagementSection() {
  const role = currentRole();
  if (role === "guest" || role === "student" || role === "parent") {
    elements.managementSection.innerHTML = "";
    return;
  }

  const studentOptions = buildStudentOptions();
  const teacherForms = [
    managementFormCard(
      "Add grade",
      `
        <label>Student<select name="studentEmail" required>${studentOptions}</select></label>
        <label>Subject<input type="text" name="subject" placeholder="Mathematics" required></label>
        <div class="manage-form__split">
          <label>Score<input type="number" name="score" min="0" required></label>
          <label>Max score<input type="number" name="maxScore" min="1" required></label>
        </div>
        <label>Comment<input type="text" name="comment" placeholder="What should be improved"></label>
      `,
      "grade",
      "Save grade"
    ),
    managementFormCard(
      "Mark attendance",
      `
        <label>Student<select name="studentEmail" required>${studentOptions}</select></label>
        <div class="manage-form__split">
          <label>Date<input type="date" name="date" required></label>
          <label>Status
            <select name="status" required>
              <option value="present">Present</option>
              <option value="late">Late</option>
              <option value="absent">Absent</option>
            </select>
          </label>
        </div>
        <label>Comment<input type="text" name="comment" placeholder="Reason or note"></label>
      `,
      "attendance",
      "Save attendance"
    ),
    managementFormCard(
      "Add achievement",
      `
        <label>Student<select name="studentEmail" required>${studentOptions}</select></label>
        <label>Title<input type="text" name="title" placeholder="Olympiad award" required></label>
        <label>Description<textarea name="body" rows="3" placeholder="Short description of the achievement"></textarea></label>
      `,
      "achievement",
      "Save achievement"
    )
  ];

  const adminForms = [
    managementFormCard(
      "Publish announcement",
      `
        <label>Title<input type="text" name="title" placeholder="Parent meeting" required></label>
        <label>Body<textarea name="body" rows="3" placeholder="Announcement text" required></textarea></label>
        <label>Audience
          <select name="audience">
            <option value="school">Whole school</option>
            <option value="students">Students</option>
            <option value="parents">Parents</option>
            <option value="teachers">Teachers</option>
          </select>
        </label>
      `,
      "announcement",
      "Publish announcement"
    ),
    managementFormCard(
      "Add event",
      `
        <label>Title<input type="text" name="title" placeholder="STEM Week" required></label>
        <div class="manage-form__split">
          <label>Date<input type="date" name="eventDate" required></label>
          <span></span>
        </div>
        <label>Description<textarea name="body" rows="3" placeholder="What will happen"></textarea></label>
      `,
      "event",
      "Save event"
    ),
    managementFormCard(
      "Kiosk highlight",
      `
        <label>Title<input type="text" name="title" placeholder="Top student of the week" required></label>
        <label>Description<textarea name="body" rows="3" placeholder="Short text for the public screen"></textarea></label>
      `,
      "kiosk",
      "Save kiosk card"
    )
  ];

  elements.managementSection.innerHTML = `
    <div class="management-header">
      <p class="eyebrow">Data management</p>
      <h2>${role === "teacher" ? "Teacher records real class data" : "Administrator manages school publications"}</h2>
    </div>
    <div class="management-grid">
      ${(role === "teacher" ? teacherForms : adminForms).join("")}
    </div>
    <div class="manage-feedback" id="manage-feedback" aria-live="polite"></div>
  `;

  bindManagementForms();
}

function renderAiResponse(result) {
  const sections = result?.sections || {};
  elements.aiStatus.textContent = result?.source ? String(result.source).toUpperCase() : "AI";
  elements.aiOutput.innerHTML = `
    <div class="ai-response">
      <section class="ai-response__section">
        <h4>Diagnosis</h4>
        <div class="ai-response__text">${formatAiText(sections.diagnosis || "Not enough data yet.")}</div>
      </section>
      <section class="ai-response__section">
        <h4>Actions for the week</h4>
        <ol class="ai-response__list">
          ${(sections.actions || []).map((item) => `<li>${formatAiText(item)}</li>`).join("") || "<li>No concrete actions yet.</li>"}
        </ol>
      </section>
      <section class="ai-response__section">
        <h4>Outlook</h4>
        <div class="ai-response__text">${formatAiText(sections.outlook || "Keep adding real records and review the plan again later.")}</div>
      </section>
    </div>
  `;
}

function renderStoredInsight(insight) {
  if (!insight) {
    elements.aiStatus.textContent = "AUTO";
    elements.aiOutput.innerHTML = `
      <strong>No automatic analysis yet</strong>
      <p>When a teacher publishes a grade, attendance mark, or achievement, AI will generate a fresh student analysis automatically.</p>
    `;
    return;
  }

  elements.aiStatus.textContent = "AUTO";
  renderAiResponse({
    source: "auto",
    sections: {
      diagnosis: insight.diagnosis,
      actions: insight.actions || [],
      outlook: insight.outlook
    }
  });
}

function renderKiosk() {
  const items = state.dashboard?.kioskHighlights || [];
  if (!items.length) {
    elements.kioskFeed.innerHTML = renderEmptyState(
      "Kiosk wall is empty",
      "An administrator has not added public screen cards yet."
    );
    return;
  }

  elements.kioskFeed.innerHTML = items
    .map((item) => `
      <article class="kiosk-card">
        <div class="record-head">
          <strong>${item.title}</strong>
          ${currentRole() === "admin" ? `<button class="record-delete record-delete--dark" type="button" data-delete-type="kiosk" data-delete-id="${item.id}">Delete</button>` : ""}
        </div>
        <p>${item.body || "No description"}</p>
      </article>
    `)
    .join("");
}

async function logoutUser() {
  state.user = null;
  state.dashboard = null;
  clearStoredUser();
  elements.aiStatus.textContent = "Mock";
  elements.aiOutput.innerHTML = `
    <strong>What this block does</strong>
    <p>It reads real portal records for the current user and generates structured recommendations.</p>
  `;
  await loadDashboard();
}

