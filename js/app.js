// Rodada — app (UI e estado). Lógica pura de textos de compartilhar fica em parse.js.
import { DEFAULT_GAMES, parseShare, splitShares, safeUrl, slug, pad,
         detectGame as detectGameIn, textDate as textDateIn } from './parse.js';
import { CONFIG } from '../config.js';
import { track } from './analytics.js';
import { initExtras } from './extras.js';

const KEY = 'rodada-v1', LEGACY_KEY = 'painel-desafios-v1';   // LEGACY: protótipo em ltmleo.github.io/pages (mesma origem, então os dados migram sozinhos)
const $ = id => document.getElementById(id);

/* ---------- estado ---------- */
let mem = null, persistOK = true;
function load(){
  try {
    const s = localStorage.getItem(KEY); if (s) return JSON.parse(s);
    const old = localStorage.getItem(LEGACY_KEY);                       // 1º acesso: traz o histórico do protótipo (a cópia antiga fica intacta)
    if (old){ const j = JSON.parse(old); if (j && j.games && j.log){ j.migratedFrom = LEGACY_KEY; return j; } }
  } catch(e){ persistOK = false; }
  return mem || { v:1, games: structuredClone(DEFAULT_GAMES), log:{} };
}
let S = load();
(function migrate(){                                              // Flagly -> Flagle; links do Farflung
  const g = S.games.find(x => x.id === 'flagly');
  if (g){ g.id = 'flagle'; if (g.name === 'Flagly') g.name = 'Flagle'; if (!g.url) g.url = 'https://www.flagle.io/';
    for (const d in S.log) if (S.log[d].flagly){ S.log[d].flagle = S.log[d].flagly; delete S.log[d].flagly; } }
  const f = S.games.find(x => x.id === 'farflung'); if (f && !f.url) f.url = 'https://farflung.game';
  if (!S.games.some(x => x.id === 'disk-discovery') && !S.migrations?.diskDiscovery){   // jogo novo entra uma vez para quem já usa
    const dd = DEFAULT_GAMES.find(x => x.id === 'disk-discovery'); if (dd){ S.games.push({ ...dd }); }
    (S.migrations ??= {}).diskDiscovery = true;
  }
  const c = S.games.findIndex(x => x.id === 'connections');           // Connections (NYT) -> Conexo (pt); histórico antigo fica guardado
  if (c >= 0 && !S.games.some(x => x.id === 'conexo') && /nytimes\.com\/games\/connections/.test(S.games[c].url))
    S.games[c] = { id:'conexo', name:'Conexo', emoji:'🔗', url:'https://conexo.ws', on:S.games[c].on };
})();
function save(){
  mem = S;
  try { localStorage.setItem(KEY, JSON.stringify(S)); persistOK = true; } catch(e){ persistOK = false; }
  $('warn').hidden = persistOK;
  $('warn').textContent = persistOK ? '' : '⚠️ Não foi possível salvar neste navegador (modo privado ou bloqueado). Exporte os dados antes de sair.';
}

/* ---------- datas ---------- */
const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const addDays = (k, n) => { const [y,m,d] = k.split('-').map(Number); return keyOf(new Date(y, m-1, d+n)); };
const todayKey = () => keyOf(new Date());
const fmtBR = k => k.split('-').reverse().join('/');
const wd = k => { const [y,m,d] = k.split('-').map(Number); return ['dom','seg','ter','qua','qui','sex','sáb'][new Date(y,m-1,d).getDay()]; };

/* ---------- helpers ---------- */
const detectGame = t => detectGameIn(t, S.games);
const textDate = t => textDateIn(t, todayKey());
function h(tag, attrs = {}, ...kids){
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)){
    if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) e.setAttribute(k, v);
  }
  for (const c of kids.flat()) if (c != null) e.append(c.nodeType ? c : document.createTextNode(c));
  return e;
}
const active = () => S.games.filter(g => g.on);
const entry = (d, g) => S.log[d]?.[g];
function setEntry(d, g, e){ (S.log[d] ??= {})[g] = e; save(); }
function delEntry(d, g){ if (S.log[d]){ delete S.log[d][g]; if (!Object.keys(S.log[d]).length) delete S.log[d]; } save(); }

/* ---------- sequências e estatísticas ---------- */
const doneOn = (d, id) => !!entry(d, id);
function streak(pred){
  const days = Object.keys(S.log).sort();
  let cur = 0, d = todayKey();
  if (!pred(d)) d = addDays(d, -1);
  while (pred(d)){ cur++; d = addDays(d, -1); }
  let best = 0, run = 0, prev = null;
  const all = new Set(days);
  for (const k of days){
    if (!pred(k)) { run = 0; prev = null; continue; }
    run = prev && addDays(prev, 1) === k ? run + 1 : 1; prev = k; best = Math.max(best, run);
  }
  return { cur, best: Math.max(best, cur) };
}
const allDone = d => { const a = active(); return a.length > 0 && a.every(g => doneOn(d, g.id)); };
const anyDone = d => active().some(g => doneOn(d, g.id));

/* ---------- render ---------- */
const WD = ['domingo','segunda','terça','quarta','quinta','sexta','sábado'];
const MES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const longDate = k => { const [y,m,d] = k.split('-').map(Number); return `${WD[new Date(y,m-1,d).getDay()]}, ${d} de ${MES[m-1]}`; };
const stateOf = e => !e ? 'pend' : e.win === true ? 'done' : e.win === false ? 'lost' : (e.score ? 'neu' : 'done');

function render(){
  if (!$('paste').value.trim()) $('suggestPaste').hidden = true;
  const t = todayKey(), a = active();
  const done = a.filter(g => doneOn(t, g.id)).length, sAll = streak(allDone), sAny = streak(anyDone);
  $('today').textContent = longDate(t);

  const pct = a.length ? done / a.length : 0, C = 2 * Math.PI * 44;
  $('ring').innerHTML = `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" fill="none" stroke="var(--line)" stroke-width="9"/>
    <circle cx="50" cy="50" r="44" fill="none" stroke="${pct === 1 ? 'var(--ok)' : 'var(--acc)'}" stroke-width="9" stroke-linecap="round"
    stroke-dasharray="${(C*pct).toFixed(1)} ${C.toFixed(1)}" style="transition:stroke-dasharray .4s"/></svg>
    <div class="lbl"><b>${done}/${a.length}</b><span>hoje</span></div>`;

  const kpi = (v, l, title) => h('div', {class:'kpi', title}, h('b', {}, v), h('span', {}, l));
  $('badges').replaceChildren(
    kpi(`🔥 ${sAll.cur}`, sAll.best > sAll.cur ? `completos · máx ${sAll.best}` : 'dias completos', `Dias seguidos com todos os jogos feitos (recorde: ${sAll.best})`),
    kpi(`📆 ${sAny.cur}`, 'dias jogando', 'Dias seguidos com pelo menos um jogo'));

  // lista do dia: pendentes primeiro
  const order = [...a].sort((x, y) => (doneOn(t, x.id) ? 1 : 0) - (doneOn(t, y.id) ? 1 : 0));
  $('todayHint').textContent = !a.length ? '' : done === a.length ? 'tudo feito 🎉' : `${a.length - done} pendente${a.length - done > 1 ? 's' : ''}`;
  if (!a.length){ $('cards').replaceChildren(h('div', {class:'box allset', style:'color:var(--mut);background:var(--surface)'}, 'Nenhum jogo escolhido. Toque em "Escolher jogos".')); }
  else $('cards').replaceChildren(...order.map(g => {
    const e = entry(t, g.id), st = streak(d => doneOn(d, g.id)), url = safeUrl(g.url), cls = stateOf(e);
    const res = !e ? (st.cur ? `sequência de ${st.cur} — não perca` : 'pendente') : e.score ? `${e.score}${e.num ? ' · #' + e.num : ''}` : 'feito';
    return h('div', {class:`box item ${cls}`},
      h('button', {class:'check', 'aria-label': e ? `Desmarcar ${g.name}` : `Marcar ${g.name} como feito`, title: e ? 'Desmarcar' : 'Marcar como feito', onclick: () => toggle(t, g.id)},
        cls === 'lost' ? '✕' : '✓'),
      h('div', {class:'meta'},
        h('div', {class:'name'}, h('span', {class:'em'}, g.emoji || '🎯'), g.name),
        h('div', {class:'res', title: e?.raw || ''}, res)),
      st.cur ? h('span', {class:'streak', title:'Sequência'}, `🔥 ${st.cur}`) : null,
      url ? h('a', {class:`btn sm ${e ? 'ghost' : 'primary'}`, href:url, target:'_blank', rel:'noopener noreferrer'}, e ? 'Abrir' : 'Jogar ↗')
          : h('span', {class:'nolink'}, 'sem link'));
  }));

  // seletor de jogo
  const cur = $('gsel').value;
  $('gsel').replaceChildren(h('option', {value:''}, 'Detectar automaticamente'), ...a.map(g => h('option', {value:g.id}, g.name)));
  $('gsel').value = a.some(g => g.id === cur) ? cur : '';
  if (!$('dsel').value) $('dsel').value = t;
  $('dsel').max = t;

  renderHist(t); renderStats(); renderSummary(t);
}
function renderHist(t){
  const days = Array.from({length:14}, (_, i) => addDays(t, -13 + i));
  const head = h('tr', {}, h('th', {}, ''), ...days.map((d, i) => h('th', {class: (d === t ? 'today ' : '') + (i < 7 ? 'old' : '')},
    wd(d).slice(0, 1).toUpperCase(), h('b', {}, String(Number(d.slice(8)))))));
  const rows = active().map(g => h('tr', {}, h('td', {}, `${g.emoji || ''} ${g.name}`), ...days.map((d, i) => {
    const e = entry(d, g.id), c = stateOf(e), cls = c === 'done' ? 'ok' : c === 'lost' ? 'bad' : c === 'neu' ? 'neu' : '';
    const desc = `${g.name}, ${fmtBR(d)}: ${e ? (e.score || 'feito') : 'não jogou'}`;
    return h('td', {class: (d === t ? 'today ' : '') + (i < 7 ? 'old' : '')},
      h('button', {class:`dot ${cls}`, 'aria-label':desc, title: desc + (e?.raw ? '\n\n' + e.raw : ''), onclick: () => toggle(d, g.id)}));
  })));
  $('hist').replaceChildren(head, ...rows);
}
function renderStats(){
  $('stats').replaceChildren(...active().map(g => {
    const es = Object.keys(S.log).map(d => S.log[d][g.id]).filter(Boolean);
    const withRes = es.filter(e => typeof e.win === 'boolean'), wins = withRes.filter(e => e.win);
    const nums = (withRes.length ? wins : es).map(e => e.n).filter(n => typeof n === 'number');
    const st = streak(d => doneOn(d, g.id)), pct = withRes.length ? Math.round(100 * wins.length / withRes.length) : null;
    const item = (k, v) => [h('dt', {}, k), h('dd', {}, v)];
    return h('div', {class:'stat'},
      h('div', {class:'stat-h'}, `${g.emoji || ''} ${g.name}`),
      h('div', {class:'stat-big'}, pct !== null ? `${pct}%` : String(es.length)),
      h('div', {class:'stat-cap'}, pct !== null ? `acertos (${wins.length} de ${withRes.length})` : (es.length === 1 ? 'dia jogado' : 'dias jogados')),
      pct !== null ? h('div', {class:'bar'}, h('i', {style:`width:${pct}%`})) : null,
      h('dl', {}, ...item('Dias', es.length), ...item('Média', nums.length ? (nums.reduce((x, y) => x + y, 0) / nums.length).toFixed(1) : '—'),
        ...item('Sequência', st.cur), ...item('Recorde', st.best)));
  }));
}
// Direção do "melhor": low = menos tentativas/tacadas é melhor; high = mais pontos; null = sem comparação
const BETTER = { decola:'high', farflung:null };
const pageUrl = () => location.origin + location.pathname;
const fmtShort = k => k.slice(8) + '/' + k.slice(5, 7);
const fmtN = n => Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ',');
function insights(t){
  const a = active(), played = a.map(g => [g, entry(t, g.id)]).filter(([, e]) => e);
  const res = played.filter(([, e]) => typeof e.win === 'boolean'), out = [];
  if (a.length > 1 && played.length === a.length && res.length && res.every(([, e]) => e.win)) out.push('💯 Dia perfeito: acertei tudo');
  // só afirma a sequência se HOJE também conta (senão o texto diria algo que ainda não é verdade)
  const sAll = allDone(t) ? streak(allDone).cur : 0, sAny = anyDone(t) ? streak(anyDone).cur : 0;
  if (sAll >= 2) out.push(`🔥 ${sAll} dias seguidos completando tudo`);
  else if (sAny >= 3) out.push(`📆 ${sAny} dias seguidos jogando`);
  let rec = null, above = null;
  for (const [g, e] of played){
    const dir = g.id in BETTER ? BETTER[g.id] : 'low';
    if (!dir || typeof e.n !== 'number' || e.win === false) continue;
    const hist = Object.keys(S.log).filter(d => d < t).map(d => S.log[d][g.id]).filter(x => x && typeof x.n === 'number' && x.win !== false).map(x => x.n);
    if (hist.length < 3) continue;
    const best = dir === 'low' ? Math.min(...hist) : Math.max(...hist), avg = hist.reduce((x, y) => x + y, 0) / hist.length;
    const gain = dir === 'low' ? (avg - e.n) / avg : (e.n - avg) / avg;
    if ((dir === 'low' ? e.n < best : e.n > best) && (!rec || gain > rec.gain)) rec = { gain, s:`🏆 Recorde no ${g.name}: ${e.score}` };
    else if (gain > 0.1 && (!above || gain > above.gain)) above = { gain, s:`⭐ ${g.name} ${e.score} (minha média: ${fmtN(avg)})` };
  }
  if (rec) out.push(rec.s); else if (above) out.push(above.s);
  if (out.length < 3){
    const top = a.map(g => [g, streak(d => doneOn(d, g.id)).cur]).filter(([g]) => doneOn(t, g.id)).sort((x, y) => y[1] - x[1])[0];
    if (top && top[1] >= 5 && top[1] > Math.max(sAll, sAny)) out.push(`📈 ${top[1]} dias seguidos de ${top[0].name}`);
  }
  return out.slice(0, 3);
}
function shareText(t, details = true){
  const a = active(), done = a.filter(g => doneOn(t, g.id)).length;
  const sq = a.map(g => ({ done:'🟩', lost:'🟥', neu:'🟦', pend:'⬜' })[stateOf(entry(t, g.id))]).join('');
  const L = [`🎯 Rodada · ${fmtShort(t)} · ${done}/${a.length}`, sq];
  if (details){
    const rows = a.filter(g => doneOn(t, g.id)).map(g => { const e = entry(t, g.id); return `${g.emoji || '🎯'} ${g.name} ${e.score || '✓'}`; });
    if (rows.length) L.push('', ...rows);
  }
  const ins = insights(t);
  if (ins.length) L.push('', ...ins);
  L.push('', done === a.length ? 'Consegue fazer melhor?' : done ? `Consegue bater meu ${done}/${a.length}?` : 'Bora jogar?', pageUrl());
  return L.join('\n');
}
const detailsPref = () => $('shareDetails').checked;
const summaryText = t => shareText(t, detailsPref());
function renderSummary(t){ $('summary').textContent = summaryText(t); }

/* ---------- ações ---------- */
function toggle(d, id){
  const e = entry(d, id);
  if (!e) setEntry(d, id, { ts: Date.now() });
  else if (!e.raw && !e.score || confirm(`Remover o registro de ${fmtBR(d)}?\n${e.score || ''}`)) delEntry(d, id);
  render();
}
function pick(id){ $('opts').open = true; $('gsel').value = id; $('paste').focus(); $('paste').scrollIntoView({behavior:'smooth', block:'center'}); }
let toastT;
function say(t, bad){
  const m = $('msg'); clearTimeout(toastT);
  if (!t){ m.classList.remove('show'); return; }
  m.textContent = t; m.classList.toggle('err', !!bad); m.classList.add('show');
  toastT = setTimeout(() => m.classList.remove('show'), bad ? 6000 : 3500);
}
function onPasteChange(){
  const t = $('paste').value, nb = splitShares(t).length;
  if (nb > 1){ $('detect').textContent = `✓ ${nb} resultados: ${splitShares(t).map(b => S.games.find(x => x.id === detectGame(b))?.name || '?').join(', ')}`; return; }
  const g = detectGame(t);
  if (g && !$('gsel').value) $('gsel').value = g;
  $('detect').textContent = t.trim() ? (g ? `✓ ${S.games.find(x => x.id === g).name}` : 'Jogo não reconhecido: escolha em "Jogo e dia".') : '';
  if (t.trim() && !g) $('opts').open = true;
  $('suggestPaste').hidden = !(t.trim() && !g && !$('fbBtn').hidden);
}
$('suggestPaste').addEventListener('click', () => document.dispatchEvent(new CustomEvent('rodada:suggest', { detail:{ text: $('paste').value } })));
$('paste').addEventListener('input', () => { $('gsel').value = ''; onPasteChange(); });
$('readclip').onclick = async () => {
  try { $('paste').value = await navigator.clipboard.readText(); $('gsel').value = ''; onPasteChange(); say('Texto lido. Confira e clique em Registrar.'); }
  catch(e){ say('O navegador não deixou ler a área de transferência: cole com Ctrl+V / toque longo.', true); }
};
$('clear').onclick = () => { $('paste').value = ''; $('gsel').value = ''; onPasteChange(); say(''); };
$('save').onclick = () => {
  const id = $('gsel').value, d = $('dsel').value || todayKey(), txt = $('paste').value;
  const blocks = txt.trim() ? splitShares(txt) : [];
  if (blocks.length > 1){                                        // vários resultados colados de uma vez
    const ok = [], bad = [];
    for (const b of blocks){
      const gid = detectGame(b);
      if (!gid){ bad.push(b.split('\n')[0].slice(0, 30)); continue; }
      const day = textDate(b) || d, g = S.games.find(x => x.id === gid);
      const parsed = parseShare(b, gid); setEntry(day, gid, { ...parsed, ts: Date.now() });
      ok.push(`${g.name}${parsed.score ? ' (' + parsed.score + ')' : ''}`);
    }
    track('register_result', { jogos:ok.length, modo:'varios' });
    say(`Registrados ${ok.length}: ${ok.join(', ')}${bad.length ? ` · não reconhecidos: ${bad.join(' | ')}` : ''}`, bad.length > 0);
    $('paste').value = ''; $('detect').textContent = ''; $('dsel').value = todayKey(); $('gsel').value = ''; render(); return;
  }
  if (!id){ $('opts').open = true; $('gsel').focus(); return say(txt.trim() ? 'Não reconheci o jogo: escolha em "Jogo e dia".' : 'Cole um resultado ou escolha o jogo.', true); }
  if (d > todayKey()) return say('Dia no futuro não vale.', true);
  const g = S.games.find(x => x.id === id).name;
  if (!txt.trim() && entry(d, id)){                              // marcar de novo não pode apagar a pontuação já guardada
    say(`${g} ${fmtBR(d)} já estava registrado (${entry(d, id).score || 'feito'}). Cole outro texto para substituir.`, true); return;
  }
  const parsed = txt.trim() ? parseShare(txt, id) : {};
  const day = (txt.trim() && textDate(txt)) || d;
  setEntry(day, id, { ...parsed, ts: Date.now() });
  track('register_result', { jogos:1, modo:'um' });
  say(`Registrado: ${g} ${fmtBR(day)}${parsed.score ? ' · ' + parsed.score : txt.trim() ? ' · sem pontuação reconhecida (texto guardado)' : ' · feito'}`);
  $('paste').value = ''; $('detect').textContent = ''; $('dsel').value = todayKey(); $('gsel').value = '';
  render();
};
async function copyText(text){
  try { await navigator.clipboard.writeText(text); say('Copiado! É só colar no grupo.'); return true; }
  catch(e){ showTab('share'); const r = document.createRange(); r.selectNodeContents($('summary')); getSelection().removeAllRanges(); getSelection().addRange(r);
    say('Texto selecionado: copie com Ctrl+C ou toque longo.', true); return false; }
}
async function shareDay(){
  const text = shareText(todayKey(), detailsPref());
  if (navigator.share && matchMedia('(pointer:coarse)').matches){          // celular: menu nativo (WhatsApp, Telegram…)
    try { await navigator.share({ text }); return; } catch(e){ if (e.name === 'AbortError') return; }
  }
  copyText(text);
}
$('shareBtn').onclick = () => { track('share', { onde:'topo' }); shareDay(); };
$('copysum').onclick = () => { track('share', { onde:'aba' }); shareDay(); };
$('copyonly').onclick = () => track('share', { onde:'copiar' }) || copyText(shareText(todayKey(), detailsPref()));
try { $('shareDetails').checked = localStorage.getItem('rodada-details') !== '0'; } catch(e){}
$('shareDetails').onchange = () => { try { localStorage.setItem('rodada-details', $('shareDetails').checked ? '1' : '0'); } catch(e){} renderSummary(todayKey()); };

/* exportar / importar */
$('export').onclick = () => {
  const a = h('a', { href: URL.createObjectURL(new Blob([JSON.stringify(S, null, 1)], {type:'application/json'})), download:`rodada-${todayKey()}.json` });
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
$('import').onchange = async ev => {
  const f = ev.target.files[0]; ev.target.value = ''; if (!f) return;
  try {
    const j = JSON.parse(await f.text());
    if (!j || typeof j.log !== 'object' || !Array.isArray(j.games)) throw new Error('formato');
    if (!confirm('Mesclar o arquivo com os dados deste navegador? (registros do arquivo vencem em caso de conflito)')) return;
    for (const [d, gs] of Object.entries(j.log)) if (/^\d{4}-\d{2}-\d{2}$/.test(d)) for (const [g, e] of Object.entries(gs)) if (e && typeof e === 'object') (S.log[d] ??= {})[g] = e;
    for (const g of j.games) if (g && g.id && g.name && !S.games.some(x => x.id === g.id)) S.games.push({ id:String(g.id), name:String(g.name), emoji:String(g.emoji||''), url:safeUrl(g.url||''), on:g.on !== false });
    save(); render(); say('Importado.');
  } catch(e){ say('Arquivo inválido.', true); }
};

/* gerenciar jogos */
function renderGames(){
  $('glist').replaceChildren(...S.games.map((g, i) => h('div', {class:'grow'},
    h('input', {type:'text', value:g.emoji || '', maxlength:'4', 'aria-label':'emoji', oninput: e => { g.emoji = e.target.value; save(); render(); }}),
    h('input', {type:'text', value:g.name, 'aria-label':'nome', oninput: e => { g.name = e.target.value || g.id; save(); render(); }}),
    h('input', {type:'url', class:'u', value:g.url, placeholder:'https://…', 'aria-label':'link', onchange: e => { g.url = e.target.value.trim() ? safeUrl(e.target.value.trim()) : ''; e.target.value = g.url; save(); render(); }}),
    h('button', {type:'button', class: g.on ? 'on' : '', title:'mostrar/ocultar', onclick: () => { g.on = !g.on; save(); render(); renderGames(); }}, g.on ? 'visível' : 'oculto'),
    h('button', {type:'button', title:'remover (o histórico fica guardado)', onclick: () => { if (confirm(`Remover ${g.name}? O histórico continua guardado.`)){ S.games.splice(i, 1); save(); render(); renderGames(); } }}, '🗑')
  )));
}
$('manage').onclick = () => { renderGames(); $('dlg').showModal(); };
$('addgame').onclick = () => {
  const name = prompt('Nome do jogo:'); if (!name) return;
  let id = slug(name), n = 2; while (S.games.some(g => g.id === id)) id = slug(name) + '-' + n++;
  const url = safeUrl(prompt('Link (opcional, https://…):') || '');
  S.games.push({ id, name, emoji:'🎯', url, on:true }); save(); render(); renderGames();
};
$('resetgames').onclick = () => {
  if (!confirm('Restaurar a lista inicial? Jogos adicionados por você ficam ocultos, não apagados.')) return;
  const keep = S.games.filter(g => !DEFAULT_GAMES.some(d => d.id === g.id)).map(g => ({ ...g, on:false }));
  S.games = [...structuredClone(DEFAULT_GAMES), ...keep]; save(); render(); renderGames();
};

/* seletor de jogos */
function renderChips(){
  $('chips').replaceChildren(...S.games.map(g => h('button', {class:'chip', 'aria-pressed': String(!!g.on), onclick: () => { g.on = !g.on; track('game_toggle', { jogo:g.id, ligado:g.on }); save(); render(); renderChips(); }},
    h('span', {class:'tick'}, '✓'), `${g.emoji || '🎯'} ${g.name}`)));
}
function openPicker(open){
  $('picker').hidden = !open; $('pickBtn').setAttribute('aria-expanded', open); $('pickBtn').textContent = open ? 'Fechar' : 'Escolher jogos';
  if (open) renderChips();
}
$('pickBtn').onclick = () => openPicker($('picker').hidden);
$('pickDone').onclick = () => {
  if (!active().length) return say('Escolha pelo menos um jogo.', true);
  S.picked = true; save(); openPicker(false); say(`${active().length} jogos no seu painel.`);
};
$('pickAll').onclick = () => { S.games.forEach(g => g.on = true); save(); render(); renderChips(); };
$('pickEdit').onclick = () => { renderGames(); $('dlg').showModal(); };
$('dlg').addEventListener('close', () => { if (!$('picker').hidden) renderChips(); });
if (!S.picked){ $('pickTitle').textContent = 'Bem-vindo! Quais jogos você joga?'; openPicker(true); }

/* abas */
function showTab(name){
  for (const b of document.querySelectorAll('[role=tab]')){
    const on = b.dataset.tab === name; b.setAttribute('aria-selected', on); $('tab-' + b.dataset.tab).hidden = !on;
  }
  try { localStorage.setItem('rodada-tab', name); } catch(e){}
}
document.querySelectorAll('[role=tab]').forEach(b => b.onclick = () => showTab(b.dataset.tab));
let tab0 = 'hist'; try { tab0 = localStorage.getItem('rodada-tab') || 'hist'; } catch(e){}
showTab($('tab-' + tab0) ? tab0 : 'hist');

/* virada de dia */
let shown = todayKey();
setInterval(() => { if (todayKey() !== shown){ shown = todayKey(); $('dsel').value = shown; render(); } }, 30000);
save(); render();
// aviso único para quem veio do protótipo (painel-desafios)
if (S.migratedFrom && !S.migrationNoticeSeen){ S.migrationNoticeSeen = true; save(); setTimeout(() => say('Esta página agora é a Rodada. Seu histórico veio junto.'), 700); }

/* extras do produto: banner, sugestões, instalação (PWA), service worker */
initExtras({ say, track });
