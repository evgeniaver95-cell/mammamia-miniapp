
// Мини‑апп «Mamma mia, che club!» — навигация по материалам
const tg = window.Telegram?.WebApp;
const state = {
  query: "",
  tag: "Все",
  tags: [],
  sections: [],
};

// Инициализация
fetch('./data.json')
  .then(r => r.json())
  .then(data => {
    state.tags = data.tags;
    state.sections = data.sections;
    renderTags();
    renderSections();
  });

const $tags = document.getElementById('tags');
const $sections = document.getElementById('sections');
const $search = document.getElementById('searchInput');

$search.addEventListener('input', (e) => {
  state.query = e.target.value.trim().toLowerCase();
  renderSections();
});

function renderTags() {
  $tags.innerHTML = "";
  const all = ["Все", ...state.tags];
  all.forEach(t => {
    const btn = document.createElement('button');
    btn.className = 'tag' + (t === state.tag ? ' active' : '');
    btn.textContent = t;
    btn.onclick = () => { state.tag = t; renderTags(); renderSections(); };
    $tags.appendChild(btn);
  });
}

function matchFilters(item) {
  const byTag = (state.tag === "Все") || (item.tags || []).includes(state.tag);
  const byQuery = !state.query || (item.title.toLowerCase().includes(state.query));
  return byTag && byQuery;
}

function renderSections() {
  $sections.innerHTML = "";
  state.sections.forEach(sec => {
    const count = (sec.items || []).filter(matchFilters).length;

    const el = document.createElement('div');
    el.className = 'card';
    el.onclick = () => openSection(sec);
    el.innerHTML = `
  <div class="title">${sec.title}</div>
  <div class="cover">${sec.cover || ""}</div>
  <div class="badge" aria-label="количество">${count}</div>
`;
    $sections.appendChild(el);
  });
}

function openSection(section) {
  // Если у раздела есть defaultLink — открываем его.
  if (section.defaultLink) {
    openLink(section.defaultLink);
    return;
  }
  // Иначе показываем быстрый выбор последних материалов (до 4).
  const items = (section.items || []).filter(matchFilters).slice(0, 4);
  const text = items.length
    ? 'Выберите материал ниже или откройте раздел.'
    : 'Материалы не найдены под текущий фильтр/поиск.';
  const buttons = items.map((it, idx) => ({ id: String(idx), type: 'default', text: it.title.slice(0, 30) }));
  buttons.push({ id: 'open', type: 'default', text: 'Открыть раздел' });
  if (tg?.showPopup) {
    tg.showPopup({
      title: section.title,
      message: text,
      buttons
    }, (btnId) => {
      if (btnId === 'open') {
        // по умолчанию открываем первый материал раздела, если он есть
        const first = section.items?.[0];
        if (first?.url) openLink(first.url);
      } else {
        const idx = Number(btnId);
        const chosen = items[idx];
        if (chosen?.url) openLink(chosen.url);
      }
    });
  } else {
    // Фоллбек — открываем первый материал
    const first = section.items?.[0];
    if (first?.url) openLink(first.url);
  }
}

function openLink(url) {
  // Открываем корректно внутри Telegram
  if (tg?.openTelegramLink && /^https?:\/\//.test(url)) {
    tg.openTelegramLink(url);
  } else {
    window.open(url, '_blank');
  }
  toast('Открываю…');
}

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 1600);
}

// Telegram UI
if (tg) {
  try {
    tg.expand();
    // Принудительно светлая тема, как просили
    document.body.setAttribute('data-theme', 'light');
    // Но цвета кнопок/ссылок берём из темы Telegram, если есть
    const tp = tg.themeParams || {};
    const root = document.documentElement;
    const map = { '--brand': tp.button_color, '--brandText': tp.button_text_color };
    Object.entries(map).forEach(([k,v]) => v && root.style.setProperty(k, v));
  } catch(e) {}
}

// нижняя навигация — просто активное состояние
document.querySelectorAll('nav.bottom button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('nav.bottom button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    if (tab === 'about') toast('Здесь будет «О клубе»');
    if (tab === 'chats') toast('Здесь будут ссылки на чаты');
    if (tab === 'fav') toast('Здесь будут избранные материалы');
    if (tab === 'amb') toast('Здесь будет программа амбассадоров');
  });
});
