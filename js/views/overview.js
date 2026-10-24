'use strict';

VIEWS['visao-geral'] = {
  title: 'Visão geral',
  render() {
    const meta = DB.getMeta();
    const T = U.today();
    const week = U.addDays(T, 7);
    const open = DB.all('tasks').filter((t) => t.status !== 'done' && L.projectActive(t.projectId));
    const byUrgency = (a, b) => (a.due || '9999').localeCompare(b.due || '9999') || (PRIORITIES[b.priority].score - PRIORITIES[a.priority].score);

    const scheduledToday = new Set(L.eventsOn(T).map((e) => e.taskId).filter(Boolean));
    const todayTasks = open.filter((t) => (t.due && t.due <= T) || scheduledToday.has(t.id)).sort(byUrgency);
    const overdue = open.filter((t) => L.isOverdue(t));
    const upcoming = open.filter((t) => t.due && t.due > T && t.due <= week).sort(byUrgency);
    const blocked = open.filter((t) => L.isBlocked(t)).sort(byUrgency);
    const projects = DB.all('projects').filter((p) => !p.archived && p.status !== 'concluido')
      .sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999'));
    const monthKey = T.slice(0, 7);
    const monthExp = DB.all('expenses').filter((x) => x.date.slice(0, 7) === monthKey);
    const monthPaid = monthExp.filter((x) => x.status === 'pago').reduce((s, x) => s + x.amount, 0);
    const monthPlanned = monthExp.filter((x) => x.status !== 'pago').reduce((s, x) => s + x.amount, 0);
    const recent = DB.all('expenses').filter((x) => x.date <= T).sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 5);
    const events = L.eventsOn(T);
    const conflicts = L.conflicts(events);

    const name = meta.userName ? `, ${U.esc(meta.userName)}` : '';
    const sub = open.length
      ? `Você tem ${U.count(todayTasks.length, 'tarefa', 'tarefas')} para hoje e ${U.count(upcoming.length, 'prazo', 'prazos')} nos próximos 7 dias.`
      : 'Nenhuma tarefa pendente. Que tal planejar o próximo projeto?';

    return `
      <div class="page-head">
        <div>
          <div class="eyebrow">${icon('calendar', 'ic-sm')}${U.fmtDateLong(T)}</div>
          <h1 class="page-title" style="margin-top:8px">${U.greeting()}${name}</h1>
          <p class="page-sub">${sub}</p>
        </div>
        <div class="actions">
          <button type="button" class="btn" data-act="organizeDay">${icon('sparkles', 'ic-sm')}Organizar meu dia</button>
          <button type="button" class="btn btn-primary" data-act="newTask">${icon('plus', 'ic-sm')}Nova tarefa</button>
        </div>
      </div>

      <div class="grid g-3">
        ${this.hero()}
        <section class="card" aria-labelledby="ov-agenda">
          <div class="card-head">
            <h2 class="card-title" id="ov-agenda">${icon('calendar')}Agenda de hoje</h2>
            <a class="link-btn" href="#/calendario" data-act="calToday">Calendário</a>
          </div>
          ${events.length ? `<div class="mini-list">${events.map((e) => {
            const c = conflicts.has(e.id);
            return `<button type="button" class="mini-row" data-key="ev-${e.id}" data-act="openEvent" data-id="${e.id}">
              <span class="mini-icon ${c ? 'tone-danger' : e.taskId ? 'tone-accent' : 'tone-brand'}">${icon(c ? 'alert' : e.taskId ? 'tasks' : 'clock', 'ic-sm')}</span>
              <span class="mini-body"><span class="mini-title">${U.esc(e.title)}</span><span class="mini-sub">${e.start}–${e.end}${c ? ' · <span class="t-danger">Conflito de horário</span>' : ''}</span></span>
            </button>`;
          }).join('')}</div>` : C.empty({ ic: 'calendar', title: 'Dia livre de compromissos', text: 'Use “Organizar meu dia” para distribuir suas tarefas no tempo disponível.' }, true)}
        </section>
      </div>

      <div class="grid g-4 mt-16">
        ${C.stat({ label: 'Para hoje', value: todayTasks.length, foot: todayTasks.length ? `${U.fmtDuration(todayTasks.reduce((s, t) => s + (t.duration || 0), 0)) || 'Sem estimativa'} estimadas` : 'Nada vence hoje', ic: 'target' })}
        ${C.stat({ label: 'Atrasadas', value: overdue.length, foot: overdue.length ? 'Precisam de atenção' : 'Tudo em dia', ic: 'alert', tone: overdue.length ? 'danger' : 'accent' })}
        ${C.stat({ label: 'Bloqueadas', value: blocked.length, foot: blocked.length ? 'Aguardando outras tarefas' : 'Nenhum bloqueio', ic: 'lock', tone: blocked.length ? 'warn' : 'accent' })}
        ${C.stat({ label: `Pago em ${U.MONTHS[new Date().getMonth()]}`, value: U.fmtMoney(monthPaid), foot: monthPlanned ? `+ ${U.fmtMoney(monthPlanned)} previstos` : 'Sem gastos previstos no mês', ic: 'wallet', tone: 'accent' })}
      </div>

      <div class="grid g-3 mt-16">
        <section class="card" aria-labelledby="ov-today">
          <div class="card-head"><h2 class="card-title" id="ov-today">${icon('target')}Para hoje</h2><span class="card-sub">${todayTasks.length}</span></div>
          ${todayTasks.length ? `<div class="task-list">${todayTasks.slice(0, 6).map((t) => C.taskRow(t, { flat: true })).join('')}</div>${todayTasks.length > 6 ? `<a class="link-btn mt-8" href="#/tarefas">Ver todas (${todayTasks.length})</a>` : ''}`
            : C.empty({ ic: 'checkCircle', title: 'Nada vence hoje', text: 'Aproveite para adiantar os próximos prazos.' }, true)}
        </section>
        <section class="card" aria-labelledby="ov-next">
          <div class="card-head"><h2 class="card-title" id="ov-next">${icon('clock')}Prazos próximos</h2><span class="card-sub">7 dias</span></div>
          ${upcoming.length ? `<div class="task-list">${upcoming.slice(0, 6).map((t) => C.taskRow(t, { flat: true })).join('')}</div>`
            : C.empty({ ic: 'calendar', title: 'Sem prazos nesta semana', text: 'Defina prazos nas tarefas para vê-los aqui.' }, true)}
        </section>
        <section class="card" aria-labelledby="ov-blocked">
          <div class="card-head"><h2 class="card-title" id="ov-blocked">${icon('lock')}Bloqueios</h2><span class="card-sub">${blocked.length}</span></div>
          ${blocked.length ? `<div class="mini-list">${blocked.slice(0, 5).map((t) => {
            const b = L.blockers(t);
            return `<div class="mini-row" data-key="bl-${t.id}">
              <span class="mini-icon tone-warn">${icon('lock', 'ic-sm')}</span>
              <span class="mini-body">
                <button type="button" class="mini-title" style="text-align:left" data-act="openTask" data-id="${t.id}">${U.esc(t.title)}</button>
                <span class="mini-sub wrap">Resolva antes: <button type="button" class="link-btn" data-act="openTask" data-id="${b[0].id}">${U.esc(b[0].title)}</button>${b.length > 1 ? ` e mais ${b.length - 1}` : ''}</span>
              </span>
            </div>`;
          }).join('')}</div>` : C.empty({ ic: 'unlock', title: 'Nenhum bloqueio', text: 'Todas as tarefas pendentes estão livres para começar.' }, true)}
        </section>
      </div>

      <div class="grid g-3 mt-16">
        <section class="card span-2" aria-labelledby="ov-projects">
          <div class="card-head"><h2 class="card-title" id="ov-projects">${icon('folder')}Projetos ativos</h2><a class="link-btn" href="#/projetos">Ver todos</a></div>
          ${projects.length ? `<div class="mini-list">${projects.slice(0, 5).map((p) => {
            const pr = L.progress(p.id);
            return `<a class="mini-row" href="#/projetos/${p.id}" data-key="op-${p.id}">
              <span class="mini-icon" style="background:color-mix(in srgb, ${p.color} 20%, transparent);color:${p.color}">${icon('folder', 'ic-sm')}</span>
              <span class="mini-body">
                <span class="row between"><span class="mini-title">${U.esc(p.name)}</span><span class="xs strong num">${pr.pct}%</span></span>
                ${C.progress(pr.pct, { label: `Progresso de ${p.name}` })}
                <span class="mini-sub">${pr.total ? `${pr.done} de ${pr.total} tarefas concluídas · ${pr.remaining ? `faltam ${pr.remaining}` : 'todas concluídas'}` : 'Nenhuma tarefa ainda'}${p.due ? ` · prazo ${U.fmtDate(p.due)}` : ''}</span>
              </span>
            </a>`;
          }).join('')}</div>` : C.empty({ ic: 'folder', title: 'Seu primeiro projeto começa aqui.', text: 'Comece do zero ou use um modelo pronto e editável.', actions: `<button type="button" class="btn btn-primary" data-act="newProject">${icon('plus', 'ic-sm')}Criar projeto</button><button type="button" class="btn" data-act="newFromTemplate">${icon('layers', 'ic-sm')}Usar modelo</button>` }, true)}
        </section>
        <section class="card" aria-labelledby="ov-costs">
          <div class="card-head"><h2 class="card-title" id="ov-costs">${icon('wallet')}Custos recentes</h2><a class="link-btn" href="#/custos">Custos</a></div>
          ${recent.length ? `<div class="mini-list">${recent.map((x) => `
            <button type="button" class="mini-row" data-key="ox-${x.id}" data-act="openExpense" data-id="${x.id}">
              <span class="mini-body"><span class="mini-title">${U.esc(x.description)}</span><span class="mini-sub">${U.fmtDate(x.date)} · ${U.esc(x.category)}${x.projectId && L.project(x.projectId) ? ' · ' + U.esc(L.project(x.projectId).name) : ''}</span></span>
              <span class="mini-amount ${x.status === 'pago' ? '' : 't-warn'}">${U.fmtMoney(x.amount)}</span>
            </button>`).join('')}</div>` : C.empty({ ic: 'wallet', title: 'Nenhum gasto registrado', actions: `<button type="button" class="btn btn-sm" data-act="newExpense">${icon('plus', 'ic-sm')}Registrar despesa</button>` }, true)}
        </section>
      </div>`;
  },

  hero() {
    const ns = L.nextStep();
    let inner;
    if (ns.task) {
      const t = ns.task;
      inner = `
        <h2 class="hero-title" id="ns-title">${U.esc(t.title)}</h2>
        <p class="hero-reason">${icon('sparkles')}<span>${U.esc(ns.reason)}</span></p>
        <div class="hero-meta">${C.projectChip(t.projectId)}${C.due(t)}${C.prio(t.priority)}${t.duration ? C.badge(U.fmtDuration(t.duration), 'muted', 'clock') : ''}</div>
        <div class="actions">
          <button type="button" class="btn btn-primary" data-act="toggleTask" data-id="${t.id}">${icon('check', 'ic-sm')}Concluir</button>
          ${t.status === 'todo' ? `<button type="button" class="btn" data-act="startTask" data-id="${t.id}">${icon('play', 'ic-sm')}Começar agora</button>` : ''}
          <button type="button" class="btn btn-ghost" data-act="openTask" data-id="${t.id}">Ver detalhes</button>
        </div>
        ${ns.alts.length ? `<div class="hero-later"><span>Em seguida:</span>${ns.alts.map((a) => `<button type="button" data-act="openTask" data-id="${a.id}">${icon('arrowRight', 'ic-xs')}<span>${U.esc(a.title)}</span></button>`).join('')}</div>` : ''}`;
    } else if (ns.blockedCount) {
      inner = `
        <h2 class="hero-title" id="ns-title">Tudo o que resta está bloqueado</h2>
        <p class="hero-reason">${icon('lock')}<span>${U.count(ns.blockedCount, 'tarefa pendente depende', 'tarefas pendentes dependem')} de outras que ainda não foram concluídas. Revise as dependências para liberar o caminho.</span></p>
        <div class="actions mt-16"><a class="btn btn-primary" href="#/tarefas">Revisar tarefas</a></div>`;
    } else {
      inner = `
        <h2 class="hero-title" id="ns-title">Nenhuma tarefa pendente</h2>
        <p class="hero-reason">${icon('sparkles')}<span>Crie tarefas com prazo, prioridade e dependências e o ENTRELIA indicará o próximo passo.</span></p>
        <div class="actions mt-16">
          <button type="button" class="btn btn-primary" data-act="newTask">${icon('plus', 'ic-sm')}Criar tarefa</button>
          <button type="button" class="btn" data-act="newFromTemplate">${icon('layers', 'ic-sm')}Usar um modelo</button>
        </div>`;
    }
    return `<section class="hero span-2" aria-labelledby="ns-title"><div class="eyebrow">${icon('target', 'ic-sm')}Seu próximo passo</div>${inner}</section>`;
  },
};

A.startTask = (el) => {
  const t = DB.get('tasks', el.dataset.id);
  if (!t) return;
  Actions.setTaskStatus(t.id, 'doing');
  UI.toast(`Em andamento: ${t.title}`, { tone: 'info' });
};
A.calToday = () => { UIS.patch('calendar', { date: U.today(), mode: 'day' }); };
