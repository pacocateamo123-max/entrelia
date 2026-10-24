'use strict';

VIEWS.tarefas = {
  title: 'Tarefas',

  filters() {
    return {
      project: UIS.get('tasks', 'project', ''),
      priority: UIS.get('tasks', 'priority', ''),
      due: UIS.get('tasks', 'due', ''),
      status: UIS.get('tasks', 'status', ''),
      q: UIS.get('tasks', 'q', ''),
    };
  },

  /* Tarefas visíveis segundo os filtros, já ordenadas. */
  visible() {
    const f = this.filters();
    const T = U.today();
    const nq = U.normalize(f.q);
    return L.sortTasks(DB.all('tasks').filter((t) => {
      if (!L.projectActive(t.projectId) && f.project !== t.projectId) return false;
      if (f.project === '__none') { if (t.projectId) return false; }
      else if (f.project && t.projectId !== f.project) return false;
      if (f.priority && t.priority !== f.priority) return false;
      if (f.status === 'blocked') { if (!L.isBlocked(t)) return false; }
      else if (f.status && t.status !== f.status) return false;
      if (f.due === 'overdue' && !L.isOverdue(t)) return false;
      if (f.due === 'today' && t.due !== T) return false;
      if (f.due === 'week' && !(t.due && t.due >= T && t.due <= U.addDays(T, 7))) return false;
      if (f.due === 'none' && t.due) return false;
      if (nq && !U.normalize(t.title + ' ' + t.description).includes(nq)) return false;
      return true;
    }));
  },

  quickAdd(projectId) {
    const fixed = projectId !== undefined;
    const pid = fixed ? projectId : (this.filters().project && this.filters().project !== '__none' ? this.filters().project : '');
    return `<form class="quick-add" data-submit="quickAddTask" aria-label="Adicionar tarefa rapidamente">
      <span class="stat-icon" aria-hidden="true">${icon('plus', 'ic-sm')}</span>
      <label class="sr-only" for="qa-title${fixed ? '-p' : ''}">Título da nova tarefa</label>
      <input class="input" id="qa-title${fixed ? '-p' : ''}" name="title" maxlength="140" placeholder="Adicionar tarefa e pressionar Enter" autocomplete="off">
      ${fixed ? `<input type="hidden" name="projectId" value="${projectId}">` : `<label class="sr-only" for="qa-proj">Projeto</label><select class="select input-sm" id="qa-proj" name="projectId">${C.projectOptions(pid)}</select>`}
      <label class="sr-only" for="qa-prio${fixed ? '-p' : ''}">Prioridade</label>
      <select class="select input-sm" id="qa-prio${fixed ? '-p' : ''}" name="priority">${C.opts([['media', 'Prioridade média'], ['alta', 'Prioridade alta'], ['baixa', 'Prioridade baixa']], 'media')}</select>
      <label class="sr-only" for="qa-due${fixed ? '-p' : ''}">Prazo</label>
      <input class="input input-sm" type="date" id="qa-due${fixed ? '-p' : ''}" name="due" title="Prazo">
      <button type="submit" class="btn btn-sm btn-primary">Adicionar</button>
    </form>`;
  },

  render() {
    const f = this.filters();
    const mode = UIS.get('tasks', 'mode', 'list');
    const all = DB.all('tasks');
    const vis = this.visible();
    const active = Object.entries(f).filter(([, v]) => v).length;

    let body;
    if (!all.length) {
      body = C.empty({ ic: 'tasks', title: 'Nenhuma tarefa ainda', text: 'Adicione sua primeira tarefa no campo acima ou crie um projeto a partir de um modelo.', actions: `<button type="button" class="btn btn-primary" data-act="newTask">${icon('plus', 'ic-sm')}Nova tarefa</button><button type="button" class="btn" data-act="newFromTemplate">${icon('layers', 'ic-sm')}Usar modelo</button>` });
    } else if (mode === 'board') {
      body = this.board(vis);
    } else {
      body = this.list(vis, f);
    }

    return `
      <div class="page-head">
        <div><h1 class="page-title">Tarefas</h1><p class="page-sub">Prazo, prioridade e dependências definem o que fazer primeiro.</p></div>
        <div class="actions">
          <button type="button" class="btn" data-act="organizeDay">${icon('sparkles', 'ic-sm')}Organizar meu dia</button>
          <button type="button" class="btn btn-primary" data-act="newTask">${icon('plus', 'ic-sm')}Nova tarefa</button>
        </div>
      </div>
      ${this.quickAdd()}
      <div class="toolbar" role="search" aria-label="Filtros de tarefas">
        <label class="input-icon">${icon('search', 'ic-sm')}<span class="sr-only">Buscar tarefas</span><input id="task-q" class="input" type="search" placeholder="Buscar tarefas" value="${U.esc(f.q)}" data-input="taskFilter" data-key="q"></label>
        <label class="sr-only" for="tf-project">Projeto</label>
        <select id="tf-project" class="select" data-change="taskFilter" data-key="project">${C.opts([['', 'Todos os projetos'], ['__none', 'Sem projeto'], ...DB.all('projects').filter((p) => !p.archived || p.id === f.project).map((p) => [p.id, p.name])], f.project)}</select>
        <label class="sr-only" for="tf-prio">Prioridade</label>
        <select id="tf-prio" class="select" data-change="taskFilter" data-key="priority">${C.opts([['', 'Qualquer prioridade'], ['alta', 'Alta'], ['media', 'Média'], ['baixa', 'Baixa']], f.priority)}</select>
        <label class="sr-only" for="tf-due">Prazo</label>
        <select id="tf-due" class="select" data-change="taskFilter" data-key="due">${C.opts([['', 'Qualquer prazo'], ['overdue', 'Atrasadas'], ['today', 'Vencem hoje'], ['week', 'Próximos 7 dias'], ['none', 'Sem prazo']], f.due)}</select>
        <label class="sr-only" for="tf-status">Status</label>
        <select id="tf-status" class="select" data-change="taskFilter" data-key="status">${C.opts([['', 'Qualquer status'], ['todo', 'A fazer'], ['doing', 'Em andamento'], ['done', 'Concluído'], ['blocked', 'Bloqueadas']], f.status)}</select>
        ${active ? `<button type="button" class="btn btn-ghost btn-sm" data-act="clearTaskFilters">${icon('x', 'ic-sm')}Limpar filtros</button>` : ''}
        ${C.seg([['list', 'Lista', 'rows'], ['board', 'Quadro', 'board']], mode, 'taskMode', 'aria-label="Modo de visualização"')}
        <span class="toolbar-count" aria-live="polite">${U.count(vis.length, 'tarefa', 'tarefas')}</span>
      </div>
      ${body}`;
  },

  list(vis, f) {
    const open = vis.filter((t) => t.status !== 'done');
    const done = vis.filter((t) => t.status === 'done').sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
    const tools = (t, i, arr) => `
      <button type="button" class="btn btn-ghost btn-icon btn-sm btn-reveal" data-act="moveTask" data-id="${t.id}" data-dir="-1" aria-label="Mover para cima: ${U.esc(t.title)}" ${i === 0 ? 'disabled' : ''}>${icon('arrowUp', 'ic-sm')}</button>
      <button type="button" class="btn btn-ghost btn-icon btn-sm btn-reveal" data-act="moveTask" data-id="${t.id}" data-dir="1" aria-label="Mover para baixo: ${U.esc(t.title)}" ${i === arr.length - 1 ? 'disabled' : ''}>${icon('arrowDown', 'ic-sm')}</button>
      ${C.menuBtn('taskMenu', t.id, `Ações da tarefa ${t.title}`)}`;
    if (!vis.length) return C.empty({ ic: 'filter', title: 'Nenhuma tarefa com estes filtros', actions: `<button type="button" class="btn" data-act="clearTaskFilters">Limpar filtros</button>` }, true);
    return `
      ${open.length ? `<div class="task-list" data-drop-zone="task">${open.map((t, i, arr) => C.taskRow(t, { drag: 'task', tools: tools(t, i, arr) })).join('')}</div>`
        : (f.status !== 'done' ? C.empty({ ic: 'checkCircle', title: 'Tudo concluído por aqui', text: 'Nenhuma tarefa pendente com estes filtros.' }, true) : '')}
      ${done.length ? `<h2 class="group-title">${icon('checkCircle', 'ic-sm')}Concluídas (${done.length})</h2>
        <div class="task-list">${done.map((t) => C.taskRow(t, { tools: C.menuBtn('taskMenu', t.id, `Ações da tarefa ${t.title}`) })).join('')}</div>` : ''}
      <p class="hint mt-16">${icon('info', 'ic-xs')} Arraste pela alça ou use as setas para reordenar. O menu “⋯” oferece as mesmas ações sem arrastar.</p>`;
  },

  board(vis) {
    const cols = ['todo', 'doing', 'done'];
    return `<div class="board-wrap"><div class="board">${cols.map((st) => {
      const items = vis.filter((t) => t.status === st);
      return `<section class="board-col" data-drop="col:${st}" aria-label="${TASK_STATUS[st]}">
        <div class="board-col-head"><span class="row"><span class="dot" style="--c:${TASK_STATUS_COLOR[st]}"></span>${TASK_STATUS[st]}</span><span class="badge">${items.length}</span></div>
        ${items.map((t) => this.card(t)).join('') || `<div class="board-empty">${st === 'done' ? 'Conclua tarefas para vê-las aqui' : 'Arraste tarefas para cá ou use o menu “⋯”'}</div>`}
        ${st !== 'done' ? `<button type="button" class="btn btn-ghost btn-sm" data-act="newTask" data-status="${st}">${icon('plus', 'ic-sm')}Adicionar</button>` : ''}
      </section>`;
    }).join('')}</div></div>`;
  },

  card(t) {
    const done = t.status === 'done';
    const blockers = L.blockers(t);
    const blocked = !done && blockers.length;
    const overdue = L.isOverdue(t);
    return `<article class="board-card anim-in ${done ? 'is-done' : ''} ${overdue ? 'is-overdue' : ''} ${blocked ? 'is-blocked' : ''}" data-key="b-${t.id}" draggable="true" data-drag="board:${t.id}" data-drop="board:${t.id}">
      <div class="row" style="align-items:flex-start">
        <button type="button" class="check ${done ? 'is-done' : ''}" data-act="toggleTask" data-id="${t.id}" aria-pressed="${done}" aria-label="${done ? 'Reabrir' : 'Concluir'} tarefa: ${U.esc(t.title)}">${icon('check')}</button>
        <button type="button" class="task-main" data-act="openTask" data-id="${t.id}"><span class="task-title">${U.esc(t.title)}</span></button>
        ${C.menuBtn('taskMenu', t.id, `Ações da tarefa ${t.title}`, 'data-board="1"')}
      </div>
      <div class="task-meta">
        ${blocked ? `<span class="badge b-warn">${icon('lock')}<span>Aguarda: ${U.esc(blockers[0].title)}</span></span>` : ''}
        ${C.due(t)}${!done && t.priority === 'alta' ? C.prio('alta') : ''}${C.projectChip(t.projectId)}
        ${t.duration ? `<span class="meta-i">${icon('clock', 'ic-xs')}${U.fmtDuration(t.duration)}</span>` : ''}
        ${(t.subtasks || []).length ? `<span class="meta-i">${icon('checklist', 'ic-xs')}${t.subtasks.filter((s) => s.done).length}/${t.subtasks.length}</span>` : ''}
      </div>
    </article>`;
  },
};

/* ---------- Ações ---------- */
A.taskFilter = (el) => UIS.set('tasks', el.dataset.key, el.value);
A.taskMode = (el) => UIS.set('tasks', 'mode', el.dataset.value);
A.clearTaskFilters = () => UIS.patch('tasks', { project: '', priority: '', due: '', status: '', q: '' });

A.quickAddTask = (form) => {
  const title = form.title.value.trim();
  if (!title) { UI.toast('Digite o título da tarefa antes de adicionar.', { tone: 'warn' }); form.title.focus(); return; }
  if (form.due.value && !U.parse(form.due.value)) { UI.toast('Informe um prazo válido.', { tone: 'warn' }); return; }
  const maxOrder = DB.all('tasks').reduce((m, t) => Math.max(m, t.order), 0);
  DB.put('tasks', M.task({ title, projectId: form.projectId.value, priority: form.priority.value, due: form.due.value, order: maxOrder + 1000 }));
  form.title.value = '';
  form.due.value = '';
  form.title.focus();
  UI.toast('Tarefa adicionada.');
};

A.moveTask = (el) => {
  const t = DB.get('tasks', el.dataset.id);
  const seq = VIEWS.tarefas.visible().filter((x) => x.status !== 'done');
  Actions.stepOrder('tasks', seq, t.id, +el.dataset.dir);
  requestAnimationFrame(() => {
    const again = document.querySelector(`[data-act="moveTask"][data-id="${t.id}"][data-dir="${el.dataset.dir}"]`);
    if (again && !again.disabled) again.focus(); else document.querySelector(`[data-key="t-${t.id}"] .task-main`)?.focus();
  });
};

A.taskMenu = (el) => {
  const t = DB.get('tasks', el.dataset.id);
  if (!t) return;
  const inBoard = el.dataset.board === '1';
  const items = [
    { label: 'Abrir e editar', icon: 'edit', fn: () => TaskModal.open(t.id) },
    t.status === 'done'
      ? { label: 'Reabrir tarefa', icon: 'undo', fn: () => Actions.toggleTask(t.id) }
      : { label: 'Marcar como concluída', icon: 'check', fn: () => Actions.toggleTask(t.id) },
    { header: 'Mover para' },
    ...Object.entries(TASK_STATUS).filter(([k]) => k !== t.status).map(([k, v]) => ({ label: v, icon: k === 'done' ? 'checkCircle' : k === 'doing' ? 'play' : 'circle', fn: () => {
      const col = DB.all('tasks').filter((x) => x.status === k);
      const max = col.reduce((m, x) => Math.max(m, x.order), 0);
      if (k === 'done') { Actions.toggleTask(t.id); return; }
      DB.patch('tasks', t.id, { status: k, completedAt: null, order: max + 1000 });
      UI.toast(`Movida para “${v}”.`, { tone: 'info' });
    } })),
  ];
  if (inBoard) {
    const col = VIEWS.tarefas.visible().filter((x) => x.status === t.status);
    const i = col.findIndex((x) => x.id === t.id);
    items.push({ header: 'Ordem na coluna' },
      { label: 'Subir', icon: 'arrowUp', disabled: i <= 0, fn: () => Actions.stepOrder('tasks', col, t.id, -1) },
      { label: 'Descer', icon: 'arrowDown', disabled: i >= col.length - 1, fn: () => Actions.stepOrder('tasks', col, t.id, 1) });
  }
  items.push('-', { label: 'Duplicar', icon: 'copy', fn: () => { DB.put('tasks', M.task({ ...structuredClone(t), id: U.uid(), title: t.title + ' (cópia)', status: 'todo', completedAt: null, order: t.order + 1, createdAt: undefined, subtasks: t.subtasks.map((s) => ({ ...s, id: U.uid(), done: false })) })); UI.toast('Tarefa duplicada.'); } },
    { label: 'Excluir', icon: 'trash', danger: true, fn: () => Actions.deleteTask(t.id) });
  UI.menu(el, items);
};

/* Arrastar e soltar (lista e quadro). */
const DnD = {
  task({ dragId, targetId, after }) {
    const seq = VIEWS.tarefas.visible().filter((x) => x.status !== 'done');
    DB.patch('tasks', dragId, { order: Actions.orderBetween(seq, dragId, targetId, after) });
  },
  board({ dragId, targetId, after, col }) {
    const target = targetId ? DB.get('tasks', targetId) : null;
    const status = target ? target.status : col;
    const seq = VIEWS.tarefas.visible().filter((x) => x.status === status);
    const order = target ? Actions.orderBetween(seq, dragId, targetId, after) : (seq.filter((x) => x.id !== dragId).reduce((m, x) => Math.max(m, x.order), 0) + 1000);
    const t = DB.get('tasks', dragId);
    if (status === 'done' && t.status !== 'done') {
      DB.patch('tasks', dragId, { order });
      Actions.toggleTask(dragId);
      return;
    }
    DB.patch('tasks', dragId, { status, order, completedAt: status === 'done' ? (t.completedAt || Date.now()) : null });
    if (t.status !== status) UI.toast(`Movida para “${TASK_STATUS[status]}”.`, { tone: 'info' });
  },
};

/* ---------- Modal de tarefa ---------- */
const TaskModal = {
  open(id, defaults = {}) {
    const existing = id ? DB.get('tasks', id) : null;
    if (id && !existing) { UI.toast('Esta tarefa não existe mais.', { tone: 'warn' }); return; }
    const t = existing ? structuredClone(existing) : M.task({ projectId: defaults.projectId || '', due: defaults.due || '', status: defaults.status || 'todo', title: defaults.title || '' });
    const subtasks = (t.subtasks || []).map((s) => ({ ...s }));
    const deps = new Set(t.dependsOn || []);
    let depQuery = '';
    const dependents = existing ? L.dependents(t.id) : [];
    const notes = existing ? DB.all('notes').filter((n) => n.taskId === t.id) : [];

    const depList = (projectId) => {
      const nq = U.normalize(depQuery);
      const cands = DB.all('tasks').filter((x) => x.id !== t.id && (!nq || U.normalize(x.title).includes(nq)))
        .sort((a, b) => ((b.projectId === projectId) - (a.projectId === projectId)) || ((a.status === 'done') - (b.status === 'done')) || a.order - b.order);
      if (!cands.length) return `<p class="hint" style="padding:8px">${nq ? 'Nenhuma tarefa encontrada.' : 'Não há outras tarefas para vincular.'}</p>`;
      return cands.slice(0, 60).map((x) => {
        const cyc = existing && L.wouldCycle(t.id, x.id);
        const p = L.project(x.projectId);
        return `<label class="check-line ${cyc ? 'is-disabled' : ''}"><input type="checkbox" name="dep" value="${x.id}" ${deps.has(x.id) ? 'checked' : ''} ${cyc && !deps.has(x.id) ? 'disabled' : ''}><span>${U.esc(x.title)}${x.status === 'done' ? ' <span class="badge b-accent">concluída</span>' : ''}</span><span class="faint">${cyc ? 'criaria um ciclo' : p ? U.esc(p.name) : 'Sem projeto'}</span></label>`;
      }).join('');
    };
    const subList = () => subtasks.length ? subtasks.map((s, i) => `
      <div class="row" style="--gap:8px" data-key="st-${s.id}">
        <input type="checkbox" data-sub-done="${i}" ${s.done ? 'checked' : ''} aria-label="Subtarefa concluída">
        <input class="input input-sm grow" data-sub-title="${i}" value="${U.esc(s.title)}" aria-label="Título da subtarefa ${i + 1}" maxlength="120">
        <button type="button" class="btn btn-ghost btn-icon btn-sm" data-sub-up="${i}" aria-label="Mover subtarefa para cima" ${i === 0 ? 'disabled' : ''}>${icon('arrowUp', 'ic-sm')}</button>
        <button type="button" class="btn btn-ghost btn-icon btn-sm" data-sub-del="${i}" aria-label="Remover subtarefa">${icon('x', 'ic-sm')}</button>
      </div>`).join('') : '<p class="hint">Divida a tarefa em passos menores.</p>';

    const blockers = existing ? L.blockers(existing) : [];
    const body = `<form id="task-form" class="stack" style="--gap:16px" novalidate>
      ${existing && blockers.length ? `<div class="banner warn" style="margin:0">${icon('lock')}<span class="grow">Bloqueada: conclua antes ${blockers.map((b) => `“${U.esc(b.title)}”`).join(', ')}.</span></div>` : ''}
      <div class="field"><label class="label" for="tf-title">Título <span class="req" aria-hidden="true">*</span></label><input class="input" id="tf-title" name="title" maxlength="140" required ${existing ? '' : 'autofocus'} value="${U.esc(t.title)}" placeholder="Ex.: Reservar hospedagem"></div>
      <div class="field"><label class="label" for="tf-desc">Descrição</label><textarea class="textarea" id="tf-desc" name="description" rows="3" maxlength="2000" placeholder="Detalhes, links ou contexto">${U.esc(t.description)}</textarea></div>
      <div class="form-grid">
        <div class="field"><label class="label" for="tf-proj">Projeto</label><select class="select" id="tf-proj" name="projectId">${C.projectOptions(t.projectId)}</select></div>
        <div class="field"><label class="label" for="tf-status">Status</label><select class="select" id="tf-status" name="status">${C.opts(Object.entries(TASK_STATUS), t.status)}</select></div>
        <fieldset class="field col-span-2"><legend class="label" style="margin-bottom:6px">Prioridade</legend>
          <div class="seg">${Object.entries(PRIORITIES).map(([k, v]) => `<label><input type="radio" name="priority" value="${k}" ${t.priority === k ? 'checked' : ''}>${icon('flag', 'ic-sm')}${v.label}</label>`).join('')}</div>
        </fieldset>
        <div class="field"><label class="label" for="tf-due">Prazo</label><input class="input" type="date" id="tf-due" name="due" value="${t.due}"><span class="hint" id="tf-due-hint"></span></div>
        <div class="field"><label class="label" for="tf-dur">Duração estimada (minutos)</label><input class="input" type="number" id="tf-dur" name="duration" min="0" max="1440" step="5" inputmode="numeric" value="${t.duration || ''}" placeholder="30"><span class="hint">Usada em “Organizar meu dia”.</span></div>
      </div>
      <fieldset>
        <legend class="fieldset-title" style="width:100%"><span>${icon('link', 'ic-xs')} Depende de <span class="badge" id="dep-count">${deps.size}</span></span></legend>
        <p class="hint" style="margin-bottom:8px">Esta tarefa só fica livre quando as marcadas forem concluídas.</p>
        <label class="input-icon mb-16" style="margin-bottom:8px">${icon('search', 'ic-sm')}<span class="sr-only">Filtrar tarefas</span><input class="input input-sm" id="dep-q" type="search" placeholder="Filtrar tarefas"></label>
        <div class="check-list" id="dep-list">${depList(t.projectId)}</div>
      </fieldset>
      ${dependents.length ? `<div class="small muted">${icon('unlock', 'ic-xs')} Concluir esta tarefa libera: ${dependents.map((d) => `<strong>${U.esc(d.title)}</strong>`).join(', ')}.</div>` : ''}
      <fieldset>
        <legend class="fieldset-title" style="width:100%"><span>${icon('checklist', 'ic-xs')} Subtarefas</span></legend>
        <div class="stack" style="--gap:6px" id="sub-list">${subList()}</div>
        <div class="row mt-8" style="--gap:8px"><label class="sr-only" for="sub-new">Nova subtarefa</label><input class="input input-sm grow" id="sub-new" placeholder="Nova subtarefa e Enter" maxlength="120"><button type="button" class="btn btn-sm" id="sub-add">${icon('plus', 'ic-sm')}Adicionar</button></div>
      </fieldset>
      ${existing ? `<div class="small muted row wrap" style="--gap:14px">
        <span>${icon('note', 'ic-xs')} ${notes.length ? notes.map((n) => `<a href="#/notas/${n.id}" data-modal-close>${U.esc(n.title || 'Nota')}</a>`).join(', ') : 'Nenhuma nota vinculada'}</span>
        <button type="button" class="link-btn" id="task-note">${icon('plus', 'ic-xs')}Nota vinculada</button>
        ${t.completedAt ? `<span>Concluída em ${U.fmtDate(U.iso(new Date(t.completedAt)), true)}</span>` : ''}
      </div>` : ''}
    </form>`;

    UI.modal({
      title: existing ? 'Editar tarefa' : 'Nova tarefa',
      size: 'lg',
      body,
      footer: `${existing ? `<button type="button" class="btn btn-danger" id="task-del">${icon('trash', 'ic-sm')}Excluir</button>` : ''}<span class="spacer"></span><button type="button" class="btn btn-ghost" data-modal-close>Cancelar</button><button type="submit" form="task-form" class="btn btn-primary">${existing ? 'Salvar alterações' : 'Criar tarefa'}</button>`,
      onMount(el, m) {
        const form = el.querySelector('#task-form');
        const depEl = el.querySelector('#dep-list');
        const subEl = el.querySelector('#sub-list');
        const syncSubs = () => subEl.querySelectorAll('[data-sub-title]').forEach((inp) => { subtasks[+inp.dataset.subTitle].title = inp.value; });
        const dueHint = () => {
          const p = L.project(form.projectId.value);
          const h = el.querySelector('#tf-due-hint');
          h.textContent = p && p.due && form.due.value && form.due.value > p.due ? `Atenção: depois do prazo do projeto (${U.fmtDate(p.due)}).` : '';
          h.className = 'hint' + (h.textContent ? ' t-warn' : '');
        };
        dueHint();
        form.due.addEventListener('change', dueHint);
        form.projectId.addEventListener('change', () => { depEl.innerHTML = depList(form.projectId.value); dueHint(); });
        el.querySelector('#dep-q').addEventListener('input', (e) => { depQuery = e.target.value; depEl.innerHTML = depList(form.projectId.value); });
        depEl.addEventListener('change', (e) => {
          if (e.target.name !== 'dep') return;
          if (e.target.checked) deps.add(e.target.value); else deps.delete(e.target.value);
          el.querySelector('#dep-count').textContent = deps.size;
        });
        const addSub = () => {
          const inp = el.querySelector('#sub-new');
          const v = inp.value.trim();
          if (!v) { inp.focus(); return; }
          syncSubs();
          subtasks.push({ id: U.uid(), title: v, done: false });
          subEl.innerHTML = subList();
          inp.value = '';
          inp.focus();
        };
        el.querySelector('#sub-add').addEventListener('click', addSub);
        el.querySelector('#sub-new').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addSub(); } });
        subEl.addEventListener('click', (e) => {
          const del = e.target.closest('[data-sub-del]');
          const up = e.target.closest('[data-sub-up]');
          if (!del && !up) return;
          syncSubs();
          if (del) subtasks.splice(+del.dataset.subDel, 1);
          if (up) { const i = +up.dataset.subUp; [subtasks[i - 1], subtasks[i]] = [subtasks[i], subtasks[i - 1]]; }
          subEl.innerHTML = subList();
        });
        subEl.addEventListener('change', (e) => { const i = e.target.dataset.subDone; if (i !== undefined) subtasks[+i].done = e.target.checked; });
        el.querySelector('#task-del')?.addEventListener('click', async () => {
          const ok = await UI.confirm({ title: 'Excluir tarefa?', message: `“${U.esc(t.title)}” será excluída e removida das dependências de outras tarefas. Você poderá desfazer em seguida.`, confirmLabel: 'Excluir', danger: true });
          if (!ok) return;
          m.close();
          Actions.deleteTask(t.id);
        });
        el.querySelector('#task-note')?.addEventListener('click', () => { m.close(); NoteActions.create({ projectId: t.projectId, taskId: t.id, title: `Notas: ${t.title}` }); });
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const ok = UI.validate(form, {
            title: (v) => (!v ? 'Informe o título da tarefa.' : ''),
            due: (v) => (v && !U.parse(v) ? 'Informe uma data válida.' : ''),
            duration: (v) => (v && (isNaN(+v) || +v < 0 || +v > 1440) ? 'Use um valor entre 0 e 1440 minutos.' : ''),
          });
          if (!ok) return;
          syncSubs();
          const status = form.status.value;
          const data = {
            ...t,
            title: form.title.value.trim(),
            description: form.description.value.trim(),
            projectId: form.projectId.value,
            status,
            priority: form.priority.value,
            due: form.due.value,
            duration: form.duration.value ? Math.round(+form.duration.value) : 0,
            dependsOn: Array.from(deps).filter((d) => DB.get('tasks', d) && !(existing && L.wouldCycle(t.id, d) && !(existing.dependsOn || []).includes(d))),
            subtasks: subtasks.filter((s) => s.title.trim()).map((s) => ({ ...s, title: s.title.trim() })),
            completedAt: status === 'done' ? (t.completedAt || Date.now()) : null,
          };
          if (!existing) data.order = DB.all('tasks').reduce((mx, x) => Math.max(mx, x.order), 0) + 1000;
          DB.put('tasks', data);
          m.close();
          UI.toast(existing ? 'Alterações salvas.' : 'Tarefa criada.');
        });
      },
    });
  },
};
