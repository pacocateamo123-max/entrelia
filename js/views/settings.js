'use strict';

const PLURALS = { projects: ['projeto', 'projetos'], tasks: ['tarefa', 'tarefas'], events: ['compromisso', 'compromissos'], lists: ['lista', 'listas'], expenses: ['despesa', 'despesas'], comparisons: ['comparação', 'comparações'], notes: ['nota', 'notas'] };

VIEWS.configuracoes = {
  title: 'Configurações',
  render() {
    const meta = DB.getMeta();
    const counts = DB.counts();
    const total = Object.values(counts).reduce((s, v) => s + v, 0);
    const st = DB.status;
    const storage = st === 'ok'
      ? { cls: 'ok', label: 'IndexedDB ativo', text: 'Os dados ficam salvos neste navegador e continuam disponíveis após fechar ou recarregar a página.' }
      : st === 'local'
        ? { cls: 'warn', label: 'Armazenamento alternativo', text: `IndexedDB indisponível${DB.lastError ? ` (${U.esc(DB.lastError)})` : ''}. Usando o armazenamento local do navegador, com limite menor de espaço.` }
        : { cls: 'err', label: 'Sem persistência', text: 'Este navegador bloqueou o armazenamento. As alterações serão perdidas ao fechar a página. Exporte um backup antes de sair.' };
    const fontOk = document.fonts && document.fonts.check('600 14px Inter');
    const saved = DB.lastSaved ? `Último salvamento às ${U.pad(DB.lastSaved.getHours())}:${U.pad(DB.lastSaved.getMinutes())}:${U.pad(DB.lastSaved.getSeconds())}.` : 'Nenhuma alteração salva nesta sessão.';
    const labels = PLURALS;
    const mod = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl';

    return `
      <div class="page-head"><div><h1 class="page-title">Configurações</h1><p class="page-sub">Preferências, dados, backup e estado das conexões.</p></div></div>
      <div class="grid g-2">
        <section class="card" aria-labelledby="set-pref">
          <div class="card-head"><h2 class="card-title" id="set-pref">${icon('user')}Preferências</h2></div>
          <div class="set-row"><div class="grow"><label class="label" for="set-name">Como devemos chamar você?</label><div class="hint">Usado na saudação da visão geral.</div></div><input class="input" style="max-width:240px" id="set-name" value="${U.esc(meta.userName)}" maxlength="40" placeholder="Seu nome" data-change="setName"></div>
          <div class="set-row"><div class="grow"><div class="label">Tema</div><div class="hint">A escolha fica salva neste dispositivo.</div></div>${C.seg([['escuro', 'Escuro', 'moon'], ['claro', 'Claro', 'sun'], ['sistema', 'Sistema', 'monitor']], meta.theme, 'setTheme', 'aria-label="Tema"')}</div>
          <div class="set-row"><div class="grow"><div class="label">Reduzir animações</div><div class="hint">${window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'Seu dispositivo já pede movimento reduzido; ele é respeitado automaticamente.' : 'O ENTRELIA também respeita a configuração de movimento reduzido do dispositivo.'}</div></div><label class="switch"><input type="checkbox" data-change="setReduceMotion" ${meta.reduceMotion ? 'checked' : ''}><span class="sr-only">Reduzir animações</span></label></div>
          <div class="set-row"><div class="grow"><label class="label" for="set-budget">Orçamento pessoal (R$)</label><div class="hint">Somado ao orçamento dos projetos na área de custos.</div></div><input class="input" style="max-width:180px" id="set-budget" inputmode="decimal" value="${U.moneyInput(meta.personalBudget)}" placeholder="0,00" data-change="setPersonalBudget"></div>
        </section>

        <section class="card" aria-labelledby="set-conn">
          <div class="card-head"><h2 class="card-title" id="set-conn">${icon('cloud')}Armazenamento e conexões</h2></div>
          <div class="set-row"><div class="grow"><div class="label">Armazenamento local</div><div class="hint">${storage.text} ${saved}</div></div><span class="status-pill ${storage.cls}">${icon(storage.cls === 'ok' ? 'checkCircle' : 'alert', 'ic-xs')}${storage.label}</span></div>
          <div class="set-row"><div class="grow"><div class="label">Sincronização em nuvem</div><div class="hint">Não configurada nesta versão. Para levar seus dados a outro aparelho, exporte e importe um backup.</div></div><span class="status-pill off">${icon('cloud', 'ic-xs')}Não configurada</span></div>
          <div class="set-row"><div class="grow"><div class="label">Fonte Inter</div><div class="hint">${fontOk ? 'Carregada do Google Fonts.' : 'Não foi possível carregar a fonte externa; usando a fonte do sistema.'}</div></div><span class="status-pill ${fontOk ? 'ok' : 'warn'}">${icon(fontOk ? 'checkCircle' : 'alert', 'ic-xs')}${fontOk ? 'Carregada' : 'Indisponível'}</span></div>
          <div class="set-row"><div class="grow"><div class="label">Avisos</div><div class="hint">Os avisos aparecem na central interna (sino). Notificações do sistema não são usadas.</div></div><span class="status-pill ok">${icon('bell', 'ic-xs')}Central interna</span></div>
        </section>
      </div>

      <section class="card mt-16" aria-labelledby="set-data">
        <div class="card-head"><h2 class="card-title" id="set-data">${icon('database')}Dados e backup</h2>${meta.demo ? C.badge('Usando dados de demonstração', 'accent', 'sparkles') : ''}</div>
        <p class="muted small">${total ? `Você tem ${Object.entries(counts).filter(([, v]) => v).map(([k, v]) => U.count(v, labels[k][0], labels[k][1])).join(', ')}.` : 'Nenhum dado registrado ainda.'}</p>
        <div class="grid g-2 mt-16">
          <div class="card" style="background:var(--elev);box-shadow:none">
            <div class="card-title">${icon('download')}Exportar backup completo</div>
            <p class="muted small mt-8">Gera um arquivo JSON com projetos, tarefas, listas, custos, comparações, notas e preferências.</p>
            <button type="button" class="btn btn-primary mt-16" data-act="exportJson">${icon('download', 'ic-sm')}Exportar JSON</button>
          </div>
          <div class="card" style="background:var(--elev);box-shadow:none">
            <div class="card-title">${icon('upload')}Importar backup</div>
            <p class="muted small mt-8">O arquivo é validado antes. Você confirma antes de substituir os dados atuais.</p>
            <input type="file" id="import-file" accept="application/json,.json" class="sr-only" data-change="importJson" tabindex="-1" aria-hidden="true">
            <button type="button" class="btn mt-16" data-act="pickImport">${icon('upload', 'ic-sm')}Escolher arquivo</button>
          </div>
          <div class="card" style="background:var(--elev);box-shadow:none">
            <div class="card-title">${icon('sparkles')}Dados de demonstração</div>
            <p class="muted small mt-8">Quatro projetos conectados (viagem, estudos, site e evento) com tarefas, dependências, listas, custos, notas e uma comparação. Os itens são marcados como demonstração.</p>
            <button type="button" class="btn mt-16" data-act="loadDemo">${icon('refresh', 'ic-sm')}Carregar demonstração</button>
          </div>
          <div class="card" style="background:var(--elev);box-shadow:none">
            <div class="card-title">${icon('trash')}Começar do zero</div>
            <p class="muted small mt-8">Remove todos os dados deste navegador. Suas preferências de tema e nome são mantidas.</p>
            <button type="button" class="btn btn-danger mt-16" data-act="wipeData" ${total ? '' : 'disabled'}>${icon('trash', 'ic-sm')}Apagar tudo</button>
          </div>
        </div>
      </section>

      <div class="grid g-2 mt-16">
        <section class="card" aria-labelledby="set-keys">
          <div class="card-head"><h2 class="card-title" id="set-keys">${icon('keyboard')}Atalhos de teclado</h2></div>
          <div class="kbd-list">
            <span class="kbd">${mod} K</span><span>Abrir a busca global</span>
            <span class="kbd">/</span><span>Abrir a busca global</span>
            <span class="kbd">N</span><span>Nova tarefa</span>
            <span class="kbd">Esc</span><span>Fechar janelas e menus</span>
            <span class="kbd">↑ ↓ Enter</span><span>Navegar nos resultados da busca e nos menus</span>
          </div>
        </section>
        <section class="card" aria-labelledby="set-about">
          <div class="card-head"><h2 class="card-title" id="set-about">${icon('info')}Sobre</h2></div>
          <div class="row" style="--gap:14px">${logo(48)}<div><div class="brand-name">ENTRELIA</div><div class="muted small">Tudo conectado. Próximo passo claro.</div></div></div>
          <p class="muted small mt-16">Versão 1.0 · Funciona sem conexão após carregada. Seus dados não saem deste navegador.</p>
        </section>
      </div>`;
  },
};

A.setName = (el) => { DB.setMeta({ userName: el.value.trim().slice(0, 40) }); UI.toast('Nome salvo.'); };
A.setTheme = (el) => App.setTheme(el.dataset.value);
A.setReduceMotion = (el) => { DB.setMeta({ reduceMotion: el.checked }); App.applyMotion(); UI.toast(el.checked ? 'Animações reduzidas.' : 'Animações restauradas.', { tone: 'info' }); };
A.setPersonalBudget = (el) => {
  const v = el.value.trim() ? U.parseMoney(el.value) : 0;
  if (isNaN(v) || v < 0) { UI.toast('Valor inválido. Use o formato 1.250,00.', { tone: 'danger' }); el.focus(); return; }
  DB.setMeta({ personalBudget: v });
  el.value = U.moneyInput(v);
  UI.toast(`Orçamento pessoal: ${U.fmtMoney(v)}.`);
};

A.exportJson = () => {
  const data = DB.exportData();
  U.download(`entrelia-backup-${U.today()}.json`, JSON.stringify(data, null, 2), 'application/json');
  const n = Object.values(data.dados).reduce((s, a) => s + a.length, 0);
  UI.toast(`Backup exportado com ${U.count(n, 'registro', 'registros')}.`);
};
A.pickImport = () => document.getElementById('import-file').click();
A.importJson = async (el) => {
  const file = el.files && el.files[0];
  el.value = '';
  if (!file) return;
  if (file.size > 20 * 1024 * 1024) { UI.toast('Arquivo muito grande (limite de 20 MB).', { tone: 'danger' }); return; }
  let obj;
  try { obj = JSON.parse(await U.readFile(file)); }
  catch (e) { UI.toast('Não foi possível ler o arquivo: ele não é um JSON válido.', { tone: 'danger' }); return; }
  const res = validateBackup(obj);
  if (!res.ok) {
    UI.modal({
      title: 'Backup inválido', size: 'sm',
      body: `<p class="muted">O arquivo <strong>${U.esc(file.name)}</strong> não pôde ser importado. Nenhum dado foi alterado.</p><ul class="stack mt-16" style="--gap:6px;padding-left:18px">${res.errors.map((e) => `<li class="small t-danger">${U.esc(e)}</li>`).join('')}${res.more ? `<li class="small muted">e mais ${res.more} problema(s).</li>` : ''}</ul>`,
      footer: '<button type="button" class="btn btn-primary" data-modal-close>Entendi</button>',
    });
    return;
  }
  const total = Object.values(DB.counts()).reduce((s, v) => s + v, 0);
  const summary = Object.entries(res.counts).filter(([, v]) => v).map(([k, v]) => U.count(v, PLURALS[k][0], PLURALS[k][1])).join(', ') || 'nenhum registro';
  UI.modal({
    title: 'Importar backup?', size: 'sm',
    body: `<p class="muted">Arquivo válido${res.exportedAt ? `, exportado em ${U.fmtDate(U.iso(new Date(res.exportedAt)), true)}` : ''}: <strong style="color:var(--text)">${summary}</strong>.</p>
      ${total ? `<div class="banner warn mt-16" style="margin-bottom:0">${icon('alert')}<span class="grow small">Os ${U.count(total, 'registro atual será substituído', 'registros atuais serão substituídos')}. Se quiser, exporte um backup antes.</span></div>` : ''}`,
    footer: `${total ? `<button type="button" class="btn btn-ghost" id="imp-export">${icon('download', 'ic-sm')}Exportar atuais</button>` : ''}<span class="spacer"></span><button type="button" class="btn btn-ghost" data-modal-close>Cancelar</button><button type="button" class="btn btn-primary" id="imp-go">${total ? 'Substituir dados' : 'Importar'}</button>`,
    onMount(el, m) {
      el.querySelector('#imp-export')?.addEventListener('click', A.exportJson);
      el.querySelector('#imp-go').addEventListener('click', async () => {
        m.close();
        const p = res.prefs || {};
        try {
          await DB.replaceAll(res.data, {
            initialized: true, demo: !!p.demo,
            userName: typeof p.userName === 'string' ? p.userName : DB.getMeta().userName,
            personalBudget: typeof p.personalBudget === 'number' ? p.personalBudget : DB.getMeta().personalBudget,
          });
          UI.toast(`Backup importado: ${summary}.`);
        } catch (e) { UI.toast('Falha ao gravar os dados importados: ' + (e && e.message ? e.message : e), { tone: 'danger' }); }
      });
    },
  });
};

/* Substitui tudo guardando uma cópia em memória para desfazer. */
async function replaceWithUndo(data, metaPatch, message) {
  const snapshot = structuredClone(DB.exportData().dados);
  const prevMeta = { demo: DB.getMeta().demo, personalBudget: DB.getMeta().personalBudget };
  try {
    await DB.replaceAll(data, metaPatch);
    UI.toast(message, { action: { label: 'Desfazer', fn: () => DB.replaceAll(snapshot, prevMeta).then(() => UI.toast('Dados restaurados.', { tone: 'info' })) } });
  } catch (e) {
    UI.toast('Não foi possível salvar: ' + (e && e.message ? e.message : e), { tone: 'danger' });
  }
}

A.loadDemo = async () => {
  const total = Object.values(DB.counts()).reduce((s, v) => s + v, 0);
  if (total) {
    const ok = await UI.confirm({ title: 'Carregar demonstração?', message: `Os ${U.count(total, 'registro atual será substituído', 'registros atuais serão substituídos')} pelos dados de demonstração. Você poderá desfazer logo em seguida.`, confirmLabel: 'Substituir pela demonstração' });
    if (!ok) return;
  }
  await replaceWithUndo(buildDemo(), { initialized: true, demo: true, personalBudget: DB.getMeta().personalBudget || 3000 }, 'Dados de demonstração carregados.');
};
A.wipeData = async () => {
  const ok = await UI.confirm({ title: 'Apagar todos os dados?', message: 'Projetos, tarefas, compromissos, listas, custos, comparações e notas deste navegador serão removidos. Você poderá desfazer logo em seguida; depois disso, apenas um backup recupera os dados.', confirmLabel: 'Apagar tudo', danger: true });
  if (!ok) return;
  await replaceWithUndo({}, { initialized: true, demo: false }, 'Tudo limpo. Seu próximo projeto começa aqui.');
};
