import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_GAMES, detectGame, parseShare, splitShares, textDate, safeUrl } from '../js/parse.js';

const games = structuredClone(DEFAULT_GAMES);
const det = t => detectGame(t, games);

// Textos reais de compartilhar (colados pelo usuário em 26/11/2026)
const PUTT = `putt.day #198 ⛳ 9/7 Double bogey
🟢🔴🟢🟢🟡🟢🟡🟡🟢
Can you beat 9?
https://putt.day/s/Fn7VDUDJvhm7`;
const DECOLA = `🚀 decola.io · Voo #45
Cheguei a MARTE · 120 pts

🪨💨💫💨💨🌑💨`;
const FLAGLE = `#Flagle #1739 (26.11.2026) X/6
🟥🟥🟥
🟥🟥🟥

https://www.flagle.io/?utm_source=share&utm_medium=native`;
const FARFLUNG = `Farflung #53 · 125/500 km
Miss · Miss · Rare · Uncommon · Miss
https://farflung.game/s/63wwqr?e=53`;
const WORDLE = `Wordle 1,986 2/6

🟩⬛⬛🟨🟨
🟩🟩🟩🟩🟩`;
const TERMO = `joguei term.ooo #1789 4/6 🔥 1

⬛⬛⬛⬛⬛
🟨🟨🟨⬛🟩
🟩🟨🟨⬛🟩
🟩🟩🟩🟩🟩`;
const DUETO = `term.ooo/2 #1738

🟥6️⃣

⬛🟩🟩⬛⬛  ⬛🟨🟨⬛🟨
🟩🟩🟩⬛🟩  ⬛⬛⬛⬛⬛`;
const CONEXO = `I played conexo.ws 11/26/2026 and got it in 10 guesses and 4 hints.

❌🟪❌❌💡💡❌🟧❌❌
💡💡🟩🟦`;

test('detecta cada jogo', () => {
  assert.equal(det(PUTT), 'puttday');
  assert.equal(det(DECOLA), 'decola');
  assert.equal(det(FLAGLE), 'flagle');
  assert.equal(det(FARFLUNG), 'farflung');
  assert.equal(det(WORDLE), 'wordle');
  assert.equal(det(TERMO), 'termo');
  assert.equal(det(DUETO), 'dueto');
  assert.equal(det(CONEXO), 'conexo');
  assert.equal(det('texto qualquer'), null);
  assert.equal(det('   '), null);
});

test('Putt.day: tacadas/par e nome do resultado', () => {
  const r = parseShare(PUTT, 'puttday');
  assert.equal(r.score, '9/7 Double bogey'); assert.equal(r.n, 9); assert.equal(r.num, '198'); assert.equal(r.win, undefined);
});
test('Decola.io: destino e pontos', () => {
  const r = parseShare(DECOLA, 'decola');
  assert.equal(r.score, 'MARTE · 120 pts'); assert.equal(r.n, 120); assert.equal(r.win, true); assert.equal(r.num, '45');
});
test('Flagle: X/6 é derrota', () => {
  const r = parseShare(FLAGLE, 'flagle');
  assert.equal(r.score, 'X/6'); assert.equal(r.win, false); assert.equal(r.num, '1739');
});
test('Farflung: km', () => {
  const r = parseShare(FARFLUNG, 'farflung');
  assert.equal(r.score, '125/500 km'); assert.equal(r.n, 125); assert.equal(r.num, '53');
});
test('Wordle e Termo: fração', () => {
  const w = parseShare(WORDLE, 'wordle'); assert.equal(w.score, '2/6'); assert.equal(w.win, true); assert.equal(w.num, '1,986');
  const t = parseShare(TERMO, 'termo'); assert.equal(t.score, '4/6'); assert.equal(t.n, 4); assert.equal(t.num, '1789');
});
test('Dueto: 🟥 = palavra errada, número = tentativas', () => {
  const r = parseShare(DUETO, 'dueto');
  assert.equal(r.score, '1/2 (✗ · 6)'); assert.equal(r.win, false);
  const ok = parseShare('term.ooo/2 #1739\n\n4️⃣5️⃣', 'dueto');
  assert.equal(ok.score, '2/2 (4 · 5)'); assert.equal(ok.win, true); assert.equal(ok.n, 4.5);
});
test('Conexo: tentativas e dicas', () => {
  const r = parseShare(CONEXO, 'conexo');
  assert.equal(r.score, '10 tentativas · 4 dicas'); assert.equal(r.n, 10); assert.equal(r.win, true);
});

test('vários resultados colados juntos são separados', () => {
  const all = [PUTT, DECOLA, FLAGLE, FARFLUNG].join('\n\n\n');
  const b = splitShares(all);
  assert.equal(b.length, 4);
  assert.deepEqual(b.map(det), ['puttday', 'decola', 'flagle', 'farflung']);
  assert.equal(splitShares([WORDLE, TERMO, DUETO].join('\n\n')).length, 3);
  assert.equal(splitShares('um resultado só').length, 1);
});

test('datas: sem ambiguidade apenas', () => {
  assert.equal(textDate(FLAGLE, '2026-11-26'), '2026-11-26');
  assert.equal(textDate(CONEXO, '2026-11-26'), '2026-11-26');   // 11/26/2026 (EUA)
  assert.equal(textDate('x 26/11/2026', '2026-11-26'), '2026-11-26');
  assert.equal(textDate('x 05/06/2026', '2026-11-26'), null);   // ambígua
  assert.equal(textDate('#Flagle (30.12.2026)', '2026-11-26'), null); // futuro
});

test('safeUrl só aceita http(s)', () => {
  assert.equal(safeUrl('https://putt.day'), 'https://putt.day/');
  assert.equal(safeUrl('javascript:alert(1)'), '');
  assert.equal(safeUrl('nada'), '');
});

test('jogos padrão têm ids únicos e links http(s) válidos', () => {
  assert.equal(new Set(DEFAULT_GAMES.map(g => g.id)).size, DEFAULT_GAMES.length);
  for (const g of DEFAULT_GAMES) assert.ok(g.url === '' || safeUrl(g.url), g.id);
});
