'use strict';

/* Salvamento automático das notas (com indicador visível). */
const NoteSave = {
  pending: new Map(), // id -> {changes}
  timer: null,
  queue(id, changes) {
    const cur = this.pending.get(id) || {};
    this.pending.set(id, { ...cur, ...changes });
    this.indicator('Salvando…', true);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), 600);
  },
  flush() {
    clearTimeout(this.timer);
    if (!this.pending.size) return;
    const items = Array.from(this.pending.entries());
    this.pending.clear();
    items.forEach(([id, ch]) => { if (DB.get('notes', id)) DB.patch('notes', id, ch); });
  },
  indicator(text, busy) {
    const el = document.querySelector('.note-save-ind');
    if (!el) return;
    el.classList.toggle('is-saving', !!busy);
    const t = el.querySelector('.save-text-n');
    if (t) t.textContent = text;
  },
  label(n) {
    if (this.pending.size || DB.saving) return { text: 'Salvando…', busy: true };
    if (DB.lastError) return { text: 'Erro ao salvar', busy: false, err: true };
    const d = new Date(n.updatedAt || Date.now());
    return { text: `Salvo automaticamente às ${U.pad(d.getHours())}:${U.pad(d.getMinutes())}`, busy: false };
  },
};

const NoteActions = {
  create(defaults = {}) {
    const n = M.note({ title: defaults.title || '', projectId: defaults.projectId || '', taskId: defaults.taskId || '', tags: defaults.tags || [] });
    DB.put('notes', n, { silent: true });
    UIS.set('notes', 'preview', false);
    App.go('#/notas/' + n.id);
    setTimeout(() => { const t = document.getElementById('note-title'); if (t) { t.focus(); t.select(); } }, 60);
    return n;
  },
  render(body, id) {
    const lines = String(body || '').split('\n');
    let html = '';
    let list = false;
    const close = () => { if (list) { html += '</ul>'; list = false; } };
    lines.forEach((line, i) => {
      const todo = line.match(/^\s*\[( |x|X)\]\s?(.*)$/);
      const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
      const head = line.match(/^#{1,3}\s+(.*)$/);
      if (todo) {
        close();
        const done = todo[1].toLowerCase() === 'x';
        html += `<label class="todo ${done ? 'is-done' : ''}"><input type="checkbox" ${done ? 'checked' : ''} data-change="noteTodo" data-id="${id}" data-line="${i}"><span>${U.esc(todo[2])}</span></label>`;
      } else if (bullet) {
        if (!list) { html += '<ul>'; list = true; }
        html += `<li>${U.esc(bullet[1])}</li>`;
      } else if (head) { close(); html += `<h3>${U.esc(head[1])}</h3>`; }
      else if (!line.trim()) { close(); }
      else { close(); html += `<p>${U.esc(line)}</p>`; }
    });
    close();
    return html || '<p class="faint">Nota vazia. Volte ao modo de edição para escrever.</p>';
  },
};

VIEWS.notas = {
  title: 'Notas',
  render(param) {
    const q = UIS.get('notes', 'q', '');
    const tag = UIS.get('notes', 'tag', '');
    const all = DB.all('notes');
    const nq = U.normalize(q);
    const tags = Array.from(new Set(all.flatMap((n) => n.tags || []))).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const list = all.filter((n) => (!tag || (n.tags || []).includes(tag)) && (!nq || U.normalize(`${n.title} ${n.body} ${(n.tags || []).join(' ')}`).includes(nq)))
      .sort((a, b) => (b.pinned - a.pinned) || (b.updatedAt || 0) - (a.updatedAt || 0));
    const current = param ? DB.get('notes', param) : null;

    const listHtml = `
      <div class="notes-list">
        <div class="row" style="--gap:8px">
          <label class="input-icon grow">${icon('search', 'ic-sm')}<span class="sr-only">Buscar notas</span><input id="notes-q" class="input" type="search" placeholder="Buscar notas" value="${U.esc(q)}" data-input="notesFilter" data-key="q"></label>
          <button type="button" class="btn btn-primary btn-icon" data-act="newNote" aria-label="Nova nota">${icon('plus')}</button>
        </div>
        ${tags.length ? `<div class="tag-filter" role="group" aria-label="Filtrar por etiqueta"><button type="button" aria-pressed="${!tag}" data-act="notesTag" data-value="">Todas</button>${tags.map((t) => `<button type="button" aria-pressed="${tag === t}" data-act="notesTag" data-value="${U.esc(t)}">#${U.esc(t)}</button>`).join('')}</div>` : ''}
        <div class="notes-scroll" role="list">
          ${list.length ? list.map((n) => `
            <a class="note-item ${current && current.id === n.id ? 'is-active' : ''}" role="listitem" href="#/notas/${n.id}" data-key="nl-${n.id}" ${current && current.id === n.id ? 'aria-current="true"' : ''}>
              <span class="row between" style="--gap:6px"><span class="mini-title">${n.pinned ? icon('pin', 'ic-xs') + ' ' : ''}${U.esc(n.title || 'Nota sem título')}</span><span class="xs faint" style="white-space:nowrap">${U.relDay(U.iso(new Date(n.updatedAt || Date.now())))}</span></span>
              <span class="note-excerpt clamp-2">${U.esc(n.body.replace(/\[( |x)\]/gi, '').replace(/\n+/g, ' · ').slice(0, 140)) || '<span class="faint">Sem conteúdo</span>'}</span>
              ${(n.tags || []).length || n.projectId ? `<span class="row wrap xs" style="--gap:6px">${(n.tags || []).map((t) => `<span class="tag">#${U.esc(t)}</span>`).join('')}${C.projectChip(n.projectId)}</span>` : ''}
            </a>`).join('') : (all.length ? '<p class="muted small" style="padding:12px">Nenhuma nota encontrada.</p>' : '')}
        </div>
      </div>`;

    if (!all.length) {
      return `<div class="page-head"><div><h1 class="page-title">Notas</h1><p class="page-sub">Ideias, resumos e checklists vinculados a projetos e tarefas.</p></div></div>
        ${C.empty({ ic: 'note', title: 'Sua primeira nota começa aqui', text: 'Escreva com listas e checklists, use etiquetas e vincule a projetos. Tudo é salvo automaticamente.', actions: `<button type="button" class="btn btn-primary" data-act="newNote">${icon('plus', 'ic-sm')}Criar nota</button>` })}`;
    }

    return `
      <div class="page-head hide-when-open">
        <div><h1 class="page-title">Notas</h1><p class="page-sub">Ideias, resumos e checklists vinculados a projetos e tarefas.</p></div>
      </div>
      <div class="notes-layout ${current ? 'has-open' : ''}">
        ${listHtml}
        <div class="note-editor-wrap">${current ? this.editor(current) : param ? C.empty({ ic: 'note', title: 'Nota não encontrada', text: 'Ela pode ter sido excluída.' }) : C.empty({ ic: 'note', title: 'Selecione uma nota', text: 'Ou crie uma nova para começar a escrever.', actions: `<button type="button" class="btn btn-primary" data-act="newNote">${icon('plus', 'ic-sm')}Nova nota</button>` })}</div>
      </div>`;
  },

  editor(n) {
    const preview = UIS.get('notes', 'preview', false);
    const s = NoteSave.label(n);
    const tasks = DB.all('tasks').filter((t) => !n.projectId || t.projectId === n.projectId).sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
    return `<section class="card note-editor" data-key="ne-${n.id}" aria-label="Editor de nota">
      <div class="row wrap between" style="--gap:8px">
        <div class="row" style="--gap:8px">
          <a class="btn btn-ghost btn-sm only-mobile" href="#/notas">${icon('arrowLeft', 'ic-sm')}Notas</a>
          <span class="save-ind note-save-ind ${s.busy ? 'is-saving' : ''} ${s.err ? 'is-error' : ''}" role="status">${icon(s.busy ? 'refresh' : s.err ? 'alert' : 'checkCircle', 'ic-sm')}<span class="save-text-n">${s.text}</span></span>
        </div>
        <div class="row" style="--gap:4px">
          <button type="button" class="btn btn-ghost btn-sm ${n.pinned ? 'is-on' : ''}" data-act="notePin" data-id="${n.id}" aria-pressed="${!!n.pinned}">${icon('pin', 'ic-sm')}<span class="hide-m">${n.pinned ? 'Fixada' : 'Fixar'}</span></button>
          <button type="button" class="btn btn-ghost btn-sm" data-act="noteDelete" data-id="${n.id}" aria-label="Excluir nota">${icon('trash', 'ic-sm')}</button>
        </div>
      </div>
      <label class="sr-only" for="note-title">Título da nota</label>
      <input class="input note-title-input" id="note-title" value="${U.esc(n.title)}" placeholder="Título da nota" maxlength="120" data-input="noteField" data-field="title" data-id="${n.id}">
      <div class="note-toolbar" role="toolbar" aria-label="Formatação">
        ${C.seg([['edit', 'Editar', 'edit'], ['preview', 'Visualizar', 'eye']], preview ? 'preview' : 'edit', 'notePreview')}
        ${preview ? '' : `
          <button type="button" class="btn btn-ghost btn-sm" data-act="noteInsert" data-prefix="# " title="Título de seção">${icon('heading', 'ic-sm')}<span class="hide-m">Título</span></button>
          <button type="button" class="btn btn-ghost btn-sm" data-act="noteInsert" data-prefix="- " title="Lista com marcadores">${icon('list', 'ic-sm')}<span class="hide-m">Lista</span></button>
          <button type="button" class="btn btn-ghost btn-sm" data-act="noteInsert" data-prefix="[ ] " title="Checklist">${icon('checklist', 'ic-sm')}<span class="hide-m">Checklist</span></button>`}
      </div>
      ${preview
        ? `<div class="note-preview" aria-label="Visualização">${NoteActions.render(n.body, n.id)}</div>`
        : `<label class="sr-only" for="note-body">Texto da nota</label><textarea class="textarea note-body" id="note-body" data-input="noteField" data-field="body" data-id="${n.id}" placeholder="Escreva aqui. Use “- ” para listas e “[ ] ” para checklists.">${U.esc(n.body)}</textarea>`}
      <div class="field">
        <span class="label" id="tags-label">Etiquetas</span>
        <div class="tags-input" role="group" aria-labelledby="tags-label">
          ${(n.tags || []).map((t) => `<span class="tag" data-key="tg-${U.esc(t)}">#${U.esc(t)}<button type="button" data-act="noteTagDel" data-id="${n.id}" data-tag="${U.esc(t)}" aria-label="Remover etiqueta ${U.esc(t)}">${icon('x', 'ic-xs')}</button></span>`).join('')}
          <input id="tag-input" placeholder="${(n.tags || []).length ? 'Adicionar' : 'Digite e pressione Enter'}" maxlength="24" data-keydown="noteTagKey" data-id="${n.id}" aria-label="Nova etiqueta">
        </div>
      </div>
      <div class="form-grid">
        <div class="field"><label class="label" for="note-proj">Projeto</label><select class="select" id="note-proj" data-change="noteLink" data-field="projectId" data-id="${n.id}">${C.projectOptions(n.projectId)}</select></div>
        <div class="field"><label class="label" for="note-task">Tarefa</label><select class="select" id="note-task" data-change="noteLink" data-field="taskId" data-id="${n.id}">${C.opts([['', 'Sem tarefa'], ...tasks.map((t) => [t.id, t.title])], n.taskId)}</select></div>
      </div>
      <div class="xs faint">Criada em ${U.fmtDate(U.iso(new Date(n.createdAt || Date.now())), true)}${n.taskId && DB.get('tasks', n.taskId) ? ` · <button type="button" class="link-btn" data-act="openTask" data-id="${n.taskId}">Abrir tarefa vinculada</button>` : ''}${n.projectId && L.project(n.projectId) ? ` · <a href="#/projetos/${n.projectId}">Abrir projeto</a>` : ''}</div>
    </section>`;
  },
};

A.newNote = (el) => NoteActions.create({ projectId: el?.dataset?.project || '' });
A.notesFilter = (el) => UIS.set('notes', el.dataset.key, el.value);
A.notesTag = (el) => UIS.set('notes', 'tag', el.dataset.value);
A.notePreview = (el) => { NoteSave.flush(); UIS.set('notes', 'preview', el.dataset.value === 'preview'); };
A.noteField = (el) => NoteSave.queue(el.dataset.id, { [el.dataset.field]: el.value });
A.notePin = (el) => { const n = DB.get('notes', el.dataset.id); DB.patch('notes', n.id, { pinned: !n.pinned }); };
A.noteDelete = (el) => {
  NoteSave.flush();
  App.go('#/notas');
  Actions.deleteSimple('notes', el.dataset.id, 'Nota excluída');
};
A.noteLink = (el) => {
  NoteSave.flush();
  const ch = { [el.dataset.field]: el.value };
  if (el.dataset.field === 'projectId') {
    const n = DB.get('notes', el.dataset.id);
    const t = n.taskId && DB.get('tasks', n.taskId);
    if (t && el.value && t.projectId !== el.value) ch.taskId = '';
  }
  DB.patch('notes', el.dataset.id, ch);
};
A.noteInsert = (el) => {
  const ta = document.getElementById('note-body');
  if (!ta) return;
  const prefix = el.dataset.prefix;
  const pos = ta.selectionStart;
  const start = ta.value.lastIndexOf('\n', pos - 1) + 1;
  const line = ta.value.slice(start, ta.value.indexOf('\n', start) === -1 ? undefined : ta.value.indexOf('\n', start));
  let next;
  if (line.trim()) next = ta.value.slice(0, pos) + '\n' + prefix + ta.value.slice(pos);
  else next = ta.value.slice(0, start) + prefix + ta.value.slice(start);
  const caret = line.trim() ? pos + 1 + prefix.length : start + prefix.length;
  ta.value = next;
  ta.focus();
  ta.setSelectionRange(caret, caret);
  A.noteField(ta);
};
A.noteTodo = (el) => {
  const n = DB.get('notes', el.dataset.id);
  const lines = n.body.split('\n');
  const i = +el.dataset.line;
  lines[i] = lines[i].replace(/^(\s*)\[( |x|X)\]/, (_, sp, v) => `${sp}[${v.trim() ? ' ' : 'x'}]`);
  DB.patch('notes', n.id, { body: lines.join('\n') });
};
A.noteTagKey = (el, e) => {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    const v = el.value.trim().replace(/^#/, '').replace(/,/g, '').toLowerCase().slice(0, 24);
    if (!v) return;
    const n = DB.get('notes', el.dataset.id);
    if ((n.tags || []).includes(v)) { UI.toast('Esta etiqueta já está na nota.', { tone: 'info' }); el.value = ''; return; }
    el.value = '';
    DB.patch('notes', n.id, { tags: [...(n.tags || []), v] });
  } else if (e.key === 'Backspace' && !el.value) {
    const n = DB.get('notes', el.dataset.id);
    if ((n.tags || []).length) DB.patch('notes', n.id, { tags: n.tags.slice(0, -1) });
  }
};
A.noteTagDel = (el) => {
  const n = DB.get('notes', el.dataset.id);
  DB.patch('notes', n.id, { tags: (n.tags || []).filter((t) => t !== el.dataset.tag) });
  document.getElementById('tag-input')?.focus();
};
