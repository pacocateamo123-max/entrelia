---
name: confere-offline
description: 'Confere e completa o modo offline (PWA) de qualquer site: acha o service worker, compara a lista de arquivos que ele guarda com o que as páginas carregam e com as pastas do projeto, e conserta o que falta. Se o site ainda não tem modo offline, mapeia tudo o que ele precisa guardar e cria sozinha o service worker, o manifest, o ícone e o registro (HTML puro ou Vite), e depois prova que abre sem internet desligando o servidor. Use quando pedirem /confere-offline ou disserem coisas como "o app ainda abre sem internet?", "criei uma tela nova, falta algo pro modo offline?", "confere o service worker antes de publicar", "o PWA funciona offline?" ou "deixa esse site funcionar sem internet".'
---

# Confere offline

Um site abre sem internet porque o service worker guarda uma lista de arquivos. Arquivo fora da lista é
tela quebrada para quem estiver offline, e ninguém percebe até ficar sem sinal. Esta skill confere essa
lista e, quando falta algo (ou falta o modo offline inteiro), completa sozinha e prova que funcionou.

## Regras

- **Faz sozinha, mas só isto:** criar ou editar o service worker, o manifest, o ícone do app e uma linha
  de registro (no HTML ou no script de entrada). Nada além disso sem pedir.
- **Só confere, sem mexer,** quando a pessoa disser "só conferir", "não mexe" ou parecido.
- Nunca: instalar pacotes (nem `vite-plugin-pwa`), rodar `git commit`/`push`, apagar arquivos. Por quê:
  o modo offline cabe em arquivos simples, e quem publica é a pessoa.
- Leia o `CLAUDE.md` do projeto antes e respeite as regras dele (ex.: "nada novo no package.json").
- Toda afirmação da resposta cita onde foi vista (`index.html:12`, `sw.js:9`). Sem prova: "não verificado".

## 1. Raio-x do site (sempre, com ou sem service worker)

1. **Tipo de projeto.** `package.json` com `vite` → **Vite** (pasta de arquivos fixos: `public/`; base em
   `vite.config.*` → `base`, padrão `/`). Sem `package.json` ou sem ferramenta de build → **HTML puro**
   (arquivos fixos na raiz). Next, Nuxt, Astro, Angular, SvelteKit → faça só o diagnóstico e diga que a
   criação automática não cobre esse tipo (eles têm caminho próprio).
2. **Páginas de entrada.** Todos os `.html` fora de `node_modules`, `dist`, `build`.
3. **O que cada página carrega do próprio site:** `<script src>`, `<link rel="stylesheet">`, `<link rel="icon">`,
   `manifest`, `<img src>`, `srcset`, `<video>`/`<source>`, e o que os scripts e estilos puxam:
   `import`, `fetch('...')`, `new URL('...', import.meta.url)`, `url(...)` no CSS (fontes, fundos),
   caminhos montados com `BASE_URL`. Endereços `https://` de outro domínio: anote o domínio (ex.: fontes do
   Google) para o service worker ter regra para ele.
4. **O que existe em disco:** pastas de código (`js/`, `css/`, `src/`, telas/rotas) e de arquivos fixos
   (`public/`, `assets/`, `img/`, `fonts/`). Ignore `.gitkeep`.
5. **Service worker.** Procure `sw.js`, `service-worker.js`, `serviceworker.js`, `workbox-config.js` na raiz,
   em `public/` e em `src/`, e `serviceWorker.register(` nos HTML e scripts. Anote a lista guardada
   (array de `cache.addAll`: `SHELL`, `ASSETS`, `LISTA`, `urlsToCache`...) e a versão (`CACHE`, `CACHE_NAME`).
   Se usa `self.__WB_MANIFEST`/`globPatterns`, a lista nasce no build: compare com `dist/` se existir.
6. **Manifest** (`manifest.webmanifest`/`manifest.json`): `start_url`, `scope`, `icons`, e se as páginas o ligam.

Com isso, monte a tabela de inventário (formato no fim).

## 2a. Já tem service worker → conferir e consertar

Classifique cada arquivo:
- carregado por uma página e ausente da lista: **FALHA** (some sem internet). Exceção: se o `fetch` do
  service worker guarda o que for aberto e o arquivo é imagem/vídeo grande de seção mais abaixo, é **ATENÇÃO**;
- na lista mas o arquivo não existe: **FALHA** (o `addAll` recusa a lista inteira e nada fica guardado);
- página de entrada ou `start_url` fora da lista: **FALHA**;
- em pasta de telas/scripts mas não carregado por nenhuma página: **ATENÇÃO** (arquivo que nunca aparece);
- só o manifest usa (ícone) e está fora da lista: **ATENÇÃO**.

Diga em uma linha o que o `fetch` faz offline com o que não está guardado. Se houver FALHA (e a pessoa não
pediu "só conferir"), corrija a lista e **suba a versão do cache** (`v1` → `v2`). Por quê: sem versão nova,
quem já instalou fica com a cópia antiga. Com Workbox/hash, a versão sobe sozinha.

## 2b. Não tem service worker → criar o modo offline completo

Use os modelos da pasta desta skill (`modelos/`), trocando só o que está marcado com `TROCAR`:

| Arquivo | Vite | HTML puro |
|---|---|---|
| `modelos/sw.js` | `public/sw.js` | `sw.js` na raiz |
| `modelos/manifest.webmanifest` | `public/manifest.webmanifest` | `manifest.webmanifest` na raiz |
| ícone (se não houver) | `public/icone.svg` | `assets/icone.svg` (ou pasta de imagens existente) |

1. **`sw.js`:** `CACHE` = nome curto do projeto + `-v1`. `PAGINAS` = cada página de entrada (`./` para a
   principal, `sobre.html`...). `LISTA` = arquivos com **nome fixo**: manifest, ícones e tudo o que estiver
   em `public/` (Vite) ou nas pastas de css/js/imagens/fontes (HTML puro), sem `/` no começo. Por quê sem a
   barra: o site pode morar numa subpasta (GitHub Pages) e o caminho é relativo ao service worker.
   No Vite, **não** liste os arquivos de `src/`: o build troca os nomes (`index-a1b2.js`); o modelo descobre
   esses nomes sozinho lendo a página na instalação. Se o raio-x achou outro domínio além das fontes do
   Google, acrescente-o em `GUARDAR_DE_FORA`.
2. **Manifest:** `name` = título do site, `short_name` ≤ 12 letras, cores de `theme-color`/tokens do CSS,
   `start_url`/`scope` = `./`. Ícone: use o que o projeto já tiver (192 e 512 px, PNG). Sem nenhum, crie um
   SVG simples (quadrado arredondado na cor do tema com a inicial do nome) e marque **ATENÇÃO**: o iPhone
   pede `apple-touch-icon` em PNG para o ícone da tela inicial. Deixe no `icons` só os arquivos que existem.
3. **Ligar nas páginas:** em cada página de entrada, `<link rel="manifest" href="...">` e, se faltar,
   `<meta name="theme-color">`. No Vite use caminho absoluto (`/manifest.webmanifest`): o build acrescenta a base.
4. **Registrar:**
   - Vite, no script de entrada (`src/main.js`/`main.ts`), no fim:
     ```js
     // Modo offline: só no site publicado (no npm run dev guardaria versões velhas enquanto você edita).
     if ('serviceWorker' in navigator && import.meta.env.PROD) {
       navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`)
     }
     ```
   - HTML puro, antes do `</body>` de cada página (ajuste o caminho em páginas de subpasta):
     `<script>if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js')</script>`

## 3. Provar que funciona

1. **Arquivos:** cada item de `LISTA` existe. Vite: rode `npm run build` (precisa sair com código 0) e
   confira `dist/sw.js`, `dist/manifest.webmanifest` e cada item de `LISTA` dentro de `dist/`.
2. **No navegador** (se houver ferramenta de navegador; senão, "não verificado" e o passo a passo abaixo):
   sirva a versão final (Vite: `npm run preview`; HTML puro: servidor local do projeto), abra a página,
   recarregue uma vez e rode no console da página:
   `[!!navigator.serviceWorker.controller, (await (await caches.open(CACHE)).keys()).length]`.
   Precisa dar `true` e um número ≥ itens da lista.
3. **Teste real sem internet:** desligue o servidor e recarregue. A página tem que abrir inteira (texto,
   estilo, imagens já guardadas). Tire um print como prova e ligue o servidor de novo se a pessoa o usava.
4. Para a pessoa repetir: Chrome › F12 › aba Application › Service Workers › marcar "Offline" › recarregar.

## Formato da resposta

```markdown
## Confere offline (<data>)
Projeto: <Vite | HTML puro | outro> · Service worker: `<arquivo>` ou "não tinha (criado)" · Cache: `<valor>`

| Arquivo | Onde é usado | Guardado? | Situação |
|---|---|---|---|

**Veredito: OK OFFLINE** ou **QUEBRA OFFLINE** (lista das FALHAS que sobraram).
O que eu fiz: <arquivos criados/alterados, um por linha> (ou "nada, só conferi").
Prova: <build, controller/caches, print com o servidor desligado>.
Não verificado: <o que faltou provar>.
Atenção: <ex.: ícone em PNG para iPhone; publicar e abrir uma vez com internet antes de testar offline>.
```

Termine lembrando: o modo offline só começa a valer depois que a pessoa abre o site **uma vez com
internet**; e as mudanças ainda não foram para o GitHub (commit e push são com ela).
