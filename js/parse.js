// Lógica pura (sem DOM): lista de jogos, detecção e leitura dos textos de compartilhar. Testada em test/parse.test.js
/* ---------- jogos iniciais (links vêm dos textos de compartilhar reais; edite em "Gerenciar jogos") ---------- */
export const DEFAULT_GAMES = [
  { id:'termo',      name:'Termo',      emoji:'🟩', url:'https://term.ooo',   on:true },
  { id:'dueto',      name:'Dueto',      emoji:'🟨', url:'https://term.ooo/2', on:true },
  { id:'quarteto',   name:'Quarteto',   emoji:'🟦', url:'https://term.ooo/4', on:true },
  { id:'puttday',    name:'Putt.day',   emoji:'⛳', url:'https://putt.day',   on:true },
  { id:'flagle',     name:'Flagle',     emoji:'🚩', url:'https://www.flagle.io/', on:true },
  { id:'decola',     name:'Decola.io',  emoji:'🚀', url:'https://decola.io',  on:true },
  { id:'farflung',   name:'Farflung',   emoji:'🌍', url:'https://farflung.game', on:true },
  { id:'wordle',     name:'Wordle',     emoji:'🔤', url:'https://www.nytimes.com/games/wordle/index.html', on:true },
  { id:'conexo',     name:'Conexo',     emoji:'🔗', url:'https://conexo.ws',                               on:true },
  { id:'worldle',    name:'Worldle',    emoji:'🗺️', url:'https://worldle.teuteuf.fr',                      on:true },
];
// Detecção do jogo pelo texto colado (ordem importa: mais específicos primeiro). Jogos sem regra caem no nome/domínio.
export const DETECT = [
  ['dueto',      /\bdueto\b|\bduo\.|term\.ooo\/2/i],
  ['quarteto',   /quarteto|term\.ooo\/4/i],
  ['termo',      /term\.ooo|\btermo\b/i],
  ['wordle',     /^\s*wordle\b/im],
  ['conexo',     /conexo/i],
  ['connections',/connections/i],
  ['worldle',    /#?worldle/i],
  ['puttday',    /putt\.?day|\bputt\b/i],
  ['decola',     /decola\.io|\bvoo\s*#/i],
  ['flagle',     /flagle|flagly/i],
  ['farflung',   /farflung/i],
];
// Linhas que iniciam um bloco de compartilhar (para colar vários resultados de uma vez). Linhas com URL não contam.
export const HEADERS = [/putt\.day\s*#/i, /decola\.io/i, /#?flagle\b.*#\d/i, /^\W*farflung\s*#/i, /^\s*wordle\s+[\d.,]+/i,
  /^\s*connections\s*$/i, /conexo\.ws|^\W*conexo\b/i, /joguei\s+\S*term/i, /^\s*term\.ooo\/\d/i, /#worldle/i];


/* ---------- utilitários puros ---------- */
export const pad = n => String(n).padStart(2, '0');
export const safeUrl = u => { try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href : ''; } catch(e){ return ''; } };
export const slug = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'jogo';

/* ---------- parser do texto de compartilhar ---------- */
export function detectGame(text, games){
  if (!text.trim()) return null;
  for (const [id, re] of DETECT) if (games.some(g => g.id === id) && re.test(text)) return id;
  for (const g of games){                                    // jogos adicionados: nome ou domínio
    const host = (() => { try { return new URL(g.url).hostname.replace(/^www\./,''); } catch(e){ return ''; } })();
    if (host && text.toLowerCase().includes(host)) return g.id;
    if (g.name.length > 3 && text.toLowerCase().includes(g.name.toLowerCase())) return g.id;
  }
  return null;
}
export function parseShare(text, gameId){
  const out = { raw: text.trim().slice(0, 800) };
  const num = text.match(/#\s?([\d.,]+)/) || text.match(/(?:wordle|puzzle)\s+#?([\d.,]+)/i);
  if (num) out.num = num[1];
  if (gameId === 'conexo'){                                     // "got it in 10 guesses and 4 hints" + ❌ erro · 💡 dica · quadrado = grupo achado
    const g = text.match(/(\d+)\s*(?:guesses|tentativas|palpites|intentos)/i), d = text.match(/(\d+)\s*(?:hints?|dicas?|pistas?)/i);
    const groups = [...text.matchAll(/[🟨🟩🟦🟪🟥🟧🟫]/gu)].length, wrong = [...text.matchAll(/❌/gu)].length;
    if (g || groups){
      const parts = [];
      if (g) parts.push(`${g[1]} tentativas`); else if (groups || wrong) parts.push(`${groups + wrong} tentativas`);
      if (d && +d[1]) parts.push(`${d[1]} dica${+d[1] > 1 ? 's' : ''}`);
      out.score = parts.join(' · '); out.n = Number(g ? g[1] : groups + wrong);
      if (groups) out.win = groups >= 4;
      return out;
    }
  }
  if (gameId === 'connections'){                                // 🟨🟩🟦🟪: linhas de 4 quadradinhos
    const rows = text.split('\n').map(l => [...l.matchAll(/[🟨🟩🟦🟪]/gu)].map(m => m[0])).filter(r => r.length === 4);
    if (rows.length){
      const solved = rows.filter(r => r.every(c => c === r[0])).length, mistakes = rows.length - solved;
      out.win = solved === 4; out.score = out.win ? (mistakes ? `${mistakes} erro(s)` : 'perfeito') : `${solved}/4 grupos`;
      out.n = mistakes; return out;
    }
  }
  if (gameId === 'dueto' || gameId === 'quarteto'){             // "🟥6️⃣" = 1ª palavra errada, 2ª certa em 6 tentativas
    const toks = [...text.matchAll(/🟥|([1-9])\uFE0F?\u20E3/gu)].map(m => m[1] ? Number(m[1]) : null);
    if (toks.length){
      const ok = toks.filter(x => x !== null);
      out.score = `${ok.length}/${toks.length} (${toks.map(x => x === null ? '✗' : x).join(' · ')})`;
      out.win = ok.length === toks.length;
      if (out.win) out.n = ok.reduce((a, b) => a + b, 0) / ok.length;
      return out;
    }
  }
  if (gameId === 'puttday'){                                    // "#198 ⛳ 9/7 Double bogey" = tacadas/par + nome do resultado
    const m = text.match(/(\d+)\s*\/\s*(\d+)[ \t]*([^\n]*)/);
    if (m){ out.score = `${m[1]}/${m[2]} ${m[3].trim()}`.trim(); out.n = Number(m[1]); out.diff = m[1] - m[2]; return out; }
  }
  if (gameId === 'decola'){                                     // "Cheguei a MARTE · 120 pts"
    const m = text.match(/Cheguei\s+a\s+(.+?)\s*[·•|\-]\s*(\d+)\s*pts?/i), p = text.match(/(\d+)\s*pts?\b/i);
    if (m){ out.score = `${m[1].trim()} · ${m[2]} pts`; out.n = Number(m[2]); out.win = true; return out; }
    if (p){ out.score = `${p[1]} pts`; out.n = Number(p[1]); return out; }
  }
  if (gameId === 'farflung'){                                   // "Farflung #53 · 125/500 km"
    const m = text.match(/(\d+)\s*\/\s*(\d+)\s*km/i);
    if (m){ out.score = `${m[1]}/${m[2]} km`; out.n = Number(m[1]); return out; }
  }
  const fr = [...text.matchAll(/\b([1-9]|X)\/(\d{1,2})\b/gi)];     // 4/6, X/6, 5/7 & 4/7 (dueto/quarteto)
  if (fr.length){
    out.score = fr.map(m => `${m[1].toUpperCase()}/${m[2]}`).join(' · ');
    out.win = fr.every(m => m[1].toUpperCase() !== 'X');
    if (out.win) out.n = fr.reduce((a, m) => a + Number(m[1]), 0) / fr.length;
    return out;
  }
  const st = text.match(/(\d+)\s*(?:strokes?|shots?|tacadas?|putts?|tentativas?|tries|attempts?)/i);
  if (st){ out.score = `${st[1]} ${/tacada/i.test(st[0]) ? 'tacadas' : st[0].replace(/^\d+\s*/, '')}`; out.n = Number(st[1]); out.win = true; }
  return out;
}

export function splitShares(text){
  const blocks = []; let cur = [];
  for (const line of text.split('\n')){
    if (!/https?:\/\//i.test(line) && HEADERS.some(re => re.test(line)) && cur.some(l => l.trim())){ blocks.push(cur.join('\n')); cur = []; }
    cur.push(line);
  }
  blocks.push(cur.join('\n'));
  return blocks.map(b => b.trim()).filter(Boolean);
}
export function textDate(t, today){                                           // "(26.11.2026)" no texto do jogo
  let k = null;
  const m = t.match(/\((\d{2})\.(\d{2})\.(\d{4})\)/);
  if (m) k = `${m[3]}-${m[2]}-${m[1]}`;
  else {                                                        // 11/26/2026 (EUA) ou 26/11/2026 (BR): só quando não é ambíguo
    const n = t.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
    if (n){ const a = +n[1], b = +n[2];
      if (a > 12 && b <= 12) k = `${n[3]}-${pad(b)}-${pad(a)}`; else if (b > 12 && a <= 12) k = `${n[3]}-${pad(a)}-${pad(b)}`; }
  }
  return k && k <= today ? k : null;
}

