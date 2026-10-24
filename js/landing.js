/* =========================================================
   ENTRELIA — página de entrada: abertura, rede, rolagem guiada,
   ondas, parallax e microinterações
   ========================================================= */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasIntro = document.documentElement.classList.contains('has-intro');
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  const lerp = (a, b, t) => a + (b - a) * t;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  /* ---------- Texto dividido ---------- */
  $$('[data-split]').forEach((el) => {
    el.innerHTML = [...el.textContent.trim()].map((c, i) => `<span class="ch" style="--i:${i}"><span>${c === ' ' ? '&nbsp;' : c}</span></span>`).join('');
  });
  $$('[data-lines]').forEach((el) => {
    el.innerHTML = el.innerHTML.split(/<br\s*\/?>/i).map((l, i) => `<span class="ln" style="--i:${i}"><span>${l.trim()}</span></span>`).join('');
  });

  /* ---------- Ícones ---------- */
  const ICONS = {
    overview: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
    projetos: '<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.7-.9L9.6 3.9A2 2 0 0 0 7.9 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
    tarefas: '<path d="m9 11 3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
    calendario: '<rect x="3" y="4" width="18" height="18"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    listas: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    custos: '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
    comparador: '<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10M12 3v18M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>',
    notas: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4M10 9H8M16 13H8M16 17H8"/>',
  };
  const glyph = (name, size) => `<svg class="glyph" x="${-size / 2}" y="${-size / 2}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="square" stroke-linejoin="miter">${ICONS[name]}</svg>`;

  /* ---------- Rede ---------- */
  const MODULES = [
    { id: 'projetos', label: 'Projetos' },
    { id: 'tarefas', label: 'Tarefas' },
    { id: 'calendario', label: 'Calendário' },
    { id: 'listas', label: 'Listas' },
    { id: 'custos', label: 'Custos' },
    { id: 'comparador', label: 'Comparador' },
    { id: 'notas', label: 'Notas' },
  ];
  const CENTER = { x: 500, y: 350 };
  const ORDERED = { core: CENTER };
  MODULES.forEach((m, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / MODULES.length;
    ORDERED[m.id] = { x: CENTER.x + Math.cos(a) * 380, y: CENTER.y + Math.sin(a) * 255 };
  });
  // Posições "bagunçadas" do começo da rolagem guiada, com um giro em cada peça.
  const SCATTER = {
    projetos: { x: 170, y: 560, r: -14 }, tarefas: { x: 820, y: 110, r: 9 }, calendario: { x: 300, y: 130, r: 12 },
    listas: { x: 900, y: 520, r: -8 }, custos: { x: 560, y: 610, r: 16 }, comparador: { x: 90, y: 300, r: -10 }, notas: { x: 690, y: 330, r: 7 },
  };
  const ALL_LINKS = [
    ['projetos', 'tarefas'], ['projetos', 'custos'], ['projetos', 'listas'], ['projetos', 'notas'],
    ['tarefas', 'calendario'], ['listas', 'tarefas'], ['comparador', 'custos'],
    ['calendario', 'core'], ['tarefas', 'core'],
    ['projetos', 'core'], ['listas', 'core'], ['custos', 'core'], ['comparador', 'core'], ['notas', 'core'],
  ];
  const linkKey = (a, b) => `${a}-${b}`;

  function curve(a, b) {
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const cx = mx + (CENTER.x - mx) * 0.35, cy = my + (CENTER.y - my) * 0.35;
    return `M${a.x.toFixed(1)} ${a.y.toFixed(1)}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
  }

  function buildNet(svg) {
    const linkLayer = document.createElementNS(SVG_NS, 'g');
    const sparkLayer = document.createElementNS(SVG_NS, 'g');
    const nodeLayer = document.createElementNS(SVG_NS, 'g');
    svg.append(linkLayer, sparkLayer, nodeLayer);
    const links = {};
    ALL_LINKS.forEach(([a, b], i) => {
      const p = document.createElementNS(SVG_NS, 'path');
      p.setAttribute('class', 'link');
      p.setAttribute('d', curve(ORDERED[a], ORDERED[b]));
      p.setAttribute('pathLength', '1');
      p.style.strokeDasharray = '1';
      p.style.strokeDashoffset = '1';
      linkLayer.appendChild(p);
      const glow = document.createElementNS(SVG_NS, 'circle');
      glow.setAttribute('class', 'spark-glow');
      glow.setAttribute('r', '9');
      const dot = document.createElementNS(SVG_NS, 'circle');
      dot.setAttribute('class', 'spark');
      dot.setAttribute('r', '3.2');
      glow.style.display = dot.style.display = 'none';
      sparkLayer.append(glow, dot);
      links[linkKey(a, b)] = { el: p, len: 0, dot, glow, phase: (i * 0.37) % 1, speed: 0.22 + (i % 4) * 0.04, drawn: 0 };
    });
    const core = document.createElementNS(SVG_NS, 'g');
    core.setAttribute('class', 'core');
    core.setAttribute('transform', `translate(${CENTER.x} ${CENTER.y})`);
    core.innerHTML = `<g class="node-in"><g class="core-body">
        <rect class="core-pulse" x="-50" y="-50" width="100" height="100"/>
        <rect class="core-pulse" x="-50" y="-50" width="100" height="100"/>
        <rect class="core-box" x="-50" y="-50" width="100" height="100"/>
        <g transform="translate(-50 -50) scale(2.5)"><path class="core-e" d="M9 9h22v5H14v3.5h7v5h-7V26h17v5H9z"/><rect class="core-node" x="24.5" y="17.5" width="5" height="5"/></g>
      </g><text y="84">Próximo passo</text></g>`;
    nodeLayer.appendChild(core);
    const nodes = {};
    MODULES.forEach((m, i) => {
      const g = document.createElementNS(SVG_NS, 'g');
      g.setAttribute('class', 'node');
      g.innerHTML = `<g class="node-body"><g class="node-in" style="transition-delay:${120 + i * 70}ms"><rect x="-36" y="-36" width="72" height="72"/>${glyph(m.id, 30)}<text y="64">${m.label}</text></g></g>`;
      nodeLayer.appendChild(g);
      nodes[m.id] = { el: g, body: g.firstElementChild };
    });
    return { svg, links, nodes, core };
  }
  const place = (n, x, y) => { n.el.style.transform = `translate(${x}px, ${y}px)`; };

  // Faíscas que correm pelas ligações já desenhadas.
  function runSparks(net, now) {
    Object.values(net.links).forEach((l) => {
      const show = l.drawn > 0.98;
      l.dot.style.display = l.glow.style.display = show ? '' : 'none';
      if (!show) return;
      if (!l.len) l.len = l.el.getTotalLength();
      const t = ((now / 1000) * l.speed + l.phase) % 1;
      const pt = l.el.getPointAtLength(t * l.len);
      const fade = Math.sin(t * Math.PI);
      l.dot.setAttribute('cx', pt.x); l.dot.setAttribute('cy', pt.y);
      l.glow.setAttribute('cx', pt.x); l.glow.setAttribute('cy', pt.y);
      l.dot.style.opacity = fade; l.glow.style.opacity = fade * 0.3;
    });
  }

  /* ---------- Visibilidade das seções (liga e desliga laços) ---------- */
  const visible = new Set();
  const visIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) visible.add(e.target.id); else visible.delete(e.target.id); });
  }, { rootMargin: '10% 0px' });

  /* ---------- Abertura ---------- */
  const hero = $('#hero');
  const heroNet = buildNet($('#hero-net'));
  MODULES.forEach((m) => { place(heroNet.nodes[m.id], ORDERED[m.id].x, ORDERED[m.id].y); heroNet.nodes[m.id].el.classList.add('is-on'); });
  heroNet.core.classList.add('is-lit');
  visIO.observe(hero);
  setTimeout(() => {
    hero.classList.add('is-in');
    heroNet.svg.classList.add('is-in');
    Object.values(heroNet.links).forEach((l, i) => {
      l.el.style.opacity = '.42';
      l.el.style.transition = reduceMotion ? 'none' : `stroke-dashoffset 1.4s cubic-bezier(.23,1,.32,1) ${500 + i * 70}ms`;
      l.el.style.strokeDashoffset = '0';
      setTimeout(() => { l.drawn = 1; }, reduceMotion ? 0 : 1900 + i * 70);
    });
  }, hasIntro ? 1250 : 80);

  /* ---------- Por dentro: rolagem guiada ---------- */
  const STEPS = [
    { title: 'Tudo solto', text: 'Tarefas num app, gastos em outro, ideias no bloco de notas. Nada conversa com nada.', upto: 0 },
    { title: 'Projetos que juntam tudo', text: 'Cada projeto reúne as próprias tarefas, custos, listas e notas. Abriu um, vê o resto.', upto: 4 },
    { title: 'Uma coisa depois da outra', text: 'Tarefas podem depender de outras. O que está bloqueado espera a vez, sem roubar sua atenção.', upto: 7 },
    { title: 'O dia no lugar', text: '“Organizar meu dia” encaixa as tarefas no tempo livre da agenda e avisa quando dois horários batem.', upto: 9 },
    { title: 'Próximo passo claro', text: 'Tudo vira uma sugestão só: o que fazer agora, e por quê.', upto: ALL_LINKS.length },
  ];
  const inside = $('#por-dentro');
  const insideNet = buildNet($('#inside-net'));
  insideNet.svg.classList.add('is-in');
  visIO.observe(inside);
  const copy = $('.inside-copy', inside);
  const titleEl = $('#inside-title');
  const textEl = $('#inside-text');
  const numEl = $('#inside-num');
  const dots = $('#inside-steps');
  dots.innerHTML = STEPS.map((s, i) => `<li><button type="button" data-step="${i}" aria-label="Etapa ${i + 1}: ${s.title}"></button></li>`).join('');
  dots.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const total = inside.offsetHeight - window.innerHeight;
    window.scrollTo({ top: inside.offsetTop + total * ((Number(b.dataset.step) + 0.55) / STEPS.length), behavior: reduceMotion ? 'auto' : 'smooth' });
  });
  const wordsHTML = (t) => t.split(' ').map((w, i) => `<span class="w" style="--i:${i}"><span>${w}</span></span>`).join(' ');
  let step = -1, swapTimer = 0;

  function setStep(s) {
    step = s;
    const lit = new Set();
    ALL_LINKS.slice(0, STEPS[s].upto).forEach(([a, b]) => { lit.add(a); lit.add(b); });
    const before = new Set();
    if (s > 0) ALL_LINKS.slice(0, STEPS[s - 1].upto).forEach(([a, b]) => { before.add(a); before.add(b); });
    MODULES.forEach((m) => {
      insideNet.nodes[m.id].el.classList.toggle('is-on', lit.has(m.id));
      insideNet.nodes[m.id].el.classList.toggle('is-hot', lit.has(m.id) && !before.has(m.id));
    });
    insideNet.core.classList.toggle('is-dim', !lit.has('core'));
    insideNet.core.classList.toggle('is-lit', s === STEPS.length - 1);
    $$('button', dots).forEach((b, i) => b.classList.toggle('is-on', i <= s));
    numEl.textContent = String(s + 1).padStart(2, '0');
    clearTimeout(swapTimer);
    copy.classList.add('is-swapping');
    titleEl.innerHTML = wordsHTML(STEPS[s].title);
    swapTimer = setTimeout(() => {
      textEl.textContent = STEPS[s].text;
      copy.classList.remove('is-swapping');
    }, reduceMotion ? 0 : 260);
  }

  function updateInside() {
    const r = inside.getBoundingClientRect();
    const total = inside.offsetHeight - window.innerHeight;
    const p = clamp(-r.top / total);
    const f = p * STEPS.length;
    // As peças se alinham durante a primeira etapa.
    const t = ease(clamp((p - 0.03) / 0.15));
    MODULES.forEach((m) => {
      const a = SCATTER[m.id], b = ORDERED[m.id], n = insideNet.nodes[m.id];
      place(n, lerp(a.x, b.x, t), lerp(a.y, b.y, t));
      n.body.style.transform = `rotate(${(a.r * (1 - t)).toFixed(2)}deg)`;
    });
    // Cada ligação se desenha conforme a rolagem avança dentro da sua etapa.
    let from = 0;
    STEPS.forEach((st, si) => {
      const local = ease(clamp((f - si) / 0.55));
      for (let k = from; k < st.upto; k++) {
        const l = insideNet.links[linkKey(...ALL_LINKS[k])];
        const stagger = clamp(local * 1.4 - (k - from) * 0.12);
        l.drawn = si === 0 ? 0 : stagger;
        l.el.style.strokeDashoffset = (1 - l.drawn).toFixed(3);
      }
      from = st.upto;
    });
    inside.style.setProperty('--bgo', (0.55 * (1 - ease(clamp((p - 0.02) / 0.2)))).toFixed(3));
    inside.style.setProperty('--bgs', (1.04 + p * 0.25).toFixed(3));
    const s = Math.min(STEPS.length - 1, Math.floor(f));
    if (s !== step) setStep(s);
  }
  updateInside();

  /* ---------- Organizar: o caos se acalma ---------- */
  const calm = $('#organizar');
  visIO.observe(calm);
  const [pa, pb, pc] = $$('#calm-lines path');
  const calmChars = $$('.calm-title .ch > span');
  const jitter = calmChars.map((_, i) => ({ x: Math.sin(i * 12.9898) * 0.18, y: Math.cos(i * 78.233) * 0.32, r: Math.sin(i * 4.1) * 16 }));
  const W = 1200, N = 120;
  const noise = (x, t) => Math.sin(x * 0.011 + t) * 0.5 + Math.sin(x * 0.029 + t * 1.3 + 1.7) * 0.32 + Math.sin(x * 0.067 + t * 0.7 + 4.1) * 0.18;
  const line = (y0, amp, sign, t) => {
    let d = '';
    for (let i = 0; i <= N; i++) {
      const x = (i / N) * W;
      d += `${i ? 'L' : 'M'}${x.toFixed(1)} ${(y0 + sign * noise(x, t) * amp).toFixed(1)}`;
    }
    return d;
  };
  let calmK = 0, calmTime = 0;
  function drawCalm() {
    const k = ease(calmK);
    pa.setAttribute('d', line(110, 85, 1, calmTime));
    pb.setAttribute('d', line(300, 85 * k, -1, calmTime));
    pc.setAttribute('d', line(500, 85 * (1 - k), 1, calmTime));
    calmChars.forEach((c, i) => {
      const j = jitter[i], m = 1 - k;
      c.style.setProperty('--jx', `${(j.x * m).toFixed(3)}em`);
      c.style.setProperty('--jy', `${(j.y * m).toFixed(3)}em`);
      c.style.setProperty('--jr', `${(j.r * m).toFixed(2)}deg`);
    });
  }
  function updateCalm() {
    const r = calm.getBoundingClientRect();
    calmK = clamp((-r.top + window.innerHeight * 0.15) / (calm.offsetHeight - window.innerHeight * 0.7));
    if (reduceMotion) drawCalm();
  }
  updateCalm();
  drawCalm();

  /* ---------- Parallax das fotos ---------- */
  const focus = $('.focus');
  const focusImg = $('.focus-img img');
  const numbersImg = $('.numbers-img img');
  const practicePhoto = $('.practice-photo img');
  const viewProgress = (el) => {
    const r = el.getBoundingClientRect();
    return clamp((window.innerHeight - r.top) / (window.innerHeight + r.height));
  };
  function updatePhotos() {
    if (reduceMotion) return;
    const f = viewProgress(focus);
    focusImg.style.setProperty('--fs', (1.18 - 0.16 * f).toFixed(3));
    focusImg.style.setProperty('--fy', `${((f - 0.5) * -70).toFixed(1)}px`);
    numbersImg.style.setProperty('--ny', `${(-viewProgress(numbersImg.parentElement) * 16).toFixed(2)}%`);
    practicePhoto.style.setProperty('--pp', `${(-viewProgress(practicePhoto.parentElement) * 13).toFixed(2)}%`);
  }

  /* ---------- Abertura: parallax da rolagem e do ponteiro ---------- */
  const words = $$('.hero-word');
  const heroVisualSvg = heroNet.svg;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  if (finePointer && !reduceMotion) {
    window.addEventListener('pointermove', (e) => {
      pointer.tx = e.clientX / window.innerWidth - 0.5;
      pointer.ty = e.clientY / window.innerHeight - 0.5;
    }, { passive: true });
  }
  const wide = () => window.innerWidth > 900;
  function updateHero() {
    if (reduceMotion || !wide()) return;
    const h = clamp(window.scrollY / window.innerHeight);
    words[0].style.setProperty('--py', `${(-h * 140).toFixed(1)}px`);
    words[1].style.setProperty('--py', `${(h * 90).toFixed(1)}px`);
    heroVisualSvg.style.setProperty('--hs', (1 + h * 0.3).toFixed(3));
    heroVisualSvg.style.setProperty('--ho', (1 - h * 1.15).toFixed(3));
  }

  /* ---------- Topo: progresso, esconder ao descer, seção ativa ---------- */
  const top = $('#top');
  const bar = $('#progress');
  const navLinks = $$('[data-nav]');
  let lastY = window.scrollY;
  function updateTop() {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = `scaleX(${clamp(y / max).toFixed(4)})`;
    top.classList.toggle('is-scrolled', y > 10);
    if (Math.abs(y - lastY) > 6) {
      top.classList.toggle('is-hidden', y > lastY && y > window.innerHeight * 0.8);
      lastY = y;
    }
    const mid = window.innerHeight * 0.45;
    let active = '';
    navLinks.forEach((a) => {
      const sec = document.getElementById(a.dataset.nav);
      const r = sec.getBoundingClientRect();
      if (r.top <= mid && r.bottom > mid) active = a.dataset.nav;
    });
    navLinks.forEach((a) => a.classList.toggle('is-active', a.dataset.nav === active));
  }
  top.addEventListener('focusin', () => top.classList.remove('is-hidden'));

  /* ---------- Laço principal ---------- */
  let scrollDirty = true;
  window.addEventListener('scroll', () => { scrollDirty = true; }, { passive: true });
  window.addEventListener('resize', () => { scrollDirty = true; });
  function frame(now) {
    if (scrollDirty) {
      scrollDirty = false;
      updateTop();
      updateHero();
      if (visible.has('por-dentro')) updateInside();
      if (visible.has('organizar')) updateCalm();
      updatePhotos();
    }
    if (!reduceMotion) {
      if (visible.has('hero')) {
        runSparks(heroNet, now);
        if (finePointer && wide()) {
          pointer.x = lerp(pointer.x, pointer.tx, 0.06);
          pointer.y = lerp(pointer.y, pointer.ty, 0.06);
          heroVisualSvg.style.setProperty('--rx', `${(-pointer.y * 10).toFixed(2)}deg`);
          heroVisualSvg.style.setProperty('--ry', `${(pointer.x * 14).toFixed(2)}deg`);
          words.forEach((w, i) => w.style.setProperty('--wx', `${(pointer.x * (i ? 18 : -18)).toFixed(1)}px`));
        }
      }
      if (visible.has('por-dentro')) runSparks(insideNet, now);
      if (visible.has('organizar')) { calmTime += 0.012; drawCalm(); }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* ---------- Vem junto ---------- */
  const BOX = [
    { icon: 'overview', name: 'Visão geral', desc: 'Seu próximo passo, a agenda de hoje e o que está atrasado, numa tela só.' },
    { icon: 'projetos', name: 'Projetos', desc: 'Prazo, orçamento e progresso de cada projeto, com modelos prontos para começar.' },
    { icon: 'tarefas', name: 'Tarefas', desc: 'Em lista ou em quadro, com prioridade, subtarefas e dependências.' },
    { icon: 'calendario', name: 'Calendário', desc: 'Dia, semana e mês, com “Organizar meu dia” e aviso de conflitos.' },
    { icon: 'listas', name: 'Listas', desc: 'Compras, materiais, etapas ou o que você quiser, ligadas aos projetos.' },
    { icon: 'custos', name: 'Custos', desc: 'Previsto e pago por mês e por categoria, com alerta de orçamento.' },
    { icon: 'comparador', name: 'Comparador', desc: 'Compare opções com critérios e pesos e veja qual ganha.' },
    { icon: 'notas', name: 'Notas', desc: 'Ideias e decisões guardadas junto do projeto a que pertencem.' },
  ];
  const drawable = (svg) => svg.replace(/<(path|rect)\s/g, '<$1 pathLength="1" ');
  $('#box-list').innerHTML = BOX.map((b, i) => `<li class="box-item reveal" style="transition-delay:${(i % 2) * 90 + Math.floor(i / 2) * 70}ms">
      <span class="box-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="square" stroke-linejoin="miter">${drawable(ICONS[b.icon])}</svg></span>
      <span class="box-name">${b.name}</span><span class="box-tag">Incluso</span>
      <span class="box-desc">${b.desc}</span>
    </li>`).join('');
  $$('.spec-list > div').forEach((el, i) => { el.style.transitionDelay = `${(i % 2) * 90 + Math.floor(i / 2) * 70}ms`; });

  /* ---------- Na prática: inclinação, próximo passo que avança e valores ---------- */
  if (finePointer && !reduceMotion) {
    $$('[data-tilt]').forEach((fig) => {
      const scr = $('.mock-screen', fig);
      fig.addEventListener('pointermove', (e) => {
        const r = scr.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        scr.style.setProperty('--ty', `${((x - 0.5) * 10).toFixed(2)}deg`);
        scr.style.setProperty('--tx', `${((0.5 - y) * 8).toFixed(2)}deg`);
        scr.style.setProperty('--gx', `${(x * 100).toFixed(1)}%`);
        scr.style.setProperty('--gy', `${(y * 100).toFixed(1)}%`);
      });
      fig.addEventListener('pointerleave', () => {
        ['--tx', '--ty'].forEach((v) => scr.style.setProperty(v, '0deg'));
        scr.style.setProperty('--gx', '100%');
        scr.style.setProperty('--gy', '0%');
      });
    });
  }

  const NEXT = [
    { title: 'Reservar hospedagem em Lisboa', why: 'Vence amanhã e precisa ser concluída antes de outras duas.', badges: [['is-warn', 'Vence amanhã'], ['is-danger', 'Alta'], ['', '45 min']] },
    { title: 'Contratar seguro viagem', why: 'Liberada agora que a hospedagem está reservada.', badges: [['is-warn', 'Vence em 4 dias'], ['', '30 min']] },
    { title: 'Montar roteiro dia a dia', why: 'Última etapa antes da viagem. Cabe na sua tarde livre.', badges: [['', 'Prazo 5 nov'], ['', '1h 30min']] },
  ];
  const mockNext = $('#mock-next');
  const nextBtn = $('#m-next-btn');
  let nextI = 0, nextTimer = 0;
  function cycleNext() {
    if (!mockNext.closest('.mock').classList.contains('is-in') || document.hidden) { nextTimer = setTimeout(cycleNext, 1200); return; }
    nextBtn.classList.add('is-pressed');
    setTimeout(() => { nextBtn.classList.remove('is-pressed'); nextBtn.classList.add('is-done'); }, 180);
    setTimeout(() => mockNext.classList.add('is-leaving'), 900);
    setTimeout(() => {
      nextI = (nextI + 1) % NEXT.length;
      const n = NEXT[nextI];
      $('#m-next-title').textContent = n.title;
      $('#m-next-why').textContent = n.why;
      $('#m-next-badges').innerHTML = n.badges.map(([c, t]) => `<span class="m-badge ${c}">${t}</span>`).join('');
      mockNext.classList.remove('is-leaving');
      mockNext.classList.add('is-entering');
      nextBtn.classList.remove('is-done');
      requestAnimationFrame(() => requestAnimationFrame(() => mockNext.classList.remove('is-entering')));
    }, 1350);
    nextTimer = setTimeout(cycleNext, 4600);
  }
  if (!reduceMotion) nextTimer = setTimeout(cycleNext, 2600);

  const money = (v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const tween = (dur, fn) => {
    if (reduceMotion) { fn(1); return; }
    const t0 = performance.now();
    const tick = (now) => { const k = ease(clamp((now - t0) / dur)); fn(k); if (k < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  };

  /* ---------- Chamada final: botão magnético ---------- */
  const magnet = $('[data-magnet]');
  if (finePointer && !reduceMotion && magnet) {
    const zone = magnet.closest('section');
    zone.addEventListener('pointermove', (e) => {
      const r = magnet.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      const near = Math.hypot(dx, dy) < 160;
      magnet.style.setProperty('--mx', `${near ? (dx * 0.28).toFixed(1) : 0}px`);
      magnet.style.setProperty('--my', `${near ? (dy * 0.36).toFixed(1) : 0}px`);
    });
    zone.addEventListener('pointerleave', () => { magnet.style.setProperty('--mx', '0px'); magnet.style.setProperty('--my', '0px'); });
  }

  /* ---------- As telas de verdade: abas que avançam sozinhas e moldura que se endireita ---------- */
  const screens = $('#telas');
  const tabs = $$('.screens-tabs [role="tab"]');
  const tabList = $('.screens-tabs');
  const shots = $$('.frame-shots picture');
  const screenFrame = $('.screens-frame');
  const selectShot = (i, focus) => {
    tabs.forEach((t, k) => {
      const on = k === i;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      // Reinicia a barrinha de progresso da aba ativa.
      const bar = $('i', t); bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = '';
    });
    shots.forEach((p, k) => p.classList.toggle('is-on', k === i));
    $$('img', shots[i]).forEach((img) => { img.loading = 'eager'; });
    if (focus) tabs[i].focus();
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => selectShot(i));
    $('i', t).addEventListener('animationend', () => selectShot((i + 1) % tabs.length));
  });
  tabList.addEventListener('keydown', (e) => {
    const cur = tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true');
    if (e.key === 'ArrowRight') { e.preventDefault(); selectShot((cur + 1) % tabs.length, true); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); selectShot((cur + tabs.length - 1) % tabs.length, true); }
  });
  const pauseTabs = (on) => tabList.classList.toggle('is-paused', on || reduceMotion);
  [screenFrame, tabList].forEach((el) => {
    el.addEventListener('pointerenter', () => pauseTabs(true));
    el.addEventListener('pointerleave', () => pauseTabs(false));
  });
  tabList.classList.add('is-paused');
  new IntersectionObserver((entries) => entries.forEach((e) => pauseTabs(!e.isIntersecting)), { threshold: 0.35 }).observe(screenFrame);
  // Carrega as outras telas sem pressa, depois que a página abriu.
  window.addEventListener('load', () => setTimeout(() => $$('.frame-shots img').forEach((img) => { img.loading = 'eager'; }), 1500));
  function updateScreens() {
    if (reduceMotion) return;
    const k = ease(clamp(viewProgress(screens) * 2.4 - 0.2));
    screenFrame.style.setProperty('--sx', `${(24 * (1 - k)).toFixed(2)}deg`);
    screenFrame.style.setProperty('--ss', (0.92 + 0.08 * k).toFixed(3));
  }
  updateScreens();
  window.addEventListener('scroll', updateScreens, { passive: true });

  /* ---------- Revelar e contar ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      el.classList.add('is-in');
      $$('[data-count]', el).forEach((c) => { const end = Number(c.dataset.count); tween(1300, (k) => { c.textContent = String(Math.round(end * k)); }); });
      $$('[data-money]', el).forEach((c) => { const end = Number(c.dataset.money); tween(1600, (k) => { c.textContent = money(end * k); }); });
      io.unobserve(el);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
  $$('.reveal, [data-lines]').forEach((el) => io.observe(el));
})();
