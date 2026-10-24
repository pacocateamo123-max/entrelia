'use strict';

const Cmp = {
  update(id, fn) {
    const c = DB.clone('comparisons', id);
    if (!c) return;
    fn(c);
    DB.put('comparisons', c);
  },
};

VIEWS.comparador = {
  title: 'Comparador',
  render(param) {
    if (param) return this.detail(param);
    const list = DB.all('comparisons').slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    return `
      <div class="page-head">
        <div><h1 class="page-title">Comparador</h1><p class="page-sub">Compare alternativas com critérios e pesos e veja a classificação mudar na hora.</p></div>
        <div class="actions"><button type="button" class="btn btn-primary" data-act="newComparison">${icon('plus', 'ic-sm')}Nova comparação</button></div>
      </div>
      ${list.length ? `<div class="grid g-auto">${list.map((c) => {
        const r = L.compareScores(c);
        const top = r.rows[0];
        const p = L.project(c.projectId);
        return `<article class="card interactive list-card anim-in" data-key="cmp-${c.id}">
          <div class="row" style="align-items:flex-start">
            <span class="list-type-ic t-compras">${icon('scale')}</span>
            <div class="grow stack" style="--gap:4px"><a class="list-link" href="#/comparador/${c.id}">${U.esc(c.title)}</a>
              <div class="row wrap xs muted" style="--gap:8px"><span>${U.count(c.options.length, 'opção', 'opções')} · ${U.count(c.criteria.length, 'critério', 'critérios')}</span>${p ? C.projectChip(p.id) : ''}</div></div>
            ${C.menuBtn('cmpMenu', c.id, `Ações da comparação ${c.title}`)}
          </div>
          ${top && r.max ? `<div><div class="row between xs"><span class="strong">${icon('award', 'ic-xs')} ${U.esc(top.option.name || 'Opção sem nome')}</span><span class="muted">${Math.round(top.pct)}%</span></div><div class="mt-8">${C.progress(top.pct, { label: 'Pontuação da melhor opção' })}</div></div>` : '<p class="muted small">Adicione opções, critérios e notas para ver o resultado.</p>'}
        </article>`;
      }).join('')}</div>` : C.empty({
        ic: 'scale', title: 'Decida com critérios claros',
        text: 'Liste alternativas, defina o que importa e dê notas de 0 a 5. O ENTRELIA calcula a pontuação ponderada e explica o resultado.',
        actions: `<button type="button" class="btn btn-primary" data-act="newComparison">${icon('plus', 'ic-sm')}Nova comparação</button>`,
      })}`;
  },

  detail(id) {
    const c = DB.get('comparisons', id);
    if (!c) return `<a class="back-link" href="#/comparador">${icon('arrowLeft', 'ic-sm')}Comparador</a>${C.empty({ ic: 'scale', title: 'Comparação não encontrada', actions: '<a class="btn" href="#/comparador">Ver comparações</a>' })}`;
    const r = L.compareScores(c);
    const p = L.project(c.projectId);
    const byId = Object.fromEntries(r.rows.map((x) => [x.option.id, x]));

    const crit = c.criteria.map((k, i) => `
      <div class="crit-row" data-key="k-${k.id}">
        <div class="field"><label class="sr-only" for="kn-${k.id}">Nome do critério ${i + 1}</label><input class="input input-sm" id="kn-${k.id}" value="${U.esc(k.name)}" placeholder="Nome do critério" maxlength="60" data-input="cmpCritName" data-cmp="${c.id}" data-cid="${k.id}"></div>
        <div class="row crit-weight" style="--gap:10px"><label class="sr-only" for="kw-${k.id}">Importância de ${U.esc(k.name || 'critério')}</label><input type="range" min="0" max="5" step="1" id="kw-${k.id}" value="${k.weight}" data-input="cmpWeight" data-cmp="${c.id}" data-cid="${k.id}" aria-valuetext="Peso ${k.weight} de 5"><span class="weight-val" aria-hidden="true">${k.weight}</span></div>
        <button type="button" class="btn btn-ghost btn-icon btn-sm" data-act="cmpDelCrit" data-cmp="${c.id}" data-cid="${k.id}" aria-label="Remover critério ${U.esc(k.name)}">${icon('trash', 'ic-sm')}</button>
      </div>`).join('');

    const leader = r.rows[0];
    const tie = r.rows.length > 1 && r.rows[0].total === r.rows[1].total && r.max;
    const withCost = r.rows.filter((x) => Number(x.option.cost) > 0 && x.total > 0);
    const value = withCost.length > 1 ? withCost.slice().sort((a, b) => (a.option.cost / a.total) - (b.option.cost / b.total))[0] : null;
    const ranking = r.rows.length && r.max ? `
      <div class="mini-list">${r.rows.map((x, i) => `
        <div class="rank-row ${i === 0 && !tie ? 'is-first' : ''}" data-key="rk-${x.option.id}">
          <span class="rank-pos">${i + 1}º</span>
          <div style="min-width:0"><div class="row between"><span class="strong ellipsis">${U.esc(x.option.name || 'Opção sem nome')}</span><span class="xs muted num">${U.fmtNum2(x.total).replace(',00', '')} de ${r.max} pts</span></div><div class="mt-8">${C.progress(x.pct, { label: `Pontuação de ${x.option.name}` })}</div></div>
          <span class="strong num" style="min-width:48px;text-align:right">${Math.round(x.pct)}%</span>
        </div>`).join('')}</div>
      <div class="formula mt-16">
        <strong style="color:var(--text)">Como calculamos.</strong> Cada nota (0 a 5) é multiplicada pelo peso do critério (0 a 5). Somamos os resultados e dividimos pelo máximo possível: 5 × soma dos pesos (${r.weightSum}) = <strong>${r.max} pontos</strong>.
        ${leader ? `<div class="mt-8"><code>${U.esc(leader.option.name || 'Opção')}: ${leader.parts.filter((x) => x.weight).map((x) => `${x.score}×${x.weight}`).join(' + ') || '0'} = ${leader.total} de ${r.max} = ${Math.round(leader.pct)}%</code></div>` : ''}
        ${tie ? `<div class="mt-8 t-warn">${icon('alert', 'ic-xs')} Empate entre as primeiras opções. Ajuste pesos ou notas para desempatar.</div>` : ''}
        ${value ? `<div class="mt-8">${icon('wallet', 'ic-xs')} Melhor custo por ponto: <strong style="color:var(--text)">${U.esc(value.option.name)}</strong> (${U.fmtMoney(value.option.cost / value.total)} por ponto).</div>` : ''}
        <div class="mt-8">O custo não entra na pontuação. Para considerá-lo, crie um critério como “Preço” e dê notas maiores às opções mais baratas.</div>
      </div>` : `<p class="muted small">${!c.options.length ? 'Adicione opções para comparar.' : !c.criteria.length ? 'Adicione critérios para avaliar as opções.' : 'Defina pesos maiores que zero para calcular a pontuação.'}</p>`;

    const table = c.options.length && c.criteria.length ? `<div class="cmp-wrap"><table class="cmp-table">
      <caption class="sr-only">Notas de cada opção por critério</caption>
      <thead><tr><th scope="col">Critério <span class="faint xs">(peso)</span></th>${c.options.map((o) => `<th scope="col">${U.esc(o.name || 'Opção sem nome')}</th>`).join('')}</tr></thead>
      <tbody>${c.criteria.map((k) => `<tr data-key="tr-${k.id}"><th scope="row">${U.esc(k.name || 'Critério sem nome')} <span class="faint xs">(${k.weight})</span></th>${c.options.map((o) => {
        const v = Number((o.scores || {})[k.id]) || 0;
        return `<td><div class="score-pick" role="group" aria-label="Nota de ${U.esc(o.name)} em ${U.esc(k.name)}">${[0, 1, 2, 3, 4, 5].map((n) => `<button type="button" aria-pressed="${v === n}" data-act="cmpScore" data-cmp="${c.id}" data-oid="${o.id}" data-cid="${k.id}" data-v="${n}" aria-label="${n}">${n}</button>`).join('')}</div></td>`;
      }).join('')}</tr>`).join('')}</tbody>
      <tfoot>
        <tr><th scope="row">Custo</th>${c.options.map((o) => `<td class="num" style="text-align:left">${o.cost ? U.fmtMoney(o.cost) : '<span class="faint">—</span>'}</td>`).join('')}</tr>
        <tr><th scope="row">Pontuação</th>${c.options.map((o) => { const x = byId[o.id]; return `<td>${x ? `${U.fmtNum2(x.total).replace(',00', '')} pts · ${Math.round(x.pct)}%` : '—'}</td>`; }).join('')}</tr>
      </tfoot>
    </table></div>
    <p class="hint mt-8">${icon('info', 'ic-xs')} Em telas pequenas, deslize a tabela para o lado para ver todas as opções.</p>` : C.empty({ ic: 'scale', title: 'A tabela aparece quando houver opções e critérios', text: 'Adicione pelo menos uma opção e um critério abaixo.' }, true);

    const options = c.options.map((o, i) => `
      <article class="card stack anim-in" style="--gap:12px" data-key="op-${o.id}">
        <div class="row between"><span class="badge b-brand">Opção ${i + 1}</span><button type="button" class="btn btn-ghost btn-icon btn-sm" data-act="cmpDelOpt" data-cmp="${c.id}" data-oid="${o.id}" aria-label="Remover opção ${U.esc(o.name)}">${icon('trash', 'ic-sm')}</button></div>
        <div class="field"><label class="label" for="on-${o.id}">Nome</label><input class="input" id="on-${o.id}" value="${U.esc(o.name)}" maxlength="60" placeholder="Nome da alternativa" data-input="cmpOptField" data-field="name" data-cmp="${c.id}" data-oid="${o.id}"></div>
        <div class="field"><label class="label" for="oc-${o.id}">Custo (R$)</label><input class="input" id="oc-${o.id}" inputmode="decimal" value="${U.moneyInput(o.cost)}" placeholder="0,00" data-change="cmpCost" data-cmp="${c.id}" data-oid="${o.id}"></div>
        <div class="field"><label class="label" for="op-${o.id}">Vantagens</label><textarea class="textarea" id="op-${o.id}" rows="2" maxlength="600" data-input="cmpOptField" data-field="pros" data-cmp="${c.id}" data-oid="${o.id}" placeholder="O que esta opção faz bem?">${U.esc(o.pros)}</textarea></div>
        <div class="field"><label class="label" for="ol-${o.id}">Limitações</label><textarea class="textarea" id="ol-${o.id}" rows="2" maxlength="600" data-input="cmpOptField" data-field="cons" data-cmp="${c.id}" data-oid="${o.id}" placeholder="O que pesa contra?">${U.esc(o.cons)}</textarea></div>
      </article>`).join('');

    return `
      <a class="back-link" href="${p ? '#/projetos/' + p.id : '#/comparador'}">${icon('arrowLeft', 'ic-sm')}${p ? U.esc(p.name) : 'Comparador'}</a>
      <div class="page-head">
        <div><h1 class="page-title">${U.esc(c.title)}</h1>${c.description ? `<p class="page-sub">${U.esc(c.description)}</p>` : ''}${p ? `<div class="mt-8"><a href="#/projetos/${p.id}">${C.projectChip(p.id)}</a></div>` : ''}</div>
        <div class="actions">
          <button type="button" class="btn" data-act="editComparison" data-id="${c.id}">${icon('edit', 'ic-sm')}Editar</button>
          ${C.menuBtn('cmpMenu', c.id, 'Mais ações', 'data-detail="1"')}
        </div>
      </div>
      <div class="grid g-2">
        <section class="card" aria-labelledby="cmp-crit">
          <div class="card-head"><h2 class="card-title" id="cmp-crit">${icon('settings')}Critérios e importância</h2><span class="card-sub">Peso de 0 a 5</span></div>
          ${crit || '<p class="muted small">Nenhum critério ainda.</p>'}
          <form class="row mt-16" style="--gap:8px" data-submit="cmpAddCrit" data-cmp="${c.id}"><label class="sr-only" for="new-crit">Novo critério</label><input class="input input-sm grow" id="new-crit" name="name" placeholder="Novo critério, ex.: Facilidade de uso" maxlength="60"><button type="submit" class="btn btn-sm">${icon('plus', 'ic-sm')}Critério</button></form>
          <p class="hint mt-8">Peso 0 desconsidera o critério. Mova os controles e observe a classificação.</p>
        </section>
        <section class="card" aria-labelledby="cmp-res" aria-live="polite" style="background:var(--hero), var(--card)">
          <div class="card-head"><h2 class="card-title" id="cmp-res">${icon('award')}Resultado</h2></div>
          ${ranking}
        </section>
      </div>
      <div class="section-head"><h2 class="section-title">${icon('rows')}Notas de 0 a 5</h2></div>
      ${table}
      <div class="section-head"><h2 class="section-title">${icon('layers')}Opções</h2><button type="button" class="btn btn-sm" data-act="cmpAddOpt" data-cmp="${c.id}">${icon('plus', 'ic-sm')}Adicionar opção</button></div>
      ${c.options.length ? `<div class="grid g-auto">${options}</div>` : C.empty({ ic: 'layers', title: 'Nenhuma opção ainda', actions: `<button type="button" class="btn btn-primary" data-act="cmpAddOpt" data-cmp="${c.id}">${icon('plus', 'ic-sm')}Adicionar opção</button>` }, true)}`;
  },
};

A.newComparison = (el) => CmpModal.open(null, { projectId: el?.dataset?.project || '' });
A.editComparison = (el) => CmpModal.open(el.dataset.id);
A.cmpMenu = (el) => {
  const c = DB.get('comparisons', el.dataset.id);
  if (!c) return;
  const inDetail = el.dataset.detail === '1';
  UI.menu(el, [
    ...(inDetail ? [] : [{ label: 'Abrir', icon: 'arrowRight', fn: () => App.go('#/comparador/' + c.id) }]),
    { label: 'Editar título e projeto', icon: 'edit', fn: () => CmpModal.open(c.id) },
    { label: 'Duplicar', icon: 'copy', fn: () => { const d = M.comparison({ ...structuredClone(c), id: U.uid(), title: c.title + ' (cópia)', createdAt: undefined, demo: undefined }); DB.put('comparisons', d); UI.toast('Comparação duplicada.', { action: { label: 'Abrir', fn: () => App.go('#/comparador/' + d.id) } }); } },
    '-',
    { label: 'Excluir', icon: 'trash', danger: true, fn: () => { if (inDetail) App.go('#/comparador'); Actions.deleteSimple('comparisons', c.id, 'Comparação excluída'); } },
  ]);
};
A.cmpCritName = (el) => Cmp.update(el.dataset.cmp, (c) => { c.criteria.find((k) => k.id === el.dataset.cid).name = el.value; });
A.cmpWeight = (el) => Cmp.update(el.dataset.cmp, (c) => { c.criteria.find((k) => k.id === el.dataset.cid).weight = +el.value; });
A.cmpDelCrit = (el) => {
  const undo = DB.track(() => Cmp.update(el.dataset.cmp, (c) => {
    c.criteria = c.criteria.filter((k) => k.id !== el.dataset.cid);
    c.options.forEach((o) => { if (o.scores) delete o.scores[el.dataset.cid]; });
  }));
  UI.toast('Critério removido.', { tone: 'info', action: { label: 'Desfazer', fn: undo } });
};
A.cmpAddCrit = (form) => {
  const name = form.name.value.trim();
  if (!name) { UI.toast('Digite o nome do critério.', { tone: 'warn' }); form.name.focus(); return; }
  Cmp.update(form.dataset.cmp, (c) => c.criteria.push({ id: U.uid(), name, weight: 3 }));
  form.name.value = '';
  form.name.focus();
};
A.cmpAddOpt = (el) => {
  const oid = U.uid();
  Cmp.update(el.dataset.cmp, (c) => c.options.push({ id: oid, name: `Opção ${c.options.length + 1}`, cost: 0, pros: '', cons: '', scores: {} }));
  requestAnimationFrame(() => { const i = document.getElementById('on-' + oid); if (i) { i.focus(); i.select(); } });
};
A.cmpDelOpt = (el) => {
  const undo = DB.track(() => Cmp.update(el.dataset.cmp, (c) => { c.options = c.options.filter((o) => o.id !== el.dataset.oid); }));
  UI.toast('Opção removida.', { tone: 'info', action: { label: 'Desfazer', fn: undo } });
};
A.cmpOptField = (el) => Cmp.update(el.dataset.cmp, (c) => { c.options.find((o) => o.id === el.dataset.oid)[el.dataset.field] = el.value; });
A.cmpCost = (el) => {
  const v = el.value.trim() ? U.parseMoney(el.value) : 0;
  if (isNaN(v) || v < 0) { UI.toast('Custo inválido. Use o formato 1.250,00.', { tone: 'warn' }); el.focus(); return; }
  Cmp.update(el.dataset.cmp, (c) => { c.options.find((o) => o.id === el.dataset.oid).cost = v; });
  el.value = U.moneyInput(v);
};
A.cmpScore = (el) => Cmp.update(el.dataset.cmp, (c) => {
  const o = c.options.find((x) => x.id === el.dataset.oid);
  o.scores = { ...(o.scores || {}), [el.dataset.cid]: +el.dataset.v };
});

const CmpModal = {
  open(id, defaults = {}) {
    const existing = id ? DB.get('comparisons', id) : null;
    const c = existing ? { ...existing } : M.comparison({ projectId: defaults.projectId || '' });
    UI.modal({
      title: existing ? 'Editar comparação' : 'Nova comparação',
      body: `<form id="cmp-form" class="stack" style="--gap:14px" novalidate>
        <div class="field"><label class="label" for="cm-title">O que você está decidindo? <span class="req" aria-hidden="true">*</span></label><input class="input" id="cm-title" name="title" maxlength="100" required autofocus value="${U.esc(c.title)}" placeholder="Ex.: Ferramenta para o projeto"></div>
        <div class="field"><label class="label" for="cm-desc">Contexto</label><input class="input" id="cm-desc" name="description" maxlength="240" value="${U.esc(c.description)}" placeholder="Opcional"></div>
        <div class="field"><label class="label" for="cm-proj">Projeto</label><select class="select" id="cm-proj" name="projectId">${C.projectOptions(c.projectId)}</select></div>
        ${existing ? '' : `<label class="switch"><input type="checkbox" name="scaffold" checked>Começar com 3 opções e 3 critérios em branco</label>`}
      </form>`,
      footer: `<button type="button" class="btn btn-ghost" data-modal-close>Cancelar</button><button type="submit" form="cmp-form" class="btn btn-primary">${existing ? 'Salvar' : 'Criar comparação'}</button>`,
      onMount(el, m) {
        const form = el.querySelector('#cmp-form');
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          if (!UI.validate(form, { title: (v) => (!v ? 'Descreva o que está sendo comparado.' : '') })) return;
          const data = { ...c, title: form.title.value.trim(), description: form.description.value.trim(), projectId: form.projectId.value };
          if (!existing && form.scaffold.checked) {
            data.criteria = ['Critério 1', 'Critério 2', 'Critério 3'].map((n) => ({ id: U.uid(), name: n, weight: 3 }));
            data.options = ['Opção 1', 'Opção 2', 'Opção 3'].map((n) => ({ id: U.uid(), name: n, cost: 0, pros: '', cons: '', scores: {} }));
          }
          DB.put('comparisons', data);
          m.close();
          UI.toast(existing ? 'Comparação atualizada.' : 'Comparação criada. Renomeie critérios e opções.');
          if (!existing) App.go('#/comparador/' + data.id);
        });
      },
    });
  },
};
