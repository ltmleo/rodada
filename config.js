// Configuração única do produto. Edite SÓ este arquivo para ligar analytics, banner e formulário.
// Tudo aqui é público (vai para o navegador de quem visita): nunca coloque segredos.
export const CONFIG = {
  name: 'Rodada',
  siteId: 'rodada',                       // = id em sites.json e content_group do GA e <ltm-bar site>
  url: 'https://ltmleo.github.io/rodada/',

  // Google Analytics 4. Enquanto estiver como G-XXXXXXXXXX (ou vazio), NADA é carregado nem enviado.
  analytics: { measurementId: 'G-714QFE3V9G' },   // propriedade única do ecossistema ltmleo.github.io (skill ltm-novo-site)

  // Navegação entre os sites do autor: a barra <ltm-bar> (lista única em ltmleo.github.io/src/shared/sites.json).
  // Não há banner próprio: o banner dos sites é a própria barra. Desligado aqui de propósito.
  banner: {
    topStrip: false,
    footerCards: false,
    sites: [],
  },

  // Formulário de sugestões/erros, sem login. Cole aqui o endereço do seu formulário Formspree
  // (https://formspree.io/f/XXXXXXXX) ou de outro serviço que aceite POST com Accept: application/json.
  // Vazio = o botão de sugestões não aparece.
  feedback: { endpoint: '' },
};
