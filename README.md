# ENTRELIA

**Tudo conectado. Próximo passo claro.**

Central de organização pessoal e de projetos: visão geral com “Seu próximo passo”, projetos, tarefas (lista e quadro, com dependências), calendário com “Organizar meu dia”, listas, custos, comparador de opções e notas. Tudo fica salvo no navegador, com IndexedDB.

## Como abrir

Não precisa instalar nada. Escolha uma das opções:

- Abra o `index.html` (página de apresentação) ou o `app.html` (o app) direto no navegador (Chrome, Edge, Firefox ou Safari).
- Ou rode um servidor local nesta pasta e acesse `http://127.0.0.1:5173`:

```bash
python -m http.server 5173
```

No primeiro acesso, escolha entre explorar os **dados de demonstração** ou **começar do zero**. Depois é possível trocar isso em *Configurações → Dados e backup*.

## Estrutura

- `index.html`, `css/landing.css`, `js/landing.js`: página de apresentação, com rolagem guiada e animações
- `app.html`: o app (página única)
- `css/styles.css`: tema escuro e claro do app, layout responsivo e animações
- `js/util.js`: datas, moeda (R$) e textos em pt-BR
- `js/ui.js`: ícones, logotipo, modais, avisos, menus e atualização do DOM
- `js/db.js`: persistência (IndexedDB, com localStorage como alternativa), desfazer e backup
- `js/logic.js`: regras de negócio (próximo passo, dependências, organização do dia, conflitos, pontuação ponderada, avisos, busca)
- `js/demo.js`: modelos de projeto e conjunto de demonstração
- `js/views/*.js`: uma tela por arquivo
- `js/app.js`: rotas, menu lateral, barra inferior, busca global, avisos e atalhos

## Atalhos

- `Ctrl/⌘ + K` ou `/`: busca global
- `N`: nova tarefa
- `Esc`: fecha janelas e menus
