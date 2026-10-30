---
name: confere-offline
description: 'Confere se o ENTRELIA continua abrindo sem internet depois de uma mudança: compara a lista de arquivos guardados pelo sw.js (SHELL) com o que app.html e index.html carregam e com as telas em js/views/, e diz se a versão do cache (CACHE) precisa subir. Só lê e responde com uma tabela; não corrige nada sem OK. Use quando pedirem /confere-offline ou disserem coisas como "o app ainda abre sem internet?", "criei uma tela nova, falta algo pro modo offline?" ou "confere o service worker antes de publicar".'
---

# Confere offline

O ENTRELIA abre sem internet porque o `sw.js` guarda uma lista fixa de arquivos (`SHELL`). Arquivo novo
fora da lista é tela quebrada para quem estiver offline, e ninguém percebe até ficar sem sinal.

**Só leitura.** Não edite arquivos, não instale pacotes e não rode comandos Git (nem `git status`) sem
autorização. Por quê: quem decide o que muda é a pessoa; a skill entrega o diagnóstico com prova.

## Passos

1. Leia o `sw.js` e anote a lista `SHELL` e o valor de `CACHE`.
2. Leia `app.html` e `index.html` e liste o que eles carregam do próprio site: `<script src>`,
   `<link rel="stylesheet">`, `manifest`, ícones. Ignore endereços `https://`: as fontes do Google já têm
   regra própria no `sw.js`.
3. Liste os `.js` de `js/` e `js/views/` e os `.css` de `css/`.
   Por quê: tela nova em `js/views/` costuma ser esquecida no `app.html` e no `SHELL` ao mesmo tempo.
4. Compare e classifique cada arquivo:
   - carregado por uma página e ausente do `SHELL`: FALHA (some quando não há internet);
   - no `SHELL` mas o arquivo não existe: FALHA. Por quê: o `addAll` do service worker recusa a lista
     inteira se um arquivo faltar, e aí nada fica guardado;
   - em `js/views/` mas não carregado pelo `app.html`: ATENÇÃO (tela que nunca aparece).
5. Se o `SHELL` precisar mudar, sugira subir o `CACHE` (ex.: `entrelia-v1` para `entrelia-v2`).
   Por quê: sem versão nova, quem já instalou o app pode continuar com a cópia antiga.
6. Imagens de `assets/img/` não precisam estar no `SHELL` (ficam guardadas quando abertas). Só comente
   se a pessoa perguntar.

## Formato da resposta

```markdown
## Confere offline (<data>)
CACHE atual: `<valor>` · Arquivos no SHELL: <n>

| Arquivo | Onde é usado | No SHELL? | Situação |
|---|---|---|---|

**Veredito: OK OFFLINE** (nenhuma FALHA) ou **QUEBRA OFFLINE** (lista das FALHAS).
Sugestão para o sw.js: <linhas a acrescentar ou tirar e a nova versão do CACHE, ou "nada a mudar">.
Não verificado: <ex.: teste real com a internet desligada>.

Quer que eu aplique a sugestão? Responda "pode aplicar".
```

Cada linha cita onde o arquivo foi visto (ex.: `app.html:74`, `sw.js:9`). Sem prova, escreva
"não verificado", nunca OK.
