'use strict';

/*
  Camada de dados: IndexedDB com cópia em memória.
  - Leituras são síncronas (memória); gravações vão para o IndexedDB em lote.
  - Se o IndexedDB não estiver disponível, usa localStorage e informa o estado real.
  - DB.track(fn) registra o estado anterior de tudo que fn alterar e devolve uma função "desfazer".
*/
const DB = (() => {
  const NAME = 'entrelia';
  const VERSION = 1;
  const COLS = ['projects', 'tasks', 'events', 'lists', 'expenses', 'comparisons', 'notes'];
  const FALLBACK_KEY = 'entrelia-fallback';

  const state = {};
  COLS.forEach((c) => { state[c] = []; });
  let meta = defaultMeta();
  let idb = null;
  let status = 'carregando'; // ok | local | memoria
  let lastSaved = null;
  let lastError = null;
  let saving = false;
  let recorder = null;
  const listeners = {};
  const queue = new Map();
  let metaDirty = false;
  let timer = null;

  function defaultMeta() {
    return {
      initialized: false, demo: false, userName: '', theme: 'escuro', reduceMotion: false,
      sidebarCollapsed: false, personalBudget: 0, readNotifs: [], ui: {}, lastRoute: '',
    };
  }

  const on = (evt, fn) => { (listeners[evt] = listeners[evt] || []).push(fn); };
  const emit = (evt, data) => (listeners[evt] || []).forEach((fn) => { try { fn(data); } catch (e) { console.error(e); } });
  const reqP = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

  function open() {
    return new Promise((res, rej) => {
      if (!('indexedDB' in window) || !window.indexedDB) return rej(new Error('IndexedDB não está disponível neste navegador.'));
      let r;
      try { r = indexedDB.open(NAME, VERSION); } catch (e) { return rej(e); }
      r.onupgradeneeded = () => {
        const db = r.result;
        COLS.forEach((c) => { if (!db.objectStoreNames.contains(c)) db.createObjectStore(c, { keyPath: 'id' }); });
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error || new Error('Falha ao abrir o banco local.'));
      r.onblocked = () => rej(new Error('O banco local está bloqueado por outra aba.'));
    });
  }

  async function init() {
    try {
      idb = await open();
      const tx = idb.transaction([...COLS, 'meta'], 'readonly');
      await Promise.all(COLS.map((c) => reqP(tx.objectStore(c).getAll()).then((rows) => { state[c] = rows; })));
      const m = await reqP(tx.objectStore('meta').get('meta'));
      if (m) meta = { ...defaultMeta(), ...m };
      status = 'ok';
      idb.onversionchange = () => { idb.close(); status = 'memoria'; lastError = 'O banco foi atualizado em outra aba. Recarregue a página.'; emit('error', lastError); };
    } catch (e) {
      console.warn('IndexedDB indisponível, usando localStorage.', e);
      lastError = e && e.message ? e.message : String(e);
      try {
        const raw = localStorage.getItem(FALLBACK_KEY);
        if (raw) {
          const d = JSON.parse(raw);
          COLS.forEach((c) => { state[c] = Array.isArray(d.data && d.data[c]) ? d.data[c] : []; });
          meta = { ...defaultMeta(), ...(d.meta || {}) };
        }
        localStorage.setItem(FALLBACK_KEY + '-test', '1');
        localStorage.removeItem(FALLBACK_KEY + '-test');
        status = 'local';
      } catch (e2) {
        status = 'memoria';
      }
    }
  }

  function schedule() {
    if (!saving) { saving = true; emit('saving'); }
    clearTimeout(timer);
    timer = setTimeout(flush, 160);
  }

  function flush() {
    clearTimeout(timer);
    if (!queue.size && !metaDirty) return;
    const ops = Array.from(queue.values());
    queue.clear();
    const writeMeta = metaDirty;
    metaDirty = false;
    if (status === 'ok' && idb) {
      let tx;
      try { tx = idb.transaction([...COLS, 'meta'], 'readwrite'); }
      catch (e) { fail(e); return; }
      ops.forEach((o) => {
        const store = tx.objectStore(o.col);
        if (o.value) store.put(o.value); else store.delete(o.id);
      });
      if (writeMeta) tx.objectStore('meta').put(meta, 'meta');
      tx.oncomplete = () => done();
      tx.onerror = () => fail(tx.error);
      tx.onabort = () => fail(tx.error);
    } else if (status === 'local') {
      try { localStorage.setItem(FALLBACK_KEY, JSON.stringify({ data: state, meta })); done(); }
      catch (e) { fail(e); }
    } else {
      done();
    }
  }
  function done() {
    if (queue.size || metaDirty) return;
    saving = false;
    lastSaved = new Date();
    lastError = null;
    emit('saved');
  }
  function fail(e) {
    saving = false;
    lastError = (e && e.message) || 'Não foi possível salvar.';
    emit('error', lastError);
  }

  const all = (col) => state[col];
  const get = (col, id) => (id ? state[col].find((x) => x.id === id) || null : null);
  const clone = (col, id) => { const o = get(col, id); return o ? structuredClone(o) : null; };

  function record(col, id) {
    if (!recorder) return;
    const k = col + '|' + id;
    if (recorder.has(k)) return;
    const prev = get(col, id);
    recorder.set(k, { col, id, prev: prev ? structuredClone(prev) : null });
  }

  function put(col, obj, opts = {}) {
    record(col, obj.id);
    const arr = state[col];
    const i = arr.findIndex((x) => x.id === obj.id);
    obj.updatedAt = Date.now();
    if (i >= 0) arr[i] = obj;
    else { obj.createdAt = obj.createdAt || Date.now(); arr.push(obj); }
    queue.set(col + '|' + obj.id, { col, id: obj.id, value: obj });
    schedule();
    if (!opts.silent) emit('change', { col, id: obj.id });
    return obj;
  }
  function patch(col, id, changes, opts) {
    const o = get(col, id);
    if (!o) return null;
    return put(col, { ...o, ...changes }, opts);
  }
  function remove(col, id, opts = {}) {
    const arr = state[col];
    const i = arr.findIndex((x) => x.id === id);
    if (i < 0) return;
    record(col, id);
    arr.splice(i, 1);
    queue.set(col + '|' + id, { col, id, value: null });
    schedule();
    if (!opts.silent) emit('change', { col, id });
  }

  function getMeta() { return meta; }
  function setMeta(p, opts = {}) {
    meta = { ...meta, ...p };
    metaDirty = true;
    schedule();
    if ('theme' in p) { try { localStorage.setItem('entrelia-theme', p.theme); } catch (e) { /* sem acesso */ } }
    if (!opts.silent) emit('change', { col: 'meta' });
  }

  /* Executa fn registrando o estado anterior; devolve a função que desfaz. */
  function track(fn) {
    const rec = new Map();
    recorder = rec;
    try { fn(); } finally { recorder = null; }
    return () => {
      Array.from(rec.values()).reverse().forEach(({ col, id, prev }) => {
        const arr = state[col];
        const i = arr.findIndex((x) => x.id === id);
        if (prev) {
          if (i >= 0) arr[i] = prev; else arr.push(prev);
          queue.set(col + '|' + id, { col, id, value: prev });
        } else if (i >= 0) {
          arr.splice(i, 1);
          queue.set(col + '|' + id, { col, id, value: null });
        }
      });
      schedule();
      emit('change', { col: '*' });
    };
  }

  /* Substitui todos os dados (importação, demonstração, começar do zero). */
  async function replaceAll(data, metaPatch = {}) {
    COLS.forEach((c) => { state[c] = Array.isArray(data[c]) ? data[c] : []; });
    meta = { ...meta, ...metaPatch, readNotifs: [] };
    queue.clear();
    metaDirty = false;
    saving = true;
    emit('saving');
    if (status === 'ok' && idb) {
      await new Promise((res, rej) => {
        const tx = idb.transaction([...COLS, 'meta'], 'readwrite');
        COLS.forEach((c) => {
          const s = tx.objectStore(c);
          s.clear();
          state[c].forEach((row) => s.put(row));
        });
        tx.objectStore('meta').put(meta, 'meta');
        tx.oncomplete = res;
        tx.onerror = () => rej(tx.error);
        tx.onabort = () => rej(tx.error);
      }).then(done, (e) => { fail(e); throw e; });
    } else if (status === 'local') {
      try { localStorage.setItem(FALLBACK_KEY, JSON.stringify({ data: state, meta })); done(); }
      catch (e) { fail(e); throw e; }
    } else done();
    emit('change', { col: '*' });
  }

  function exportData() {
    const data = {};
    COLS.forEach((c) => { data[c] = state[c]; });
    return {
      app: 'ENTRELIA',
      formato: 1,
      exportadoEm: new Date().toISOString(),
      preferencias: { userName: meta.userName, theme: meta.theme, personalBudget: meta.personalBudget, demo: meta.demo },
      dados: data,
    };
  }

  function counts() {
    const c = {};
    COLS.forEach((k) => { c[k] = state[k].length; });
    return c;
  }

  window.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
  window.addEventListener('pagehide', flush);

  return {
    COLS, init, on, all, get, clone, put, patch, remove, getMeta, setMeta, track, replaceAll, exportData, counts, flush,
    get status() { return status; },
    get lastSaved() { return lastSaved; },
    get lastError() { return lastError; },
    get saving() { return saving; },
  };
})();
