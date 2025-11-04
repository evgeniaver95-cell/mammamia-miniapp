// Mini App: Mamma mia, che club! — навигатор материалов

let $sp, $spTitle, $spBack, $spClose, $spSearch, $spList;
let $tags, $sections, $search;

let currentSection = null;
let innerQuery = "";

const tg = window.Telegram?.WebApp;
const state = { query: "", tag: "Все", tags: [], sections: [] };

/* ==============================
   ИНИЦИАЛИЗАЦИЯ ПОСЛЕ DOM
================================ */
document.addEventListener("DOMContentLoaded", () => {
  // Привязка DOM-элементов
  $sp       = document.getElementById("sectionPage");
  $spTitle  = document.getElementById("spTitle");
  $spBack   = document.getElementById("spBack");
  $spClose  = document.getElementById("spClose");
  $spSearch = document.getElementById("spSearch");
  $spList   = document.getElementById("spList");

  $tags     = document.getElementById("tags");
  $sections = document.getElementById("sections");
  $search   = document.getElementById("searchInput");

  // Экран раздела: слушатели
  if ($spBack)  $spBack.addEventListener("click", closeSectionPage);
  if ($spClose) $spClose.addEventListener("click", closeSectionPage);
  if ($spSearch) $spSearch.addEventListener("input", (e) => {
    innerQuery = e.target.value;
    renderSectionItems();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && $sp && !$sp.hidden) closeSectionPage();
  });

  // Глобальный поиск
  if ($search) {
    $search.addEventListener("input", (e) => {
      state.query = e.target.value.trim().toLowerCase();
      renderSections();
    });
  }

  // Нижняя панель (если используются кнопки)
  document.querySelectorAll("nav.bottom button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("nav.bottom button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const tab = btn.dataset.tab;
      if (tab === "about") toast("Здесь будет «О клубе»");
      if (tab === "chats") toast("Здесь будут ссылки на чаты");
      if (tab === "fav")   toast("Здесь будут избранные материалы");
      if (tab === "amb")   toast("Здесь будет программа амбассадоров");
    });
  });

  // Telegram UI
  if (tg) {
    try {
      tg.expand();
      document.body.setAttribute("data-theme", "light");
      const tp = tg.themeParams || {};
      const root = document.documentElement;
      const map = { "--brand": tp.button_color, "--brandText": tp.button_text_color };
      Object.entries(map).forEach(([k, v]) => v && root.style.setProperty(k, v));
    } catch (_) {}
  }

  // Загрузка данных
  fetch("./data.json")
    .then((r) => r.json())
    .then((data) => {
      state.tags = data.tags || [];
      state.sections = data.sections || [];
      renderTags();
      renderSections();
    })
    .catch(() => toast("Не удалось загрузить данные"));
});

/* ==============================
   ТЕГИ + ФИЛЬТРЫ
================================ */
function renderTags() {
  if (!$tags) return;
  $tags.innerHTML = "";
  const all = ["Все", ...state.tags];
  all.forEach((t) => {
    const btn = document.createElement("button");
    btn.className = "tag" + (t === state.tag ? " active" : "");
    btn.textContent = t;
    btn.onclick = () => {
      state.tag = t;
      renderTags();
      renderSections();
    };
    $tags.appendChild(btn);
  });
}

function matchFilters(item) {
  const byTag = state.tag === "Все" || (item.tags || []).includes(state.tag);
  const byQuery = !state.query || item.title.toLowerCase().includes(state.query);
  return byTag && byQuery;
}

/* ==============================
   ГЛАВНАЯ СЕТКА РАЗДЕЛОВ
================================ */
function renderSections() {
  if (!$sections) return;
  $sections.innerHTML = "";
  state.sections.forEach((sec) => {
    const count = (sec.items || []).filter(matchFilters).length;

    const el = document.createElement("div");
    el.className = "card";
    el.onclick = () => openSectionPage(sec);
    el.innerHTML = `
      <div class="title">${sec.title}</div>
      <div class="cover">${sec.cover || ""}</div>
      <div class="badge" aria-label="количество">${count}</div>
    `;
    $sections.appendChild(el);
  });
}

/* ==============================
   ЭКРАН РАЗДЕЛА (FULLSCREEN)
================================ */
function openSectionPage(section) {
  currentSection = section;
  innerQuery = "";
  if ($spTitle)  $spTitle.textContent = section.title;
  if ($spSearch) $spSearch.value = "";
  renderSectionItems();
  if ($sp) $sp.hidden = false;
  try { tg?.expand?.(); } catch (_) {}
}

function closeSectionPage() {
  if ($sp) $sp.hidden = true;
  currentSection = null;
}

function renderSectionItems() {
  if (!currentSection || !$spList) return;

  const q = innerQuery.trim().toLowerCase();
  const items = (currentSection.items || []).filter((it) => {
    const byGlobal = matchFilters(it);
    const byInner  = !q || it.title.toLowerCase().includes(q);
    return byGlobal && byInner;
  });

  if (!items.length) {
    $spList.innerHTML = `<div style="padding:14px;color:var(--hint)">Ничего не найдено.</div>`;
    return;
  }

  $spList.innerHTML = "";
  items.forEach((it) => {
    const { emoji, text } = splitLeadingEmoji(it.title);
    const row = document.createElement("button");
    row.className = "section-page__item";
    row.innerHTML = `
      <span class="emj">${emoji || "📖"}</span>
      <span class="t">${text || it.title}</span>
    `;
    row.onclick = () => it.url && openLink(it.url);
    $spList.appendChild(row);
  });
}

/* Выделяем первую эмодзи в начале строки и убираем её из текста */
function splitLeadingEmoji(title = "") {
  const t = String(title).trim();
  // группа из одного или нескольких пиктографических символов в начале
  const m = t.match(/^[\p{Extended_Pictographic}\p{Emoji}\uFE0F\u200D]+/u);
  if (!m) return { emoji: null, text: t };
  const seq = m[0];
  const emoji = Array.from(seq)[0];       // берём первый символ
  const text = t.slice(seq.length).trim();
  return { emoji, text };
}

/* ==============================
   УТИЛИТЫ
================================ */
function openLink(url) {
  if (tg?.openTelegramLink && /^https?:\/\//.test(url)) {
    tg.openTelegramLink(url);
  } else {
    window.open(url, "_blank");
  }
  toast("Открываю…");
}

function toast(msg) {
  const el = document.getElementById("toast");
  if (!el) return alert(msg);
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 1600);
}
