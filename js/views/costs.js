'use strict';

VIEWS.custos = {
  title: 'Custos',

  filters() {
    return {
      period: UIS.get('costs', 'period', 'month'),
      from: UIS.get('costs', 'from', ''),
      to: UIS.get('costs', 'to', ''),
      category: UIS.get('costs', 'category', ''),
      project: UIS.get('costs', 'project', ''),
      status: UIS.get('costs', 'status', ''),
    };
  },

  range(f) {
    const T = U.today();
    const d = new Date();
    switch (f.period) {
      case 'month': return [U.iso(new Date(d.getFullYear(), d.getMonth(), 1)), U.iso(new Date(d.getFullYear(), d.getMonth() + 1, 0))];
      case '30': return [U.addDays(T, -29), T];
      case '90': return [U.addDays(T, -89), T];
      case 'year': return [`${d.getFullYear()}-01-01`, `${d.getFullYear()}-12-31`];
      case 'custom': return [U.parse(f.from) ? f.from : '0000-01-01', U.parse(f.to) ? f.to : '9999-12-31'];
      default: return ['0000-01-01', '9999-12-31'];
    }
  },

  scopeMatch(x, f) {
    if (f.project === '__none') return !x.projectId;
    if (f.project) return x.projectId === f.project;
    return true;
  },

  filtered(f = this.filters()) {
    const [a, b] = this.range(f);
    return DB.all('expenses').filter((x) => x.date >= a && x.date <= b && (!f.category || x.category === f.category) && (!f.status || x.status === f.status) && this.scopeMatch(x, f))
      .sort((x, y) => y.date.localeCompare(x.date) || (y.createdAt || 0) - (x.createdAt || 0));
  },

  plannedBudget(f) {
    const personal = Number(DB.getMeta().personalBudget) || 0;
    if (f.project === '__none') return { value: personal, note: 'Orçamento pessoal definido em Configurações.' };
    if (f.project) { const p = L.project(f.project); return { value: p ? p.budget : 0, note: p ? `Orçamento do projeto ${p.name}.` : '' }; }
    const projects = DB.all('projects').filter((p) => !p.archived).reduce((s, p) => s + (Number(p.budget) || 0), 0);
    return { value: projects + personal, note: 'Soma dos orçamentos dos projetos ativos e do orçamento pessoal.' };
  },

  render() {
    const f = this.filters();
    const rows = this.filtered(f);
    const all = DB.all('expenses');
    const committed = rows.reduce((s, x) => s + x.amount, 0);
    const paid = rows.filter((x) => x.status === 'pago').reduce((s, x) => s + x.amount, 0);
    const planned = this.plannedBudget(f);
    const balance = planned.value - committed;
    const [a, b] = this.range(f);
    const periodLabel = { month: 'neste mês', '30': 'nos últimos 30 dias', '90': 'nos últimos 3 meses', year: 'neste ano', all: 'em todo o período', custom: `de ${a > '0000-01-01' ? U.fmtDate(a, true) : 'início'} a ${b < '9999-12-31' ? U.fmtDate(b, true) : 'hoje'}` }[f.period];

    return `
      <div class="page-head">
        <div><h1 class="page-title">Custos</h1><p class="page-sub">Gastos pessoais e despesas de projetos, previstos e pagos.</p></div>
        <div class="actions">
          <button type="button" class="btn" data-act="exportCsv" ${rows.length ? '' : 'disabled'}>${icon('download', 'ic-sm')}Exportar CSV</button>
          <button type="button" class="btn btn-primary" data-act="newExpense">${icon('plus', 'ic-sm')}Nova despesa</button>
        </div>
      </div>
      <div class="toolbar" aria-label="Filtros de custos">
        <label class="sr-only" for="cf-period">Período</label>
        <select id="cf-period" class="select" data-change="costFilter" data-key="period">${C.opts([['month', 'Este mês'], ['30', 'Últimos 30 dias'], ['90', 'Últimos 3 meses'], ['year', 'Este ano'], ['all', 'Todo o período'], ['custom', 'Personalizado']], f.period)}</select>
        ${f.period === 'custom' ? `<label class="sr-only" for="cf-from">De</label><input id="cf-from" class="input" type="date" value="${f.from}" data-change="costFilter" data-key="from" aria-label="De"><label class="sr-only" for="cf-to">Até</label><input id="cf-to" class="input" type="date" value="${f.to}" data-change="costFilter" data-key="to" aria-label="Até">` : ''}
        <label class="sr-only" for="cf-cat">Categoria</label>
        <select id="cf-cat" class="select" data-change="costFilter" data-key="category">${C.opts([['', 'Todas as categorias'], ...CATEGORIES.map((c) => [c, c])], f.category)}</select>
        <label class="sr-only" for="cf-proj">Projeto</label>
        <select id="cf-proj" class="select" data-change="costFilter" data-key="project">${C.opts([['', 'Pessoal e projetos'], ['__none', 'Somente pessoal'], ...DB.all('projects').map((p) => [p.id, p.name + (p.archived ? ' (arquivado)' : '')])], f.project)}</select>
        <label class="sr-only" for="cf-status">Situação</label>
        <select id="cf-status" class="select" data-change="costFilter" data-key="status">${C.opts([['', 'Previstos e pagos'], ['pago', 'Somente pagos'], ['previsto', 'Somente previstos']], f.status)}</select>
        <span class="toolbar-count">${U.count(rows.length, 'registro', 'registros')}</span>
      </div>

      <div class="grid g-4">
        ${C.stat({ label: 'Orçamento planejado', value: U.fmtMoney(planned.value), foot: planned.note, ic: 'target' })}
        ${C.stat({ label: 'Total comprometido', value: U.fmtMoney(committed), foot: `Previstos + pagos ${periodLabel}`, ic: 'receipt', tone: 'warn' })}
        ${C.stat({ label: 'Total pago', value: U.fmtMoney(paid), foot: `${U.fmtMoney(committed - paid)} ainda previstos`, ic: 'checkCircle', tone: 'accent' })}
        ${C.stat({ label: 'Saldo disponível', value: `<span class="${balance < 0 ? 't-danger' : ''}">${U.fmtMoney(balance)}</span>`, foot: planned.value ? (balance < 0 ? `${icon('alert', 'ic-xs')} Acima do orçamento` : `${Math.round((committed / planned.value) * 100)}% do orçamento comprometido`) : 'Defina um orçamento para acompanhar o saldo', ic: 'wallet', tone: balance < 0 ? 'danger' : '' })}
      </div>

      ${!all.length ? `<div class="mt-24">${C.empty({ ic: 'wallet', title: 'Nenhum gasto registrado ainda', text: 'Registre despesas previstas e pagas. Itens comprados de listas de compras também podem virar despesas.', actions: `<button type="button" class="btn btn-primary" data-act="newExpense">${icon('plus', 'ic-sm')}Registrar despesa</button>` })}</div>` : `
      <div class="grid g-2 mt-16">
        <section class="card" aria-labelledby="ch-cat">
          <div class="card-head"><h2 class="card-title" id="ch-cat">${icon('pie')}Por categoria</h2><span class="card-sub">${periodLabel}</span></div>
          ${this.byCategory(rows)}
        </section>
        <section class="card" aria-labelledby="ch-month">
          <div class="card-head"><h2 class="card-title" id="ch-month">${icon('calendar')}Últimos 6 meses</h2>
            <div class="legend"><span><i style="--c:var(--brand)"></i>Pago</span><span><i class="striped"></i>Previsto</span></div></div>
          ${this.byMonth(f)}
          <p class="hint mt-8">Considera categoria, projeto e situação; ignora o filtro de período.</p>
        </section>
      </div>
      ${!f.project ? `<section class="card mt-16" aria-labelledby="ch-proj">
        <div class="card-head"><h2 class="card-title" id="ch-proj">${icon('folder')}Orçamento por projeto</h2><span class="card-sub">Comprometido em relação ao previsto (todas as datas)</span></div>
        ${this.byProject()}
      </section>` : ''}
      <div class="section-head"><h2 class="section-title">${icon('receipt')}Registros</h2></div>
      ${rows.length ? this.table(rows) : C.empty({ ic: 'filter', title: 'Nenhum registro neste filtro', text: 'Mude o período ou os filtros para ver outros registros.', actions: `<button type="button" class="btn" data-act="clearCostFilters">Limpar filtros</button>` }, true)}`}`;
  },

  byCategory(rows) {
    const map = {};
    rows.forEach((x) => { map[x.category] = (map[x.category] || 0) + x.amount; });
    const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);
    if (!entries.length) return '<p class="muted small">Sem registros no filtro atual.</p>';
    const total = entries.reduce((s, [, v]) => s + v, 0);
    const max = entries[0][1] || 1;
    return `<div class="hbars" role="list">${entries.map(([c, v]) => `
      <div class="hbar" role="listitem" data-key="cat-${U.esc(c)}" aria-label="${U.esc(c)}: ${U.fmtMoney(v)}, ${Math.round((v / total) * 100)}%">
        <span class="hbar-label">${U.esc(c)}</span>
        <span class="hbar-track"><span class="hbar-fill" style="--w:${(v / max) * 100}%;--c:${categoryColor(c)}"></span></span>
        <span class="hbar-value">${U.fmtMoney(v)} <span class="faint">${Math.round((v / total) * 100)}%</span></span>
      </div>`).join('')}</div>`;
  },

  byMonth(f) {
    const d = new Date();
    const months = Array.from({ length: 6 }, (_, i) => { const m = new Date(d.getFullYear(), d.getMonth() - 5 + i, 1); return { key: U.iso(m).slice(0, 7), label: U.MONTHS_S[m.getMonth()] }; });
    const data = months.map((m) => {
      const xs = DB.all('expenses').filter((x) => x.date.slice(0, 7) === m.key && (!f.category || x.category === f.category) && (!f.status || x.status === f.status) && this.scopeMatch(x, f));
      const paid = xs.filter((x) => x.status === 'pago').reduce((s, x) => s + x.amount, 0);
      const plan = xs.filter((x) => x.status !== 'pago').reduce((s, x) => s + x.amount, 0);
      return { ...m, paid, plan, total: paid + plan };
    });
    const max = Math.max(...data.map((x) => x.total), 1);
    return `<div class="vbars" role="list">${data.map((m) => `
      <div class="vbar" role="listitem" aria-label="${m.label}: pago ${U.fmtMoney(m.paid)}, previsto ${U.fmtMoney(m.plan)}" data-key="m-${m.key}">
        <span class="vbar-value">${m.total ? U.fmtMoneyShort(m.total) : '—'}</span>
        <span class="vbar-area"><span class="vbar-stack" style="--h:${(m.total / max) * 100}%"><span class="seg-paid" style="--p:${m.paid}"></span><span class="seg-plan" style="--q:${m.plan}"></span></span></span>
        <span class="vbar-label">${m.label}</span>
      </div>`).join('')}</div>`;
  },

  byProject() {
    const ps = DB.all('projects').filter((p) => !p.archived && (p.budget > 0 || L.spent(p.id).committed > 0));
    if (!ps.length) return '<p class="muted small">Defina orçamentos nos projetos para comparar o planejado com o comprometido.</p>';
    return `<div class="hbars" role="list">${ps.map((p) => {
      const s = L.spent(p.id);
      const pct = p.budget ? (s.committed / p.budget) * 100 : 100;
      const tone = pct > 100 ? 'var(--danger)' : pct >= 90 ? 'var(--warn)' : p.color;
      return `<div class="hbar" role="listitem" data-key="bp-${p.id}" aria-label="${U.esc(p.name)}: ${U.fmtMoney(s.committed)} de ${U.fmtMoney(p.budget)}">
        <a class="hbar-label" href="#/projetos/${p.id}">${U.esc(p.name)}</a>
        <span class="hbar-track"><span class="hbar-fill" style="--w:${Math.min(100, pct)}%;--c:${tone}"></span></span>
        <span class="hbar-value">${U.fmtMoney(s.committed)} <span class="faint">${p.budget ? `de ${U.fmtMoney(p.budget)}` : 'sem orçamento'}</span></span>
      </div>`;
    }).join('')}</div>`;
  },

  table(rows, { showProject = true } = {}) {
    const total = rows.reduce((s, x) => s + x.amount, 0);
    return `<div class="table-wrap"><table class="table exp-table">
      <thead><tr><th scope="col">Data</th><th scope="col">Descrição</th><th scope="col">Categoria</th>${showProject ? '<th scope="col">Projeto</th>' : ''}<th scope="col">Situação</th><th scope="col" class="num">Valor</th><th scope="col"><span class="sr-only">Ações</span></th></tr></thead>
      <tbody>${rows.map((x) => {
        const p = L.project(x.projectId);
        return `<tr data-key="x-${x.id}">
          <td class="c-date num">${U.fmtDateBR(x.date)}</td>
          <td class="c-desc"><span>${U.esc(x.description)}</span>${x.source ? ` <span class="badge" title="Gerada a partir de uma lista de compras">${icon('cart')}<span>lista</span></span>` : ''}
            <div class="c-meta-m">${U.fmtDateBR(x.date)} · ${U.esc(x.category)}${showProject && p ? ' · ' + U.esc(p.name) : ''}</div></td>
          <td class="c-cat"><span class="row" style="--gap:8px"><span class="dot" style="--c:${categoryColor(x.category)}"></span>${U.esc(x.category)}</span></td>
          ${showProject ? `<td class="c-proj">${p ? `<a href="#/projetos/${p.id}">${C.projectChip(p.id)}</a>` : '<span class="faint">Pessoal</span>'}</td>` : ''}
          <td class="c-status"><button type="button" class="badge ${x.status === 'pago' ? 'b-accent' : 'b-warn'}" data-act="toggleExpenseStatus" data-id="${x.id}" title="Clique para marcar como ${x.status === 'pago' ? 'previsto' : 'pago'}" aria-label="Situação: ${x.status === 'pago' ? 'pago' : 'previsto'}. Alterar para ${x.status === 'pago' ? 'previsto' : 'pago'}">${icon(x.status === 'pago' ? 'checkCircle' : 'clock')}<span>${x.status === 'pago' ? 'Pago' : 'Previsto'}</span></button></td>
          <td class="c-amount num strong">${U.fmtMoney(x.amount)}</td>
          <td class="c-actions actions-cell">${C.menuBtn('expenseMenu', x.id, `Ações da despesa ${x.description}`)}</td>
        </tr>`;
      }).join('')}</tbody>
      <tfoot><tr><td colspan="${showProject ? 5 : 4}" class="hide-m">Total (${U.count(rows.length, 'registro', 'registros')})</td><td class="num">${U.fmtMoney(total)}</td><td class="hide-m"></td></tr></tfoot>
    </table></div>`;
  },
};

A.costFilter = (el) => UIS.set('costs', el.dataset.key, el.value);
A.clearCostFilters = () => UIS.patch('costs', { period: 'all', category: '', project: '', status: '' });
A.newExpense = (el) => ExpenseModal.open(null, { projectId: el?.dataset?.project || (UIS.get('costs', 'project', '').startsWith('__') ? '' : UIS.get('costs', 'project', '')) });
A.openExpense = (el) => ExpenseModal.open(el.dataset.id);
A.toggleExpenseStatus = (el) => {
  const x = DB.get('expenses', el.dataset.id);
  if (!x) return;
  const next = x.status === 'pago' ? 'previsto' : 'pago';
  DB.patch('expenses', x.id, { status: next });
  UI.toast(`Marcada como ${next}.`, { tone: 'info' });
};
A.expenseMenu = (el) => {
  const x = DB.get('expenses', el.dataset.id);
  if (!x) return;
  UI.menu(el, [
    { label: 'Editar', icon: 'edit', fn: () => ExpenseModal.open(x.id) },
    { label: x.status === 'pago' ? 'Marcar como previsto' : 'Marcar como pago', icon: x.status === 'pago' ? 'clock' : 'checkCircle', fn: () => A.toggleExpenseStatus(el) },
    { label: 'Duplicar', icon: 'copy', fn: () => { DB.put('expenses', M.expense({ ...x, id: U.uid(), source: null, createdAt: undefined, demo: undefined })); UI.toast('Despesa duplicada.'); } },
    '-',
    { label: 'Excluir', icon: 'trash', danger: true, fn: () => Actions.deleteSimple('expenses', x.id, 'Despesa excluída') },
  ]);
};

A.exportCsv = () => {
  const rows = VIEWS.custos.filtered();
  if (!rows.length) { UI.toast('Não há registros para exportar.', { tone: 'warn' }); return; }
  const q = (v) => { const s = String(v ?? ''); return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const lines = [['Data', 'Descrição', 'Categoria', 'Projeto', 'Situação', 'Valor (R$)'].join(';')];
  rows.forEach((x) => lines.push([U.fmtDateBR(x.date), x.description, x.category, L.project(x.projectId)?.name || 'Pessoal', x.status === 'pago' ? 'Pago' : 'Previsto', U.fmtNum2(x.amount)].map(q).join(';')));
  lines.push(['', 'Total', '', '', '', U.fmtNum2(rows.reduce((s, x) => s + x.amount, 0))].map(q).join(';'));
  U.download(`entrelia-custos-${U.today()}.csv`, '﻿' + lines.join('\r\n'), 'text/csv;charset=utf-8');
  UI.toast(`CSV exportado com ${U.count(rows.length, 'registro', 'registros')}.`);
};

const ExpenseModal = {
  open(id, defaults = {}) {
    const existing = id ? DB.get('expenses', id) : null;
    if (id && !existing) { UI.toast('Esta despesa não existe mais.', { tone: 'warn' }); return; }
    const x = existing ? { ...existing } : M.expense({ description: defaults.description || '', amount: defaults.amount || 0, category: defaults.category || 'Outros', projectId: defaults.projectId || '', status: defaults.status || 'pago', source: defaults.source || null });
    const src = x.source && DB.get('lists', x.source.listId);
    UI.modal({
      title: defaults.title || (existing ? 'Editar despesa' : 'Nova despesa'),
      body: `<form id="exp-form" class="stack" style="--gap:14px" novalidate>
        ${src ? `<div class="banner" style="margin:0">${icon('cart')}<span class="grow small">${existing ? 'Gerada a partir da lista' : 'Será vinculada ao item da lista'} <a href="#/listas/${src.id}" data-modal-close>${U.esc(src.name)}</a>. ${existing ? '' : 'Cada item gera no máximo uma despesa.'}</span></div>` : ''}
        <div class="field"><label class="label" for="xf-desc">Descrição <span class="req" aria-hidden="true">*</span></label><input class="input" id="xf-desc" name="description" maxlength="120" required autofocus value="${U.esc(x.description)}" placeholder="Ex.: Passagens aéreas"></div>
        <div class="form-grid">
          <div class="field"><label class="label" for="xf-amount">Valor (R$) <span class="req" aria-hidden="true">*</span></label><input class="input" id="xf-amount" name="amount" inputmode="decimal" required value="${U.moneyInput(x.amount)}" placeholder="0,00"><span class="hint" id="xf-amount-prev">${x.amount ? U.fmtMoney(x.amount) : 'Ex.: 1.250,00'}</span></div>
          <div class="field"><label class="label" for="xf-date">Data <span class="req" aria-hidden="true">*</span></label><input class="input" type="date" id="xf-date" name="date" required value="${x.date}"></div>
          <div class="field"><label class="label" for="xf-cat">Categoria</label><select class="select" id="xf-cat" name="category">${C.opts(CATEGORIES.map((c) => [c, c]), x.category)}</select></div>
          <div class="field"><label class="label" for="xf-proj">Projeto</label><select class="select" id="xf-proj" name="projectId">${C.projectOptions(x.projectId, { empty: 'Pessoal (sem projeto)' })}</select></div>
          <fieldset class="field col-span-2"><legend class="label" style="margin-bottom:6px">Situação</legend>
            <div class="seg"><label><input type="radio" name="status" value="previsto" ${x.status !== 'pago' ? 'checked' : ''}>${icon('clock', 'ic-sm')}Previsto</label><label><input type="radio" name="status" value="pago" ${x.status === 'pago' ? 'checked' : ''}>${icon('checkCircle', 'ic-sm')}Pago</label></div>
          </fieldset>
        </div>
      </form>`,
      footer: `${existing ? `<button type="button" class="btn btn-danger" id="xf-del">${icon('trash', 'ic-sm')}Excluir</button>` : ''}<span class="spacer"></span><button type="button" class="btn btn-ghost" data-modal-close>Cancelar</button><button type="submit" form="exp-form" class="btn btn-primary">${existing ? 'Salvar' : 'Registrar despesa'}</button>`,
      onMount(el, m) {
        const form = el.querySelector('#exp-form');
        const prev = el.querySelector('#xf-amount-prev');
        form.amount.addEventListener('input', () => { const v = U.parseMoney(form.amount.value); prev.textContent = isNaN(v) ? 'Valor inválido. Ex.: 1.250,00' : U.fmtMoney(v); });
        el.querySelector('#xf-del')?.addEventListener('click', () => { m.close(); Actions.deleteSimple('expenses', x.id, 'Despesa excluída'); });
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const ok = UI.validate(form, {
            description: (v) => (!v ? 'Informe a descrição.' : ''),
            amount: (v) => { const n = U.parseMoney(v); return !v ? 'Informe o valor.' : isNaN(n) ? 'Valor inválido. Use o formato 1.250,00.' : n <= 0 ? 'O valor precisa ser maior que zero.' : ''; },
            date: (v) => (!U.parse(v) ? 'Informe uma data válida.' : ''),
          });
          if (!ok) return;
          const data = { ...x, description: form.description.value.trim(), amount: U.parseMoney(form.amount.value), date: form.date.value, category: form.category.value, projectId: form.projectId.value, status: form.status.value };
          if (!existing && data.source) {
            const dup = DB.all('expenses').find((y) => y.source && y.source.listId === data.source.listId && y.source.itemId === data.source.itemId);
            if (dup) { m.close(); UI.toast('Este item já foi registrado como despesa.', { tone: 'warn' }); return; }
            const undo = DB.track(() => {
              DB.put('expenses', data);
              ListActions.updateItems(data.source.listId, (items) => { const it = items.find((i) => i.id === data.source.itemId); if (it) it.expenseId = data.id; });
            });
            m.close();
            UI.toast(`Despesa registrada: ${U.fmtMoney(data.amount)}.`, { action: { label: 'Desfazer', fn: undo } });
            return;
          }
          DB.put('expenses', data);
          m.close();
          UI.toast(existing ? 'Despesa atualizada.' : `Despesa registrada: ${U.fmtMoney(data.amount)}.`);
        });
      },
    });
  },
};
