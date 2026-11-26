// Configuração única do produto. Edite SÓ este arquivo para ligar analytics, banner e formulário.
// Tudo aqui é público (vai para o navegador de quem visita): nunca coloque segredos.
export const CONFIG = {
  name: 'Rodada',
  url: 'https://ltmleo.github.io/rodada/',

  // Google Analytics 4. Enquanto estiver como G-XXXXXXXXXX (ou vazio), NADA é carregado nem enviado.
  analytics: { measurementId: 'G-XXXXXXXXXX' },

  // Banner dos seus outros sites. Lista vazia = banner e seção "Outros projetos" não aparecem.
  // Exemplo: { name: 'Meu site', url: 'https://exemplo.com', desc: 'Uma frase curta', emoji: '🧭' }
  banner: {
    topStrip: true,     // faixa fina no topo (um site por dia, dispensável)
    footerCards: true,  // seção "Outros projetos" no rodapé (todos os sites)
    sites: [],
  },

  // Formulário de sugestões/erros, sem login. Cole aqui o endereço do seu formulário Formspree
  // (https://formspree.io/f/XXXXXXXX) ou de outro serviço que aceite POST com Accept: application/json.
  // Vazio = o botão de sugestões não aparece.
  feedback: { endpoint: '' },
};
