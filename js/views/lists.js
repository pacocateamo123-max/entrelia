'use strict';

const ListUtil = {
  totals(l) {
    const est = l.items.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.qty) || 1), 0);
    const bought = l.items.filter((i) => i.done).reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.qty) || 1), 0);
    const done = l.items.filter((i) => i.done).length;
    return { est, bought, done, total: l.items.length, pct: l.items.length ? Math.round((done / l.items.length) * 100) : 0 };
  },
  expenseFor(item) {
    if (!item.expenseId) return null;
    return DB.get('expenses', item.expenseId);
  },
  sorted(filter = () => true) {
    return DB.all('lists').filter(filter).sort((a, b) => a.order - b.order);
  },
};

VIEWS.listas = {
  title: 'Listas',
  render(param) {
    if (param) return this.detail(param);
    const project = UIS.get('lists', 'project', '');
    const type = UIS.get('lists', 'type', '');
    const all = DB.all('lists');
    const vis = ListUtil.sorted((l) => (!project || (project === '__none' ? !l.projectId : l.projectId === project)) && (!type || l.type === type));
    return `
      <div class="page-head">
        <div><h1 class="page-title">Listas</h1><p class="page-sub">Compras, documentos, materiais e etapas — independentes ou ligadas a projetos.</p></div>
        <div class="actions"><button type="button" class="btn btn-primary" data-act="newList">${icon('plus', 'ic-sm')}Nova lista</button></div>
      </div>
      ${all.length ? `<div class="toolbar">
        <label class="sr-only" for="lf-proj">Projeto</label>
        <select id="lf-proj" class="select" data-change="listFilter" data-key="project">${C.opts([['', 'Todos os projetos'], ['__none', 'Independentes'], ...DB.all('projects').filter((p) => !p.archived).map((p) => [p.id, p.name])], project)}</select>
        <label class="sr-only" for="lf-type">Tipo</label>
        <select id="lf-type" class="select" data-change="listFilter" data-key="type">${C.opts([['', 'Todos os tipos'], ...Object.entries(LIST_TYPES).map(([k, v]) => [k, v.label])], type)}</select>
        <span class="toolbar-count">${U.count(vis.length, 'lista', 'listas')}</span>
      </div>` : ''}
      ${!all.length ? C.empty({ ic: 'list', title: 'Crie sua primeira lista', text: 'Listas de compras somam os preços estimados e podem virar despesas com um clique.', actions: `<button type="button" class="btn btn-primary" data-act="newList">${icon('plus', 'ic-sm')}Nova lista</button>` })
        : vis.length ? `<div class="grid g-auto">${vis.map((l) => this.card(l, { drag: true })).join('')}</div>
          <p class="hint mt-16">${icon('info', 'ic-xs')} Arraste os cartões ou use o menu “⋯” para mudar a ordem.</p>`
        : C.empty({ ic: 'filter', title: 'Nenhuma lista com estes filtros', actions: `<button type="button" class="btn" data-act="clearListFilters">Limpar filtros</button>` }, true)}`;
  },

  card(l, o = {}) {
    const t = ListUtil.totals(l);
    const type = LIST_TYPES[l.type] || LIST_TYPES.personalizada;
    return `<article class="card interactive list-card anim-in" data-key="lc-${l.id}" ${o.drag ? `draggable="true" data-drag="list:${l.id}" data-drop="list:${l.id}"` : ''}>
      <div class="row" style="align-items:flex-start">
        <span class="list-type-ic t-${l.type}">${icon(type.icon)}</span>
        <div class="grow stack" style="--gap:4px">
          <a class="list-link" href="#/listas/${l.id}">${U.esc(l.name)}</a>
          <div class="row wrap xs muted" style="--gap:8px"><span>${type.short}</span>${o.showProject !== false ? C.projectChip(l.projectId) : ''}${l.demo ? C.badge('Demonstração', 'muted') : ''}</div>
        </div>
        ${C.menuBtn('listMenu', l.id, `Ações da lista ${l.name}`)}
      </div>
      <div>
        <div class="row between xs"><span class="strong">${t.done} de ${t.total} ${t.total === 1 ? 'item' : 'itens'}</span><span class="muted">${t.total ? (t.total - t.done ? `faltam ${t.total - t.done}` : 'completa') : 'vazia'}</span></div>
        <div class="mt-8">${C.progress(t.pct, { label: `Progresso de ${l.name}` })}</div>
      </div>
      ${l.type === 'compras' ? `<div class="row between small"><span class="muted">Total estimado</span><span class="strong num">${U.fmtMoney(t.est)}</span></div>` : ''}
    </article>`;
  },

  detail(id) {
    const l = DB.get('lists', id);
    if (!l) return `<a class="back-link" href="#/listas">${icon('arrowLeft', 'ic-sm')}Listas</a>${C.empty({ ic: 'list', title: 'Lista não encontrada', text: 'Ela pode ter sido excluída.', actions: '<a class="btn" href="#/listas">Ver listas</a>' })}`;
    const t = ListUtil.totals(l);
    const type = LIST_TYPES[l.type] || LIST_TYPES.personalizada;
    const shop = l.type === 'compras';
    const p = L.project(l.projectId);
    const registered = l.items.filter((i) => ListUtil.expenseFor(i)).reduce((s, i) => s + ListUtil.expenseFor(i).amount, 0);
    return `
      <a class="back-link" href="${p ? '#/projetos/' + p.id : '#/listas'}">${icon('arrowLeft', 'ic-sm')}${p ? U.esc(p.name) : 'Listas'}</a>
      <div class="page-head">
        <div class="row" style="align-items:flex-start;--gap:14px">
          <span class="list-type-ic t-${l.type}" style="width:48px;height:48px">${icon(type.icon, 'ic-lg')}</span>
          <div>
            <h1 class="page-title">${U.esc(l.name)}</h1>
            <div class="row wrap mt-8" style="--gap:8px">${C.badge(type.label, 'muted')}${p ? `<a href="#/projetos/${p.id}">${C.projectChip(p.id)}</a>` : C.badge('Independente', 'muted')}</div>
          </div>
        </div>
        <div class="actions">
          <button type="button" class="btn" data-act="editList" data-id="${l.id}">${icon('edit', 'ic-sm')}Editar</button>
          <button type="button" class="btn" data-act="duplicateList" data-id="${l.id}">${icon('copy', 'ic-sm')}Duplicar</button>
          ${C.menuBtn('listMenu', l.id, 'Mais ações da lista', 'data-detail="1"')}
        </div>
      </div>

      <div class="grid ${shop ? 'g-4' : 'g-2'}">
        <div class="card stat"><div class="stat-label">Concluídos</div><div class="stat-value">${t.done}<span class="muted" style="font-size:16px"> / ${t.total}</span></div>${C.progress(t.pct, { label: 'Itens concluídos' })}</div>
        ${shop ? `
          ${C.stat({ label: 'Total estimado', value: U.fmtMoney(t.est), foot: 'Quantidade × preço', ic: 'cart' })}
          ${C.stat({ label: 'Já comprado', value: U.fmtMoney(t.bought), foot: `Faltam ${U.fmtMoney(t.est - t.bought)}`, ic: 'check', tone: 'accent' })}
          ${C.stat({ label: 'Registrado em custos', value: U.fmtMoney(registered), foot: 'Itens convertidos em despesa', ic: 'receipt', tone: 'warn' })}`
          : `<div class="card stat"><div class="stat-label">Pendentes</div><div class="stat-value">${t.total - t.done}</div><div class="stat-foot">${t.total - t.done ? 'Itens a resolver' : 'Tudo pronto'}</div></div>`}
      </div>

      <h2 class="section-head section-title">${icon('plus')}Adicionar item</h2>
      <form class="add-item ${shop ? '' : 'no-price'}" data-submit="addItem" data-id="${l.id}" aria-label="Adicionar item">
        <div class="field ai-name"><label class="sr-only" for="ai-name">Nome do item</label><input class="input" id="ai-name" name="name" placeholder="Nome do item" maxlength="120" autocomplete="off"></div>
        <div class="field"><label class="sr-only" for="ai-qty">Quantidade</label><input class="input" id="ai-qty" name="qty" type="number" min="1" step="1" value="1" inputmode="numeric" title="Quantidade"></div>
        ${shop ? `<div class="field"><label class="sr-only" for="ai-price">Preço unitário estimado</label><input class="input" id="ai-price" name="price" inputmode="decimal" placeholder="Preço (R$)"></div>` : ''}
        <button type="submit" class="btn btn-primary">${icon('plus', 'ic-sm')}Adicionar</button>
      </form>

      ${l.items.length ? `<div class="task-list">${l.items.map((it, i) => this.itemRow(l, it, i)).join('')}</div>
        ${shop ? `<div class="row between card mt-16" style="padding:14px 18px"><span class="strong">Total estimado</span><span class="strong num" style="font-size:18px">${U.fmtMoney(t.est)}</span></div>` : ''}
        <p class="hint mt-16">${icon('info', 'ic-xs')} Arraste pela alça ou use as setas para reordenar.${shop ? ' Itens marcados podem ser registrados como despesa — cada item só pode gerar uma despesa.' : ''}</p>`
        : C.empty({ ic: type.icon, title: 'Lista vazia', text: 'Adicione o primeiro item no campo acima.' }, true)}`;
  },

  itemRow(l, it, i) {
    const shop = l.type === 'compras';
    const exp = ListUtil.expenseFor(it);
    const sub = (Number(it.price) || 0) * (Number(it.qty) || 1);
    return `<div class="item-row anim-in ${it.done ? 'is-done' : ''}" data-key="it-${it.id}" draggable="true" data-drag="item:${it.id}" data-drop="item:${it.id}">
      <span class="drag-handle" aria-hidden="true">${icon('grip', 'ic-sm')}</span>
      <button type="button" class="check square ${it.done ? 'is-done' : ''}" data-act="toggleItem" data-list="${l.id}" data-item="${it.id}" aria-pressed="${it.done}" aria-label="${it.done ? 'Desmarcar' : 'Marcar'}: ${U.esc(it.name)}">${icon('check')}</button>
      <div style="min-width:0">
        <div class="item-name">${it.qty > 1 ? `<span class="muted">${it.qty}×</span> ` : ''}${U.esc(it.name)}</div>
        ${it.note ? `<div class="item-note">${U.esc(it.note)}</div>` : ''}
        ${exp ? `<a class="badge b-accent mt-8" href="#/custos" data-act="focusExpense" data-id="${exp.id}" style="width:max-content">${icon('receipt')}<span>Despesa registrada · ${U.fmtMoney(exp.amount)}</span></a>` : ''}
      </div>
      <div class="item-money">${shop ? (it.price ? `<div class="strong">${U.fmtMoney(sub)}</div>${it.qty > 1 ? `<div class="xs muted">${U.fmtMoney(it.price)} cada</div>` : ''}` : '<span class="xs faint">Sem preço</span>') : ''}</div>
      <div class="task-tools">
        ${shop && it.done && !exp ? `<button type="button" class="btn btn-sm" data-act="itemExpense" data-list="${l.id}" data-item="${it.id}">${icon('receipt', 'ic-sm')}<span class="hide-m">Registrar despesa</span><span class="sr-only">Registrar despesa de ${U.esc(it.name)}</span></button>` : ''}
        <button type="button" class="btn btn-ghost btn-icon btn-sm" data-act="moveItem" data-list="${l.id}" data-item="${it.id}" data-dir="-1" aria-label="Mover para cima: ${U.esc(it.name)}" ${i === 0 ? 'disabled' : ''}>${icon('arrowUp', 'ic-sm')}</button>
        <button type="button" class="btn btn-ghost btn-icon btn-sm" data-act="moveItem" data-list="${l.id}" data-item="${it.id}" data-dir="1" aria-label="Mover para baixo: ${U.esc(it.name)}" ${i === l.items.length - 1 ? 'disabled' : ''}>${icon('arrowDown', 'ic-sm')}</button>
        <button type="button" class="btn btn-ghost btn-icon btn-sm menu-btn" data-act="itemMenu" data-list="${l.id}" data-item="${it.id}" aria-label="Ações do item ${U.esc(it.name)}" aria-haspopup="menu" aria-expanded="false">${icon('more')}</button>
      </div>
    </div>`;
  },
};

/* ---------- Ações ---------- */
A.listFilter = (el) => UIS.set('lists', el.dataset.key, el.value);
A.clearListFilters = () => UIS.patch('lists', { project: '', type: '' });
A.newList = (el) => ListModal.open(null, { projectId: el?.dataset?.project || '' });
A.editList = (el) => ListModal.open(el.dataset.id);
A.duplicateList = (el) => ListActions.duplicate(el.dataset.id);

const ListActions = {
  duplicate(id) {
    const l = DB.get('lists', id);
    if (!l) return;
    const copy = M.list({ ...structuredClone(l), id: U.uid(), name: `${l.name} (cópia)`, order: l.order + 1, createdAt: undefined, demo: undefined,
      items: l.items.map((i) => ({ ...i, id: U.uid(), done: false, expenseId: '' })) });
    DB.put('lists', copy);
    UI.toast('Lista duplicada com os itens desmarcados.', { action: { label: 'Abrir', fn: () => App.go('#/listas/' + copy.id) } });
  },
  async remove(id, inDetail) {
    const l = DB.get('lists', id);
    if (!l) return;
    const ok = await UI.confirm({ title: 'Excluir lista?', message: `“${U.esc(l.name)}” e seus ${U.count(l.items.length, 'item', 'itens')} serão excluídos. Despesas já registradas são mantidas.`, confirmLabel: 'Excluir lista', danger: true });
    if (!ok) return;
    if (inDetail) App.go(l.projectId ? '#/projetos/' + l.projectId : '#/listas');
    Actions.deleteSimple('lists', id, 'Lista excluída');
  },
  updateItems(listId, fn) {
    const l = DB.clone('lists', listId);
    if (!l) return null;
    fn(l.items, l);
    DB.put('lists', l);
    return l;
  },
};

A.listMenu = (el) => {
  const l = DB.get('lists', el.dataset.id);
  if (!l) return;
  const inDetail = el.dataset.detail === '1';
  const seq = ListUtil.sorted();
  const i = seq.findIndex((x) => x.id === l.id);
  UI.menu(el, [
    ...(inDetail ? [] : [{ label: 'Abrir lista', icon: 'arrowRight', fn: () => App.go('#/listas/' + l.id) }]),
    { label: 'Editar nome e tipo', icon: 'edit', fn: () => ListModal.open(l.id) },
    { label: 'Duplicar', icon: 'copy', fn: () => ListActions.duplicate(l.id) },
    { label: 'Desmarcar todos os itens', icon: 'refresh', disabled: !l.items.some((x) => x.done), fn: () => { const undo = DB.track(() => ListActions.updateItems(l.id, (items) => items.forEach((x) => { x.done = false; }))); UI.toast('Itens desmarcados.', { tone: 'info', action: { label: 'Desfazer', fn: undo } }); } },
    ...(inDetail ? [] : [{ header: 'Ordem' },
      { label: 'Mover para frente', icon: 'arrowUp', disabled: i <= 0, fn: () => Actions.stepOrder('lists', seq, l.id, -1) },
      { label: 'Mover para trás', icon: 'arrowDown', disabled: i >= seq.length - 1, fn: () => Actions.stepOrder('lists', seq, l.id, 1) }]),
    '-',
    { label: 'Excluir lista', icon: 'trash', danger: true, fn: () => ListActions.remove(l.id, inDetail) },
  ]);
};

A.addItem = (form) => {
  const name = form.name.value.trim();
  const l = DB.get('lists', form.dataset.id);
  if (!name) { UI.fieldError(form, 'name', 'Informe o nome do item.'); form.name.focus(); return; }
  UI.fieldError(form, 'name', '');
  const qty = Math.max(1, Math.round(+form.qty.value || 1));
  let price = 0;
  if (form.price && form.price.value.trim()) {
    price = U.parseMoney(form.price.value);
    if (isNaN(price) || price < 0) { UI.fieldError(form, 'price', 'Preço inválido.'); form.price.focus(); return; }
    UI.fieldError(form, 'price', '');
  }
  ListActions.updateItems(l.id, (items) => items.push(M.item({ name, qty, price })));
  form.name.value = ''; form.qty.value = '1'; if (form.price) form.price.value = '';
  form.name.focus();
};

A.toggleItem = (el) => {
  ListActions.updateItems(el.dataset.list, (items) => { const it = items.find((x) => x.id === el.dataset.item); if (it) it.done = !it.done; });
};

A.moveItem = (el) => {
  const dir = +el.dataset.dir;
  ListActions.updateItems(el.dataset.list, (items) => {
    const i = items.findIndex((x) => x.id === el.dataset.item);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= items.length) return;
    [items[i], items[j]] = [items[j], items[i]];
  });
  requestAnimationFrame(() => {
    const again = document.querySelector(`[data-act="moveItem"][data-item="${el.dataset.item}"][data-dir="${dir}"]`);
    if (again && !again.disabled) again.focus();
  });
};

A.itemMenu = (el) => {
  const l = DB.get('lists', el.dataset.list);
  const it = l && l.items.find((x) => x.id === el.dataset.item);
  if (!it) return;
  const exp = ListUtil.expenseFor(it);
  UI.menu(el, [
    { label: 'Editar item', icon: 'edit', fn: () => ItemModal.open(l.id, it.id) },
    { label: it.done ? 'Desmarcar' : 'Marcar como concluído', icon: 'check', fn: () => A.toggleItem(el) },
    ...(l.type === 'compras' ? [exp
      ? { label: 'Ver despesa registrada', icon: 'receipt', fn: () => ExpenseModal.open(exp.id) }
      : { label: 'Registrar como despesa', icon: 'receipt', disabled: !it.done, hint: it.done ? '' : 'marque antes', fn: () => ItemActions.toExpense(l.id, it.id) }] : []),
    '-',
    { label: 'Excluir item', icon: 'trash', danger: true, fn: () => {
      const undo = DB.track(() => ListActions.updateItems(l.id, (items) => items.splice(items.findIndex((x) => x.id === it.id), 1)));
      UI.toast(`Item excluído: ${it.name}`, { tone: 'info', action: { label: 'Desfazer', fn: undo } });
    } },
  ]);
};

A.itemExpense = (el) => ItemActions.toExpense(el.dataset.list, el.dataset.item);
A.focusExpense = () => UIS.patch('costs', { period: 'all', category: '', project: '', status: '' });

const ItemActions = {
  /* Converte um item comprado em despesa — ação explícita, sem duplicar. */
  toExpense(listId, itemId) {
    const l = DB.get('lists', listId);
    const it = l && l.items.find((x) => x.id === itemId);
    if (!it) return;
    const already = ListUtil.expenseFor(it) || DB.all('expenses').find((x) => x.source && x.source.listId === listId && x.source.itemId === itemId);
    if (already) {
      if (!it.expenseId) ListActions.updateItems(listId, (items) => { items.find((x) => x.id === itemId).expenseId = already.id; });
      UI.toast('Este item já foi registrado como despesa.', { tone: 'warn', action: { label: 'Ver', fn: () => ExpenseModal.open(already.id) } });
      return;
    }
    const qty = Number(it.qty) || 1;
    ExpenseModal.open(null, {
      description: qty > 1 ? `${it.name} (${qty} un.)` : it.name,
      amount: (Number(it.price) || 0) * qty,
      category: 'Compras',
      projectId: l.projectId,
      status: 'pago',
      source: { listId, itemId },
      title: 'Registrar item como despesa',
    });
  },
};

/* ---------- Modais ---------- */
const ListModal = {
  open(id, defaults = {}) {
    const existing = id ? DB.get('lists', id) : null;
    const l = existing ? { ...existing } : M.list({ projectId: defaults.projectId || '', type: defaults.type || 'compras' });
    UI.modal({
      title: existing ? 'Editar lista' : 'Nova lista',
      body: `<form id="list-form" class="stack" style="--gap:14px" novalidate>
        <div class="field"><label class="label" for="lf-name">Nome <span class="req" aria-hidden="true">*</span></label><input class="input" id="lf-name" name="name" maxlength="80" required autofocus value="${U.esc(l.name)}" placeholder="Ex.: Documentos da viagem"></div>
        <fieldset class="field"><legend class="label" style="margin-bottom:6px">Tipo</legend>
          <div class="grid g-2" style="gap:8px">${Object.entries(LIST_TYPES).map(([k, v]) => `<label class="check-line" style="background:var(--elev);border:1px solid var(--border)"><input type="radio" name="type" value="${k}" ${l.type === k ? 'checked' : ''}>${icon(v.icon, 'ic-sm')}<span>${v.label}</span></label>`).join('')}</div>
          ${existing && existing.type === 'compras' ? '<span class="hint">Ao mudar o tipo, os preços são mantidos, mas o total só aparece em listas de compras.</span>' : ''}
        </fieldset>
        <div class="field"><label class="label" for="lf-proj2">Projeto</label><select class="select" id="lf-proj2" name="projectId">${C.projectOptions(l.projectId, { empty: 'Lista independente' })}</select></div>
      </form>`,
      footer: `<button type="button" class="btn btn-ghost" data-modal-close>Cancelar</button><button type="submit" form="list-form" class="btn btn-primary">${existing ? 'Salvar' : 'Criar lista'}</button>`,
      onMount(el, m) {
        const form = el.querySelector('#list-form');
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          if (!UI.validate(form, { name: (v) => (!v ? 'Informe o nome da lista.' : '') })) return;
          const data = { ...l, name: form.name.value.trim(), type: form.type.value, projectId: form.projectId.value };
          if (!existing) data.order = ListUtil.sorted().reduce((mx, x) => Math.max(mx, x.order), 0) + 1000;
          DB.put('lists', data);
          m.close();
          UI.toast(existing ? 'Lista atualizada.' : 'Lista criada.');
          if (!existing) App.go('#/listas/' + data.id);
        });
      },
    });
  },
};

const ItemModal = {
  open(listId, itemId) {
    const l = DB.get('lists', listId);
    const it = l.items.find((x) => x.id === itemId);
    if (!it) return;
    const shop = l.type === 'compras';
    UI.modal({
      title: 'Editar item',
      size: 'sm',
      body: `<form id="item-form" class="stack" style="--gap:14px" novalidate>
        <div class="field"><label class="label" for="if-name">Nome <span class="req" aria-hidden="true">*</span></label><input class="input" id="if-name" name="name" maxlength="120" required autofocus value="${U.esc(it.name)}"></div>
        <div class="field"><label class="label" for="if-note">Observação</label><input class="input" id="if-note" name="note" maxlength="240" value="${U.esc(it.note)}" placeholder="Ex.: marca, tamanho, onde comprar"></div>
        <div class="form-grid">
          <div class="field"><label class="label" for="if-qty">Quantidade</label><input class="input" type="number" min="1" step="1" id="if-qty" name="qty" value="${it.qty || 1}"></div>
          ${shop ? `<div class="field"><label class="label" for="if-price">Preço unitário (R$)</label><input class="input" id="if-price" name="price" inputmode="decimal" value="${U.moneyInput(it.price)}" placeholder="0,00"></div>` : ''}
        </div>
        <label class="switch"><input type="checkbox" name="done" ${it.done ? 'checked' : ''}>Concluído</label>
      </form>`,
      footer: `<button type="button" class="btn btn-ghost" data-modal-close>Cancelar</button><button type="submit" form="item-form" class="btn btn-primary">Salvar</button>`,
      onMount(el, m) {
        const form = el.querySelector('#item-form');
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const ok = UI.validate(form, {
            name: (v) => (!v ? 'Informe o nome.' : ''),
            qty: (v) => (!(+v >= 1) ? 'A quantidade mínima é 1.' : ''),
            price: (v) => (v && (isNaN(U.parseMoney(v)) || U.parseMoney(v) < 0) ? 'Preço inválido.' : ''),
          });
          if (!ok) return;
          ListActions.updateItems(listId, (items) => {
            const x = items.find((y) => y.id === itemId);
            Object.assign(x, { name: form.name.value.trim(), note: form.note.value.trim(), qty: Math.round(+form.qty.value), done: form.done.checked });
            if (form.price) x.price = form.price.value ? U.parseMoney(form.price.value) : 0;
          });
          m.close();
          UI.toast('Item atualizado.');
        });
      },
    });
  },
};

/* Arrastar e soltar de listas e itens. */
DnD.list = ({ dragId, targetId, after }) => {
  DB.patch('lists', dragId, { order: Actions.orderBetween(ListUtil.sorted(), dragId, targetId, after) });
};
DnD.item = ({ dragId, targetId, after }) => {
  const l = DB.all('lists').find((x) => x.items.some((i) => i.id === dragId));
  if (!l || !l.items.some((i) => i.id === targetId)) return;
  ListActions.updateItems(l.id, (items) => {
    const from = items.findIndex((i) => i.id === dragId);
    const [moved] = items.splice(from, 1);
    let to = items.findIndex((i) => i.id === targetId);
    if (after) to += 1;
    items.splice(to, 0, moved);
  });
};
