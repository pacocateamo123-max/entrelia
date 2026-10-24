'use strict';

VIEWS.projetos = {
  title: 'Projetos',
  render(param) {
    if (param) return this.detail(param);
    const q = UIS.get('projects', 'q', '');
    const vis = UIS.get('projects', 'vis', 'ativos');
    const status = UIS.get('projects', 'status', '');
    const mode = UIS.get('projects', 'mode', 'grid');
    const sort = UIS.get('projects', 'sort', 'due');
    const all = DB.all('projects');
    const nq = U.normalize(q);
    let list = all.filter((p) => (vis === 'todos' || (vis === 'arquivados' ? p.archived : !p.archived))
      && (!status || p.status === status)
      && (!nq || U.normalize(p.name + ' ' + p.description).includes(nq)));
    const sorters = {
      due: (a, b) => (a.due || '9999').localeCompare(b.due || '9999'),
      name: (a, b) => a.name.localeCompare(b.name, 'pt-BR'),
      progress: (a, b) => L.progress(b.id).pct - L.progress(a.id).pct,
      recent: (a, b) => (b.createdAt || 0) - (a.createdAt || 0),
    };
    list = list.sort(sorters[sort] || sorters.due);
    const archivedCount = all.filter((p) => p.archived).length;

    let body;
    if (!all.length) {
      body = C.empty({
        ic: 'folder', title: 'Seu primeiro projeto começa aqui.',
        text: 'Reúna tarefas, listas, notas e custos de um objetivo em um só lugar.',
        actions: `<button type="button" class="btn btn-primary" data-act="newProject">${icon('plus', 'ic-sm')}Criar projeto</button><button type="button" class="btn" data-act="newFromTemplate">${icon('layers', 'ic-sm')}Usar um modelo</button>`,
      });
    } else if (!list.length) {
      body = C.empty({ ic: 'search', title: 'Nenhum projeto encontrado', text: 'Ajuste a busca ou os filtros para ver outros projetos.', actions: `<button type="button" class="btn" data-act="clearProjectFilters">Limpar filtros</button>` }, true);
    } else if (mode === 'list') {
      body = `<div class="card pad-0 proj-rows" role="table" aria-label="Projetos">
        <div class="proj-row head" role="row"><span role="columnheader">Projeto</span><span role="columnheader">Progresso</span><span role="columnheader">Prazo</span><span role="columnheader">Orçamento</span><span role="columnheader"><span class="sr-only">Ações</span></span></div>
        ${list.map((p) => this.row(p)).join('')}
      </div>`;
    } else {
      body = `<div class="grid g-auto">${list.map((p) => this.card(p)).join('')}</div>`;
    }

    return `
      <div class="page-head">
        <div><h1 class="page-title">Projetos</h1><p class="page-sub">Cada projeto conecta tarefas, listas, notas, custos e decisões.</p></div>
        <div class="actions">
          <button type="button" class="btn" data-act="newFromTemplate">${icon('layers', 'ic-sm')}Usar modelo</button>
          <button type="button" class="btn btn-primary" data-act="newProject">${icon('plus', 'ic-sm')}Novo projeto</button>
        </div>
      </div>
      ${all.length ? `<div class="toolbar" role="search">
        <label class="input-icon">${icon('search', 'ic-sm')}<span class="sr-only">Buscar projetos</span><input id="proj-q" class="input" type="search" placeholder="Buscar projetos" value="${U.esc(q)}" data-input="projFilter" data-key="q"></label>
        ${C.seg([['ativos', 'Ativos'], ['arquivados', `Arquivados${archivedCount ? ` (${archivedCount})` : ''}`], ['todos', 'Todos']], vis, 'projVis', 'aria-label="Mostrar projetos"')}
        <label class="sr-only" for="proj-status">Status</label>
        <select id="proj-status" class="select" data-change="projFilter" data-key="status">${C.opts([['', 'Todos os status'], ...Object.entries(PROJECT_STATUS).map(([k, v]) => [k, v.label])], status)}</select>
        <label class="sr-only" for="proj-sort">Ordenar por</label>
        <select id="proj-sort" class="select" data-change="projFilter" data-key="sort">${C.opts([['due', 'Ordenar: prazo'], ['name', 'Ordenar: nome'], ['progress', 'Ordenar: progresso'], ['recent', 'Ordenar: mais recentes']], sort)}</select>
        ${C.seg([['grid', 'Cartões', 'grid'], ['list', 'Lista', 'rows']], mode, 'projMode', 'aria-label="Modo de visualização"')}
      </div>` : ''}
      ${body}`;
  },

  budgetLine(p) {
    const s = L.spent(p.id);
    if (!p.budget && !s.committed) return '<span class="faint">Sem orçamento</span>';
    if (!p.budget) return `${U.fmtMoney(s.committed)} <span class="faint">sem orçamento</span>`;
    const over = s.committed > p.budget;
    return `<span class="${over ? 't-danger' : ''}">${U.fmtMoney(s.committed)}</span> <span class="faint">de ${U.fmtMoney(p.budget)}</span>`;
  },

  card(p) {
    const pr = L.progress(p.id);
    const nLists = DB.all('lists').filter((l) => l.projectId === p.id).length;
    const nNotes = DB.all('notes').filter((n) => n.projectId === p.id).length;
    const blocked = L.tasksOf(p.id).filter((t) => L.isBlocked(t)).length;
    const overdue = L.tasksOf(p.id).filter((t) => L.isOverdue(t)).length;
    return `<article class="card interactive proj-card anim-in" style="--c:${p.color}" data-key="pc-${p.id}">
      <div class="row between" style="align-items:flex-start">
        <div class="stack" style="--gap:6px;min-width:0">
          <a class="proj-name" href="#/projetos/${p.id}">${U.esc(p.name)}</a>
          <div class="row wrap" style="--gap:6px">${C.projectStatus(p)}${p.due ? C.badge(U.dueInfo(p.due, p.status === 'concluido').label.replace('Atrasada', 'Prazo vencido'), U.dueInfo(p.due, p.status === 'concluido').tone, 'calendar') : ''}</div>
        </div>
        ${C.menuBtn('projMenu', p.id, `Ações do projeto ${p.name}`)}
      </div>
      ${p.description ? `<p class="muted small clamp-2">${U.esc(p.description)}</p>` : ''}
      <div>
        <div class="row between xs"><span class="strong">${pr.pct}% concluído</span><span class="muted">${pr.total ? `${pr.done} de ${pr.total} · faltam ${pr.remaining}` : 'Sem tarefas'}</span></div>
        <div class="mt-8">${C.progress(pr.pct, { label: `Progresso de ${p.name}` })}</div>
      </div>
      <div class="proj-counts">
        <span class="meta-i">${icon('wallet', 'ic-xs')}${this.budgetLine(p)}</span>
      </div>
      <div class="proj-counts">
        <span class="meta-i">${icon('tasks', 'ic-xs')}${U.count(pr.total, 'tarefa', 'tarefas')}</span>
        <span class="meta-i">${icon('list', 'ic-xs')}${U.count(nLists, 'lista', 'listas')}</span>
        <span class="meta-i">${icon('note', 'ic-xs')}${U.count(nNotes, 'nota', 'notas')}</span>
        ${overdue ? `<span class="meta-i t-danger">${icon('alert', 'ic-xs')}${overdue} atrasada${overdue > 1 ? 's' : ''}</span>` : ''}
        ${blocked ? `<span class="meta-i t-warn">${icon('lock', 'ic-xs')}${blocked} bloqueada${blocked > 1 ? 's' : ''}</span>` : ''}
      </div>
    </article>`;
  },

  row(p) {
    const pr = L.progress(p.id);
    return `<div class="proj-row" role="row" data-key="pr-${p.id}">
      <div role="cell" class="row" style="min-width:0"><span class="dot" style="--c:${p.color}"></span><div style="min-width:0"><a class="strong" style="color:var(--text)" href="#/projetos/${p.id}">${U.esc(p.name)}</a><div class="xs muted ellipsis">${PROJECT_STATUS[p.status]?.label || ''}${p.archived ? ' · Arquivado' : ''}${p.description ? ' · ' + U.esc(p.description) : ''}</div></div></div>
      <div role="cell" class="pr-progress"><div class="row xs" style="--gap:8px"><span class="strong num">${pr.pct}%</span><span class="muted">${pr.done}/${pr.total} · faltam ${pr.remaining}</span></div><div class="mt-8">${C.progress(pr.pct, { label: `Progresso de ${p.name}` })}</div></div>
      <div role="cell" class="pr-due small">${p.due ? U.fmtDate(p.due) : '<span class="faint">Sem prazo</span>'}</div>
      <div role="cell" class="pr-budget small">${this.budgetLine(p)}</div>
      <div role="cell" class="pr-menu">${C.menuBtn('projMenu', p.id, `Ações do projeto ${p.name}`)}</div>
    </div>`;
  },

  detail(id) {
    const p = DB.get('projects', id);
    if (!p) {
      return `<a class="back-link" href="#/projetos">${icon('arrowLeft', 'ic-sm')}Projetos</a>${C.empty({ ic: 'folder', title: 'Projeto não encontrado', text: 'Ele pode ter sido excluído.', actions: '<a class="btn" href="#/projetos">Ver projetos</a>' })}`;
    }
    const pr = L.progress(id);
    const s = L.spent(id);
    const tasks = L.sortTasks(L.tasksOf(id));
    const openT = tasks.filter((t) => t.status !== 'done');
    const doneT = tasks.filter((t) => t.status === 'done');
    const blocked = openT.filter((t) => L.isBlocked(t));
    const lists = DB.all('lists').filter((l) => l.projectId === id).sort((a, b) => a.order - b.order);
    const notes = DB.all('notes').filter((n) => n.projectId === id).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    const expenses = DB.all('expenses').filter((x) => x.projectId === id).sort((a, b) => b.date.localeCompare(a.date));
    const cmps = DB.all('comparisons').filter((c) => c.projectId === id);
    const events = DB.all('events').filter((e) => e.projectId === id && e.date >= U.today()).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
    const ns = L.nextStep(id);
    const missing = L.missingInfo(p);
    const balance = p.budget - s.committed;
    const budgetPct = p.budget ? (s.committed / p.budget) * 100 : 0;

    return `
      <a class="back-link" href="#/projetos">${icon('arrowLeft', 'ic-sm')}Projetos</a>
      <div class="page-head">
        <div class="proj-head" style="--c:${p.color}">
          <span class="proj-swatch">${icon('folder')}</span>
          <div style="min-width:0">
            <h1 class="page-title">${U.esc(p.name)}</h1>
            <div class="row wrap mt-8" style="--gap:8px">
              ${C.projectStatus(p)}
              ${p.start || p.due ? C.badge(`${p.start ? U.fmtDate(p.start) : 'Sem início'} → ${p.due ? U.fmtDate(p.due) : 'sem prazo'}`, 'muted', 'calendar') : ''}
              ${p.due && p.status !== 'concluido' ? C.badge(U.dueInfo(p.due).label.replace('Atrasada', 'Prazo vencido').replace('Vence', 'Termina'), U.dueInfo(p.due).tone, 'clock') : ''}
            </div>
            ${p.description ? `<p class="page-sub" style="max-width:70ch">${U.esc(p.description)}</p>` : ''}
          </div>
        </div>
        <div class="actions">
          <button type="button" class="btn" data-act="editProject" data-id="${id}">${icon('edit', 'ic-sm')}Editar</button>
          <button type="button" class="btn btn-primary" data-act="newTaskInProject" data-project="${id}">${icon('plus', 'ic-sm')}Nova tarefa</button>
          ${C.menuBtn('projMenu', id, 'Mais ações do projeto', 'data-detail="1"')}
        </div>
      </div>

      <div class="grid g-3">
        <section class="card" aria-label="Progresso">
          <div class="card-head"><h2 class="card-title">${icon('checkCircle')}Progresso</h2></div>
          <div class="row" style="--gap:18px">
            <div class="ring" style="--p:${pr.pct}" role="img" aria-label="${pr.pct}% concluído"><span>${pr.pct}%</span></div>
            <div class="stack" style="--gap:4px">
              <div class="strong">${pr.done} de ${pr.total} tarefas concluídas</div>
              <div class="muted small">${pr.total ? (pr.remaining ? `Faltam ${U.count(pr.remaining, 'tarefa', 'tarefas')}` : 'Todas as tarefas concluídas') : 'Adicione tarefas para medir o progresso'}</div>
              ${blocked.length ? `<div class="small t-warn">${icon('lock', 'ic-xs')} ${U.count(blocked.length, 'bloqueada', 'bloqueadas')}</div>` : ''}
            </div>
          </div>
        </section>
        <section class="card" aria-label="Orçamento">
          <div class="card-head"><h2 class="card-title">${icon('wallet')}Orçamento</h2><button type="button" class="link-btn" data-act="newExpense" data-project="${id}">${icon('plus', 'ic-xs')}Despesa</button></div>
          ${p.budget ? `
            <div class="row between"><span class="stat-value" style="font-size:22px">${U.fmtMoney(balance)}</span><span class="badge ${balance < 0 ? 'b-danger' : 'b-accent'}">${balance < 0 ? 'Acima do orçamento' : 'Saldo disponível'}</span></div>
            <div class="mt-8">${C.progress(budgetPct, { tone: budgetPct > 100 ? 'is-danger' : budgetPct >= 90 ? 'is-warn' : '', label: 'Uso do orçamento' })}</div>
            <div class="progress-meta"><span>Comprometido ${U.fmtMoney(s.committed)}</span><span>Previsto ${U.fmtMoney(p.budget)}</span></div>
            <div class="progress-meta"><span>Pago ${U.fmtMoney(s.paid)}</span><span>A pagar ${U.fmtMoney(s.planned)}</span></div>`
            : `<p class="muted small">Sem orçamento definido. ${s.committed ? `Já há ${U.fmtMoney(s.committed)} em despesas registradas.` : ''}</p><button type="button" class="btn btn-sm mt-16" data-act="editProject" data-id="${id}">Definir orçamento</button>`}
        </section>
        <section class="card" aria-label="Próximo passo do projeto" style="background:var(--hero), var(--card)">
          <div class="card-head"><h2 class="card-title">${icon('target')}Próximo passo</h2></div>
          ${ns.task ? `
            <button type="button" class="strong" style="text-align:left;font-size:16px" data-act="openTask" data-id="${ns.task.id}">${U.esc(ns.task.title)}</button>
            <p class="muted small mt-8">${U.esc(ns.reason)}</p>
            <div class="actions mt-16"><button type="button" class="btn btn-sm btn-primary" data-act="toggleTask" data-id="${ns.task.id}">${icon('check', 'ic-sm')}Concluir</button></div>`
            : `<p class="muted small">${ns.blockedCount ? 'As tarefas restantes estão bloqueadas por dependências.' : pr.total ? 'Todas as tarefas foram concluídas.' : 'Crie tarefas para receber uma sugestão.'}</p>`}
        </section>
      </div>

      <div class="grid g-2 mt-16">
        <section class="card" aria-label="O que está faltando">
          <div class="card-head"><h2 class="card-title">${icon('info')}O que está faltando</h2><span class="card-sub">${missing.length}</span></div>
          ${missing.length ? missing.map((m) => `<div class="missing-item">${icon('alert', 'ic-sm')}<span class="grow">${U.esc(m.text)}</span>${m.act ? `<button type="button" class="link-btn" data-act="${m.act}" data-id="${id}" data-project="${id}">Resolver</button>` : m.listId ? `<a class="link-btn" href="#/listas/${m.listId}">Abrir</a>` : ''}</div>`).join('')
            : `<p class="muted small">${icon('checkCircle', 'ic-xs')} As informações essenciais estão completas.</p>`}
        </section>
        <section class="card" aria-label="Bloqueios">
          <div class="card-head"><h2 class="card-title">${icon('lock')}Dependências pendentes</h2><span class="card-sub">${blocked.length}</span></div>
          ${blocked.length ? `<div class="mini-list">${blocked.map((t) => `<div class="mini-row" data-key="pb-${t.id}"><span class="mini-body"><button type="button" class="mini-title" style="text-align:left" data-act="openTask" data-id="${t.id}">${U.esc(t.title)}</button><span class="mini-sub wrap">Aguarda: ${L.blockers(t).map((b) => `<button type="button" class="link-btn" data-act="openTask" data-id="${b.id}">${U.esc(b.title)}</button>`).join(', ')}</span></span></div>`).join('')}</div>`
            : `<p class="muted small">${icon('unlock', 'ic-xs')} Nenhuma tarefa deste projeto está bloqueada.</p>`}
        </section>
      </div>

      <div class="section-head"><h2 class="section-title">${icon('tasks')}Tarefas <span class="badge">${openT.length} pendentes</span></h2><a class="link-btn" href="#/tarefas" data-act="tasksOfProject" data-id="${id}">Abrir no gerenciador</a></div>
      ${VIEWS.tarefas.quickAdd(id)}
      ${openT.length ? `<div class="task-list">${openT.map((t) => C.taskRow(t, { showProject: false })).join('')}</div>` : C.empty({ ic: 'tasks', title: tasks.length ? 'Todas as tarefas concluídas' : 'Nenhuma tarefa ainda', text: 'Use o campo acima para adicionar tarefas rapidamente.' }, true)}
      ${doneT.length ? `<details class="mt-16"><summary class="group-title" style="cursor:pointer">${icon('checkCircle', 'ic-sm')}Concluídas (${doneT.length})</summary><div class="task-list">${doneT.map((t) => C.taskRow(t, { showProject: false })).join('')}</div></details>` : ''}

      <div class="section-head"><h2 class="section-title">${icon('list')}Listas</h2><button type="button" class="btn btn-sm" data-act="newList" data-project="${id}">${icon('plus', 'ic-sm')}Nova lista</button></div>
      ${lists.length ? `<div class="grid g-auto">${lists.map((l) => VIEWS.listas.card(l, { showProject: false })).join('')}</div>` : C.empty({ ic: 'list', title: 'Nenhuma lista vinculada', text: 'Crie checklists de documentos, compras ou materiais para este projeto.' }, true)}

      <div class="section-head"><h2 class="section-title">${icon('wallet')}Despesas</h2><button type="button" class="btn btn-sm" data-act="newExpense" data-project="${id}">${icon('plus', 'ic-sm')}Registrar despesa</button></div>
      ${expenses.length ? VIEWS.custos.table(expenses, { showProject: false }) : C.empty({ ic: 'receipt', title: 'Nenhuma despesa registrada', text: 'Registre gastos previstos e pagos para acompanhar o saldo do orçamento.' }, true)}

      <div class="grid g-2 mt-24">
        <section class="card" aria-label="Notas">
          <div class="card-head"><h2 class="card-title">${icon('note')}Notas</h2><button type="button" class="link-btn" data-act="newNote" data-project="${id}">${icon('plus', 'ic-xs')}Nova nota</button></div>
          ${notes.length ? `<div class="mini-list">${notes.map((n) => `<a class="mini-row" href="#/notas/${n.id}" data-key="pn-${n.id}"><span class="mini-icon tone-brand">${icon('note', 'ic-sm')}</span><span class="mini-body"><span class="mini-title">${U.esc(n.title || 'Nota sem título')}</span><span class="mini-sub">${U.esc(n.body.replace(/\n/g, ' ').slice(0, 90))}</span></span></a>`).join('')}</div>` : '<p class="muted small">Nenhuma nota vinculada.</p>'}
        </section>
        <section class="card" aria-label="Agenda e decisões">
          <div class="card-head"><h2 class="card-title">${icon('calendar')}Agenda e decisões</h2><button type="button" class="link-btn" data-act="newEvent" data-project="${id}">${icon('plus', 'ic-xs')}Compromisso</button></div>
          ${events.length || cmps.length ? `<div class="mini-list">
            ${events.slice(0, 4).map((e) => `<button type="button" class="mini-row" data-act="openEvent" data-id="${e.id}" data-key="pe-${e.id}"><span class="mini-icon tone-brand">${icon('clock', 'ic-sm')}</span><span class="mini-body"><span class="mini-title">${U.esc(e.title)}</span><span class="mini-sub">${U.fmtDate(e.date)} · ${e.start}–${e.end}</span></span></button>`).join('')}
            ${cmps.map((c) => { const r = L.compareScores(c).rows[0]; return `<a class="mini-row" href="#/comparador/${c.id}" data-key="pc-${c.id}"><span class="mini-icon tone-accent">${icon('scale', 'ic-sm')}</span><span class="mini-body"><span class="mini-title">${U.esc(c.title)}</span><span class="mini-sub">${r ? `Melhor pontuação: ${U.esc(r.option.name)} (${Math.round(r.pct)}%)` : 'Sem opções ainda'}</span></span></a>`; }).join('')}
          </div>` : '<p class="muted small">Nenhum compromisso futuro ou comparação vinculada.</p>'}
          <button type="button" class="btn btn-sm mt-16" data-act="newComparison" data-project="${id}">${icon('scale', 'ic-sm')}Comparar opções</button>
        </section>
      </div>`;
  },
};

/* ---------- Filtros e ações da lista ---------- */
A.projFilter = (el) => UIS.set('projects', el.dataset.key, el.value);
A.projVis = (el) => UIS.set('projects', 'vis', el.dataset.value);
A.projMode = (el) => UIS.set('projects', 'mode', el.dataset.value);
A.clearProjectFilters = () => UIS.patch('projects', { q: '', status: '', vis: 'todos' });
A.newProject = () => ProjectModal.open();
A.editProject = (el) => ProjectModal.open(el.dataset.id || el.dataset.project);
A.newFromTemplate = () => TemplateModal.open();
A.tasksOfProject = (el) => UIS.patch('tasks', { project: el.dataset.id, status: '', priority: '', due: '' });
A.projMenu = (el) => {
  const p = DB.get('projects', el.dataset.id);
  if (!p) return;
  const inDetail = el.dataset.detail === '1';
  UI.menu(el, [
    ...(inDetail ? [] : [{ label: 'Abrir projeto', icon: 'arrowRight', fn: () => App.go('#/projetos/' + p.id) }]),
    { label: 'Editar', icon: 'edit', fn: () => ProjectModal.open(p.id) },
    { label: 'Nova tarefa', icon: 'plus', fn: () => TaskModal.open(null, { projectId: p.id }) },
    { label: p.archived ? 'Restaurar' : 'Arquivar', icon: 'archive', fn: () => Actions.toggleArchive(p.id) },
    '-',
    { label: 'Excluir projeto', icon: 'trash', danger: true, fn: async () => { if (await Actions.deleteProject(p.id) && inDetail) App.go('#/projetos'); } },
  ]);
};

/* ---------- Modal de projeto ---------- */
const ProjectModal = {
  open(id) {
    const existing = id ? DB.get('projects', id) : null;
    const p = existing ? { ...existing } : M.project({ start: U.today(), color: PROJECT_COLORS[DB.all('projects').length % PROJECT_COLORS.length] });
    UI.modal({
      title: existing ? 'Editar projeto' : 'Novo projeto',
      body: `<form id="proj-form" class="stack" style="--gap:14px" novalidate>
        <div class="field"><label class="label" for="pf-name">Nome <span class="req" aria-hidden="true">*</span></label><input class="input" id="pf-name" name="name" maxlength="80" required autofocus value="${U.esc(p.name)}" placeholder="Ex.: Organizar uma viagem"></div>
        <div class="field"><label class="label" for="pf-desc">Descrição</label><textarea class="textarea" id="pf-desc" name="description" rows="2" maxlength="400" placeholder="Qual é o objetivo deste projeto?">${U.esc(p.description)}</textarea></div>
        <fieldset class="field"><legend class="label" style="margin-bottom:6px">Cor de identificação</legend><div class="color-pick">${PROJECT_COLORS.map((c, i) => `<label><input type="radio" name="color" value="${c}" ${c === p.color ? 'checked' : ''} aria-label="Cor ${i + 1}"><span style="--c:${c}"></span></label>`).join('')}</div></fieldset>
        <div class="form-grid">
          <div class="field"><label class="label" for="pf-start">Início</label><input class="input" type="date" id="pf-start" name="start" value="${p.start}"></div>
          <div class="field"><label class="label" for="pf-due">Prazo</label><input class="input" type="date" id="pf-due" name="due" value="${p.due}"></div>
          <div class="field"><label class="label" for="pf-status">Status</label><select class="select" id="pf-status" name="status">${C.opts(Object.entries(PROJECT_STATUS).map(([k, v]) => [k, v.label]), p.status)}</select></div>
          <div class="field"><label class="label" for="pf-budget">Orçamento previsto (R$)</label><input class="input" id="pf-budget" name="budget" inputmode="decimal" placeholder="0,00" value="${U.moneyInput(p.budget)}"><span class="hint">Use vírgula para centavos. Ex.: 1.250,00</span></div>
        </div>
      </form>`,
      footer: `<button type="button" class="btn btn-ghost" data-modal-close>Cancelar</button><button type="submit" form="proj-form" class="btn btn-primary">${existing ? 'Salvar alterações' : 'Criar projeto'}</button>`,
      onMount(el, m) {
        const form = el.querySelector('#proj-form');
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const ok = UI.validate(form, {
            name: (v) => (!v ? 'Informe o nome do projeto.' : ''),
            due: (v) => { const s = form.start.value; return v && s && v < s ? 'O prazo precisa ser igual ou posterior ao início.' : ''; },
            budget: (v) => (v && (isNaN(U.parseMoney(v)) || U.parseMoney(v) < 0) ? 'Informe um valor válido, como 1.250,00.' : ''),
          });
          if (!ok) return;
          const data = {
            ...p, name: form.name.value.trim(), description: form.description.value.trim(),
            color: form.color.value, start: form.start.value, due: form.due.value, status: form.status.value,
            budget: form.budget.value ? U.parseMoney(form.budget.value) : 0,
          };
          DB.put('projects', data);
          m.close();
          if (existing) UI.toast('Projeto atualizado.');
          else { UI.toast('Projeto criado.'); App.go('#/projetos/' + data.id); }
        });
      },
    });
  },
};

/* ---------- Modelos ---------- */
const TemplateModal = {
  open() {
    const m = UI.modal({
      title: 'Começar com um modelo',
      size: 'lg',
      body: `<p class="muted mb-16">Escolha um modelo. Você poderá ajustar nome, datas, orçamento, tarefas e listas antes de criar.</p>
        <div class="grid g-2">${TEMPLATES.map((t) => `
          <button type="button" class="choice" data-tpl="${t.id}" style="--c:${t.color}">
            <span class="row"><span class="stat-icon" style="background:color-mix(in srgb, ${t.color} 20%, transparent);color:${t.color}">${icon(t.icon, 'ic-sm')}</span><strong>${t.name}</strong></span>
            <span>${t.description}</span>
            <span class="xs faint">${U.count(t.tasks.length, 'tarefa', 'tarefas')} com dependências · ${U.count(t.lists.length, 'lista', 'listas')}${t.budget ? ' · orçamento sugerido ' + U.fmtMoney(t.budget) : ''}</span>
          </button>`).join('')}</div>`,
      onMount(el) {
        el.addEventListener('click', (e) => {
          const b = e.target.closest('[data-tpl]');
          if (!b) return;
          TemplateModal.configure(m, TEMPLATES.find((t) => t.id === b.dataset.tpl));
        });
      },
    });
  },
  configure(m, tpl) {
    const start = U.today();
    m.setTitle(`Modelo: ${tpl.name}`);
    m.setBody(`<form id="tpl-form" class="stack" style="--gap:14px" novalidate>
      <div class="form-grid">
        <div class="field col-span-2"><label class="label" for="tp-name">Nome do projeto <span class="req" aria-hidden="true">*</span></label><input class="input" id="tp-name" name="name" required value="${U.esc(tpl.name)}" maxlength="80"></div>
        <div class="field col-span-2"><label class="label" for="tp-desc">Descrição</label><input class="input" id="tp-desc" name="description" value="${U.esc(tpl.description)}" maxlength="400"></div>
        <div class="field"><label class="label" for="tp-start">Início</label><input class="input" type="date" id="tp-start" name="start" value="${start}" required></div>
        <div class="field"><label class="label" for="tp-due">Prazo</label><input class="input" type="date" id="tp-due" name="due" value="${U.addDays(start, tpl.days)}" required><span class="hint">Os prazos das tarefas serão distribuídos neste período.</span></div>
        <div class="field"><label class="label" for="tp-budget">Orçamento previsto (R$)</label><input class="input" id="tp-budget" name="budget" inputmode="decimal" value="${U.moneyInput(tpl.budget)}" placeholder="0,00"></div>
      </div>
      <fieldset><legend class="fieldset-title">Tarefas incluídas <span class="hint">Desmarque o que não se aplica</span></legend>
        <div class="check-list" style="max-height:260px">${tpl.tasks.map((t, i) => `<label class="check-line"><input type="checkbox" name="task" value="${i}" checked><span>${U.esc(t.title)}</span><span class="faint">${t.deps && t.deps.length ? 'depende de ' + t.deps.map((d) => d + 1).join(', ') + ' · ' : ''}${i + 1}</span></label>`).join('')}</div>
      </fieldset>
      ${tpl.lists.length ? `<fieldset><legend class="fieldset-title">Listas incluídas</legend><div class="check-list">${tpl.lists.map((l, i) => `<label class="check-line"><input type="checkbox" name="list" value="${i}" checked><span>${U.esc(l.name)}</span><span class="faint">${LIST_TYPES[l.type].short} · ${U.count(l.items.length, 'item', 'itens')}</span></label>`).join('')}</div></fieldset>` : ''}
    </form>`);
    m.setFoot(`<button type="button" class="btn btn-ghost" data-back>Voltar</button><span class="spacer"></span><button type="submit" form="tpl-form" class="btn btn-primary">Criar projeto</button>`);
    m.foot.querySelector('[data-back]').onclick = () => { m.close(); TemplateModal.open(); };
    const form = m.body.querySelector('#tpl-form');
    form.querySelector('#tp-name').focus();
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const ok = UI.validate(form, {
        name: (v) => (!v ? 'Informe o nome do projeto.' : ''),
        start: (v) => (!U.parse(v) ? 'Informe a data de início.' : ''),
        due: (v) => (!U.parse(v) ? 'Informe o prazo.' : v < form.start.value ? 'O prazo precisa ser posterior ao início.' : ''),
        budget: (v) => (v && isNaN(U.parseMoney(v)) ? 'Valor inválido.' : ''),
      });
      if (!ok) return;
      const taskIdx = new Set(Array.from(form.querySelectorAll('[name="task"]:checked')).map((x) => +x.value));
      const listIdx = new Set(Array.from(form.querySelectorAll('[name="list"]:checked')).map((x) => +x.value));
      const built = buildFromTemplate(tpl, {
        name: form.name.value.trim(), description: form.description.value.trim(), start: form.start.value, due: form.due.value,
        color: tpl.color, budget: form.budget.value ? U.parseMoney(form.budget.value) : 0, taskIdx, listIdx,
      });
      DB.put('projects', built.project, { silent: true });
      built.tasks.forEach((t) => DB.put('tasks', t, { silent: true }));
      built.lists.forEach((l) => DB.put('lists', l, { silent: true }));
      m.close();
      UI.toast(`Projeto criado com ${U.count(built.tasks.length, 'tarefa', 'tarefas')}.`);
      App.go('#/projetos/' + built.project.id);
    });
  },
};
