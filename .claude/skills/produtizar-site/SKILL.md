---
name: produtizar-site
description: Aplica o kit de produto do autor em qualquer site estático dele (Google Analytics, banner/faixa e cartões "Outros projetos", formulário de sugestões sem login, PWA e privacidade). Use quando o usuário pedir para "produtizar", configurar GA/analytics, adicionar o banner dos seus sites ou aceitar sugestões num site ou repositório dele. Guarda o ID do GA e a lista de sites.
---

# Produtizar um site (kit do autor)

Este arquivo é a **fonte única** dos dados que se repetem em todos os sites do autor. Mantenha-o atualizado; ao aplicar o kit em um projeto, copie os valores abaixo para o arquivo de configuração do projeto (na Rodada: `config.js`). Nada aqui é segredo: ID de medição do GA, links e o endereço público de um formulário são públicos por natureza. **Nunca** coloque neste arquivo tokens, senhas ou chaves privadas.

## Dados do autor — PREENCHER

```yaml
analytics:
  ga4_measurement_id: "G-XXXXXXXXXX"   # TODO: colar o ID real (GA › Admin › Fluxos de dados). Placeholder = analytics desligado.
  cookie_notice: false                 # decisão do autor: sem aviso de cookies (o GA fica sem publicidade/sinais e respeita "Não rastrear")

banner:
  # um item por site do autor
  sites: []
  # exemplo:
  # - { name: "Nome", url: "https://exemplo.com", desc: "Uma frase curta", emoji: "🧭" }

feedback:
  endpoint: ""        # TODO: URL do formulário (ex.: https://formspree.io/f/XXXXXXXX). Vazio = botão de sugestões oculto.
```

> Estado atual: **nada acima foi preenchido** (o ID do GA e a lista de sites não foram informados). Até lá, GA, banner e formulário ficam desligados por padrão, sem erro.

## Como aplicar em um site estático

1. **Config única.** Criar `config.js` exportando `CONFIG` (`analytics.measurementId`, `banner.sites`, `feedback.endpoint`) com os valores acima. Modelo: `config.js` da Rodada.
2. **GA4** (`js/analytics.js` da Rodada): carregar `gtag.js` só se o ID for real; `ad_storage` e `ad_personalization` negados; sem Google Signals; respeitar `navigator.doNotTrack`; eventos só com nome + contagens, **nunca conteúdo do usuário**.
3. **Banner** (`js/extras.js`): faixa fina no topo (um site por dia, dispensável por 7 dias) e seção "Outros projetos" com cartões no rodapé. Links com `utm_source=<projeto>&utm_medium=banner_topo|banner_rodape`. Lista vazia = nada aparece.
4. **Sugestões sem login:** diálogo com tipo (sugerir jogo/erro/ideia), mensagem e contato opcional, `POST` com `Accept: application/json` ao `endpoint`, campo honeypot `_gotcha`. Sem `endpoint` o botão fica oculto.
5. **Privacidade:** página `privacidade.html` dizendo o que é guardado no aparelho, o que o GA recebe, o formulário e os links externos. Atualizar a data.
6. **PWA:** `manifest.webmanifest`, `sw.js` versionado pelo commit, ícones 192/512/maskable, `apple-touch-icon`.
7. **Verificar:** testar com um ID falso e requisições interceptadas (GA, formulário), com DNT ligado, e com config padrão (nada carregado). Conferir que nenhum texto do usuário aparece em `dataLayer`.

## Avisos a repetir ao autor
- Sem aviso de cookies, o GA em visitantes da UE/Brasil continua exigindo base legal (LGPD/GDPR); a escolha foi do autor. A configuração acima reduz o risco, mas não o elimina.
- Formspree gratuito tem limite mensal de envios; trate o endpoint como público (por isso o honeypot).
- Um domínio próprio muda a origem do navegador: o histórico salvo em `ltmleo.github.io` não acompanha. Planeje migração (exportar/importar) antes de trocar o endereço.
