// Extras do produto: banner dos sites do autor, formulário de sugestões, instalação (PWA) e service worker.
import { CONFIG } from '../config.js';
import { safeUrl } from './parse.js';

const $ = id => document.getElementById(id);
const sites = (CONFIG.banner?.sites || []).map(s => ({ ...s, url: safeUrl(s.url || '') })).filter(s => s.name && s.url);
const withUtm = (url, medium) => { const u = new URL(url); u.searchParams.set('utm_source', 'rodada'); u.searchParams.set('utm_medium', medium); return u.href; };
const el = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)){ if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (v != null && v !== false) e.setAttribute(k, v); }
  for (const c of kids.flat()) if (c != null) e.append(c.nodeType ? c : document.createTextNode(c));
  return e;
};

export function initExtras({ say, track }){
  /* ---- banner dos seus sites ---- */
  if (sites.length){
    if (CONFIG.banner.topStrip !== false){
      const day = Math.floor(Date.now() / 864e5), s = sites[day % sites.length];
      let hiddenUntil = 0; try { hiddenUntil = Number(localStorage.getItem('rodada-banner-off') || 0); } catch(e){}
      if (Date.now() > hiddenUntil){
        $('topBanner').append(
          el('a', { href: withUtm(s.url, 'banner_topo'), target:'_blank', rel:'noopener', onclick: () => track('banner_click', { site:s.name, onde:'topo' }) },
            `${s.emoji || '✨'} `, el('b', {}, s.name), s.desc ? ` — ${s.desc}` : '', ' ↗'),
          el('button', { class:'x', 'aria-label':'Fechar aviso', title:'Fechar por 7 dias', onclick: () => {
            $('topBanner').hidden = true; try { localStorage.setItem('rodada-banner-off', String(Date.now() + 7 * 864e5)); } catch(e){} } }, '×'));
        $('topBanner').hidden = false;
      }
    }
    if (CONFIG.banner.footerCards !== false){
      $('sites').replaceChildren(el('h2', {}, 'Outros projetos'),
        el('div', { class:'sitegrid' }, ...sites.map(s => el('a', { class:'sitecard', href: withUtm(s.url, 'banner_rodape'), target:'_blank', rel:'noopener',
          onclick: () => track('banner_click', { site:s.name, onde:'rodape' }) },
          el('span', { class:'em' }, s.emoji || '✨'), el('span', {}, el('b', {}, s.name), el('small', {}, s.desc || new URL(s.url).hostname))))));
      $('sites').hidden = false;
    }
  }

  /* ---- sugestões: abrem uma issue pública no GitHub (nada é enviado sem o usuário clicar em "Submit") ---- */
  const issuesUrl = (CONFIG.feedback?.issuesUrl || '').trim();
  const issue = (template, title, body = '') => {
    const u = new URL(issuesUrl);
    u.searchParams.set('template', template); u.searchParams.set('title', title);
    if (body) u.searchParams.set('body', body.slice(0, 1500));
    return u.href;
  };
  if (/^https:\/\//.test(issuesUrl)){
    $('fbBtn').href = issue('sugestao-jogo.md', 'Sugestão: ');  $('fbBtn').hidden = false;
    $('fbErro').href = issue('erro.md', 'Erro: ');              $('fbErro').hidden = false;
    $('fbBtn').addEventListener('click', () => track('feedback_open', { tipo:'jogo', origem:'rodape' }));
    $('fbErro').addEventListener('click', () => track('feedback_open', { tipo:'erro', origem:'rodape' }));
    // texto não reconhecido: o usuário decide se envia; o texto vai para a issue, nunca para o analytics
    const sg = $('suggestPaste');
    document.addEventListener('rodada:suggest', e => {
      const txt = e.detail?.text || '';
      sg.href = issue('sugestao-jogo.md', 'Sugestão de jogo: ', 'Exemplo do texto de "Compartilhar":\n\n```\n' + txt.trim() + '\n```\n');
      track('feedback_open', { tipo:'jogo', origem:'colar' });
    });
  }

  /* ---- instalar como app (PWA) ---- */
  let deferred = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; $('installBtn').hidden = false; });
  $('installBtn').addEventListener('click', async () => {
    if (!deferred) return; deferred.prompt();
    const { outcome } = await deferred.userChoice; track('install_prompt', { resultado: outcome }); deferred = null; $('installBtn').hidden = true;
  });
  window.addEventListener('appinstalled', () => track('installed'));
  if (/iphone|ipad/i.test(navigator.userAgent) && !navigator.standalone) $('iosHint').hidden = false;

  /* ---- offline ---- */
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')){
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}
