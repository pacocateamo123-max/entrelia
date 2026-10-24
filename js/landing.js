/* =========================================================
   ENTRELIA — página de entrada: rede, rolagem guiada e ondas
   ========================================================= */
(function () {
  'use strict';

  document.documentElement.classList.add('js');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ease = (t) => 1 - Math.pow(1 - t, 3);

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
  const ORDERED = {};
  MODULES.forEach((m, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / MODULES.length;
    ORDERED[m.id] = { x: CENTER.x + Math.cos(a) * 380, y: CENTER.y + Math.sin(a) * 255 };
  });
  ORDERED.core = CENTER;
  // Posições "bagunçadas" do começo da rolagem guiada.
  const SCATTER = {
    projetos: { x: 170, y: 560 }, tarefas: { x: 820, y: 110 }, calendario: { x: 300, y: 130 },
    listas: { x: 900, y: 520 }, custos: { x: 560, y: 610 }, comparador: { x: 90, y: 300 }, notas: { x: 690, y: 330 },
  };

  function curve(a, b) {
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const cx = mx + (CENTER.x - mx) * 0.35, cy = my + (CENTER.y - my) * 0.35;
    return `M${a.x.toFixed(1)} ${a.y.toFixed(1)}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
  }
  const linkKey = (a, b) => `${a}-${b}`;

  function buildNet(svg, links) {
    const linkLayer = document.createElementNS(SVG_NS, 'g');
    const nodeLayer = document.createElementNS(SVG_NS, 'g');
    svg.append(linkLayer, nodeLayer);
    const linkEls = {};
    links.forEach(([a, b]) => {
      const p = document.createElementNS(SVG_NS, 'path');
      p.setAttribute('class', 'link');
      p.setAttribute('d', curve(ORDERED[a], ORDERED[b]));
      p.setAttribute('pathLength', '1');
      p.style.strokeDasharray = '1';
      p.style.strokeDashoffset = '1';
      linkLayer.appendChild(p);
      linkEls[linkKey(a, b)] = p;
    });
    const core = document.createElementNS(SVG_NS, 'g');
    core.setAttribute('class', 'core');
    core.setAttribute('transform', `translate(${CENTER.x} ${CENTER.y})`);
    core.innerHTML = `<rect class="core-pulse" x="-50" y="-50" width="100" height="100"/>
      <rect x="-50" y="-50" width="100" height="100"/>
      <g fill="none" stroke="#140D08" stroke-width="5" stroke-linecap="square" transform="translate(-36 -36) scale(1.8)">
        <path d="M12 11v18M12 11h11M12 20h7M12 29h13"/><path d="M24 11l-4 9M20 20l7 9" stroke-width="2.4" stroke-dasharray="1 4"/>
      </g>
      <text y="84">Próximo passo</text>`;
    nodeLayer.appendChild(core);
    const nodeEls = {};
    MODULES.forEach((m) => {
      const g = document.createElementNS(SVG_NS, 'g');
      g.setAttribute('class', 'node');
      g.innerHTML = `<rect x="-36" y="-36" width="72" height="72"/>${glyph(m.id, 30)}<text y="64">${m.label}</text>`;
      nodeLayer.appendChild(g);
      nodeEls[m.id] = g;
    });
    return { linkEls, nodeEls, core };
  }
  function place(el, pt) { el.style.transform = `translate(${pt.x}px, ${pt.y}px)`; }

  const ALL_LINKS = [
    ['projetos', 'tarefas'], ['projetos', 'custos'], ['projetos', 'listas'], ['projetos', 'notas'],
    ['tarefas', 'calendario'], ['listas', 'tarefas'], ['comparador', 'custos'],
    ['calendario', 'core'], ['tarefas', 'core'],
    ['projetos', 'core'], ['listas', 'core'], ['custos', 'core'], ['comparador', 'core'], ['notas', 'core'],
  ];

  /* Hero: a rede já pronta, respirando devagar. */
  const heroSvg = document.getElementById('hero-net');
  if (heroSvg) {
    const net = buildNet(heroSvg, ALL_LINKS);
    MODULES.forEach((m) => { place(net.nodeEls[m.id], ORDERED[m.id]); net.nodeEls[m.id].classList.add('is-on'); });
    Object.values(net.linkEls).forEach((p, i) => {
      p.style.opacity = '.45';
      setTimeout(() => { p.style.strokeDashoffset = '0'; }, reduceMotion ? 0 : 500 + i * 70);
    });
    net.core.classList.add('is-lit');
  }

  /* ---------- Por dentro: rolagem guiada ---------- */
  const STEPS = [
    { title: 'Tudo solto', text: 'Tarefas num app, gastos em outro, ideias no bloco de notas. Nada conversa com nada.', links: [] },
    { title: 'Projetos que juntam tudo', text: 'Cada projeto reúne as próprias tarefas, custos, listas e notas. Abriu um, vê o resto.', links: ALL_LINKS.slice(0, 4) },
    { title: 'Uma coisa depois da outra', text: 'Tarefas podem depender de outras. O que está bloqueado espera a vez, sem roubar sua atenção.', links: ALL_LINKS.slice(0, 7) },
    { title: 'O dia no lugar', text: '“Organizar meu dia” encaixa as tarefas no tempo livre da agenda e avisa quando dois horários batem.', links: ALL_LINKS.slice(0, 9) },
    { title: 'Próximo passo claro', text: 'Tudo vira uma sugestão só: o que fazer agora, e por quê.', links: ALL_LINKS },
  ];
  const inside = document.getElementById('por-dentro');
  const insideSvg = document.getElementById('inside-net');
  let insideUpdate = () => {};
  if (inside && insideSvg) {
    const net = buildNet(insideSvg, ALL_LINKS);
    const copy = inside.querySelector('.inside-copy');
    const titleEl = document.getElementById('inside-title');
    const textEl = document.getElementById('inside-text');
    const dots = document.getElementById('inside-steps');
    dots.innerHTML = STEPS.map((s) => `<li><span class="sr-only">${s.title}</span></li>`).join('');
    let step = -1, lastT = -1, swapTimer = 0;

    const render = (s) => {
      const on = new Set(STEPS[s].links.map(([a, b]) => linkKey(a, b)));
      const lit = new Set();
      STEPS[s].links.forEach(([a, b]) => { lit.add(a); lit.add(b); });
      Object.entries(net.linkEls).forEach(([k, p]) => { p.style.strokeDashoffset = on.has(k) ? '0' : '1'; });
      MODULES.forEach((m) => net.nodeEls[m.id].classList.toggle('is-on', lit.has(m.id)));
      net.core.classList.toggle('is-dim', !lit.has('core'));
      net.core.classList.toggle('is-lit', s === STEPS.length - 1);
      [...dots.children].forEach((li, i) => li.classList.toggle('is-on', i <= s));
      clearTimeout(swapTimer);
      copy.classList.add('is-swapping');
      swapTimer = setTimeout(() => {
        titleEl.textContent = STEPS[s].title;
        textEl.textContent = STEPS[s].text;
        copy.classList.remove('is-swapping');
      }, reduceMotion ? 0 : 220);
    };

    insideUpdate = () => {
      const r = inside.getBoundingClientRect();
      const total = inside.offsetHeight - window.innerHeight;
      const p = clamp(-r.top / total);
      // As peças se alinham na primeira parte da rolagem.
      const t = ease(clamp((p - 0.04) / 0.14));
      if (Math.abs(t - lastT) > 0.001) {
        lastT = t;
        MODULES.forEach((m) => {
          const a = SCATTER[m.id], b = ORDERED[m.id];
          place(net.nodeEls[m.id], { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
        });
      }
      const s = Math.min(STEPS.length - 1, Math.floor(p * STEPS.length));
      if (s !== step) { step = s; render(s); }
    };
    insideUpdate();
  }

  /* ---------- Organizar: o caos se acalma ---------- */
  const calm = document.querySelector('.calm');
  const calmSvg = document.getElementById('calm-lines');
  let calmUpdate = () => {};
  if (calm && calmSvg) {
    const [pa, pb, pc] = calmSvg.querySelectorAll('path');
    const W = 1200, N = 120;
    const noise = (x, t) => Math.sin(x * 0.011 + t) * 0.5 + Math.sin(x * 0.029 + t * 1.3 + 1.7) * 0.32 + Math.sin(x * 0.067 + t * 0.7 + 4.1) * 0.18;
    const line = (y0, amp, fn) => {
      let d = '';
      for (let i = 0; i <= N; i++) {
        const x = (i / N) * W;
        d += `${i ? 'L' : 'M'}${x.toFixed(1)} ${(y0 + fn(x) * amp).toFixed(1)}`;
      }
      return d;
    };
    let p = 0, time = 0, visible = false, raf = 0;
    const draw = () => {
      const k = ease(p);
      pa.setAttribute('d', line(110, 85, (x) => noise(x, time)));
      pb.setAttribute('d', line(300, 85 * k, (x) => -noise(x, time)));
      pc.setAttribute('d', line(500, 85 * (1 - k), (x) => noise(x, time)));
    };
    const loop = () => {
      time += 0.012;
      draw();
      raf = visible ? requestAnimationFrame(loop) : 0;
    };
    calmUpdate = () => {
      const r = calm.getBoundingClientRect();
      p = clamp((-r.top + window.innerHeight * 0.2) / (calm.offsetHeight - window.innerHeight * 0.8));
      visible = r.bottom > 0 && r.top < window.innerHeight;
      if (reduceMotion) { draw(); return; }
      if (visible && !raf) raf = requestAnimationFrame(loop);
    };
    draw();
    calmUpdate();
  }

  /* ---------- Topo e rolagem ---------- */
  const top = document.getElementById('top');
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      top.classList.toggle('is-scrolled', window.scrollY > 10);
      insideUpdate();
      calmUpdate();
      ticking = false;
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

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
  const boxList = document.getElementById('box-list');
  if (boxList) {
    boxList.innerHTML = BOX.map((b) => `<li class="box-item reveal">
      <span class="box-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="square" stroke-linejoin="miter">${ICONS[b.icon]}</svg></span>
      <span class="box-name">${b.name}</span><span class="box-tag">Incluso</span>
      <span class="box-desc">${b.desc}</span>
    </li>`).join('');
  }

  /* ---------- Revelar e contar ---------- */
  const countUp = (el) => {
    const end = Number(el.dataset.count);
    if (!end || reduceMotion) { el.textContent = String(end); return; }
    const t0 = performance.now(), dur = 1200;
    const tick = (now) => {
      const k = ease(clamp((now - t0) / dur));
      el.textContent = String(Math.round(end * k));
      if (k < 1) requestAnimationFrame(tick);
    };
    el.textContent = '0';
    requestAnimationFrame(tick);
  };
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      e.target.querySelectorAll('[data-count]').forEach(countUp);
      io.unobserve(e.target);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -5% 0px' }) : null;
  document.querySelectorAll('.reveal').forEach((el) => {
    if (io) io.observe(el); else el.classList.add('is-in');
  });
})();
