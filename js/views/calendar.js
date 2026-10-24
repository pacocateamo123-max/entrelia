'use strict';

VIEWS.calendario = {
  title: 'Calendário',
  render() {
    const mode = UIS.get('calendar', 'mode', 'month');
    const date = U.parse(UIS.get('calendar', 'date', '')) ? UIS.get('calendar', 'date', '') : U.today();
    const d = U.parse(date);
    let label;
    if (mode === 'month') label = `${U.MONTHS[d.getMonth()]} de ${d.getFullYear()}`;
    else if (mode === 'week') { const s = U.startOfWeek(date); const e = U.addDays(s, 6); label = `${U.fmtDate(s)} – ${U.fmtDate(e, true)}`; }
    else label = U.fmtDateLong(date) + (d.getFullYear() !== new Date().getFullYear() ? ` de ${d.getFullYear()}` : '');
    label = label.charAt(0).toUpperCase() + label.slice(1);

    const conf = L.conflicts();
    const body = mode === 'month' ? this.month(d, conf) : mode === 'week' ? this.week(date, conf) : this.day(date, conf);
    return `
      <div class="page-head">
        <div><h1 class="page-title">Calendário</h1><p class="page-sub">Compromissos e prazos das tarefas no mesmo lugar.</p></div>
        <div class="actions">
          <button type="button" class="btn" data-act="organizeDay" data-date="${mode === 'day' ? date : ''}">${icon('sparkles', 'ic-sm')}Organizar meu dia</button>
          <button type="button" class="btn btn-primary" data-act="newEvent" data-date="${mode === 'month' ? '' : date}">${icon('plus', 'ic-sm')}Novo compromisso</button>
        </div>
      </div>
      <div class="cal-toolbar">
        <div class="row" style="--gap:4px">
          <button type="button" class="btn btn-icon btn-sm" data-act="calNav" data-dir="-1" aria-label="Período anterior">${icon('chevronLeft', 'ic-sm')}</button>
          <button type="button" class="btn btn-sm" data-act="calNav" data-dir="0">Hoje</button>
          <button type="button" class="btn btn-icon btn-sm" data-act="calNav" data-dir="1" aria-label="Próximo período">${icon('chevronRight', 'ic-sm')}</button>
        </div>
        <h2 class="cal-label" aria-live="polite">${label}</h2>
        <span class="grow"></span>
        ${C.seg([['month', 'Mês'], ['week', 'Semana'], ['day', 'Dia']], mode, 'calMode', 'aria-label="Visualização do calendário"')}
      </div>
      ${body}
      <div class="legend mt-16" aria-label="Legenda">
        <span><i style="--c:var(--brand)"></i>Compromisso</span>
        <span><i style="--c:var(--accent)"></i>Tarefa agendada</span>
        <span><i style="--c:var(--warn)"></i>Prazo de tarefa</span>
        <span><i style="--c:var(--danger)"></i>Conflito de horário</span>
      </div>`;
  },

  itemsOn(date) {
    const events = L.eventsOn(date);
    const deadlines = DB.all('tasks').filter((t) => t.due === date && L.projectActive(t.projectId)).sort((a, b) => (a.status === 'done') - (b.status === 'done'));
    return { events, deadlines };
  },

  month(d, conf) {
    const days = U.monthMatrix(d.getFullYear(), d.getMonth());
    const T = U.today();
    return `<div class="cal-month" role="grid" aria-label="Mês">
      ${U.WD_S.map((w) => `<div class="cal-wd" role="columnheader">${w}</div>`).join('')}
      ${days.map((day) => {
        const { events, deadlines } = this.itemsOn(day);
        const dd = U.parse(day);
        const out = dd.getMonth() !== d.getMonth();
        const hasConf = events.some((e) => conf.has(e.id));
        const chips = [
          ...deadlines.map((t) => `<button type="button" class="cal-chip is-deadline" data-act="openTask" data-id="${t.id}" title="Prazo: ${U.esc(t.title)}">${icon(t.status === 'done' ? 'check' : 'flag')}<span>${U.esc(t.title)}</span></button>`),
          ...events.map((e) => `<button type="button" class="cal-chip ${e.taskId ? 'is-task' : ''} ${conf.has(e.id) ? 'is-conflict' : ''}" style="${e.projectId && L.project(e.projectId) ? `--c:${L.project(e.projectId).color}` : ''}" data-act="openEvent" data-id="${e.id}" title="${e.start}–${e.end} ${U.esc(e.title)}"><span>${e.start} ${U.esc(e.title)}</span></button>`),
        ];
        const shown = chips.slice(0, 3);
        const dots = [...deadlines.map(() => '<i class="d-warn"></i>'), ...events.map((e) => `<i class="${conf.has(e.id) ? 'd-danger' : e.taskId ? 'd-task' : ''}"></i>`)].slice(0, 6).join('');
        return `<div class="cal-day ${out ? 'is-out' : ''} ${day === T ? 'is-today' : ''}" role="gridcell" data-act="calOpenDay" data-date="${day}" data-key="cd-${day}">
          <div class="cal-day-head"><button type="button" class="cal-num" data-act="calOpenDay" data-date="${day}" aria-label="${U.fmtDateLong(day)}${events.length + deadlines.length ? `, ${events.length + deadlines.length} itens` : ''}">${dd.getDate()}</button>${hasConf ? `<span title="Conflito de horário">${icon('alert')}</span>` : ''}</div>
          ${shown.join('')}
          ${chips.length > 3 ? `<button type="button" class="cal-more" data-act="calOpenDay" data-date="${day}">+${chips.length - 3} mais</button>` : ''}
          <div class="cal-dots" aria-hidden="true">${dots}</div>
        </div>`;
      }).join('')}
    </div>`;
  },

  evBlock(e, conf, extraCls = '', style = '') {
    const c = conf.has(e.id);
    const p = L.project(e.projectId);
    const others = c ? conf.get(e.id).map((id) => DB.get('events', id)).filter(Boolean) : [];
    return `<button type="button" class="ev ${e.taskId ? 'is-task' : ''} ${c ? 'is-conflict' : ''} ${extraCls}" style="${p ? `--c:${p.color};` : ''}${style}" data-act="openEvent" data-id="${e.id}" data-key="ev-${e.id}" ${c ? `aria-label="${U.esc(e.title)}, ${e.start} a ${e.end}, conflito com ${U.esc(others.map((o) => o.title).join(', '))}"` : ''}>
      <span class="ev-time">${c ? icon('alert', 'ic-xs') : ''}${e.start}–${e.end}${c ? ' · conflito' : ''}</span>
      <span class="ev-title">${U.esc(e.title)}</span>
      ${p ? `<span class="xs faint ellipsis">${U.esc(p.name)}</span>` : ''}
    </button>`;
  },

  week(date, conf) {
    const s = U.startOfWeek(date);
    const T = U.today();
    return `<div class="week">${Array.from({ length: 7 }, (_, i) => {
      const day = U.addDays(s, i);
      const { events, deadlines } = this.itemsOn(day);
      const dd = U.parse(day);
      return `<section class="week-col ${day === T ? 'is-today' : ''}" aria-label="${U.fmtDateLong(day)}" data-key="wk-${day}">
        <button type="button" class="week-head" data-act="calOpenDay" data-date="${day}"><span class="wd">${U.WD_S[dd.getDay()]}</span><span class="dn">${dd.getDate()}</span></button>
        ${deadlines.map((t) => `<button type="button" class="ev is-deadline" data-act="openTask" data-id="${t.id}" data-key="dl-${t.id}"><span class="ev-time">${icon('flag', 'ic-xs')}Prazo${t.status === 'done' ? ' · concluída' : ''}</span><span class="ev-title">${U.esc(t.title)}</span></button>`).join('')}
        ${events.map((e) => this.evBlock(e, conf)).join('')}
        ${!events.length && !deadlines.length ? '<span class="week-empty">Livre</span>' : ''}
        <button type="button" class="btn btn-ghost btn-sm" data-act="newEvent" data-date="${day}" aria-label="Novo compromisso em ${U.fmtDateLong(day)}">${icon('plus', 'ic-sm')}</button>
      </section>`;
    }).join('')}</div>`;
  },

  day(date, conf) {
    const { events, deadlines } = this.itemsOn(date);
    let startH = 7, endH = 22;
    events.forEach((e) => { startH = Math.min(startH, Math.floor(U.timeToMin(e.start) / 60)); endH = Math.max(endH, Math.ceil(U.timeToMin(e.end) / 60)); });
    const pxMin = 56 / 60;
    // Distribui eventos sobrepostos em colunas.
    const sorted = events.slice();
    const lanes = [];
    const placed = sorted.map((e) => {
      const s = U.timeToMin(e.start), en = U.timeToMin(e.end);
      let lane = lanes.findIndex((end) => end <= s);
      if (lane < 0) { lane = lanes.length; lanes.push(en); } else lanes[lane] = en;
      return { e, s, en, lane };
    });
    const groups = placed.map((p) => {
      const overlapping = placed.filter((q) => q.s < p.en && q.en > p.s);
      return Math.max(...overlapping.map((q) => q.lane)) + 1;
    });
    const T = U.today();
    const nowTop = date === T ? (U.nowMin() - startH * 60) * pxMin : null;
    const pendingDue = DB.all('tasks').filter((t) => t.status !== 'done' && L.projectActive(t.projectId) && t.due && t.due <= date && !events.some((e) => e.taskId === t.id));

    return `<div class="day-layout">
      <section class="card pad-0" aria-label="Linha do tempo">
        ${deadlines.length ? `<div class="row wrap" style="padding:14px 16px 0;--gap:8px"><span class="xs strong muted">Prazos do dia:</span>${deadlines.map((t) => `<button type="button" class="badge b-warn" data-act="openTask" data-id="${t.id}">${icon(t.status === 'done' ? 'check' : 'flag')}<span>${U.esc(t.title)}</span></button>`).join('')}</div>` : ''}
        <div class="timeline">
          <div class="tl-hours">${Array.from({ length: endH - startH }, (_, i) => `<div class="tl-hour">${U.pad(startH + i)}:00</div>`).join('')}</div>
          <div class="tl-grid" style="height:${(endH - startH) * 56}px" data-act="calSlot" data-date="${date}" data-start-h="${startH}">
            ${placed.map((p, i) => this.evBlock(p.e, conf, 'tl-ev' + (p.en - p.s < 45 ? ' is-short' : ''), `--top:${(p.s - startH * 60) * pxMin};--h:${Math.max(26, (p.en - p.s) * pxMin - 2)};--col:${p.lane};--cols:${groups[i]};position:absolute`)).join('')}
            ${nowTop !== null && nowTop >= 0 && nowTop <= (endH - startH) * 56 ? `<div class="tl-now" style="--top:${nowTop}" aria-hidden="true"></div>` : ''}
          </div>
        </div>
        <p class="hint" style="padding:0 16px 14px">${icon('info', 'ic-xs')} Clique em um horário vazio para criar um compromisso.</p>
      </section>
      <aside class="stack">
        <section class="card">
          <div class="card-head"><h2 class="card-title">${icon('sparkles')}Organizar este dia</h2></div>
          <p class="muted small">Distribua tarefas pendentes nos horários livres, respeitando prazos, prioridades e dependências.</p>
          <button type="button" class="btn btn-primary mt-16" data-act="organizeDay" data-date="${date}">Gerar proposta</button>
        </section>
        <section class="card">
          <div class="card-head"><h2 class="card-title">${icon('tasks')}Pendentes até este dia</h2><span class="card-sub">${pendingDue.length}</span></div>
          ${pendingDue.length ? `<div class="task-list">${L.sortTasks(pendingDue).slice(0, 8).map((t) => C.taskRow(t, { flat: true })).join('')}</div>` : '<p class="muted small">Nenhuma tarefa pendente com prazo até esta data.</p>'}
        </section>
      </aside>
    </div>`;
  },
};

A.calMode = (el) => UIS.set('calendar', 'mode', el.dataset.value);
A.calNav = (el) => {
  const dir = +el.dataset.dir;
  const mode = UIS.get('calendar', 'mode', 'month');
  let date = UIS.get('calendar', 'date', U.today());
  if (!U.parse(date)) date = U.today();
  if (!dir) date = U.today();
  else if (mode === 'month') { const d = U.parse(date); date = U.iso(new Date(d.getFullYear(), d.getMonth() + dir, 1)); }
  else date = U.addDays(date, mode === 'week' ? 7 * dir : dir);
  UIS.set('calendar', 'date', date);
};
A.calOpenDay = (el) => UIS.patch('calendar', { date: el.dataset.date, mode: 'day' });
A.calSlot = (el, e) => {
  if (e.target !== el) return;
  const rect = el.getBoundingClientRect();
  const min = +el.dataset.startH * 60 + Math.floor(((e.clientY - rect.top) / 56) * 60 / 30) * 30;
  EventModal.open(null, { date: el.dataset.date, start: U.minToTime(min), end: U.minToTime(Math.min(min + 60, 23 * 60 + 59)) });
};
A.newEvent = (el) => EventModal.open(null, { date: el?.dataset?.date || undefined, projectId: el?.dataset?.project || '' });
A.openEvent = (el) => EventModal.open(el.dataset.id);
A.organizeDay = (el) => OrganizeModal.open(el?.dataset?.date || U.today());

/* ---------- Compromissos ---------- */
const EventModal = {
  open(id, defaults = {}) {
    const existing = id ? DB.get('events', id) : null;
    if (id && !existing) { UI.toast('Este compromisso não existe mais.', { tone: 'warn' }); return; }
    const e = existing ? { ...existing } : M.event({ date: defaults.date || U.today(), start: defaults.start || '09:00', end: defaults.end || '10:00', projectId: defaults.projectId || '' });
    const task = e.taskId ? DB.get('tasks', e.taskId) : null;
    UI.modal({
      title: existing ? 'Editar compromisso' : 'Novo compromisso',
      body: `<form id="ev-form" class="stack" style="--gap:14px" novalidate>
        <div id="ev-conflict"></div>
        <div class="field"><label class="label" for="ev-title">Título <span class="req" aria-hidden="true">*</span></label><input class="input" id="ev-title" name="title" maxlength="120" required autofocus value="${U.esc(e.title)}" placeholder="Ex.: Reunião com fornecedor"></div>
        <div class="form-grid" style="grid-template-columns:repeat(3,minmax(0,1fr))">
          <div class="field col-span-2" style="grid-column:1 / -1"><label class="label" for="ev-date">Data <span class="req" aria-hidden="true">*</span></label><input class="input" type="date" id="ev-date" name="date" required value="${e.date}"></div>
          <div class="field"><label class="label" for="ev-start">Início</label><input class="input" type="time" id="ev-start" name="start" required value="${e.start}" step="300"></div>
          <div class="field"><label class="label" for="ev-end">Fim</label><input class="input" type="time" id="ev-end" name="end" required value="${e.end}" step="300"></div>
          <div class="field"><label class="label" for="ev-dur">Duração</label><input class="input" id="ev-dur" readonly tabindex="-1" value=""></div>
        </div>
        <div class="field"><label class="label" for="ev-proj">Projeto</label><select class="select" id="ev-proj" name="projectId">${C.projectOptions(e.projectId)}</select></div>
        <div class="field"><label class="label" for="ev-notes">Observações</label><textarea class="textarea" id="ev-notes" name="notes" rows="2" maxlength="1000">${U.esc(e.notes)}</textarea></div>
        ${task ? `<div class="small muted">${icon('tasks', 'ic-xs')} Bloco de tempo da tarefa <button type="button" class="link-btn" id="ev-task">${U.esc(task.title)}</button></div>` : ''}
      </form>`,
      footer: `${existing ? `<button type="button" class="btn btn-danger" id="ev-del">${icon('trash', 'ic-sm')}Excluir</button>` : ''}<span class="spacer"></span><button type="button" class="btn btn-ghost" data-modal-close>Cancelar</button><button type="submit" form="ev-form" class="btn btn-primary">${existing ? 'Salvar' : 'Criar compromisso'}</button>`,
      onMount(el, m) {
        const form = el.querySelector('#ev-form');
        const confEl = el.querySelector('#ev-conflict');
        const check = () => {
          const s = U.timeToMin(form.start.value), en = U.timeToMin(form.end.value);
          el.querySelector('#ev-dur').value = en > s ? U.fmtDuration(en - s) : '—';
          if (!U.parse(form.date.value) || isNaN(s) || isNaN(en) || en <= s) { confEl.innerHTML = ''; return; }
          const others = L.eventsOn(form.date.value).filter((o) => o.id !== e.id && U.timeToMin(o.start) < en && U.timeToMin(o.end) > s);
          if (!others.length) { confEl.innerHTML = ''; return; }
          const slot = L.firstFreeSlot(form.date.value, en - s, '07:00', '22:00');
          confEl.innerHTML = `<div class="banner danger" style="margin:0">${icon('alert')}<div class="grow"><strong>Conflito de horário</strong><div class="small">Sobrepõe ${others.map((o) => `“${U.esc(o.title)}” (${o.start}–${o.end})`).join(', ')}.</div></div>${slot ? `<button type="button" class="btn btn-sm" id="ev-fix">Mover para ${U.minToTime(slot.start)}–${U.minToTime(slot.end)}</button>` : '<span class="small">Sem horário livre neste dia.</span>'}</div>`;
          confEl.querySelector('#ev-fix')?.addEventListener('click', () => {
            form.start.value = U.minToTime(slot.start); form.end.value = U.minToTime(slot.end); check();
            UI.toast('Horário ajustado. Salve para confirmar.', { tone: 'info' });
          });
        };
        ['start', 'end', 'date'].forEach((n) => form[n].addEventListener('input', check));
        check();
        el.querySelector('#ev-task')?.addEventListener('click', () => { m.close(); TaskModal.open(task.id); });
        el.querySelector('#ev-del')?.addEventListener('click', () => { m.close(); Actions.deleteSimple('events', e.id, 'Compromisso excluído'); });
        form.addEventListener('submit', (ev) => {
          ev.preventDefault();
          const ok = UI.validate(form, {
            title: (v) => (!v ? 'Informe o título.' : ''),
            date: (v) => (!U.parse(v) ? 'Informe uma data válida.' : ''),
            start: (v) => (isNaN(U.timeToMin(v)) ? 'Informe o horário de início.' : ''),
            end: (v) => (isNaN(U.timeToMin(v)) ? 'Informe o horário de fim.' : U.timeToMin(v) <= U.timeToMin(form.start.value) ? 'O fim precisa ser depois do início.' : ''),
          });
          if (!ok) return;
          DB.put('events', { ...e, title: form.title.value.trim(), date: form.date.value, start: form.start.value, end: form.end.value, projectId: form.projectId.value, notes: form.notes.value.trim() });
          m.close();
          const conflicts = L.conflicts().get(e.id);
          UI.toast(conflicts ? 'Compromisso salvo, mas há conflito de horário.' : (existing ? 'Compromisso atualizado.' : 'Compromisso criado.'), { tone: conflicts ? 'warn' : 'success' });
        });
      },
    });
  },
};

/* ---------- Organizar meu dia ---------- */
const OrganizeModal = {
  open(date) {
    const isToday = date === U.today();
    const startDefault = isToday ? U.minToTime(U.clamp(Math.ceil(U.nowMin() / 30) * 30, 6 * 60, 22 * 60)) : '09:00';
    const st = { date, start: startDefault, end: isToday && U.nowMin() > 17 * 60 ? '23:00' : '18:00', order: null, durations: {}, exclude: [], plan: null };
    const m = UI.modal({
      title: 'Organizar meu dia',
      size: 'lg',
      body: '',
      footer: ' ',
      onMount(el, ctrl) { OrganizeModal.step1(ctrl, st); },
    });
    return m;
  },

  step1(m, st) {
    const evs = L.eventsOn(st.date);
    // innerHTML (não morph) para recriar o formulário e seus ouvintes a cada passo.
    m.body.innerHTML = (`<form id="org-form" class="stack" style="--gap:16px" novalidate>
      <p class="muted">Informe o período disponível. O ENTRELIA considera seus compromissos e distribui as tarefas por prazo, prioridade e dependências. Você revisa a proposta antes de aplicar.</p>
      <div class="form-grid" style="grid-template-columns:repeat(3,minmax(0,1fr))">
        <div class="field"><label class="label" for="org-date">Dia</label><input class="input" type="date" id="org-date" name="date" value="${st.date}" required></div>
        <div class="field"><label class="label" for="org-start">Disponível das</label><input class="input" type="time" id="org-start" name="start" value="${st.start}" step="300" required></div>
        <div class="field"><label class="label" for="org-end">até</label><input class="input" type="time" id="org-end" name="end" value="${st.end}" step="300" required></div>
      </div>
      <div class="card" style="background:var(--elev);box-shadow:none">
        <div class="card-title">${icon('calendar')}Compromissos neste dia</div>
        ${evs.length ? `<div class="mini-list mt-8">${evs.map((e) => `<div class="mini-row"><span class="plan-time">${e.start}–${e.end}</span><span class="mini-title">${U.esc(e.title)}</span>${L.conflicts(evs).has(e.id) ? C.badge('Conflito', 'danger', 'alert') : ''}</div>`).join('')}</div>` : '<p class="muted small mt-8">Nenhum compromisso. Todo o período está livre.</p>'}
      </div>
    </form>`);
    m.body.querySelector('#org-start').focus();
    m.setFoot(`<button type="button" class="btn btn-ghost" data-modal-close>Cancelar</button><button type="submit" form="org-form" class="btn btn-primary">${icon('sparkles', 'ic-sm')}Gerar proposta</button>`);
    const form = m.body.querySelector('#org-form');
    form.date.addEventListener('change', () => { if (U.parse(form.date.value)) { st.date = form.date.value; st.start = form.start.value; st.end = form.end.value; OrganizeModal.step1(m, st); } });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const ok = UI.validate(form, {
        date: (v) => (!U.parse(v) ? 'Informe um dia válido.' : v < U.today() ? 'Escolha hoje ou uma data futura.' : ''),
        start: (v) => (isNaN(U.timeToMin(v)) ? 'Informe o início.' : ''),
        end: (v) => (isNaN(U.timeToMin(v)) ? 'Informe o fim.' : U.timeToMin(v) <= U.timeToMin(form.start.value) ? 'O fim precisa ser depois do início.' : ''),
      });
      if (!ok) return;
      Object.assign(st, { date: form.date.value, start: form.start.value, end: form.end.value, order: null, durations: {}, exclude: [] });
      OrganizeModal.step2(m, st);
    });
  },

  compute(st) {
    st.plan = L.organizeDay({ date: st.date, start: st.start, end: st.end, order: st.order, durations: st.durations, exclude: st.exclude });
    if (!st.order) st.order = st.plan.sequence.slice();
  },

  step2(m, st) {
    OrganizeModal.compute(st);
    const render = () => {
      const p = st.plan;
      const rows = [
        ...p.busy.map((e) => ({ s: U.timeToMin(e.start), html: `<div class="plan-row is-busy" data-key="busy-${e.id}"><span class="plan-time">${e.start}–${e.end}</span><span class="ellipsis">${icon('lock', 'ic-xs')} ${U.esc(e.title)}</span><span class="xs">Compromisso</span></div>` })),
        ...p.slots.map((s) => {
          const t = DB.get('tasks', s.taskId);
          const idx = st.order.indexOf(s.taskId);
          return { s: s.start, html: `<div class="plan-row" data-key="slot-${t.id}">
            <span class="plan-time">${U.minToTime(s.start)}–${U.minToTime(s.end)}</span>
            <span style="min-width:0"><span class="mini-title" style="display:block">${U.esc(t.title)}</span><span class="row wrap xs" style="--gap:6px;margin-top:4px">${C.due(t)}${C.prio(t.priority)}${C.projectChip(t.projectId)}</span></span>
            <span class="plan-tools">
              <label class="sr-only" for="dur-${t.id}">Duração em minutos</label>
              <input class="input input-sm" type="number" min="5" max="600" step="5" id="dur-${t.id}" data-dur="${t.id}" value="${s.duration}" title="Duração (min)">
              <button type="button" class="btn btn-ghost btn-icon btn-sm" data-up="${t.id}" aria-label="Priorizar ${U.esc(t.title)}" ${idx <= 0 ? 'disabled' : ''}>${icon('arrowUp', 'ic-sm')}</button>
              <button type="button" class="btn btn-ghost btn-icon btn-sm" data-down="${t.id}" aria-label="Adiar ${U.esc(t.title)}" ${idx >= st.order.length - 1 ? 'disabled' : ''}>${icon('arrowDown', 'ic-sm')}</button>
              <button type="button" class="btn btn-ghost btn-icon btn-sm" data-ex="${t.id}" aria-label="Remover ${U.esc(t.title)} da proposta">${icon('x', 'ic-sm')}</button>
            </span>
          </div>` };
        }),
      ].sort((a, b) => a.s - b.s).map((r) => r.html).join('');

      const unfit = p.unfit.map((u) => {
        const t = DB.get('tasks', u.taskId);
        const why = u.depsMissing.length ? `Depende de “${U.esc(DB.get('tasks', u.depsMissing[0]).title)}”, que não entrou na proposta.` : `Precisa de ${U.fmtDuration(u.duration)}; faltam ${U.fmtDuration(u.missing) || 'alguns minutos'} no maior intervalo livre.`;
        return `<div class="plan-row is-warn" data-key="unfit-${t.id}">
          <span class="plan-time t-warn">${icon('alert', 'ic-xs')} Não coube</span>
          <span style="min-width:0"><span class="mini-title" style="display:block">${U.esc(t.title)}</span><span class="xs muted">${why}</span></span>
          <span class="plan-tools" style="flex-wrap:wrap;justify-content:flex-end">
            <label class="sr-only" for="rs-${t.id}">Reagendar para</label>
            <input class="input input-sm" style="width:140px" type="date" id="rs-${t.id}" data-rsdate="${t.id}" value="${U.addDays(st.date, 1)}" min="${U.today()}">
            <button type="button" class="btn btn-sm" data-resched="${t.id}" data-dur="${u.duration}">Reagendar</button>
            <button type="button" class="btn btn-ghost btn-icon btn-sm" data-ex="${t.id}" aria-label="Ignorar ${U.esc(t.title)}">${icon('x', 'ic-sm')}</button>
          </span>
        </div>`;
      }).join('');

      const excluded = st.exclude.map((id) => DB.get('tasks', id)).filter(Boolean);
      m.setTitle(`Proposta para ${U.relDay(st.date) === 'hoje' ? 'hoje' : U.fmtDateLong(st.date)}`);
      m.setBody(`<div class="stack" style="--gap:14px">
        <div class="summary-pills">
          ${C.badge(`${st.start}–${st.end}`, 'muted', 'clock')}
          ${C.badge(`${U.count(p.slots.length, 'tarefa planejada', 'tarefas planejadas')}`, 'brand', 'tasks')}
          ${C.badge(`${U.fmtDuration(p.used) || '0 min'} ocupados`, 'accent', 'checkCircle')}
          ${C.badge(`${U.fmtDuration(p.remaining) || '0 min'} livres`, 'muted', 'sparkles')}
          ${p.unfit.length ? C.badge(`${U.count(p.unfit.length, 'não coube', 'não couberam')}`, 'warn', 'alert') : ''}
        </div>
        ${p.freeTotal === 0 ? `<div class="banner warn" style="margin:0">${icon('alert')}<span class="grow">Não há tempo livre neste período${st.date === U.today() ? ' a partir de agora' : ''}. Ajuste o horário disponível.</span></div>` : ''}
        ${rows || C.empty({ ic: 'checkCircle', title: 'Nenhuma tarefa disponível', text: 'Não há tarefas pendentes livres de dependências para este dia.' }, true)}
        ${unfit ? `<h3 class="group-title" style="margin:8px 0 0">Não couberam no tempo disponível</h3>${unfit}` : ''}
        ${excluded.length ? `<div class="small muted">Fora da proposta: ${excluded.map((t) => `<button type="button" class="link-btn" data-inc="${t.id}">${icon('plus', 'ic-xs')}${U.esc(t.title)}</button>`).join(' ')}</div>` : ''}
        ${p.blockedOut.length ? `<p class="hint">${icon('lock', 'ic-xs')} ${U.count(p.blockedOut.length, 'tarefa ficou', 'tarefas ficaram')} de fora por dependerem de tarefas que ainda não podem ser feitas.</p>` : ''}
        <p class="hint">${icon('info', 'ic-xs')} Ajuste durações e a ordem; a proposta é recalculada na hora. Nada é salvo até você aplicar.</p>
      </div>`);
      m.setFoot(`<button type="button" class="btn btn-ghost" data-back>${icon('chevronLeft', 'ic-sm')}Ajustar período</button><span class="spacer"></span><button type="button" class="btn btn-ghost" data-modal-close>Cancelar</button><button type="button" class="btn btn-primary" data-apply ${p.slots.length ? '' : 'disabled'}>${icon('check', 'ic-sm')}Aplicar ao calendário</button>`);
    };
    render();

    if (m._orgBound) { m._orgRender = render; return; }
    m._orgBound = true;
    m._orgRender = render;
    const rerender = () => { OrganizeModal.compute(st); m._orgRender(); };
    m.body.addEventListener('change', (e) => {
      const d = e.target.dataset.dur;
      if (d && e.target.tagName === 'INPUT') {
        const v = Math.round(+e.target.value);
        if (!v || v < 5) { e.target.value = st.durations[d] || DB.get('tasks', d).duration || 30; UI.toast('A duração mínima é de 5 minutos.', { tone: 'warn' }); return; }
        st.durations[d] = v; rerender();
      }
    });
    m.body.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      const { up, down, ex, inc, resched } = b.dataset;
      if (up || down) {
        const id = up || down; const i = st.order.indexOf(id); const j = i + (up ? -1 : 1);
        if (i < 0 || j < 0 || j >= st.order.length) return;
        [st.order[i], st.order[j]] = [st.order[j], st.order[i]];
        rerender();
      } else if (ex) { st.exclude.push(ex); rerender(); }
      else if (inc) { st.exclude = st.exclude.filter((x) => x !== inc); rerender(); }
      else if (resched) {
        const t = DB.get('tasks', resched);
        const date = m.body.querySelector(`[data-rsdate="${resched}"]`).value;
        if (!U.parse(date) || date < U.today()) { UI.toast('Escolha uma data válida para reagendar.', { tone: 'warn' }); return; }
        const slot = L.firstFreeSlot(date, +b.dataset.dur);
        if (!slot) { UI.toast(`Não há ${U.fmtDuration(+b.dataset.dur)} livres entre 08:00 e 20:00 em ${U.fmtDate(date)}.`, { tone: 'warn' }); return; }
        DB.put('events', M.event({ title: t.title, date, start: U.minToTime(slot.start), end: U.minToTime(slot.end), taskId: t.id, projectId: t.projectId }));
        st.exclude.push(t.id);
        rerender();
        UI.toast(`Reagendada para ${U.fmtDate(date)}, ${U.minToTime(slot.start)}–${U.minToTime(slot.end)}.`);
      }
    });
    m.foot.addEventListener('click', (e) => {
      if (e.target.closest('[data-back]')) { OrganizeModal.step1(m, st); m.setTitle('Organizar meu dia'); }
      if (e.target.closest('[data-apply]')) {
        const p = st.plan;
        if (!p.slots.length) return;
        const fresh = L.organizeDay({ date: st.date, start: st.start, end: st.end, order: st.order, durations: st.durations, exclude: st.exclude });
        const undo = DB.track(() => {
          fresh.slots.forEach((s) => {
            const t = DB.get('tasks', s.taskId);
            DB.put('events', M.event({ title: t.title, date: st.date, start: U.minToTime(s.start), end: U.minToTime(s.end), taskId: t.id, projectId: t.projectId }), { silent: true });
          });
        });
        m.close();
        UIS.patch('calendar', { date: st.date, mode: 'day' });
        App.go('#/calendario');
        UI.toast(`${U.count(fresh.slots.length, 'tarefa agendada', 'tarefas agendadas')} no calendário.`, { action: { label: 'Desfazer', fn: undo } });
      }
    });
  },
};
