# Rodada

**Sua rodada diária de jogos.** Marque os desafios que você joga todo dia (Termo, Dueto, Wordle, Putt.day, Flagle, Decola.io, Farflung, Conexo…), cole o resultado do botão "Compartilhar", acompanhe sequências e histórico e compartilhe o seu dia. Sem login: tudo fica no seu aparelho.

🔗 https://ltmleo.github.io/rodada/

## Recursos
- Lista do dia com pendentes primeiro e sequência por jogo.
- Cole um ou vários resultados de uma vez: o jogo, o número do dia e a pontuação são reconhecidos.
- Histórico de 14 dias, estatísticas por jogo e "dias completos" seguidos.
- Botão **Compartilhar meu dia** com destaques (recorde, sequência, dia perfeito).
- Cada pessoa escolhe os jogos que quer ver.
- Instalável e funciona offline (PWA). Exportar/importar o histórico em JSON.

## Desenvolvimento
```bash
npm test          # testes do parser (Node 22, sem dependências)
npm run serve     # http://localhost:8000
```
Sem build: HTML/CSS/JS puro. A configuração (Google Analytics, banner dos sites do autor, formulário de sugestões) fica toda em [`config.js`](config.js).

## Estrutura
`js/parse.js` (lógica pura e testada) · `js/app.js` (UI) · `js/analytics.js` · `js/extras.js` · `sw.js` (offline) · `scripts/build.sh` (monta e valida o site). Detalhes em [`CLAUDE.md`](CLAUDE.md).

## Publicação
Push em `main` roda os testes e publica no GitHub Pages (Settings › Pages › Source: **GitHub Actions**).

## Adicionar um jogo
Abra uma [issue de sugestão](https://github.com/ltmleo/rodada/issues/new?template=sugestao-jogo.md) com um exemplo do texto de "Compartilhar". Para contribuir com código, veja "Adicionar um jogo" no `CLAUDE.md`.

## Privacidade
Seus resultados nunca saem do aparelho. Veja [privacidade.html](privacidade.html).
