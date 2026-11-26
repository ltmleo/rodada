# Rodada — instruções do projeto

Produto: **Rodada**, sua rodada diária de jogos. Uma página (PWA) para marcar os desafios diários que a pessoa joga (Termo, Wordle, Putt.day…), colar o texto de "Compartilhar", ver sequências/histórico e compartilhar o dia. **Sem login, sem backend**: os dados ficam no `localStorage` de quem usa.

Publicado em `https://ltmleo.github.io/rodada/` via GitHub Actions (`.github/workflows/pages.yml`).

## Estrutura
```
index.html            app (uma tela com abas)       config.js        ÚNICO arquivo de configuração (GA, banner, formulário)
css/app.css           estilos                       manifest.webmanifest, sw.js   PWA/offline
js/parse.js           lógica pura dos textos de compartilhar (SEM DOM) — coberta por testes
js/app.js             UI e estado                   js/analytics.js  Google Analytics   js/extras.js  banner, sugestões, instalação
test/parse.test.js    testes com textos reais       scripts/build.sh monta _site/ e valida
privacidade.html      política
```

## Comandos
- `npm test` — testes do parser (Node 22, sem dependências).
- `npm run serve` — servidor local em http://localhost:8000.
- `scripts/build.sh` — gera `_site/` como o CI faz.

## Regras
1. **Sem build, sem dependências.** HTML/CSS/JS puro com módulos ES. Não adicionar bundler nem framework sem pedido.
2. **Configuração só em `config.js`.** GA, banner e formulário nunca ficam espalhados no código. O que está lá é público: **nunca colocar segredos**.
3. **Privacidade (promessa do produto):** os resultados e os textos colados **nunca** saem do aparelho. O GA recebe só nomes de evento e contagens (`track()` em `js/analytics.js`). Nunca passar texto do usuário, resultados ou nomes de jogos digitados a `track()`. Respeitar "Não rastrear".
4. **Dados do usuário são sagrados.** Mudou o formato do `localStorage`? Escreva migração que preserva o histórico (veja `migrate()` em `js/app.js`). A chave atual é `rodada-v1`; `painel-desafios-v1` é o protótipo antigo (importado no primeiro acesso, nunca apagado).
5. **Texto do usuário vai com `textContent`/`h()`**, nunca `innerHTML`. Links de jogos passam por `safeUrl()` (só http/https).
6. Interface em português do Brasil, mobile-first, claro e escuro (`prefers-color-scheme`).

## Adicionar um jogo (ou corrigir o formato de um)
1. Peça/obtenha um **texto real** de "Compartilhar" do jogo (não invente formato; se não houver exemplo, o parser genérico só marca como feito e guarda o texto).
2. `js/parse.js`: adicionar a `DEFAULT_GAMES` (id estável, nome, emoji, link confirmado), a `DETECT` (reconhecer pelo texto) e a `HEADERS` (início de bloco, para colar vários de uma vez); se precisar, um bloco em `parseShare`.
3. **Teste primeiro/junto:** adicionar o texto real em `test/parse.test.js` e conferir `npm test`.
4. Quem já usa o app não recebe o jogo novo automaticamente (a lista é salva no aparelho): se for importante, adicione em `migrate()`.

## Publicação
- Push em `main` testa e publica. PR só testa.
- Pages precisa estar com **Source = GitHub Actions** (Settings › Pages).
- O `sw.js` é versionado pelo commit no deploy; ao criar arquivos que o app pré-carrega, liste-os em `SHELL` do `sw.js` (o build falha se algum não existir).

## Integração ao ecossistema
Seguir a skill `ltm-novo-site` (repo `ltmleo/ltmleo.github.io`, pasta `.claude/skills/ltm-novo-site/`). Ela define o GA compartilhado `G-714QFE3V9G`, a barra `<ltm-bar>` e a lista `sites.json`. O site `rodada` já está previsto lá (`id: rodada`, `path: /rodada/`).
Sugestões: o formulário ainda não tem endpoint (`feedback.endpoint` em `config.js`); a skill não cobre isso.
