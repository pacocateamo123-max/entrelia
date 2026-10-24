'use strict';

/* ---------- Modelos iniciais de projeto (editáveis antes de criar) ---------- */
const TEMPLATES = [
  {
    id: 'estudos', name: 'Planejamento de estudos', icon: 'book', color: '#A78BFA', days: 45, budget: 300,
    description: 'Organize conteúdos, revisões e simulados até a data da prova.',
    tasks: [
      { title: 'Definir objetivo e data da prova', priority: 'alta', offset: 1, duration: 30 },
      { title: 'Montar cronograma semanal', priority: 'alta', offset: 2, duration: 60, deps: [0] },
      { title: 'Reunir materiais de estudo', priority: 'media', offset: 3, duration: 45, deps: [0] },
      { title: 'Estudar o módulo 1', priority: 'media', offset: 10, duration: 240, deps: [1, 2] },
      { title: 'Estudar o módulo 2', priority: 'media', offset: 18, duration: 240, deps: [3] },
      { title: 'Fazer simulado completo', priority: 'alta', offset: 25, duration: 180, deps: [4] },
      { title: 'Revisar os pontos fracos', priority: 'media', offset: 32, duration: 120, deps: [5] },
      { title: 'Revisão final', priority: 'alta', offset: -2, duration: 90, deps: [6] },
    ],
    lists: [{ name: 'Materiais de estudo', type: 'materiais', items: [{ name: 'Livro ou apostila principal' }, { name: 'Caderno de exercícios' }, { name: 'Marca-textos', qty: 3 }] }],
  },
  {
    id: 'viagem', name: 'Viagem', icon: 'map', color: '#5EEAD4', days: 30, budget: 8000,
    description: 'Datas, documentos, reservas, roteiro e orçamento da viagem em um só lugar.',
    tasks: [
      { title: 'Definir destino e datas', priority: 'alta', offset: 1, duration: 60 },
      { title: 'Verificar documentos necessários', priority: 'alta', offset: 2, duration: 30, deps: [0] },
      { title: 'Comprar passagens', priority: 'alta', offset: 5, duration: 60, deps: [0] },
      { title: 'Reservar hospedagem', priority: 'alta', offset: 7, duration: 45, deps: [2] },
      { title: 'Contratar seguro viagem', priority: 'media', offset: 10, duration: 30, deps: [2] },
      { title: 'Montar roteiro', priority: 'media', offset: 15, duration: 90, deps: [3] },
      { title: 'Fazer check-in online', priority: 'media', offset: -2, duration: 15, deps: [2] },
      { title: 'Arrumar a mala', priority: 'baixa', offset: -1, duration: 60, deps: [5] },
    ],
    lists: [
      { name: 'Documentos da viagem', type: 'documentos', items: [{ name: 'Documento de identidade ou passaporte' }, { name: 'Comprovante de hospedagem' }, { name: 'Apólice do seguro viagem' }, { name: 'Cartão de vacinação' }] },
      { name: 'Compras para a viagem', type: 'compras', items: [{ name: 'Adaptador de tomada', price: 45 }, { name: 'Kit de higiene', price: 50 }, { name: 'Cadeado para mala', price: 40 }] },
    ],
  },
  {
    id: 'pessoal', name: 'Projeto pessoal', icon: 'rocket', color: '#60A5FA', days: 30, budget: 0,
    description: 'Transforme uma ideia em etapas concretas, do objetivo à entrega.',
    tasks: [
      { title: 'Definir o objetivo e o resultado esperado', priority: 'alta', offset: 1, duration: 30 },
      { title: 'Listar as etapas principais', priority: 'media', offset: 2, duration: 30, deps: [0] },
      { title: 'Pesquisar referências', priority: 'media', offset: 5, duration: 60, deps: [0] },
      { title: 'Executar a primeira etapa', priority: 'alta', offset: 12, duration: 120, deps: [1] },
      { title: 'Revisar e ajustar', priority: 'media', offset: 22, duration: 60, deps: [3] },
      { title: 'Concluir e compartilhar o resultado', priority: 'media', offset: -1, duration: 45, deps: [4] },
    ],
    lists: [{ name: 'Ideias e referências', type: 'personalizada', items: [] }],
  },
  {
    id: 'evento', name: 'Organização de evento', icon: 'party', color: '#FDA4AF', days: 40, budget: 2500,
    description: 'Local, convidados, fornecedores e compras com orçamento sob controle.',
    tasks: [
      { title: 'Definir data, orçamento e número de convidados', priority: 'alta', offset: 1, duration: 45 },
      { title: 'Reservar o local', priority: 'alta', offset: 5, duration: 60, deps: [0] },
      { title: 'Enviar os convites', priority: 'media', offset: 10, duration: 45, deps: [1] },
      { title: 'Contratar comida e bebida', priority: 'alta', offset: 12, duration: 60, deps: [1] },
      { title: 'Planejar a decoração', priority: 'media', offset: 18, duration: 60, deps: [1] },
      { title: 'Confirmar presenças', priority: 'media', offset: -7, duration: 30, deps: [2] },
      { title: 'Comprar os itens finais', priority: 'media', offset: -3, duration: 90, deps: [4, 5] },
    ],
    lists: [
      { name: 'Compras do evento', type: 'compras', items: [{ name: 'Balões', qty: 50, price: 0.6 }, { name: 'Pratos e copos descartáveis', qty: 2, price: 19.9 }, { name: 'Guardanapos', qty: 3, price: 6.5 }] },
      { name: 'Roteiro do dia', type: 'etapas', items: [{ name: 'Montagem e decoração' }, { name: 'Recepção dos convidados' }, { name: 'Momento principal' }, { name: 'Desmontagem' }] },
    ],
  },
  {
    id: 'site', name: 'Desenvolvimento de site', icon: 'code', color: '#FBBF24', days: 45, budget: 500,
    description: 'Do objetivo à publicação: estrutura, conteúdo, layout, testes e domínio.',
    tasks: [
      { title: 'Definir objetivo e público do site', priority: 'alta', offset: 1, duration: 45 },
      { title: 'Mapear páginas e conteúdo', priority: 'alta', offset: 3, duration: 60, deps: [0] },
      { title: 'Escolher hospedagem e domínio', priority: 'media', offset: 6, duration: 45, deps: [0] },
      { title: 'Criar o layout', priority: 'alta', offset: 12, duration: 240, deps: [1] },
      { title: 'Escrever os textos', priority: 'media', offset: 14, duration: 180, deps: [1] },
      { title: 'Desenvolver as páginas', priority: 'alta', offset: 28, duration: 480, deps: [3, 4] },
      { title: 'Testar no celular e no computador', priority: 'alta', offset: -5, duration: 120, deps: [5] },
      { title: 'Publicar o site', priority: 'alta', offset: -1, duration: 60, deps: [6, 2] },
    ],
    lists: [{ name: 'Checklist de publicação', type: 'etapas', items: [{ name: 'Testar formulários' }, { name: 'Revisar textos e ortografia' }, { name: 'Configurar o domínio' }, { name: 'Ativar HTTPS' }] }],
  },
];

/* Constrói projeto, tarefas e listas a partir de um modelo. */
function buildFromTemplate(tpl, { name, description, start, due, color, budget, taskIdx, listIdx }) {
  const project = M.project({ name, description, color, start, due, budget, status: 'ativo' });
  const ids = tpl.tasks.map(() => U.uid());
  const span = Math.max(1, U.diffDays(start, due));
  const base = Date.now();
  const tasks = [];
  tpl.tasks.forEach((t, i) => {
    if (taskIdx && !taskIdx.has(i)) return;
    let off = t.offset < 0 ? span + t.offset : Math.round((t.offset / tpl.days) * span);
    off = U.clamp(off, 0, span);
    tasks.push(M.task({
      id: ids[i], title: t.title, priority: t.priority, duration: t.duration, projectId: project.id,
      due: U.addDays(start, off), order: base + i * 1000,
      dependsOn: (t.deps || []).filter((d) => !taskIdx || taskIdx.has(d)).map((d) => ids[d]),
    }));
  });
  const lists = tpl.lists.filter((_, i) => !listIdx || listIdx.has(i)).map((l, i) => M.list({
    name: l.name, type: l.type, projectId: project.id, order: base + i * 1000,
    items: l.items.map((it) => M.item({ name: it.name, qty: it.qty || 1, price: it.price || 0 })),
  }));
  return { project, tasks, lists };
}

/* ---------- Conjunto de demonstração (datas relativas a hoje) ---------- */
function buildDemo() {
  const T = U.today();
  const d = (n) => U.addDays(T, n);
  const D = { demo: true };
  let ord = 1000;
  const o = () => (ord += 1000);

  const P1 = M.project({ ...D, name: 'Viagem para Lisboa', color: '#5EEAD4', start: d(-12), due: d(38), budget: 12000, description: 'Dez dias em Lisboa e Sintra. Passagens compradas; falta fechar hospedagem, seguro e roteiro.' });
  const P2 = M.project({ ...D, name: 'Certificação em nuvem', color: '#A78BFA', start: d(-20), due: d(24), budget: 1200, description: 'Plano de estudos para a certificação de fundamentos em computação em nuvem.' });
  const P3 = M.project({ ...D, name: 'Site do portfólio', color: '#FBBF24', start: d(-15), due: d(30), budget: 600, description: 'Portfólio pessoal com projetos, contato e currículo.' });
  const P4 = M.project({ ...D, name: 'Aniversário da Júlia', color: '#FDA4AF', start: d(-2), due: d(20), budget: 1500, description: 'Festa surpresa para cerca de 30 pessoas.' });

  const t = (x) => M.task({ ...D, order: o(), ...x });
  const a1 = t({ projectId: P1.id, title: 'Renovar passaporte', priority: 'alta', due: d(-6), duration: 60, status: 'done', completedAt: Date.now() - 6 * 864e5 });
  const a2 = t({ projectId: P1.id, title: 'Comprar passagens aéreas', priority: 'alta', due: d(-3), duration: 60, status: 'done', completedAt: Date.now() - 3 * 864e5, dependsOn: [a1.id] });
  const a3 = t({ projectId: P1.id, title: 'Reservar hospedagem em Lisboa', priority: 'alta', due: d(1), duration: 45, dependsOn: [a2.id], description: 'Comparar Alfama, Baixa-Chiado e Belém. Limite de R$ 400 por noite.' });
  const a4 = t({ projectId: P1.id, title: 'Contratar seguro viagem', priority: 'media', due: d(4), duration: 30, dependsOn: [a2.id] });
  const a5 = t({ projectId: P1.id, title: 'Montar roteiro dia a dia', priority: 'media', due: d(12), duration: 90, dependsOn: [a3.id], subtasks: [{ id: U.uid(), title: 'Centro histórico de Lisboa', done: true }, { id: U.uid(), title: 'Bate-volta para Sintra', done: false }, { id: U.uid(), title: 'Tarde em Cascais', done: false }] });
  const a6 = t({ projectId: P1.id, title: 'Reservar passeio para Sintra', priority: 'baixa', due: d(16), duration: 30, dependsOn: [a3.id] });
  const a7 = t({ projectId: P1.id, title: 'Trocar dinheiro para euros', priority: 'baixa', due: d(30), duration: 30 });
  const a8 = t({ projectId: P1.id, title: 'Fazer check-in online', priority: 'media', due: d(37), duration: 15, dependsOn: [a2.id] });

  const b1 = t({ projectId: P2.id, title: 'Montar cronograma de estudos', priority: 'alta', due: d(-18), duration: 60, status: 'done', completedAt: Date.now() - 18 * 864e5 });
  const b2 = t({ projectId: P2.id, title: 'Módulo 1: fundamentos de nuvem', priority: 'media', due: d(-6), duration: 240, status: 'done', completedAt: Date.now() - 6 * 864e5, dependsOn: [b1.id] });
  const b3 = t({ projectId: P2.id, title: 'Módulo 2: computação e armazenamento', priority: 'alta', due: d(2), duration: 180, status: 'doing', dependsOn: [b2.id], subtasks: [{ id: U.uid(), title: 'Videoaulas', done: true }, { id: U.uid(), title: 'Exercícios práticos', done: false }, { id: U.uid(), title: 'Resumo do módulo', done: false }] });
  const b4 = t({ projectId: P2.id, title: 'Fazer o simulado 1', priority: 'alta', due: d(6), duration: 120, dependsOn: [b3.id] });
  const b5 = t({ projectId: P2.id, title: 'Módulo 3: redes e segurança', priority: 'media', due: d(10), duration: 180, dependsOn: [b2.id] });
  const b6 = t({ projectId: P2.id, title: 'Agendar a prova', priority: 'media', due: d(14), duration: 15, dependsOn: [b4.id] });

  const c1 = t({ projectId: P3.id, title: 'Definir páginas e estrutura', priority: 'alta', due: d(-10), duration: 60, status: 'done', completedAt: Date.now() - 10 * 864e5 });
  const c2 = t({ projectId: P3.id, title: 'Escrever textos das páginas', priority: 'media', due: d(5), duration: 120 });
  const c3 = t({ projectId: P3.id, title: 'Criar layout para celular e computador', priority: 'media', due: d(4), duration: 180, status: 'doing', dependsOn: [c1.id] });
  const c4 = t({ projectId: P3.id, title: 'Desenvolver as páginas', priority: 'alta', due: d(14), duration: 480, dependsOn: [c2.id, c3.id] });
  const c5 = t({ projectId: P3.id, title: 'Registrar o domínio', priority: 'baixa', due: d(8), duration: 15 });
  const c6 = t({ projectId: P3.id, title: 'Publicar o site', priority: 'alta', due: d(28), duration: 60, dependsOn: [c4.id, c5.id] });

  const d1 = t({ projectId: P4.id, title: 'Fechar lista de convidados', priority: 'media', due: d(3), duration: 30 });
  const d2 = t({ projectId: P4.id, title: 'Reservar o salão de festas', priority: 'alta', due: d(6), duration: 45, dependsOn: [d1.id] });
  const d3 = t({ projectId: P4.id, title: 'Encomendar bolo e docinhos', priority: 'media', due: d(15), duration: 30, dependsOn: [d2.id] });

  const p1 = t({ title: 'Devolver livro na biblioteca', priority: 'baixa', due: d(-1), duration: 20 });
  const p2 = t({ title: 'Agendar consulta no dentista', priority: 'media', due: d(7), duration: 15 });
  const p3 = t({ title: 'Pagar fatura do cartão', priority: 'alta', due: d(3), duration: 10 });

  const tasks = [a1, a2, a3, a4, a5, a6, a7, a8, b1, b2, b3, b4, b5, b6, c1, c2, c3, c4, c5, c6, d1, d2, d3, p1, p2, p3];

  const x = (v) => M.expense({ ...D, ...v });
  const cadeadoItemId = U.uid();
  const eCadeado = x({ description: 'Cadeado TSA (2 un.)', amount: 79.8, date: d(-2), category: 'Compras', projectId: P1.id, status: 'pago' });
  const lDocs = M.list({ ...D, name: 'Documentos da viagem', type: 'documentos', projectId: P1.id, order: o(), items: [
    M.item({ name: 'Passaporte válido', done: true }),
    M.item({ name: 'Comprovante de hospedagem', note: 'Imprimir uma cópia' }),
    M.item({ name: 'Apólice do seguro viagem' }),
    M.item({ name: 'Carteira de vacinação', done: true }),
    M.item({ name: 'Cópia das passagens', done: true }),
  ] });
  const lCompras = M.list({ ...D, name: 'Compras para a viagem', type: 'compras', projectId: P1.id, order: o(), items: [
    M.item({ name: 'Adaptador de tomada europeu', qty: 1, price: 45, done: true }),
    M.item({ id: cadeadoItemId, name: 'Cadeado TSA', qty: 2, price: 39.9, done: true, expenseId: eCadeado.id }),
    M.item({ name: 'Mala de bordo', qty: 1, price: 389.9, note: 'Até 10 kg' }),
    M.item({ name: 'Kit de higiene para viagem', qty: 1 }),
  ] });
  eCadeado.source = { listId: lCompras.id, itemId: cadeadoItemId };
  const lEstudos = M.list({ ...D, name: 'Materiais de estudo', type: 'materiais', projectId: P2.id, order: o(), items: [
    M.item({ name: 'Caderno de exercícios', done: true }),
    M.item({ name: 'Simulados oficiais' }),
    M.item({ name: 'Fone com microfone', done: true }),
  ] });
  const lSite = M.list({ ...D, name: 'Checklist de publicação', type: 'etapas', projectId: P3.id, order: o(), items: [
    M.item({ name: 'Testar formulário de contato' }),
    M.item({ name: 'Revisar ortografia' }),
    M.item({ name: 'Configurar o domínio' }),
    M.item({ name: 'Ativar HTTPS' }),
  ] });
  const lFesta = M.list({ ...D, name: 'Compras da festa', type: 'compras', projectId: P4.id, order: o(), items: [
    M.item({ name: 'Balões', qty: 50, price: 0.6 }),
    M.item({ name: 'Velas de aniversário', qty: 1, price: 12 }),
    M.item({ name: 'Pratos descartáveis', qty: 2, price: 18.9 }),
    M.item({ name: 'Guardanapos', qty: 3, price: 6.5 }),
  ] });
  const lMercado = M.list({ ...D, name: 'Mercado da semana', type: 'compras', order: o(), items: [
    M.item({ name: 'Café', qty: 2, price: 18.5, done: true }),
    M.item({ name: 'Frutas', qty: 1, price: 25 }),
    M.item({ name: 'Arroz 5 kg', qty: 1, price: 27.9 }),
  ] });

  const expenses = [
    x({ description: 'Passagens aéreas (ida e volta)', amount: 4870, date: d(-3), category: 'Transporte', projectId: P1.id, status: 'pago' }),
    x({ description: 'Taxa do passaporte', amount: 257.25, date: d(-8), category: 'Documentos', projectId: P1.id, status: 'pago' }),
    eCadeado,
    x({ description: 'Hospedagem — sinal da reserva', amount: 3900, date: d(1), category: 'Hospedagem', projectId: P1.id, status: 'previsto' }),
    x({ description: 'Curso online preparatório', amount: 349.9, date: d(-19), category: 'Educação', projectId: P2.id, status: 'pago' }),
    x({ description: 'Taxa da prova', amount: 650, date: d(14), category: 'Educação', projectId: P2.id, status: 'previsto' }),
    x({ description: 'Banco de imagens (plano mensal)', amount: 89, date: d(-10), category: 'Tecnologia', projectId: P3.id, status: 'pago' }),
    x({ description: 'Domínio (1 ano)', amount: 40, date: d(8), category: 'Tecnologia', projectId: P3.id, status: 'previsto' }),
    x({ description: 'Sinal do salão de festas', amount: 300, date: d(6), category: 'Serviços', projectId: P4.id, status: 'previsto' }),
    x({ description: 'Mercado', amount: 412.35, date: d(-2), category: 'Alimentação', status: 'pago' }),
    x({ description: 'Academia (mensalidade)', amount: 119.9, date: d(-12), category: 'Saúde', status: 'pago' }),
    x({ description: 'Corrida por aplicativo', amount: 36.5, date: d(-1), category: 'Transporte', status: 'pago' }),
    x({ description: 'Internet residencial', amount: 99.9, date: d(-35), category: 'Moradia', status: 'pago' }),
    x({ description: 'Mercado', amount: 388.1, date: d(-33), category: 'Alimentação', status: 'pago' }),
    x({ description: 'Cinema', amount: 64, date: d(-40), category: 'Lazer', status: 'pago' }),
    x({ description: 'Mercado', amount: 401.2, date: d(-65), category: 'Alimentação', status: 'pago' }),
    x({ description: 'Farmácia', amount: 58.4, date: d(-70), category: 'Saúde', status: 'pago' }),
    x({ description: 'Presente de aniversário', amount: 150, date: d(-95), category: 'Compras', status: 'pago' }),
    x({ description: 'Internet residencial', amount: 99.9, date: d(-66), category: 'Moradia', status: 'pago' }),
  ];

  const ev = (v) => M.event({ ...D, ...v });
  const events = [
    ev({ title: 'Reunião de alinhamento do site', date: T, start: '10:00', end: '11:00', projectId: P3.id }),
    ev({ title: 'Almoço com a Ana', date: T, start: '12:30', end: '13:30' }),
    ev({ title: 'Aula de inglês', date: T, start: '15:00', end: '16:00' }),
    ev({ title: 'Ligação com a agência de viagens', date: T, start: '15:30', end: '16:00', projectId: P1.id, notes: 'Perguntar sobre transfer do aeroporto.' }),
    ev({ title: 'Academia', date: d(1), start: '07:00', end: '08:00' }),
    ev({ title: 'Mentoria de estudos', date: d(2), start: '19:00', end: '20:00', projectId: P2.id }),
    ev({ title: 'Visita ao salão de festas', date: d(5), start: '18:00', end: '19:00', projectId: P4.id }),
    ev({ title: 'Revisão do layout', date: d(-3), start: '14:00', end: '15:00', projectId: P3.id }),
  ];

  const n = (v) => M.note({ ...D, ...v });
  const notes = [
    n({ title: 'Ideias de roteiro — Lisboa', projectId: P1.id, taskId: a5.id, tags: ['viagem', 'roteiro'], pinned: true, body: 'Bairros para conhecer:\n- Alfama e o Castelo de São Jorge\n- Baixa e Chiado\n- Belém: torre e pastéis\n\nReservar com antecedência:\n[x] Ingresso do Oceanário\n[ ] Palácio da Pena (Sintra)\n[ ] Noite de fado em Alfama' }),
    n({ title: 'Resumo — Módulo 1', projectId: P2.id, taskId: b2.id, tags: ['estudos', 'nuvem'], body: '# Modelos de serviço\n- IaaS: infraestrutura sob demanda\n- PaaS: plataforma gerenciada\n- SaaS: software pronto para uso\n\n# Pontos para revisar\n[ ] Regiões e zonas de disponibilidade\n[x] Modelo de responsabilidade compartilhada' }),
    n({ title: 'Referências visuais do portfólio', projectId: P3.id, tags: ['design'], body: 'Tom: direto, profissional e acolhedor.\n- Paleta escura com um acento forte\n- Fotos reais dos projetos\n- Página de contato curta' }),
    n({ title: 'Ideias de presente', tags: ['pessoal'], body: '- Livro de receitas\n- Kit de plantas\n- Vale-experiência' }),
  ];

  const cmp = M.comparison({
    ...D, title: 'Onde se hospedar em Lisboa', projectId: P1.id,
    description: 'Decisão necessária para a tarefa “Reservar hospedagem em Lisboa”.',
  });
  const k1 = { id: U.uid(), name: 'Preço por noite', weight: 4 };
  const k2 = { id: U.uid(), name: 'Localização', weight: 5 };
  const k3 = { id: U.uid(), name: 'Acesso ao transporte', weight: 3 };
  const k4 = { id: U.uid(), name: 'Silêncio à noite', weight: 2 };
  cmp.criteria = [k1, k2, k3, k4];
  cmp.options = [
    { id: U.uid(), name: 'Alfama', cost: 380, pros: 'Bairro histórico, vista do rio', cons: 'Ladeiras e ruas movimentadas à noite', scores: { [k1.id]: 3, [k2.id]: 5, [k3.id]: 3, [k4.id]: 2 } },
    { id: U.uid(), name: 'Baixa-Chiado', cost: 420, pros: 'Tudo a pé, metrô na porta', cons: 'Mais caro', scores: { [k1.id]: 2, [k2.id]: 5, [k3.id]: 5, [k4.id]: 3 } },
    { id: U.uid(), name: 'Belém', cost: 290, pros: 'Mais barato e tranquilo', cons: 'Longe do centro', scores: { [k1.id]: 5, [k2.id]: 3, [k3.id]: 2, [k4.id]: 5 } },
  ];

  return {
    projects: [P1, P2, P3, P4],
    tasks,
    events,
    lists: [lDocs, lCompras, lEstudos, lSite, lFesta, lMercado],
    expenses,
    comparisons: [cmp],
    notes,
  };
}
