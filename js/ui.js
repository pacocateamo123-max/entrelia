'use strict';

/* Ícones (traço 1.8, 24x24) — conjunto único usado em toda a interface. */
const ICONS = {
  overview: '<rect x="3" y="3" width="7" height="9" rx="2"/><rect x="14" y="3" width="7" height="5" rx="2"/><rect x="14" y="12" width="7" height="9" rx="2"/><rect x="3" y="16" width="7" height="5" rx="2"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  tasks: '<path d="m9 11 3 3L21 5"/><path d="M20 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h11"/>',
  calendar: '<rect x="3" y="4.5" width="18" height="17" rx="2.5"/><path d="M16 2.5v4M8 2.5v4M3 10h18"/>',
  list: '<path d="M9 6h12M9 12h12M9 18h12"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>',
  wallet: '<path d="M20 7V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-1"/><path d="M3 7h16a1 1 0 0 1 1 1v3"/><path d="M21 11h-4a2 2 0 0 0 0 4h4z"/>',
  scale: '<path d="M12 3v18M7 21h10M5 7h14"/><path d="m5 7-3 7a3 3 0 0 0 6 0z"/><path d="m19 7-3 7a3 3 0 0 0 6 0z"/>',
  note: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
  settings: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  monitor: '<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  chevronLeft: '<path d="m15 18-6-6 6-6"/>',
  chevronRight: '<path d="m9 18 6-6-6-6"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  chevronUp: '<path d="m18 15-6-6-6 6"/>',
  more: '<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  archive: '<rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8M10 12h4"/>',
  grip: '<circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>',
  arrowUp: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  arrowDown: '<path d="M12 5v14M19 12l-7 7-7-7"/>',
  arrowRight: '<path d="M5 12h14M12 5l7 7-7 7"/>',
  arrowLeft: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
  alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  unlock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  filter: '<path d="M22 3H2l8 9.5V19l4 2v-8.5z"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  rows: '<rect x="3" y="4" width="18" height="4" rx="1.5"/><rect x="3" y="10" width="18" height="4" rx="1.5"/><rect x="3" y="16" width="18" height="4" rx="1.5"/>',
  board: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18"/><path d="M5.5 7h1.5M11.5 7h1M17 7h1.5"/>',
  sparkles: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  undo: '<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-15-6.7L3 13"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  circle: '<circle cx="12" cy="12" r="9"/>',
  flag: '<path d="M5 22V4M5 4h12l-2 4 2 4H5"/>',
  tag: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  panel: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 9l-3 3 3 3"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
  play: '<path d="m7 4 13 8-13 8z"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  cloud: '<path d="M17.5 19H8a6 6 0 1 1 5.7-7.9A4.5 4.5 0 1 1 17.5 19z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
  cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.7 12.4a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L21 8H6"/>',
  doc: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><path d="m9 15 2 2 4-4"/>',
  package: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
  steps: '<path d="M4 20h4v-4h4v-4h4V8h4V4"/>',
  receipt: '<path d="M5 3v18l2.5-1.5L10 21l2-1.5 2 1.5 2.5-1.5L19 21V3l-2.5 1.5L14 3l-2 1.5L10 3 7.5 4.5z"/><path d="M9 9h6M9 13h6"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  keyboard: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
  layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 12 10 5 10-5M2 17l10 5 10-5"/>',
  award: '<circle cx="12" cy="8" r="6"/><path d="M8.2 13.2 7 22l5-3 5 3-1.2-8.8"/>',
  zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  pin: '<path d="M12 17v5M5 17h14l-1.5-2.5V8a5.5 5.5 0 0 0-11 0v6.5z"/>',
  pie: '<path d="M21 12A9 9 0 1 1 12 3v9z"/><path d="M15 3.4A9 9 0 0 1 20.6 9H15z"/>',
  minus: '<path d="M5 12h14"/>',
  checklist: '<path d="m3 6 2 2 3-3M3 13l2 2 3-3"/><path d="M11 7h10M11 14h10M11 20h10"/>',
  heading: '<path d="M6 4v16M18 4v16M6 12h12"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  map: '<path d="m9 3-6 3v15l6-3 6 3 6-3V3l-6 3z"/><path d="M9 3v15M15 6v15"/>',
  book: '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 21.5A2.5 2.5 0 0 1 6.5 19H20v3H6.5"/>',
  party: '<path d="M5.8 11.3 2 22l10.7-3.8"/><path d="M4 3h.01M22 8h.01M15 2h.01M22 20h.01M22 2l-2.2.8a2.9 2.9 0 0 0-1.9 3.3c.1.6-.3 1.2-1 1.2H16M11 2l.3 2c.2 1-.4 1.9-1.4 2.1L9 6.3"/><path d="m22 13-1.6-.3c-1-.2-1.9.4-2.1 1.4l-.2 1"/><path d="M8.6 9.4c2 2 3 4.3 2.1 5.1-.9.9-3.1-.1-5.1-2.1s-3-4.3-2.1-5.1c.9-.9 3.1.1 5.1 2.1z"/>',
  code: '<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>',
  rocket: '<path d="M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2.1-.1-2.9a2.2 2.2 0 0 0-2.9-.1z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.9A12.9 12.9 0 0 1 22 2c0 2.7-.8 7.5-6 11a22.4 22.4 0 0 1-4 2z"/><path d="M9 12H4s.5-3 2-4c1.6-1.1 5 0 5 0M12 15v5s3-.5 4-2c1.1-1.6 0-5 0-5"/>',
};

function icon(name, cls = '') {
  return `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[name] || ''}</svg>`;
}

let __logoN = 0;
function logo(size = 38) {
  const id = 'lg' + (++__logoN);
  return `<svg class="brand-logo" width="${size}" height="${size}" viewBox="0 0 40 40" aria-hidden="true" focusable="false">
    <defs><linearGradient id="${id}" x1="6" y1="6" x2="34" y2="34" gradientUnits="userSpaceOnUse"><stop stop-color="#EBEAE6"/><stop offset="1" stop-color="#D6A062"/></linearGradient></defs>
    <rect x="1" y="1" width="38" height="38" fill="#101011"/>
    <rect x="1.5" y="1.5" width="37" height="37" fill="none" stroke="#D6A062" stroke-opacity=".45"/>
    <g fill="none" stroke="url(#${id})" stroke-width="2.6" stroke-linecap="square" stroke-linejoin="miter">
      <path d="M12 11v18M12 11h11M12 20h7M12 29h13"/>
      <path d="M24 11l-4 9M20 20l7 9" stroke-width="1.6" stroke-dasharray="1 3"/>
    </g>
    <circle cx="24" cy="11" r="2.8" fill="#EBEAE6"/><circle cx="20" cy="20" r="2.8" fill="#A6A39D"/><circle cx="28" cy="29" r="3.6" fill="#D6A062"/>
  </svg>`;
}

/* ---------- Morph: atualiza o DOM preservando foco, rolagem e transições ---------- */
function morph(el, html) {
  const tpl = el.cloneNode(false);
  tpl.innerHTML = html;
  morphChildren(el, tpl);
}
function keyOf(n) { return n.nodeType === 1 ? n.getAttribute('data-key') : null; }
function morphChildren(a, b) {
  const bKids = Array.from(b.childNodes);
  const keyed = new Map();
  a.childNodes.forEach((n) => { const k = keyOf(n); if (k) keyed.set(k, n); });
  let i = 0;
  for (const bn of bKids) {
    const k = keyOf(bn);
    let an = null;
    if (k) {
      an = keyed.get(k) || null;
      if (an && an.nodeName !== bn.nodeName) an = null;
      if (an) keyed.delete(k);
    } else {
      const cur = a.childNodes[i];
      if (cur && !keyOf(cur) && cur.nodeType === bn.nodeType && cur.nodeName === bn.nodeName) an = cur;
    }
    const ref = a.childNodes[i] || null;
    if (an) {
      if (an !== ref) a.insertBefore(an, ref);
      morphNode(an, bn);
    } else {
      a.insertBefore(bn, ref);
    }
    i++;
  }
  while (a.childNodes.length > i) a.removeChild(a.lastChild);
}
function morphNode(a, b) {
  if (a.nodeType === 3 || a.nodeType === 8) { if (a.nodeValue !== b.nodeValue) a.nodeValue = b.nodeValue; return; }
  if (a.nodeType !== 1) return;
  const focused = document.activeElement === a;
  for (const attr of Array.from(a.attributes)) if (!b.hasAttribute(attr.name)) a.removeAttribute(attr.name);
  for (const attr of Array.from(b.attributes)) if (a.getAttribute(attr.name) !== attr.value) a.setAttribute(attr.name, attr.value);
  const tag = a.tagName;
  if (tag === 'INPUT') {
    if (a.type === 'checkbox' || a.type === 'radio') a.checked = b.hasAttribute('checked');
    else if (!focused) { const v = b.getAttribute('value') ?? ''; if (a.value !== v) a.value = v; }
    return;
  }
  if (tag === 'TEXTAREA') { if (!focused) { const v = b.value; if (a.value !== v) a.value = v; } return; }
  if (a.hasAttribute('data-morph-skip')) return;
  morphChildren(a, b);
  if (tag === 'SELECT') {
    const sel = Array.from(b.options).find((o) => o.hasAttribute('selected'));
    const v = sel ? sel.value : (b.options[0] ? b.options[0].value : '');
    if (a.value !== v) a.value = v;
  }
}

/* ---------- Modais, confirmações, avisos e menus ---------- */
const UI = (() => {
  const stack = [];
  let pop = null;
  const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('reduce-motion');
  const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

  function modal({ title = '', body = '', footer = '', size = 'md', className = '', onMount, onClose, dismissible = true, hideHead = false }) {
    closePopover();
    const prevFocus = document.activeElement;
    const layer = document.createElement('div');
    layer.className = `modal-layer ${className}`;
    const hid = 'mh-' + U.uid();
    layer.innerHTML = `<div class="modal-backdrop" ${dismissible ? 'data-modal-close' : ''}></div>
      <div class="modal modal-${size}" role="dialog" aria-modal="true" tabindex="-1" ${title ? `aria-labelledby="${hid}"` : 'aria-label="Diálogo"'}>
        ${hideHead ? '' : `<header class="modal-head"><h2 id="${hid}">${title}</h2><button type="button" class="btn btn-ghost btn-icon btn-sm" data-modal-close aria-label="Fechar">${icon('x')}</button></header>`}
        <div class="modal-body">${body}</div>
        ${footer ? `<footer class="modal-foot">${footer}</footer>` : ''}
      </div>`;
    document.getElementById('modal-root').appendChild(layer);
    document.body.classList.add('no-scroll');
    const dlg = layer.querySelector('.modal');
    const ctrl = {
      el: dlg, layer, dismissible, closed: false,
      body: dlg.querySelector('.modal-body'),
      foot: dlg.querySelector('.modal-foot'),
      setBody(html) { morph(ctrl.body, html); },
      setFoot(html) { if (ctrl.foot) morph(ctrl.foot, html); },
      setTitle(t) { const h = dlg.querySelector('.modal-head h2'); if (h) h.innerHTML = t; },
      close,
    };
    layer.addEventListener('click', (e) => { if (e.target.closest('[data-modal-close]')) close(); });
    stack.push(ctrl);
    function close(result) {
      if (ctrl.closed) return;
      ctrl.closed = true;
      const i = stack.indexOf(ctrl);
      if (i >= 0) stack.splice(i, 1);
      layer.classList.add('closing');
      setTimeout(() => layer.remove(), reduceMotion() ? 0 : 140);
      if (!stack.length) document.body.classList.remove('no-scroll');
      if (onClose) onClose(result);
      if (prevFocus && document.contains(prevFocus) && prevFocus.focus) prevFocus.focus({ preventScroll: true });
    }
    if (onMount) onMount(dlg, ctrl);
    requestAnimationFrame(() => {
      if (ctrl.closed) return;
      const f = dlg.querySelector('[autofocus]') || dlg.querySelector('.modal-body ' + FOCUSABLE) || dlg.querySelector(FOCUSABLE);
      (f || dlg).focus({ preventScroll: false });
    });
    return ctrl;
  }

  function confirm({ title, message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', danger = false }) {
    return new Promise((res) => {
      let result = false;
      modal({
        title, size: 'sm',
        body: `<p class="muted">${message}</p>`,
        footer: `<button type="button" class="btn btn-ghost" data-modal-close ${danger ? 'autofocus' : ''}>${cancelLabel}</button>
                 <button type="button" class="btn ${danger ? 'btn-danger-solid' : 'btn-primary'}" data-confirm ${danger ? '' : 'autofocus'}>${confirmLabel}</button>`,
        onMount(el, c) { el.querySelector('[data-confirm]').addEventListener('click', () => { result = true; c.close(); }); },
        onClose() { res(result); },
      });
    });
  }

  function toast(msg, { tone = 'success', action = null, timeout = 4200 } = {}) {
    const root = document.getElementById('toast-root');
    const el = document.createElement('div');
    el.className = `toast t-${tone}`;
    el.setAttribute('role', tone === 'danger' ? 'alert' : 'status');
    const ic = { success: 'checkCircle', info: 'info', warn: 'alert', danger: 'alert' }[tone] || 'info';
    el.innerHTML = `${icon(ic)}<span class="toast-msg">${U.esc(msg)}</span>${action ? `<button type="button" class="toast-action">${U.esc(action.label)}</button>` : ''}<button type="button" class="toast-x" aria-label="Fechar aviso">${icon('x', 'ic-sm')}</button>`;
    root.appendChild(el);
    while (root.children.length > 3) root.firstChild.remove();
    const kill = () => {
      if (!el.isConnected || el.classList.contains('leaving')) return;
      el.classList.add('leaving');
      setTimeout(() => el.remove(), reduceMotion() ? 0 : 160);
    };
    const life = action ? Math.max(timeout, 7000) : timeout;
    let t = setTimeout(kill, life);
    el.addEventListener('mouseenter', () => clearTimeout(t));
    el.addEventListener('mouseleave', () => { t = setTimeout(kill, 2500); });
    el.querySelector('.toast-x').addEventListener('click', kill);
    if (action) el.querySelector('.toast-action').addEventListener('click', () => { kill(); action.fn(); });
  }

  function popover(anchor, html, { align = 'end', className = '', onMount } = {}) {
    closePopover();
    const el = document.createElement('div');
    el.className = 'popover ' + className;
    el.innerHTML = html;
    document.body.appendChild(el);
    position(el, anchor, align);
    anchor.setAttribute('aria-expanded', 'true');
    pop = { el, anchor };
    if (onMount) onMount(el);
    const first = el.querySelector('[role="menuitem"]:not([disabled]), button:not([disabled]), input, a[href]');
    if (first) first.focus({ preventScroll: true });
    return el;
  }
  function position(el, anchor, align) {
    const r = anchor.getBoundingClientRect();
    const w = el.offsetWidth, h = el.offsetHeight, vw = window.innerWidth, vh = window.innerHeight;
    let left = align === 'end' ? r.right - w : r.left;
    left = Math.max(12, Math.min(left, vw - w - 12));
    let top = r.bottom + 8;
    if (top + h > vh - 12 && r.top - h - 8 > 12) top = r.top - h - 8;
    top = Math.max(12, Math.min(top, vh - h - 12));
    el.style.left = left + 'px';
    el.style.top = top + 'px';
  }
  function closePopover(returnFocus) {
    if (!pop) return;
    const p = pop; pop = null;
    p.el.remove();
    p.anchor.setAttribute('aria-expanded', 'false');
    if (returnFocus && document.contains(p.anchor)) p.anchor.focus();
  }
  const popoverAnchor = () => (pop ? pop.anchor : null);

  /* items: [{label, icon, fn, danger, disabled, hint} | '-' | {header}] */
  function menu(anchor, items, opts = {}) {
    if (pop && pop.anchor === anchor) { closePopover(); return null; }
    const html = `<div role="menu">${items.map((it, i) => {
      if (it === '-') return '<div class="menu-sep" role="separator"></div>';
      if (it.header) return `<div class="menu-label">${U.esc(it.header)}</div>`;
      return `<button type="button" role="menuitem" class="menu-item ${it.danger ? 'danger' : ''}" data-i="${i}" ${it.disabled ? 'disabled' : ''}>${icon(it.icon || 'chevronRight')}<span>${U.esc(it.label)}</span>${it.hint ? `<span class="menu-hint">${U.esc(it.hint)}</span>` : ''}</button>`;
    }).join('')}</div>`;
    return popover(anchor, html, {
      ...opts,
      onMount(el) {
        el.addEventListener('click', (e) => {
          const b = e.target.closest('[data-i]');
          if (!b || b.disabled) return;
          const it = items[+b.dataset.i];
          closePopover(true);
          it.fn && it.fn();
        });
        el.addEventListener('keydown', (e) => {
          const btns = Array.from(el.querySelectorAll('[role="menuitem"]:not([disabled])'));
          const i = btns.indexOf(document.activeElement);
          if (e.key === 'ArrowDown') { e.preventDefault(); btns[(i + 1) % btns.length]?.focus(); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); btns[(i - 1 + btns.length) % btns.length]?.focus(); }
          else if (e.key === 'Home') { e.preventDefault(); btns[0]?.focus(); }
          else if (e.key === 'End') { e.preventDefault(); btns[btns.length - 1]?.focus(); }
          else if (e.key === 'Tab') closePopover();
        });
      },
    });
  }

  document.addEventListener('pointerdown', (e) => {
    if (pop && !pop.el.contains(e.target) && !pop.anchor.contains(e.target)) closePopover();
  }, true);
  window.addEventListener('resize', () => closePopover());
  window.addEventListener('scroll', (e) => { if (pop && !pop.el.contains(e.target)) closePopover(); }, true);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (pop) { e.preventDefault(); closePopover(true); return; }
      const top = stack[stack.length - 1];
      if (top && top.dismissible) { e.preventDefault(); top.close(); }
      return;
    }
    if (e.key === 'Tab' && stack.length && !pop) {
      const top = stack[stack.length - 1].el;
      const f = Array.from(top.querySelectorAll(FOCUSABLE)).filter((x) => x.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (!top.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* Validação simples de campos: marca .field com erro e mostra mensagem. */
  function fieldError(form, name, msg) {
    const input = form.querySelector(`[name="${name}"]`);
    const field = input && input.closest('.field');
    if (!field) return;
    let err = field.querySelector('.error');
    if (!err) { err = document.createElement('div'); err.className = 'error'; field.appendChild(err); }
    if (msg) {
      field.classList.add('has-error');
      err.hidden = false;
      err.innerHTML = `${icon('alert', 'ic-xs')}<span>${U.esc(msg)}</span>`;
      input.setAttribute('aria-invalid', 'true');
      if (!err.id) err.id = 'err-' + U.uid();
      input.setAttribute('aria-describedby', err.id);
    } else {
      field.classList.remove('has-error');
      err.hidden = true;
      input.removeAttribute('aria-invalid');
    }
  }
  function validate(form, rules) {
    let firstBad = null;
    for (const [name, check] of Object.entries(rules)) {
      const input = form.querySelector(`[name="${name}"]`);
      if (!input) continue;
      const msg = check(input.value.trim(), input);
      fieldError(form, name, msg || '');
      if (msg && !firstBad) firstBad = input;
    }
    if (firstBad) firstBad.focus();
    return !firstBad;
  }

  return { modal, confirm, toast, popover, closePopover, popoverAnchor, menu, stack, fieldError, validate, reduceMotion };
})();
