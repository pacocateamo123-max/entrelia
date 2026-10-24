'use strict';

/* Utilitários gerais: datas, dinheiro, texto. Tudo em pt-BR. */
const U = (() => {
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = (s) => {
    if (!s || typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    const [y, m, d] = s.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.getMonth() === m - 1 ? dt : null;
  };
  const today = () => iso(new Date());
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
  const diffDays = (a, b) => Math.round((parse(b) - parse(a)) / 86400000); // b - a

  const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const MONTHS_S = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const WEEKDAYS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  const WD_S = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

  function fmtDate(s, withYear) {
    const d = parse(s); if (!d) return '';
    const showYear = withYear || d.getFullYear() !== new Date().getFullYear();
    return `${d.getDate()} ${MONTHS_S[d.getMonth()]}${showYear ? ' ' + d.getFullYear() : ''}`;
  }
  function fmtDateBR(s) { const d = parse(s); return d ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}` : ''; }
  function fmtDateLong(s) { const d = parse(s); return d ? `${WEEKDAYS[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}` : ''; }
  function fmtDateFull(s) { const d = parse(s); return d ? `${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}` : ''; }

  function relDay(s) {
    const n = diffDays(today(), s);
    if (n === 0) return 'hoje';
    if (n === 1) return 'amanhã';
    if (n === -1) return 'ontem';
    if (n > 1 && n < 7) return `em ${n} dias`;
    if (n < -1 && n > -30) return `há ${-n} dias`;
    return fmtDate(s);
  }

  function dueInfo(s, done) {
    if (!parse(s)) return null;
    if (done) return { label: fmtDate(s), tone: 'muted', icon: 'calendar' };
    const n = diffDays(today(), s);
    if (n < 0) return { label: `Atrasada há ${-n === 1 ? '1 dia' : -n + ' dias'}`, tone: 'danger', icon: 'alert' };
    if (n === 0) return { label: 'Vence hoje', tone: 'warn', icon: 'clock' };
    if (n === 1) return { label: 'Vence amanhã', tone: 'warn', icon: 'clock' };
    if (n <= 7) return { label: `Vence em ${n} dias`, tone: 'brand', icon: 'clock' };
    return { label: `Prazo ${fmtDate(s)}`, tone: 'muted', icon: 'calendar' };
  }

  const moneyFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const numFmt = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtMoney = (n) => moneyFmt.format(Number(n) || 0);
  const fmtNum2 = (n) => numFmt.format(Number(n) || 0);
  function fmtMoneyShort(n) {
    const v = Number(n) || 0;
    if (Math.abs(v) >= 1000) return 'R$ ' + (v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mil';
    return 'R$ ' + Math.round(v).toLocaleString('pt-BR');
  }
  function parseMoney(v) {
    if (typeof v === 'number') return v;
    let s = String(v || '').trim().replace(/[R$\s ]/g, '');
    if (!s) return NaN;
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    if (!/^-?\d+(\.\d+)?$/.test(s)) return NaN;
    return Math.round(Number(s) * 100) / 100;
  }
  const moneyInput = (n) => (Number(n) || 0) ? fmtNum2(n) : '';

  function fmtDuration(min) {
    min = Math.round(Number(min) || 0);
    if (!min) return '';
    const h = Math.floor(min / 60), m = min % 60;
    if (!h) return `${m} min`;
    return m ? `${h}h ${m}min` : `${h}h`;
  }
  const timeToMin = (t) => { if (!/^\d{1,2}:\d{2}$/.test(t || '')) return NaN; const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const minToTime = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
  const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
  const normalize = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  const NUM_F = ['zero', 'uma', 'duas', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez'];
  const NUM_M = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez'];
  const numWord = (n, fem) => (n >= 0 && n <= 10 ? (fem ? NUM_F : NUM_M)[n] : String(n));
  const plural = (n, s, p) => (n === 1 ? s : p);
  const count = (n, s, p) => `${n} ${plural(n, s, p)}`;

  function debounce(fn, ms) {
    let t;
    const d = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
    d.flush = (...a) => { clearTimeout(t); fn(...a); };
    d.cancel = () => clearTimeout(t);
    return d;
  }
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  function greeting() {
    const h = new Date().getHours();
    return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  }

  function download(filename, content, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const readFile = (file) => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = () => rej(r.error);
    r.readAsText(file);
  });

  function startOfWeek(s) { const d = parse(s); return addDays(s, -d.getDay()); }
  function monthMatrix(y, m) {
    const first = new Date(y, m, 1);
    const start = addDays(iso(first), -first.getDay());
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }
  const timeNow = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };

  return {
    pad, iso, parse, today, addDays, diffDays, MONTHS, MONTHS_S, WEEKDAYS, WD_S,
    fmtDate, fmtDateBR, fmtDateLong, fmtDateFull, relDay, dueInfo,
    fmtMoney, fmtNum2, fmtMoneyShort, parseMoney, moneyInput,
    fmtDuration, timeToMin, minToTime, nowMin, timeNow,
    uid, esc, normalize, numWord, plural, count, debounce, clamp, greeting,
    download, readFile, startOfWeek, monthMatrix,
  };
})();
