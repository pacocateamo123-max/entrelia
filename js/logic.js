'use strict';

/* ---------- Constantes de domínio ---------- */
const PRIORITIES = {
  alta: { label: 'Alta', tone: 'danger', score: 30 },
  media: { label: 'Média', tone: 'warn', score: 16 },
  baixa: { label: 'Baixa', tone: 'muted', score: 6 },
};
const TASK_STATUS = { todo: 'A fazer', doing: 'Em andamento', done: 'Concluído' };
const TASK_STATUS_COLOR = { todo: 'var(--text-3)', doing: 'var(--brand)', done: 'var(--accent)' };
const PROJECT_STATUS = {
  planejamento: { label: 'Planejamento', tone: 'muted' },
  ativo: { label: 'Ativo', tone: 'brand' },
  pausado: { label: 'Pausado', tone: 'warn' },
  concluido: { label: 'Concluído', tone: 'accent' },
};
const LIST_TYPES = {
  compras: { label: 'Lista de compras', short: 'Compras', icon: 'cart' },
  documentos: { label: 'Checklist de documentos', short: 'Documentos', icon: 'doc' },
  materiais: { label: 'Materiais necessários', short: 'Materiais', icon: 'package' },
  etapas: { label: 'Etapas de execução', short: 'Etapas', icon: 'steps' },
  personalizada: { label: 'Lista personalizada', short: 'Personalizada', icon: 'list' },
};
const CATEGORIES = ['Alimentação', 'Transporte', 'Hospedagem', 'Educação', 'Moradia', 'Saúde', 'Lazer', 'Compras', 'Serviços', 'Tecnologia', 'Documentos', 'Outros'];
const CATEGORY_COLORS = ['#D6A062', '#5EEAD4', '#FBBF24', '#FDA4AF', '#60A5FA', '#F472B6', '#34D399', '#FB923C', '#C084FC', '#38BDF8', '#FACC15', '#94A3B8'];
const PROJECT_COLORS = ['#D6A062', '#5EEAD4', '#FBBF24', '#FDA4AF', '#60A5FA', '#F472B6', '#34D399', '#FB923C'];
const categoryColor = (c) => CATEGORY_COLORS[Math.max(0, CATEGORIES.indexOf(c)) % CATEGORY_COLORS.length];

/* ---------- Modelos (valores padrão) ---------- */
const M = {
  project: (p = {}) => ({ id: U.uid(), name: '', description: '', color: PROJECT_COLORS[0], start: '', due: '', status: 'ativo', archived: false, budget: 0, ...p }),
  task: (t = {}) => ({ id: U.uid(), title: '', description: '', priority: 'media', due: '', duration: 30, projectId: '', status: 'todo', order: Date.now(), dependsOn: [], subtasks: [], completedAt: null, ...t }),
  event: (e = {}) => ({ id: U.uid(), title: '', date: U.today(), start: '09:00', end: '10:00', projectId: '', taskId: '', notes: '', ...e }),
  list: (l = {}) => ({ id: U.uid(), name: '', type: 'personalizada', projectId: '', items: [], order: Date.now(), ...l }),
  item: (i = {}) => ({ id: U.uid(), name: '', note: '', qty: 1, price: 0, done: false, expenseId: '', ...i }),
  expense: (x = {}) => ({ id: U.uid(), description: '', amount: 0, date: U.today(), category: 'Outros', projectId: '', status: 'pago', source: null, ...x }),
  comparison: (c = {}) => ({ id: U.uid(), title: '', projectId: '', description: '', criteria: [], options: [], ...c }),
  note: (n = {}) => ({ id: U.uid(), title: '', body: '', tags: [], projectId: '', taskId: '', pinned: false, ...n }),
};

/* ---------- Regras e cálculos ---------- */
const L = {
  project: (id) => DB.get('projects', id),
  tasksOf: (pid) => DB.all('tasks').filter((t) => t.projectId === pid),
  sortTasks: (arr) => arr.slice().sort((a, b) => (a.order - b.order) || (a.createdAt || 0) - (b.createdAt || 0)),

  projectActive(pid) {
    if (!pid) return true;
    const p = DB.get('projects', pid);
    return !p || !p.archived;
  },

  blockers(t) {
    return (t.dependsOn || []).map((id) => DB.get('tasks', id)).filter((d) => d && d.status !== 'done');
  },
  isBlocked(t) { return t.status !== 'done' && L.blockers(t).length > 0; },
  isOverdue(t) { return t.status !== 'done' && !!t.due && t.due < U.today(); },
  dependents(id) { return DB.all('tasks').filter((x) => (x.dependsOn || []).includes(id)); },
  openDependents(id) { return L.dependents(id).filter((x) => x.status !== 'done'); },

  /* Quantas tarefas pendentes dependem (direta ou indiretamente) desta. */
  downstream(id) {
    const seen = new Set();
    const stack = [id];
    while (stack.length) {
      const cur = stack.pop();
      L.openDependents(cur).forEach((d) => { if (!seen.has(d.id) && d.id !== id) { seen.add(d.id); stack.push(d.id); } });
    }
    return seen.size;
  },

  /* Verdadeiro se "taskId passar a depender de depId" criaria um ciclo. */
  wouldCycle(taskId, depId) {
    if (!taskId || taskId === depId) return taskId === depId;
    const seen = new Set();
    const stack = [depId];
    while (stack.length) {
      const cur = stack.pop();
      if (cur === taskId) return true;
      if (seen.has(cur)) continue;
      seen.add(cur);
      const t = DB.get('tasks', cur);
      if (t) (t.dependsOn || []).forEach((d) => stack.push(d));
    }
    return false;
  },

  progress(pid) {
    const tasks = L.tasksOf(pid);
    const done = tasks.filter((t) => t.status === 'done').length;
    const total = tasks.length;
    return { total, done, remaining: total - done, pct: total ? Math.round((done / total) * 100) : 0 };
  },

  spent(pid) {
    const ex = DB.all('expenses').filter((x) => x.projectId === pid);
    const committed = ex.reduce((s, x) => s + (Number(x.amount) || 0), 0);
    const paid = ex.filter((x) => x.status === 'pago').reduce((s, x) => s + (Number(x.amount) || 0), 0);
    return { committed, paid, planned: committed - paid };
  },

  score(t) {
    let s = 0;
    const n = t.due ? U.diffDays(U.today(), t.due) : null;
    if (n !== null) {
      if (n < 0) s += 60 + Math.min(-n, 10) * 2;
      else if (n === 0) s += 50;
      else if (n === 1) s += 42;
      else if (n <= 3) s += 32;
      else if (n <= 7) s += 20;
      else s += Math.max(0, 12 - (n - 7) / 3);
    }
    s += (PRIORITIES[t.priority] || PRIORITIES.media).score;
    const down = L.downstream(t.id);
    s += Math.min(down, 5) * 10;
    if (t.status === 'doing') s += 8;
    return { s, n, down };
  },

  candidates(pid) {
    return DB.all('tasks').filter((t) => t.status !== 'done' && !L.isBlocked(t) && L.projectActive(t.projectId) && (!pid || t.projectId === pid));
  },

  /* Sugere a próxima tarefa com base em prazo, prioridade e dependências. */
  nextStep(pid) {
    const ranked = L.candidates(pid)
      .map((t) => ({ t, sc: L.score(t) }))
      .sort((a, b) => (b.sc.s - a.sc.s) || (a.t.order - b.t.order));
    if (!ranked.length) {
      const pending = DB.all('tasks').filter((t) => t.status !== 'done' && L.projectActive(t.projectId) && (!pid || t.projectId === pid));
      return { task: null, blockedCount: pending.length, alts: [] };
    }
    const top = ranked[0];
    return { task: top.t, reason: L.explain(top.t, top.sc), alts: ranked.slice(1, 3).map((r) => r.t) };
  },

  explain(t, { n, down }) {
    const parts = [];
    if (n !== null && n !== undefined) {
      if (n < 0) parts.push(`está atrasada há ${-n === 1 ? '1 dia' : -n + ' dias'}`);
      else if (n === 0) parts.push('vence hoje');
      else if (n === 1) parts.push('vence amanhã');
      else if (n <= 7) parts.push(`vence em ${n} dias`);
    }
    if (down > 0) parts.push(`precisa ser concluída antes de ${down === 1 ? 'outra tarefa' : 'outras ' + U.numWord(down, true)}`);
    if (t.priority === 'alta' && parts.length < 2) parts.push('tem prioridade alta');
    if (t.status === 'doing' && parts.length < 2) parts.push('já está em andamento');
    if (!parts.length) {
      return t.due
        ? `Esta tarefa não depende de nenhuma outra e tem o prazo mais próximo entre as disponíveis (${U.fmtDate(t.due)}).`
        : 'Esta tarefa não depende de nenhuma outra e é a de maior prioridade entre as disponíveis.';
    }
    const txt = parts.length === 1 ? parts[0] : parts.slice(0, -1).join(', ') + ' e ' + parts[parts.length - 1];
    return `Esta tarefa ${txt}.`;
  },

  /* Lacunas de informação de um projeto. */
  missingInfo(p) {
    const out = [];
    const tasks = L.tasksOf(p.id);
    const lists = DB.all('lists').filter((l) => l.projectId === p.id);
    if (!p.due) out.push({ text: 'Defina um prazo para o projeto.', act: 'editProject' });
    if (!p.budget) out.push({ text: 'Registre o orçamento previsto para acompanhar o saldo.', act: 'editProject' });
    if (!tasks.length) out.push({ text: 'Adicione as primeiras tarefas para calcular o progresso.', act: 'newTaskInProject' });
    const noDue = tasks.filter((t) => t.status !== 'done' && !t.due).length;
    if (noDue) out.push({ text: `${U.count(noDue, 'tarefa pendente está', 'tarefas pendentes estão')} sem prazo.` });
    if (p.due) {
      const late = tasks.filter((t) => t.status !== 'done' && t.due && t.due > p.due).length;
      if (late) out.push({ text: `${U.count(late, 'tarefa termina', 'tarefas terminam')} depois do prazo do projeto.` });
    }
    lists.forEach((l) => {
      const pend = l.items.filter((i) => !i.done).length;
      if (l.type === 'documentos' && pend) out.push({ text: `${U.count(pend, 'documento pendente', 'documentos pendentes')} em “${l.name}”.`, listId: l.id });
      if (l.type === 'compras') {
        const noPrice = l.items.filter((i) => !i.done && !(Number(i.price) > 0)).length;
        if (noPrice) out.push({ text: `${U.count(noPrice, 'item sem preço estimado', 'itens sem preço estimado')} em “${l.name}”.`, listId: l.id });
      }
    });
    return out;
  },

  /* Conflitos de horário: mapa id -> [ids em conflito]. */
  conflicts(events = DB.all('events')) {
    const map = new Map();
    const byDate = {};
    events.forEach((e) => { (byDate[e.date] = byDate[e.date] || []).push(e); });
    Object.values(byDate).forEach((list) => {
      const sorted = list.slice().sort((a, b) => U.timeToMin(a.start) - U.timeToMin(b.start));
      for (let i = 0; i < sorted.length; i++) {
        for (let j = i + 1; j < sorted.length; j++) {
          const a = sorted[i], b = sorted[j];
          if (U.timeToMin(b.start) >= U.timeToMin(a.end)) break;
          if (!map.has(a.id)) map.set(a.id, []);
          if (!map.has(b.id)) map.set(b.id, []);
          map.get(a.id).push(b.id);
          map.get(b.id).push(a.id);
        }
      }
    });
    return map;
  },

  eventsOn(date) {
    return DB.all('events').filter((e) => e.date === date).sort((a, b) => U.timeToMin(a.start) - U.timeToMin(b.start));
  },

  /* Intervalos livres numa janela, considerando compromissos. */
  freeSlots(date, startMin, endMin, extraBusy = []) {
    const busy = L.eventsOn(date).map((e) => [U.timeToMin(e.start), U.timeToMin(e.end)])
      .concat(extraBusy)
      .map(([s, e]) => [Math.max(s, startMin), Math.min(e, endMin)])
      .filter(([s, e]) => e > s)
      .sort((a, b) => a[0] - b[0]);
    const merged = [];
    busy.forEach((b) => {
      const last = merged[merged.length - 1];
      if (last && b[0] <= last[1]) last[1] = Math.max(last[1], b[1]);
      else merged.push(b.slice());
    });
    const free = [];
    let cur = startMin;
    merged.forEach(([s, e]) => { if (s > cur) free.push([cur, s]); cur = Math.max(cur, e); });
    if (cur < endMin) free.push([cur, endMin]);
    return free;
  },

  /*
    Organizar meu dia.
    order: lista de ids na ordem desejada (opcional). durations: {id: min} (opcional).
  */
  organizeDay({ date, start, end, order, durations = {}, exclude = [] }) {
    const startMin = U.timeToMin(start), endMin = U.timeToMin(end);
    const scheduledIds = new Set(L.eventsOn(date).map((e) => e.taskId).filter(Boolean));
    const pool = DB.all('tasks').filter((t) => t.status !== 'done' && L.projectActive(t.projectId) && !scheduledIds.has(t.id));
    const poolIds = new Set(pool.map((t) => t.id));

    let seq;
    if (order) {
      seq = order.map((id) => DB.get('tasks', id)).filter((t) => t && poolIds.has(t.id));
    } else {
      // Ordenação por pontuação respeitando dependências (uma tarefa só entra depois das que ela depende).
      const scored = pool.map((t) => ({ t, s: L.score(t).s })).sort((a, b) => (b.s - a.s) || (a.t.order - b.t.order));
      seq = [];
      const placed = new Set();
      let progress = true;
      while (progress) {
        progress = false;
        for (const { t } of scored) {
          if (placed.has(t.id)) continue;
          const ok = L.blockers(t).every((b) => placed.has(b.id));
          if (ok) { seq.push(t); placed.add(t.id); progress = true; break; }
        }
      }
    }
    const excluded = new Set(exclude);
    const active = seq.filter((t) => !excluded.has(t.id));
    const blockedOut = order ? [] : pool.filter((t) => !seq.includes(t)); // dependências fora do alcance

    let free = L.freeSlots(date, startMin, endMin);
    // Hoje: não agenda no passado.
    if (date === U.today()) {
      const now = Math.ceil(U.nowMin() / 5) * 5;
      free = free.map(([s, e]) => [Math.max(s, now), e]).filter(([s, e]) => e > s);
    }
    const freeTotal = free.reduce((s, [a, b]) => s + (b - a), 0);
    const slots = [];
    const unfit = [];
    const endOf = {};
    active.forEach((t) => {
      const dur = Math.max(5, Number(durations[t.id] || t.duration || 30));
      // Precisa começar depois do fim das dependências agendadas nesta proposta.
      const minStart = L.blockers(t).reduce((m, b) => Math.max(m, endOf[b.id] || 0), 0);
      const depsMissing = L.blockers(t).filter((b) => !(b.id in endOf));
      let placed = false;
      if (!depsMissing.length) {
        for (let i = 0; i < free.length; i++) {
          const [s, e] = free[i];
          const st = Math.max(s, minStart);
          if (e - st >= dur) {
            slots.push({ taskId: t.id, start: st, end: st + dur, duration: dur });
            endOf[t.id] = st + dur;
            const pieces = [];
            if (st > s) pieces.push([s, st]);
            if (st + dur < e) pieces.push([st + dur, e]);
            free.splice(i, 1, ...pieces);
            placed = true;
            break;
          }
        }
      }
      if (!placed) {
        const largest = free.reduce((m, [s, e]) => Math.max(m, e - Math.max(s, minStart)), 0);
        unfit.push({ taskId: t.id, duration: dur, missing: Math.max(0, dur - largest), depsMissing: depsMissing.map((d) => d.id) });
      }
    });
    slots.sort((a, b) => a.start - b.start);
    const used = slots.reduce((s, x) => s + x.duration, 0);
    return {
      slots, unfit, sequence: active.map((t) => t.id), excluded: seq.filter((t) => excluded.has(t.id)).map((t) => t.id),
      blockedOut: blockedOut.map((t) => t.id), freeTotal, used, remaining: Math.max(0, freeTotal - used),
      busy: L.eventsOn(date).filter((e) => U.timeToMin(e.end) > startMin && U.timeToMin(e.start) < endMin),
    };
  },

  /* Primeiro horário livre num dia (para reagendar). */
  firstFreeSlot(date, duration, from = '08:00', to = '20:00') {
    let free = L.freeSlots(date, U.timeToMin(from), U.timeToMin(to));
    if (date === U.today()) {
      const now = Math.ceil(U.nowMin() / 5) * 5;
      free = free.map(([s, e]) => [Math.max(s, now), e]).filter(([s, e]) => e > s);
    }
    const f = free.find(([s, e]) => e - s >= duration);
    return f ? { start: f[0], end: f[0] + duration } : null;
  },

  /* Pontuação ponderada do comparador. */
  compareScores(c) {
    const weightSum = c.criteria.reduce((s, k) => s + (Number(k.weight) || 0), 0);
    const max = weightSum * 5;
    const rows = c.options.map((o) => {
      const parts = c.criteria.map((k) => ({ crit: k, score: Number((o.scores || {})[k.id]) || 0, weight: Number(k.weight) || 0 }));
      const total = parts.reduce((s, p) => s + p.score * p.weight, 0);
      return { option: o, total, pct: max ? (total / max) * 100 : 0, parts };
    }).sort((a, b) => b.total - a.total);
    return { rows, max, weightSum };
  },

  notifications() {
    const out = [];
    const today = U.today();
    DB.all('tasks').forEach((t) => {
      if (t.status === 'done' || !L.projectActive(t.projectId)) return;
      if (t.due && t.due < today) {
        out.push({ key: `overdue:${t.id}:${t.due}`, tone: 'danger', icon: 'alert', title: `Tarefa atrasada: ${t.title}`, text: `O prazo era ${U.fmtDate(t.due)}.`, open: { type: 'task', id: t.id } });
      } else if (t.due && U.diffDays(today, t.due) <= 1) {
        out.push({ key: `due:${t.id}:${t.due}`, tone: 'warn', icon: 'clock', title: `${t.due === today ? 'Vence hoje' : 'Vence amanhã'}: ${t.title}`, text: L.isBlocked(t) ? 'Atenção: ainda há dependências pendentes.' : 'Está livre para começar.', open: { type: 'task', id: t.id } });
      }
      if (L.isBlocked(t) && t.due && U.diffDays(today, t.due) <= 3 && t.due >= today) {
        const b = L.blockers(t)[0];
        out.push({ key: `blocked:${t.id}:${b.id}`, tone: 'warn', icon: 'lock', title: `Bloqueada: ${t.title}`, text: `Aguarda “${b.title}”.`, open: { type: 'task', id: b.id } });
      }
    });
    DB.all('projects').forEach((p) => {
      if (p.archived || !(p.budget > 0)) return;
      const { committed } = L.spent(p.id);
      if (committed > p.budget) out.push({ key: `budget-over:${p.id}`, tone: 'danger', icon: 'wallet', title: `Orçamento ultrapassado: ${p.name}`, text: `${U.fmtMoney(committed)} comprometidos de ${U.fmtMoney(p.budget)}.`, open: { type: 'project', id: p.id } });
      else if (committed >= p.budget * 0.9) out.push({ key: `budget-90:${p.id}`, tone: 'warn', icon: 'wallet', title: `Orçamento quase no limite: ${p.name}`, text: `${Math.round((committed / p.budget) * 100)}% do orçamento comprometido.`, open: { type: 'project', id: p.id } });
    });
    const conf = L.conflicts();
    const seen = new Set();
    conf.forEach((others, id) => {
      others.forEach((o) => {
        const key = [id, o].sort().join(':');
        if (seen.has(key)) return;
        seen.add(key);
        const a = DB.get('events', id), b = DB.get('events', o);
        if (!a || !b || a.date < today) return;
        out.push({ key: `conflict:${key}:${a.start}-${b.start}`, tone: 'warn', icon: 'calendar', title: `Conflito de horário em ${U.fmtDate(a.date)}`, text: `“${a.title}” e “${b.title}” se sobrepõem.`, open: { type: 'event', id: a.id } });
      });
    });
    const rank = { danger: 0, warn: 1, info: 2 };
    return out.sort((a, b) => rank[a.tone] - rank[b.tone]);
  },

  search(q) {
    const tokens = U.normalize(q).split(/\s+/).filter(Boolean);
    if (!tokens.length) return [];
    const hit = (...fields) => { const h = U.normalize(fields.join(' ')); return tokens.every((t) => h.includes(t)); };
    const groups = [];
    const projects = DB.all('projects').filter((p) => hit(p.name, p.description)).map((p) => ({ type: 'project', id: p.id, title: p.name, sub: `${PROJECT_STATUS[p.status]?.label || ''}${p.archived ? ' · Arquivado' : ''} · ${L.progress(p.id).pct}% concluído`, icon: 'folder', color: p.color }));
    const tasks = DB.all('tasks').filter((t) => hit(t.title, t.description, (t.subtasks || []).map((s) => s.title).join(' '))).map((t) => ({ type: 'task', id: t.id, title: t.title, sub: [TASK_STATUS[t.status], L.project(t.projectId)?.name, t.due ? 'Prazo ' + U.fmtDate(t.due) : ''].filter(Boolean).join(' · '), icon: 'tasks' }));
    const notes = DB.all('notes').filter((n) => hit(n.title, n.body, (n.tags || []).join(' '))).map((n) => ({ type: 'note', id: n.id, title: n.title || 'Nota sem título', sub: [(n.tags || []).map((t) => '#' + t).join(' '), L.project(n.projectId)?.name].filter(Boolean).join(' · ') || n.body.slice(0, 70), icon: 'note' }));
    const lists = DB.all('lists').filter((l) => hit(l.name, l.items.map((i) => i.name + ' ' + (i.note || '')).join(' '))).map((l) => ({ type: 'list', id: l.id, title: l.name, sub: `${LIST_TYPES[l.type]?.short || ''} · ${l.items.filter((i) => i.done).length} de ${l.items.length} itens`, icon: LIST_TYPES[l.type]?.icon || 'list' }));
    const events = DB.all('events').filter((e) => hit(e.title, e.notes)).map((e) => ({ type: 'event', id: e.id, title: e.title, sub: `${U.fmtDate(e.date)} · ${e.start}–${e.end}`, icon: 'calendar' }));
    const cmps = DB.all('comparisons').filter((c) => hit(c.title, c.options.map((o) => o.name).join(' '))).map((c) => ({ type: 'comparison', id: c.id, title: c.title, sub: `${U.count(c.options.length, 'opção', 'opções')} · ${U.count(c.criteria.length, 'critério', 'critérios')}`, icon: 'scale' }));
    if (projects.length) groups.push({ label: 'Projetos', items: projects.slice(0, 6) });
    if (tasks.length) groups.push({ label: 'Tarefas', items: tasks.slice(0, 8) });
    if (notes.length) groups.push({ label: 'Notas', items: notes.slice(0, 6) });
    if (lists.length) groups.push({ label: 'Listas', items: lists.slice(0, 6) });
    if (events.length) groups.push({ label: 'Compromissos', items: events.slice(0, 5) });
    if (cmps.length) groups.push({ label: 'Comparações', items: cmps.slice(0, 4) });
    return groups;
  },
};

/* ---------- Ações compartilhadas (mutações com desfazer) ---------- */
const Actions = {
  async toggleTask(id) {
    const t = DB.get('tasks', id);
    if (!t) return;
    if (t.status === 'done') {
      const undo = DB.track(() => DB.patch('tasks', id, { status: 'todo', completedAt: null }));
      UI.toast(`Tarefa reaberta: ${t.title}`, { tone: 'info', action: { label: 'Desfazer', fn: undo } });
      return;
    }
    const blockers = L.blockers(t);
    if (blockers.length) {
      const ok = await UI.confirm({
        title: 'Esta tarefa tem uma dependência pendente',
        message: `“${U.esc(t.title)}” depende de “${blockers.map((b) => U.esc(b.title)).join('”, “')}”, que ainda não foi concluída. Deseja concluir mesmo assim?`,
        confirmLabel: 'Concluir mesmo assim',
      });
      if (!ok) return;
    }
    const waiting = L.openDependents(id).filter((d) => L.isBlocked(d)).map((d) => d.id);
    const undo = DB.track(() => DB.patch('tasks', id, { status: 'done', completedAt: Date.now() }));
    const freed = waiting.filter((x) => { const d = DB.get('tasks', x); return d && !L.isBlocked(d); }).length;
    const msg = freed ? `Tarefa concluída. ${freed === 1 ? 'Uma tarefa foi liberada' : U.numWord(freed, true).replace(/^./, (c) => c.toUpperCase()) + ' tarefas foram liberadas'}.` : 'Tarefa concluída.';
    UI.toast(msg, { action: { label: 'Desfazer', fn: undo } });
  },

  setTaskStatus(id, status) {
    const t = DB.get('tasks', id);
    if (!t || t.status === status) return;
    DB.patch('tasks', id, { status, completedAt: status === 'done' ? Date.now() : null });
  },

  deleteTask(id, silent) {
    const t = DB.get('tasks', id);
    if (!t) return;
    const undo = DB.track(() => Actions._removeTask(id));
    if (!silent) UI.toast(`Tarefa excluída: ${t.title}`, { tone: 'info', action: { label: 'Desfazer', fn: undo } });
    return undo;
  },
  _removeTask(id) {
    DB.remove('tasks', id);
    DB.all('tasks').filter((x) => (x.dependsOn || []).includes(id)).forEach((x) => DB.patch('tasks', x.id, { dependsOn: x.dependsOn.filter((d) => d !== id) }));
    DB.all('events').filter((e) => e.taskId === id).forEach((e) => DB.remove('events', e.id));
    DB.all('notes').filter((n) => n.taskId === id).forEach((n) => DB.patch('notes', n.id, { taskId: '' }));
  },

  async deleteProject(id) {
    const p = DB.get('projects', id);
    if (!p) return false;
    const nTasks = L.tasksOf(id).length;
    const nLists = DB.all('lists').filter((l) => l.projectId === id).length;
    const ok = await UI.confirm({
      title: `Excluir “${U.esc(p.name)}”?`,
      message: `${U.count(nTasks, 'tarefa', 'tarefas')} e ${U.count(nLists, 'lista', 'listas')} deste projeto também serão excluídas. Notas, despesas, compromissos e comparações serão mantidos sem vínculo. Você poderá desfazer logo em seguida.`,
      confirmLabel: 'Excluir projeto', danger: true,
    });
    if (!ok) return false;
    const undo = DB.track(() => {
      DB.remove('projects', id);
      L.tasksOf(id).forEach((t) => Actions._removeTask(t.id));
      DB.all('lists').filter((l) => l.projectId === id).forEach((l) => DB.remove('lists', l.id));
      ['notes', 'expenses', 'events', 'comparisons'].forEach((col) => DB.all(col).filter((x) => x.projectId === id).forEach((x) => DB.patch(col, x.id, { projectId: '' })));
    });
    UI.toast(`Projeto excluído: ${p.name}`, { tone: 'info', action: { label: 'Desfazer', fn: undo } });
    return true;
  },

  toggleArchive(id) {
    const p = DB.get('projects', id);
    if (!p) return;
    const undo = DB.track(() => DB.patch('projects', id, { archived: !p.archived }));
    UI.toast(p.archived ? `Projeto restaurado: ${p.name}` : `Projeto arquivado: ${p.name}`, { tone: 'info', action: { label: 'Desfazer', fn: undo } });
  },

  deleteSimple(col, id, label) {
    const o = DB.get(col, id);
    if (!o) return;
    const undo = DB.track(() => {
      DB.remove(col, id);
      if (col === 'expenses') {
        DB.all('lists').forEach((l) => {
          if (l.items.some((i) => i.expenseId === id)) DB.put('lists', { ...l, items: l.items.map((i) => (i.expenseId === id ? { ...i, expenseId: '' } : i)) });
        });
      }
    });
    const name = o.title || o.name || o.description;
    UI.toast(`${label}${name ? ': ' + name : ''}`, { tone: 'info', action: { label: 'Desfazer', fn: undo } });
  },

  /* Reordenação: devolve o novo valor de "order" para inserir antes/depois do alvo. */
  orderBetween(sorted, dragId, targetId, after) {
    const arr = sorted.filter((x) => x.id !== dragId);
    const i = arr.findIndex((x) => x.id === targetId);
    if (i < 0) return (arr.length ? arr[arr.length - 1].order : 0) + 1000;
    const idx = after ? i + 1 : i;
    const prev = arr[idx - 1], next = arr[idx];
    if (!prev && !next) return 1000;
    if (!prev) return next.order - 1000;
    if (!next) return prev.order + 1000;
    return (prev.order + next.order) / 2;
  },
  /* Move um item um passo para cima/baixo numa sequência visível. */
  stepOrder(col, sorted, id, dir) {
    const i = sorted.findIndex((x) => x.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= sorted.length) return false;
    const a = sorted[i], b = sorted[j];
    let oa = a.order, ob = b.order;
    if (oa === ob) ob = oa + dir;
    DB.patch(col, a.id, { order: ob });
    DB.patch(col, b.id, { order: oa });
    return true;
  },
};

/* ---------- Validação de backup ---------- */
function validateBackup(obj) {
  const errors = [];
  if (!obj || typeof obj !== 'object') return { ok: false, errors: ['O arquivo não contém um objeto JSON válido.'] };
  if (obj.app !== 'ENTRELIA') errors.push('O arquivo não foi gerado pelo ENTRELIA (campo "app" ausente ou diferente).');
  const d = obj.dados;
  if (!d || typeof d !== 'object') { errors.push('O arquivo não possui a seção "dados".'); return { ok: false, errors }; }
  const req = {
    projects: (x) => typeof x.name === 'string',
    tasks: (x) => typeof x.title === 'string',
    events: (x) => typeof x.title === 'string' && U.parse(x.date) && !isNaN(U.timeToMin(x.start)) && !isNaN(U.timeToMin(x.end)),
    lists: (x) => typeof x.name === 'string' && Array.isArray(x.items),
    expenses: (x) => typeof x.description === 'string' && typeof x.amount === 'number' && isFinite(x.amount) && U.parse(x.date),
    comparisons: (x) => typeof x.title === 'string' && Array.isArray(x.criteria) && Array.isArray(x.options),
    notes: (x) => typeof x.title === 'string' && typeof x.body === 'string',
  };
  const labels = { projects: 'projetos', tasks: 'tarefas', events: 'compromissos', lists: 'listas', expenses: 'despesas', comparisons: 'comparações', notes: 'notas' };
  const clean = {};
  const counts = {};
  for (const col of DB.COLS) {
    const arr = d[col] === undefined ? [] : d[col];
    if (!Array.isArray(arr)) { errors.push(`"${labels[col]}" deveria ser uma lista.`); continue; }
    const ids = new Set();
    arr.forEach((x, i) => {
      if (!x || typeof x !== 'object' || typeof x.id !== 'string' || !x.id) { errors.push(`Item ${i + 1} de ${labels[col]} está sem identificador.`); return; }
      if (ids.has(x.id)) { errors.push(`Identificador repetido em ${labels[col]}: ${x.id}.`); return; }
      if (!req[col](x)) { errors.push(`Item ${i + 1} de ${labels[col]} tem campos obrigatórios ausentes ou inválidos.`); return; }
      ids.add(x.id);
    });
    const factory = { projects: M.project, tasks: M.task, events: M.event, lists: M.list, expenses: M.expense, comparisons: M.comparison, notes: M.note }[col];
    clean[col] = arr.map((x) => factory(x));
    if (col === 'lists') clean[col] = clean[col].map((l) => ({ ...l, items: l.items.map((it) => M.item(it)) }));
    counts[col] = arr.length;
  }
  if (errors.length) return { ok: false, errors: errors.slice(0, 8), more: Math.max(0, errors.length - 8) };
  // Remove referências quebradas entre tarefas.
  const taskIds = new Set(clean.tasks.map((t) => t.id));
  clean.tasks = clean.tasks.map((t) => ({ ...t, dependsOn: (t.dependsOn || []).filter((id) => taskIds.has(id) && id !== t.id), subtasks: Array.isArray(t.subtasks) ? t.subtasks : [] }));
  return { ok: true, data: clean, counts, labels, prefs: obj.preferencias || {}, exportedAt: obj.exportadoEm };
}
