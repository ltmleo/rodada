// Google Analytics 4, carregado só se houver um ID real em config.js. Nunca envia o conteúdo dos resultados:
// apenas nomes de eventos e contagens (ex.: share, register_result, game_toggle).
import { CONFIG } from '../config.js';

const id = CONFIG.analytics?.measurementId || '';
const valid = /^G-(?!X+$)[A-Z0-9]{6,}$/.test(id);
const dnt = navigator.doNotTrack === '1' || window.doNotTrack === '1';   // respeita "Não rastrear" do navegador
export const analyticsOn = valid && !dnt;

window.dataLayer = window.dataLayer || [];
function gtag(){ window.dataLayer.push(arguments); }

if (analyticsOn){
  gtag('consent', 'default', { ad_storage:'denied', ad_user_data:'denied', ad_personalization:'denied', analytics_storage:'granted' });
  gtag('js', new Date());
  gtag('config', id, { allow_google_signals:false, allow_ad_personalization_signals:false });
  const s = document.createElement('script');
  s.async = true; s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.append(s);
}

/** Registra um evento. Sem efeito se o GA estiver desligado. */
export function track(name, params = {}){
  if (analyticsOn) gtag('event', name, params);
  if (new URLSearchParams(location.search).has('debug')) console.debug('[analytics]', analyticsOn ? 'on' : 'off', name, params);
}
