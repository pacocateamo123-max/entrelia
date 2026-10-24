'use strict';

/* Ações globais disparadas por data-act / data-change / data-input / data-submit. */
const A = {};
/* Telas registradas: VIEWS[rota] = { title, render(param), after?(param) } */
const VIEWS = {};

/* Estado de interface persistido (filtros, modos de visualização). */
const UIS = {
  get(view, key, def) {
    const ui = DB.getMeta().ui || {};
    const v = ui[view] ? ui[view][key] : undefined;
    return v === undefined ? def : v;
  },
  set(view, key, value) {
    const ui = { ...(DB.getMeta().ui || {}) };
    ui[view] = { ...(ui[view] || {}), [key]: value };
    DB.setMeta({ ui });
  },
  patch(view, obj) {
    const ui = { ...(DB.getMeta().ui || {}) };
    ui[view] = { ...(ui[view] || {}), ...obj };
    DB.setMeta({ ui });
  },
};

const C = {
  badge(text, tone = 'muted', ic) {
    return `<span class="badge b-${tone}">${ic ? icon(ic) : ''}<span>${text}</span></span>`;
  },
  progress(pct, { tone = '', thick = false, label = 'Progresso' } = {}) {
    const p = U.clamp(Math.round(pct), 0, 100);
    return `<div class="progress ${tone} ${thick ? 'thick' : ''}" role="progressbar" aria-valuenow="${p}" aria-valuemin="0" aria-valuemax="100" aria-label="${U.esc(label)}"><span style="--w:${p}%"></span></div>`;
  },
  empty({ ic = 'sparkles', title, text = '', actions = '' }, compact) {
    return `<div class="empty ${compact ? 'compact' : ''}"><div class="empty-ic">${icon(ic, compact ? '' : 'ic-lg')}</div><h3>${title}</h3>${text ? `<p>${text}</p>` : ''}${actions ? `<div class="actions">${actions}</div>` : ''}</div>`;
  },
  projectChip(pid) {
    const p = pid && DB.get('projects', pid);
    if (!p) return '';
    return `<span class="chip-project"><span class="dot" style="--c:${p.color}"></span><span>${U.esc(p.name)}</span></span>`;
  },
  due(t) {
    const d = U.dueInfo(t.due, t.status === 'done');
    return d ? C.badge(d.label, d.tone, d.icon) : '';
  },
  prio(p) {
    const P = PRIORITIES[p] || PRIORITIES.media;
    return C.badge(P.label, P.tone, 'flag');
  },
  projectStatus(p) {
    if (p.archived) return C.badge('Arquivado', 'muted', 'archive');
    const s = PROJECT_STATUS[p.status] || PROJECT_STATUS.ativo;
    return C.badge(s.label, s.tone);
  },
  opts(pairs, value) {
    return pairs.map(([v, l]) => `<option value="${U.esc(v)}" ${String(v) === String(value) ? 'selected' : ''}>${U.esc(l)}</option>`).join('');
  },
  projectOptions(value, { empty = 'Sem projeto', includeArchived = false } = {}) {
    const ps = DB.all('projects').filter((p) => includeArchived || !p.archived || p.id === value).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    return C.opts([['', empty], ...ps.map((p) => [p.id, p.name + (p.archived ? ' (arquivado)' : '')])], value);
  },
  seg(items, value, act, extra = '') {
    return `<div class="seg" role="group" ${extra}>${items.map(([v, label, ic]) => `<button type="button" aria-pressed="${v === value}" data-act="${act}" data-value="${v}">${ic ? icon(ic, 'ic-sm') : ''}${label}</button>`).join('')}</div>`;
  },
  stat({ label, value, foot = '', ic = 'sparkles', tone = '' }) {
    return `<div class="card stat"><div class="stat-label"><span class="stat-icon ${tone ? 'tone-' + tone : ''}">${icon(ic, 'ic-sm')}</span>${label}</div><div class="stat-value">${value}</div>${foot ? `<div class="stat-foot">${foot}</div>` : ''}</div>`;
  },

  /* Linha de tarefa reutilizada em várias telas. */
  taskRow(t, o = {}) {
    const done = t.status === 'done';
    const overdue = L.isOverdue(t);
    const blockers = L.blockers(t);
    const blocked = !done && blockers.length > 0;
    const subDone = (t.subtasks || []).filter((s) => s.done).length;
    const meta = [
      blocked ? `<span class="badge b-warn" title="Depende de: ${U.esc(blockers.map((b) => b.title).join(', '))}">${icon('lock')}<span>Aguarda: ${U.esc(blockers[0].title)}${blockers.length > 1 ? ` +${blockers.length - 1}` : ''}</span></span>` : '',
      !done && t.status === 'doing' ? C.badge('Em andamento', 'brand', 'play') : '',
      C.due(t),
      !done && t.priority === 'alta' ? C.prio('alta') : '',
      o.showProject !== false ? C.projectChip(t.projectId) : '',
      t.duration ? `<span class="meta-i">${icon('clock', 'ic-xs')}${U.fmtDuration(t.duration)}</span>` : '',
      (t.subtasks || []).length ? `<span class="meta-i">${icon('checklist', 'ic-xs')}${subDone}/${t.subtasks.length}</span>` : '',
    ].filter(Boolean).join('');
    const drag = o.drag ? `draggable="true" data-drag="${o.drag}:${t.id}" data-drop="${o.drag}:${t.id}"` : '';
    return `<div class="task-row ${o.flat ? 'flat' : ''} ${done ? 'is-done' : ''} ${overdue ? 'is-overdue' : ''} ${blocked ? 'is-blocked' : ''} anim-in" data-key="t-${t.id}" ${drag}>
      ${o.drag ? `<span class="drag-handle" aria-hidden="true" title="Arraste para reordenar">${icon('grip', 'ic-sm')}</span>` : ''}
      <button type="button" class="check ${done ? 'is-done' : ''}" data-act="toggleTask" data-id="${t.id}" aria-pressed="${done}" aria-label="${done ? 'Reabrir' : 'Concluir'} tarefa: ${U.esc(t.title)}">${icon('check')}</button>
      <button type="button" class="task-main" data-act="openTask" data-id="${t.id}" aria-label="Abrir tarefa: ${U.esc(t.title)}">
        <span class="task-title">${U.esc(t.title)}</span>
        <span class="task-meta">${meta}</span>
      </button>
      ${o.tools ? `<div class="task-tools">${o.tools}</div>` : ''}
    </div>`;
  },

  menuBtn(act, id, label = 'Mais ações', extra = '') {
    return `<button type="button" class="btn btn-ghost btn-icon btn-sm menu-btn" data-act="${act}" data-id="${id}" aria-label="${U.esc(label)}" aria-haspopup="menu" aria-expanded="false" ${extra}>${icon('more')}</button>`;
  },
};

/* Ações globais de tarefa (usadas em qualquer tela). */
A.toggleTask = (el) => Actions.toggleTask(el.dataset.id);
A.openTask = (el) => TaskModal.open(el.dataset.id);
A.newTask = (el) => TaskModal.open(null, { projectId: el?.dataset?.project || '', status: el?.dataset?.status || 'todo', due: el?.dataset?.due || '' });
A.newTaskInProject = (el) => TaskModal.open(null, { projectId: el.dataset.project });
A.go = (el) => { App.go(el.dataset.href); };
