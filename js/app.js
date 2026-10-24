'use strict';

const NAV = [
  { id: 'visao-geral', label: 'Visão geral', icon: 'overview' },
  { id: 'projetos', label: 'Projetos', icon: 'folder' },
  { id: 'tarefas', label: 'Tarefas', icon: 'tasks' },
  { id: 'calendario', label: 'Calendário', icon: 'calendar' },
  { id: 'listas', label: 'Listas', icon: 'list' },
  { id: 'custos', label: 'Custos', icon: 'wallet' },
  { id: 'comparador', label: 'Comparador', icon: 'scale' },
  { id: 'notas', label: 'Notas', icon: 'note' },
  { id: 'configuracoes', label: 'Configurações', icon: 'settings' },
];
const BOTTOM = ['visao-geral', 'projetos', 'tarefas', 'calendario'];
const LOGO_SIDE = logo(38);
const LOGO_MINI = logo(30);

const App = {
  route: { name: '', param: '' },
  pending: false,

  parse() {
    const h = location.hash.replace(/^#\/?/, '');
    const [path] = h.split('?');
    const parts = path.split('/').filter(Boolean);
    return { name: parts[0] || '', param: parts[1] ? decodeURIComponent(parts[1]) : '' };
  },

  go(hash) {
    if (location.hash === hash) App.render(true);
    else location.hash = hash;
  },

  schedule() {
    if (App.pending) return;
    App.pending = true;
    // rAF para sincronizar com a pintura; o timeout garante a atualização se o rAF estiver pausado.
    let done = false;
    const run = () => { if (done) return; done = true; App.pending = false; App.render(false); };
    requestAnimationFrame(run);
    setTimeout(run, 60);
  },

  render(routeChanged) {
    const r = App.parse();
    if (!VIEWS[r.name]) { location.replace('#/visao-geral'); return; }
    const prev = App.route;
    const main = document.getElementById('main');
    if (routeChanged) { NoteSave.flush(); UI.closePopover(); }
    App.route = r;
    const view = VIEWS[r.name];
    let html;
    try {
      html = (r.name === 'visao-geral' ? App.demoBanner() : '') + view.render(r.param);
    } catch (err) {
      console.error(err);
      html = C.empty({ ic: 'alert', title: 'Algo deu errado ao montar esta tela', text: U.esc(err && err.message ? err.message : String(err)) + '. Seus dados continuam salvos.', actions: '<button type="button" class="btn" data-act="reload">Recarregar</button><a class="btn" href="#/visao-geral">Ir para a visão geral</a>' });
    }
    const container = main.firstElementChild;
    const sameScreen = container && container.classList.contains('view') && prev.name === r.name && (prev.param === r.param || r.name === 'notas');
    if (!sameScreen) {
      main.innerHTML = `<div class="view view-enter">${html}</div>`;
      if (routeChanged) window.scrollTo(0, 0);
    } else {
      morph(container, html);
    }
    if (routeChanged) {
      document.title = `${view.title} · ENTRELIA`;
      DB.setMeta({ lastRoute: location.hash }, { silent: true });
    }
    App.renderChrome();
  },

  demoBanner() {
    if (!DB.getMeta().demo) return '';
    return `<div class="banner" role="note">${icon('sparkles')}<span class="grow"><strong>Você está explorando dados de demonstração.</strong> Edite à vontade — tudo é salvo neste navegador.</span><button type="button" class="btn btn-sm" data-act="wipeData">Começar do zero</button></div>`;
  },

  /* ---------- Moldura: menu lateral, barra superior e navegação inferior ---------- */
  renderChrome() {
    const meta = DB.getMeta();
    const r = App.route.name;
    const open = DB.all('tasks').filter((t) => t.status !== 'done' && L.projectActive(t.projectId));
    const overdue = open.filter((t) => L.isOverdue(t)).length;
    const notifs = L.notifications();
    const read = new Set(meta.readNotifs || []);
    const unread = notifs.filter((n) => !read.has(n.key)).length;
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    const app = document.getElementById('app');
    app.classList.toggle('is-collapsed', !!meta.sidebarCollapsed);

    const counts = { tarefas: open.length };
    morph(document.getElementById('sidebar'), `
      <div class="brand">
        <a href="#/visao-geral" class="row" style="--gap:12px;color:inherit;text-decoration:none;min-width:0" aria-label="ENTRELIA — ir para a visão geral">${LOGO_SIDE}<span class="brand-text"><span class="brand-name">ENTRELIA</span><span class="brand-tag">Tudo conectado.</span></span></a>
        <button type="button" class="btn btn-ghost btn-icon btn-sm collapse-btn" data-act="toggleSidebar" aria-label="${meta.sidebarCollapsed ? 'Expandir' : 'Recolher'} menu" aria-expanded="${!meta.sidebarCollapsed}" title="${meta.sidebarCollapsed ? 'Expandir' : 'Recolher'} menu">${icon('panel', 'ic-sm')}</button>
      </div>
      <nav class="nav" aria-label="Seções">
        ${NAV.map((n, i) => `${i === NAV.length - 1 ? '<div class="nav-sep" role="presentation"></div>' : ''}<a class="nav-item ${r === n.id ? 'is-active' : ''}" href="#/${n.id}" ${r === n.id ? 'aria-current="page"' : ''} title="${n.label}">${icon(n.icon)}<span class="nav-label">${n.label}</span>${n.id === 'tarefas' && counts.tarefas ? `<span class="nav-count ${overdue ? 'is-danger' : ''}" aria-label="${counts.tarefas} pendentes${overdue ? `, ${overdue} atrasadas` : ''}">${overdue || counts.tarefas}</span>` : ''}</a>`).join('')}
      </nav>
      <div class="side-foot">
        <div class="side-card" title="${App.saveText().title}">${icon(meta.demo ? 'sparkles' : 'database', 'ic-sm')}<div class="side-foot-text"><strong>${meta.demo ? 'Modo demonstração' : 'Salvo neste dispositivo'}</strong>${App.saveText().short}</div></div>
      </div>`);

    const s = App.saveText();
    morph(document.getElementById('topbar'), `
      <a class="brand-mini" href="#/visao-geral" aria-label="ENTRELIA — visão geral">${LOGO_MINI}<span>ENTRELIA</span></a>
      <button type="button" class="search-trigger" data-act="openSearch" aria-label="Buscar (atalho ${App.mod()}+K)">${icon('search', 'ic-sm')}<span class="search-label">Buscar projetos, tarefas, notas…</span><kbd class="kbd">${App.mod()} K</kbd></button>
      <span class="topbar-spacer"></span>
      <span class="save-ind ${s.cls}" role="status" title="${s.title}">${icon(s.icon, 'ic-sm')}<span class="save-text">${s.label}</span></span>
      <button type="button" class="btn btn-ghost btn-icon" data-act="toggleTheme" aria-label="Alternar para tema ${dark ? 'claro' : 'escuro'}" title="Tema ${dark ? 'claro' : 'escuro'}">${icon(dark ? 'sun' : 'moon')}</button>
      <button type="button" class="btn btn-ghost btn-icon bell" data-act="openNotifs" aria-haspopup="dialog" aria-expanded="false" aria-label="Avisos${unread ? `, ${unread} não lidos` : ''}">${icon('bell')}${unread ? `<span class="bell-count" aria-hidden="true">${unread > 9 ? '9+' : unread}</span>` : ''}</button>
      <button type="button" class="btn btn-primary btn-create" data-act="openCreate" aria-haspopup="menu" aria-expanded="false" aria-label="Criar">${icon('plus', 'ic-sm')}<span class="btn-label">Criar</span></button>`);

    const moreActive = !BOTTOM.includes(r);
    morph(document.getElementById('bottom-nav'), `
      ${BOTTOM.map((id) => { const n = NAV.find((x) => x.id === id); return `<a class="bn-item ${r === id ? 'is-active' : ''}" href="#/${id}" ${r === id ? 'aria-current="page"' : ''}><span class="bn-ico">${icon(n.icon)}</span>${n.id === 'visao-geral' ? 'Início' : n.label}${id === 'tarefas' && overdue ? `<span class="bn-badge" aria-label="${overdue} atrasadas">${overdue}</span>` : ''}</a>`; }).join('')}
      <button type="button" class="bn-item ${moreActive ? 'is-active' : ''}" data-act="openMore" aria-haspopup="dialog" ${moreActive ? 'aria-current="page"' : ''}><span class="bn-ico">${icon('menu')}</span>Mais</button>`);
  },

  saveText() {
    const t = DB.lastSaved;
    const time = t ? `${U.pad(t.getHours())}:${U.pad(t.getMinutes())}` : '';
    if (DB.status === 'memoria') return { label: 'Sem armazenamento', short: 'Armazenamento indisponível', icon: 'alert', cls: 'is-error', title: 'O navegador bloqueou o armazenamento local. Exporte um backup.' };
    if (DB.lastError) return { label: 'Erro ao salvar', short: 'Erro ao salvar', icon: 'alert', cls: 'is-error', title: DB.lastError };
    if (DB.saving) return { label: 'Salvando…', short: 'Salvando…', icon: 'refresh', cls: 'is-saving', title: 'Gravando alterações' };
    const where = DB.status === 'ok' ? 'IndexedDB' : 'armazenamento local';
    return { label: 'Salvo', short: time ? `Salvo às ${time}` : `Pronto · ${where}`, icon: 'checkCircle', cls: '', title: `Dados salvos no ${where}${time ? ' às ' + time : ''}.` };
  },

  mod() { return /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl'; },

  /* ---------- Tema e movimento ---------- */
  resolveDark(pref) {
    if (pref === 'sistema') return !window.matchMedia('(prefers-color-scheme: light)').matches;
    return pref !== 'claro';
  },
  applyTheme() {
    const dark = App.resolveDark(DB.getMeta().theme);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    document.querySelector('meta[name="theme-color"]').setAttribute('content', dark ? '#090D16' : '#F2F4F8');
    try { localStorage.setItem('entrelia-theme', DB.getMeta().theme); } catch (e) { /* sem acesso */ }
  },
  setTheme(pref) {
    DB.setMeta({ theme: pref });
    App.applyTheme();
    UI.toast(`Tema ${pref === 'sistema' ? 'do sistema' : pref} aplicado.`, { tone: 'info', timeout: 2200 });
  },
  applyMotion() { document.documentElement.classList.toggle('reduce-motion', !!DB.getMeta().reduceMotion); },

  /* ---------- Busca global ---------- */
  openSearch() {
    if (document.querySelector('.search-modal')) { document.getElementById('gsearch')?.focus(); return; }
    let groups = [];
    let flat = [];
    let sel = 0;
    const recent = () => {
      const items = [
        ...DB.all('projects').filter((p) => !p.archived).map((p) => ({ type: 'project', id: p.id, title: p.name, sub: 'Projeto', icon: 'folder', t: p.updatedAt || 0, color: p.color })),
        ...DB.all('tasks').filter((t) => t.status !== 'done').map((t) => ({ type: 'task', id: t.id, title: t.title, sub: 'Tarefa' + (t.due ? ' · prazo ' + U.fmtDate(t.due) : ''), icon: 'tasks', t: t.updatedAt || 0 })),
        ...DB.all('notes').map((n) => ({ type: 'note', id: n.id, title: n.title || 'Nota sem título', sub: 'Nota', icon: 'note', t: n.updatedAt || 0 })),
        ...DB.all('lists').map((l) => ({ type: 'list', id: l.id, title: l.name, sub: 'Lista', icon: LIST_TYPES[l.type]?.icon || 'list', t: l.updatedAt || 0 })),
      ].sort((a, b) => b.t - a.t).slice(0, 6);
      return items.length ? [{ label: 'Atualizados recentemente', items }] : [];
    };
    const hl = (text, q) => {
      const s = U.esc(text);
      const tokens = U.normalize(q).split(/\s+/).filter(Boolean);
      if (!tokens.length) return s;
      const norm = U.normalize(text);
      const marks = new Array(text.length).fill(false);
      tokens.forEach((t) => { let i = norm.indexOf(t); while (i >= 0) { for (let k = i; k < i + t.length; k++) marks[k] = true; i = norm.indexOf(t, i + t.length); } });
      let out = '', open = false;
      for (let i = 0; i < text.length; i++) {
        if (marks[i] && !open) { out += '<mark>'; open = true; }
        if (!marks[i] && open) { out += '</mark>'; open = false; }
        out += U.esc(text[i]);
      }
      return out + (open ? '</mark>' : '');
    };
    const draw = (m, q) => {
      groups = q.trim() ? L.search(q) : recent();
      flat = groups.flatMap((g) => g.items);
      sel = Math.min(sel, Math.max(0, flat.length - 1));
      let idx = 0;
      const html = groups.length ? groups.map((g) => `<div class="sr-group" role="group" aria-label="${g.label}"><div class="menu-label">${g.label}</div>${g.items.map((it) => {
        const i = idx++;
        return `<button type="button" class="sr-item" role="option" id="sr-${i}" data-i="${i}" aria-selected="${i === sel}" data-key="sr-${it.type}-${it.id}">
          <span class="mini-icon tone-brand" ${it.color ? `style="background:color-mix(in srgb, ${it.color} 20%, transparent);color:${it.color}"` : ''}>${icon(it.icon, 'ic-sm')}</span>
          <span class="mini-body"><span class="mini-title">${hl(it.title, q)}</span><span class="mini-sub">${U.esc(it.sub || '')}</span></span>
          ${icon('arrowRight', 'ic-sm')}
        </button>`;
      }).join('')}</div>`).join('')
        : `<div style="padding:28px 16px">${C.empty({ ic: 'search', title: q.trim() ? 'Nada encontrado' : 'Comece a digitar', text: q.trim() ? `Nenhum projeto, tarefa, nota ou lista corresponde a “${U.esc(q)}”.` : 'Busque por projetos, tarefas, notas, listas e compromissos.' }, true)}</div>`;
      morph(m.el.querySelector('.search-results'), html);
      const input = m.el.querySelector('#gsearch');
      input.setAttribute('aria-activedescendant', flat.length ? 'sr-' + sel : '');
      m.el.querySelector('#sr-status').textContent = q.trim() ? `${U.count(flat.length, 'resultado', 'resultados')}` : '';
    };
    const m = UI.modal({
      hideHead: true, className: 'is-top search-modal', size: 'md',
      body: `<div class="search-head">${icon('search', 'ic-lg')}<label class="sr-only" for="gsearch">Buscar em tudo</label><input id="gsearch" autofocus autocomplete="off" placeholder="Buscar projetos, tarefas, notas e listas" role="combobox" aria-expanded="true" aria-controls="sr-list" aria-autocomplete="list"><button type="button" class="btn btn-ghost btn-sm" data-modal-close>Esc</button></div>
        <div class="search-results" id="sr-list" role="listbox" aria-label="Resultados"></div>
        <div class="sr-foot"><span><kbd class="kbd">↑</kbd> <kbd class="kbd">↓</kbd> navegar</span><span><kbd class="kbd">Enter</kbd> abrir</span><span><kbd class="kbd">Esc</kbd> fechar</span><span id="sr-status" aria-live="polite" style="margin-left:auto"></span></div>`,
      onMount(el, ctrl) {
        el.querySelector('.modal-body').style.padding = '0';
        const input = el.querySelector('#gsearch');
        const open = (i) => { const it = flat[i]; if (!it) return; ctrl.close(); App.openItem(it.type, it.id); };
        input.addEventListener('input', () => { sel = 0; draw(ctrl, input.value); });
        input.addEventListener('keydown', (e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(sel + 1, flat.length - 1); draw(ctrl, input.value); el.querySelector('#sr-' + sel)?.scrollIntoView({ block: 'nearest' }); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(sel - 1, 0); draw(ctrl, input.value); el.querySelector('#sr-' + sel)?.scrollIntoView({ block: 'nearest' }); }
          else if (e.key === 'Enter') { e.preventDefault(); open(sel); }
        });
        el.querySelector('.search-results').addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (b) open(+b.dataset.i); });
        draw(ctrl, '');
      },
    });
  },

  openItem(type, id) {
    if (type === 'project') App.go('#/projetos/' + id);
    else if (type === 'task') TaskModal.open(id);
    else if (type === 'note') App.go('#/notas/' + id);
    else if (type === 'list') App.go('#/listas/' + id);
    else if (type === 'comparison') App.go('#/comparador/' + id);
    else if (type === 'event') {
      const e = DB.get('events', id);
      if (!e) return;
      UIS.patch('calendar', { date: e.date, mode: 'day' });
      App.go('#/calendario');
      setTimeout(() => EventModal.open(id), 50);
    }
  },

  /* ---------- Avisos ---------- */
  openNotifs(anchor) {
    if (UI.popoverAnchor() === anchor) { UI.closePopover(); return; }
    const draw = () => {
      const meta = DB.getMeta();
      const read = new Set(meta.readNotifs || []);
      const list = L.notifications();
      const unread = list.filter((n) => !read.has(n.key)).length;
      return `<div role="dialog" aria-label="Central de avisos">
        <div class="notif-head"><strong>Avisos ${unread ? `<span class="badge b-danger">${unread} novos</span>` : ''}</strong>${list.length && unread ? '<button type="button" class="link-btn" data-read-all>Marcar todos como lidos</button>' : ''}</div>
        <div class="notif-list">${list.length ? list.map((n) => `
          <button type="button" class="notif ${read.has(n.key) ? '' : 'is-unread'}" data-key="${U.esc(n.key)}" data-nk="${U.esc(n.key)}">
            <span class="mini-icon tone-${n.tone === 'danger' ? 'danger' : n.tone === 'warn' ? 'warn' : 'brand'}">${icon(n.icon, 'ic-sm')}</span>
            <span class="mini-body"><span class="mini-title">${U.esc(n.title)}</span><span class="mini-sub">${U.esc(n.text)}</span></span>
            <span class="sr-only">${read.has(n.key) ? 'Lido' : 'Não lido'}</span>
          </button>`).join('') : `<div style="padding:8px 10px 14px">${C.empty({ ic: 'bell', title: 'Tudo em ordem', text: 'Avisos sobre prazos, bloqueios, orçamento e conflitos de horário aparecem aqui.' }, true)}</div>`}</div>
      </div>`;
    };
    UI.popover(anchor, draw(), {
      className: 'notif-panel',
      onMount(el) {
        el.addEventListener('click', (e) => {
          if (e.target.closest('[data-read-all]')) {
            const keys = L.notifications().map((n) => n.key);
            DB.setMeta({ readNotifs: keys });
            morph(el, draw());
            UI.toast('Avisos marcados como lidos.', { tone: 'info', timeout: 2000 });
            return;
          }
          const b = e.target.closest('[data-nk]');
          if (!b) return;
          const n = L.notifications().find((x) => x.key === b.dataset.nk);
          const current = new Set(L.notifications().map((x) => x.key));
          const read = (DB.getMeta().readNotifs || []).filter((k) => current.has(k));
          if (!read.includes(b.dataset.nk)) read.push(b.dataset.nk);
          DB.setMeta({ readNotifs: read });
          UI.closePopover();
          if (n) App.openItem(n.open.type, n.open.id);
        });
      },
    });
  },

  /* ---------- Menu “Criar” ---------- */
  openCreate(anchor) {
    const p = App.route.name === 'projetos' && App.route.param ? App.route.param : '';
    UI.menu(anchor, [
      { header: 'Criar' },
      { label: 'Tarefa', icon: 'tasks', hint: 'N', fn: () => TaskModal.open(null, { projectId: p }) },
      { label: 'Projeto', icon: 'folder', fn: () => ProjectModal.open() },
      { label: 'Projeto a partir de modelo', icon: 'layers', fn: () => TemplateModal.open() },
      { label: 'Compromisso', icon: 'calendar', fn: () => EventModal.open(null, { projectId: p }) },
      { label: 'Lista', icon: 'list', fn: () => ListModal.open(null, { projectId: p }) },
      { label: 'Despesa', icon: 'receipt', fn: () => ExpenseModal.open(null, { projectId: p }) },
      { label: 'Nota', icon: 'note', fn: () => NoteActions.create({ projectId: p }) },
      { label: 'Comparação', icon: 'scale', fn: () => CmpModal.open(null, { projectId: p }) },
    ]);
  },

  openMore() {
    const r = App.route.name;
    UI.modal({
      title: 'Mais seções',
      body: `<nav class="more-grid" aria-label="Mais seções">${NAV.filter((n) => !BOTTOM.includes(n.id)).map((n) => `<a class="more-item ${r === n.id ? 'is-active' : ''}" href="#/${n.id}" data-modal-close ${r === n.id ? 'aria-current="page"' : ''}>${icon(n.icon)}${n.label}</a>`).join('')}</nav>
        <div class="row wrap mt-16" style="--gap:8px"><button type="button" class="btn btn-sm" data-modal-close data-act="organizeDay">${icon('sparkles', 'ic-sm')}Organizar meu dia</button><button type="button" class="btn btn-sm" data-modal-close data-act="openSearch">${icon('search', 'ic-sm')}Buscar</button></div>`,
    });
  },

  /* ---------- Primeiro acesso ---------- */
  welcome() {
    UI.modal({
      hideHead: true, dismissible: false, size: 'md',
      body: `<div class="welcome">
        ${logo(64)}
        <div class="eyebrow">Bem-vindo ao ENTRELIA</div>
        <h2>Tudo conectado. Próximo passo claro.</h2>
        <p class="muted" style="max-width:46ch">Projetos, tarefas, calendário, listas, custos, decisões e notas no mesmo lugar — e uma sugestão clara do que fazer agora.</p>
        <div class="field" style="width:100%;max-width:340px;text-align:left;margin-top:6px"><label class="label" for="wl-name">Como devemos chamar você? <span class="faint">(opcional)</span></label><input class="input" id="wl-name" maxlength="40" placeholder="Seu nome" autofocus></div>
        <div class="welcome-choices">
          <button type="button" class="choice" data-choice="demo">${icon('sparkles')}<strong>Explorar com demonstração</strong><span>Quatro projetos conectados para ver tudo funcionando. Você pode apagar depois.</span></button>
          <button type="button" class="choice" data-choice="empty">${icon('plus')}<strong>Começar do zero</strong><span>Um ambiente vazio para organizar seus próprios projetos.</span></button>
        </div>
        <p class="xs faint">Seus dados ficam somente neste navegador.</p>
      </div>`,
      onMount(el, m) {
        el.addEventListener('click', async (e) => {
          const b = e.target.closest('[data-choice]');
          if (!b) return;
          const userName = el.querySelector('#wl-name').value.trim().slice(0, 40);
          m.close();
          if (b.dataset.choice === 'demo') {
            await DB.replaceAll(buildDemo(), { initialized: true, demo: true, userName, personalBudget: 3000 });
            UI.toast('Demonstração carregada. Explore à vontade!');
          } else {
            DB.setMeta({ initialized: true, demo: false, userName });
            UI.toast('Tudo pronto. Crie seu primeiro projeto.', { tone: 'info' });
          }
          App.go('#/visao-geral');
        });
      },
    });
  },
};

/* ---------- Ações da moldura ---------- */
A.openSearch = () => App.openSearch();
A.openNotifs = (el) => App.openNotifs(el);
A.openCreate = (el) => App.openCreate(el);
A.openMore = () => App.openMore();
A.toggleTheme = () => App.setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'claro' : 'escuro');
A.toggleSidebar = () => DB.setMeta({ sidebarCollapsed: !DB.getMeta().sidebarCollapsed });
A.reload = () => location.reload();

/* ---------- Delegação de eventos ---------- */
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const fn = A[el.dataset.act];
  if (!fn) { console.warn('Ação desconhecida:', el.dataset.act); return; }
  if (el.tagName === 'A' && el.getAttribute('href') === '#') e.preventDefault();
  try { fn(el, e); } catch (err) { console.error(err); UI.toast('Não foi possível concluir a ação: ' + err.message, { tone: 'danger' }); }
});
document.addEventListener('change', (e) => {
  const el = e.target.closest('[data-change]');
  if (el && A[el.dataset.change]) A[el.dataset.change](el, e);
});
document.addEventListener('input', (e) => {
  const el = e.target.closest('[data-input]');
  if (el && A[el.dataset.input]) A[el.dataset.input](el, e);
});
document.addEventListener('submit', (e) => {
  const f = e.target.closest('form[data-submit]');
  if (!f) return;
  e.preventDefault();
  A[f.dataset.submit] && A[f.dataset.submit](f, e);
});
document.addEventListener('keydown', (e) => {
  const kd = e.target.closest && e.target.closest('[data-keydown]');
  if (kd && A[kd.dataset.keydown]) A[kd.dataset.keydown](kd, e);
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); App.openSearch(); return; }
  const typing = e.target.closest && e.target.closest('input, textarea, select, [contenteditable="true"]');
  if (typing || e.ctrlKey || e.metaKey || e.altKey || UI.stack.length || document.querySelector('.popover')) return;
  if (e.key === '/') { e.preventDefault(); App.openSearch(); }
  else if (e.key === 'n' || e.key === 'N') { e.preventDefault(); TaskModal.open(null); }
});

/* ---------- Arrastar e soltar (com alternativa por botões/menus em cada tela) ---------- */
(() => {
  let drag = null;
  let drop = null;
  const clear = () => document.querySelectorAll('.drop-before, .drop-after, .drop-into').forEach((x) => x.classList.remove('drop-before', 'drop-after', 'drop-into'));
  document.addEventListener('dragstart', (e) => {
    const el = e.target.closest && e.target.closest('[data-drag]');
    if (!el) return;
    const [kind, id] = el.dataset.drag.split(':');
    drag = { kind, id, el };
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', id); } catch (err) { /* ignorado */ }
    requestAnimationFrame(() => el.classList.add('dragging'));
  });
  document.addEventListener('dragover', (e) => {
    if (!drag) return;
    const t = e.target.closest('[data-drop]');
    clear();
    drop = null;
    if (!t) return;
    const [kind, id] = t.dataset.drop.split(':');
    const ok = kind === drag.kind || (drag.kind === 'board' && kind === 'col');
    if (!ok) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (kind === 'col') { t.classList.add('drop-into'); drop = { col: id }; return; }
    if (id === drag.id) return;
    const r = t.getBoundingClientRect();
    const after = kind === 'list' ? e.clientX > r.left + r.width / 2 : e.clientY > r.top + r.height / 2;
    t.classList.add(after ? 'drop-after' : 'drop-before');
    drop = { targetId: id, after };
  });
  document.addEventListener('drop', (e) => {
    if (!drag) return;
    e.preventDefault();
    const d = drag, target = drop;
    clear();
    d.el.classList.remove('dragging');
    drag = null; drop = null;
    if (target && DnD[d.kind]) DnD[d.kind]({ dragId: d.id, ...target });
  });
  document.addEventListener('dragend', () => {
    clear();
    if (drag) drag.el.classList.remove('dragging');
    drag = null; drop = null;
  });
})();

/* ---------- Inicialização ---------- */
(async function boot() {
  await DB.init();
  App.applyTheme();
  App.applyMotion();
  DB.on('change', () => App.schedule());
  DB.on('saving', () => App.schedule());
  DB.on('saved', () => App.schedule());
  DB.on('error', (msg) => { UI.toast('Erro ao salvar: ' + msg, { tone: 'danger', timeout: 8000 }); App.schedule(); });
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => { if (DB.getMeta().theme === 'sistema') { App.applyTheme(); App.schedule(); } });
  window.addEventListener('hashchange', () => App.render(true));
  if (!location.hash || !VIEWS[App.parse().name]) {
    const last = DB.getMeta().lastRoute;
    history.replaceState(null, '', last && VIEWS[last.replace(/^#\/?/, '').split('/')[0]] ? last : '#/visao-geral');
  }
  App.render(true);
  if (!DB.getMeta().initialized) App.welcome();
  if (DB.status === 'local') UI.toast('IndexedDB indisponível: usando o armazenamento local do navegador.', { tone: 'warn', timeout: 7000 });
  if (DB.status === 'memoria') UI.toast('O navegador bloqueou o armazenamento. Exporte um backup antes de sair.', { tone: 'danger', timeout: 10000 });
  // Atualiza indicadores dependentes da hora (agora, atrasos) a cada minuto.
  setInterval(() => { if (!UI.stack.length) App.schedule(); }, 60000);
})();
