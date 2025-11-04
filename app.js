
// Мини‑апп «Mamma mia, che club!» — навигация по материалам
const $sp = document.getElementById('sectionPage');
// Если страница ещё не отрисована, дождёмся DOM:
if (!$sp || !$spTitle || !$spBack || !$spClose || !$spSearch || !$spList) {
  window.addEventListener('DOMContentLoaded', () => {
    // Пере-свяжем элементы
    window.location.reload(); // самый простой и надёжный вариант подтянуть DOM + JS
  });
}
const $spTitle = document.getElementById('spTitle');
const $spBack = document.getElementById('spBack');
const $spClose = document.getElementById('spClose');
const $spSearch = document.getElementById('spSearch');
const $spList = document.getElementById('spList');

let currentSection = null;
let innerQuery = "";

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
function openSectionPage(section) {
  currentSection = section;
  innerQuery = "";
  $spTitle.textContent = section.title;
  $spSearch.value = "";
  renderSectionItems();
  $sp.hidden = false;
  // Чтобы WebApp подвинулся под fullscreen
  try { tg?.expand?.(); } catch(e) {}
}

function closeSectionPage() {
  $sp.hidden = true;
  currentSection = null;
}

function renderSectionItems() {
  if (!currentSection) return;
  const q = innerQuery.trim().toLowerCase();

  const items = (currentSection.items || []).filter(it => {
    const byGlobal = matchFilters(it);               // действуют теги и глобальный поиск
    const byInner = !q || it.title.toLowerCase().includes(q);
    return byGlobal && byInner;
  });

  if (!items.length) {
    $spList.innerHTML = `<div style="padding:14px;color:var(--hint)">Ничего не найдено.</div>`;
    return;
  }

  $spList.innerHTML = "";
  items.forEach(it => {
    const row = document.createElement('button');
    row.className = 'section-page__item';
    row.innerHTML = `
      <span class="emj">📖</span>
      <span>${it.title}</span>
    `;
    row.onclick = () => it.url && openLink(it.url);
    $spList.appendChild(row);
  });
}

function renderSections() {
  $sections.innerHTML = "";
  state.sections.forEach(sec => {
    const count = (sec.items || []).filter(matchFilters).length;

    const el = document.createElement('div');
    el.className = 'card';
    el.onclick = () => openSectionPage(sec);
    el.innerHTML = `
  <div class="title">${sec.title}</div>
  <div class="cover">${sec.cover || ""}</div>
  <div class="badge" aria-label="количество">${count}</div>
`;
    $sections.appendChild(el);
  });
}

function openSectionV3(section) {
  const tg = window.Telegram?.WebApp;

  const allItems = (section.items || []).filter(matchFilters);

  // Нет материалов — короткий алерт и выходим
  if (!allItems.length) {
    if (tg?.showAlert) tg.showAlert('Материалы не найдены под текущий фильтр/поиск.');
    else toast('Материалы не найдены');
    return;
  }

  // Обрезаем очень длинные подписи
  const trim = (s, n = 28) => {
    if (!s) return '';
    s = String(s).replace(/\s+/g, ' ').trim();
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
  };

  const PAGE = 2; // по 2 материала на экран
  const msg = 'Выберите материал ниже:';

  const showPage = (start = 0) => {
    const slice = allItems.slice(start, start + PAGE);

    const buttons = slice.map((it, i) => ({
      id: String(start + i),          // глобальный индекс
      type: 'default',
      text: trim(it.title, 28)
    }));

    const hasMore = start + PAGE < allItems.length;
    if (hasMore) {
      // единственная служебная кнопка
      buttons.push({ id: 'more:' + (start + PAGE), type: 'default', text: 'Ещё…' });
    }
    // НИКАКОЙ "Отмена" тут больше нет — закрывается жестом

    tg.showPopup(
      { title: section.title, message: msg, buttons },
      (btnId) => {
        if (btnId == null) return; // закрыли жестом

        if (btnId.startsWith?.('more:')) {
          const nextStart = Number(btnId.split(':')[1]);
          showPage(nextStart);
          return;
        }

        const idx = Number(btnId);
        const chosen = allItems[idx];
        if (chosen?.url) openLink(chosen.url);
      }
    );
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
$spBack.addEventListener('click', closeSectionPage);
$spClose.addEventListener('click', closeSectionPage);
$spSearch.addEventListener('input', e => {
  innerQuery = e.target.value;
  renderSectionItems();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !$sp.hidden) closeSectionPage();
});

// нижняя навигация — просто активное состояние
document.querySelectorAll('nav.bottom button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('nav.bottom button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    if ($spBack)  $spBack.addEventListener('click', closeSectionPage);
if ($spClose) $spClose.addEventListener('click', closeSectionPage);
if ($spSearch) $spSearch.addEventListener('input', e => {
  innerQuery = e.target.value;
  renderSectionItems();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && $sp && !$sp.hidden) closeSectionPage();
});

  });
});
