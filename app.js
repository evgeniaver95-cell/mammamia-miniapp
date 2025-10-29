
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
    el.onclick = () => openSectionV2(sec);
    el.innerHTML = `
  <div class="title">${sec.title}</div>
  <div class="cover">${sec.cover || ""}</div>
  <div class="badge" aria-label="количество">${count}</div>
`;
    $sections.appendChild(el);
  });
}

function openSectionV2(section) {
  const tg = window.Telegram?.WebApp;

  const allItems = (section.items || []).filter(matchFilters);
  if (!tg?.showPopup) {
    if (allItems[0]?.url) openLink(allItems[0].url);
    else toast('Материалы не найдены');
    return;
  }

  const msg = allItems.length
    ? 'Выберите материал ниже:'
    : 'Материалы не найдены под текущий фильтр/поиск.';

  const trim = (s, n = 28) => {
    if (!s) return '';
    s = String(s).replace(/\s+/g, ' ').trim();
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
  };

  // показываем по 2 материала + 1 служебная кнопка (итого ≤3)
  const PAGE = 2;

  const showPage = (start = 0) => {
    const slice = allItems.slice(start, start + PAGE);

    /** строим кнопки: 2 материала + (Ещё… или Отмена) */
    const buttons = slice.map((it, i) => ({
      id: String(start + i),          // глобальный индекс
      type: 'default',
      text: trim(it.title, 28)
    }));

    const hasMore = start + PAGE < allItems.length;
    if (hasMore) {
      buttons.push({ id: 'more:' + (start + PAGE), type: 'default', text: 'Ещё…' });
    } else {
      // обычная кнопка, чтобы она гарантированно была последней
      buttons.push({ id: 'close', type: 'default', text: 'Отмена' });
    }

    tg.showPopup({ title: section.title, message: msg, buttons }, (btnId) => {
      if (btnId == null || btnId === 'close') return;

      if (btnId.startsWith('more:')) {
        const nextStart = Number(btnId.split(':')[1]);
        showPage(nextStart);
        return;
      }

      const idx = Number(btnId);
      const chosen = allItems[idx];
      if (chosen?.url) openLink(chosen.url);
    });
  };

  showPage(0);
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
