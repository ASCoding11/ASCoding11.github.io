/*
 * Thereabouts: the parts with no page in them. Sets window.TBCore (and module.exports under Node, for check.js).
 *   parseGuess(text, unit)   reads what a player typed: 2500000, 2,500,000, 2.5 million, 40k, 3e6, 1.2 x 10^9
 *                            -> { v: number } or { err: 'a message for the player' }
 *   score(guess, answer)     the miss as a multiple: max(g/a, a/g). 1 is perfect, 2 is double or half
 *   fmtNum(v), fmtFull(v), fmtMult(m)   numbers written so people can read them
 *   calcEval(text, ans)      the calculator: + - × ÷ ^ ( ) sqrt cbrt pi, and the same shorthand as parseGuess
 *   band(a)                  which of four answer sizes a question is (0 under 100 ... 3 a million and up)
 *   daySet(list, i)          the three questions for day number i (0 = the first day), as positions in the list
 * No libraries, nothing from the network.
 */
(function () {
  'use strict';

  // ------------------------------------------------------------------ numbers in words
  var WORDS = [[1e15, 'quadrillion'], [1e12, 'trillion'], [1e9, 'billion'], [1e6, 'million']];
  var MULT = {
    k: 1e3, thousand: 1e3, thousands: 1e3,
    m: 1e6, mil: 1e6, mill: 1e6, mn: 1e6, million: 1e6, millions: 1e6,
    b: 1e9, bn: 1e9, bil: 1e9, billion: 1e9, billions: 1e9,
    t: 1e12, tn: 1e12, tr: 1e12, tril: 1e12, trillion: 1e12, trillions: 1e12,
    q: 1e15, quad: 1e15, quadrillion: 1e15, quadrillions: 1e15,
    hundred: 100
  };
  var WORD1 = { k: 'thousand', m: 'million', b: 'billion', t: 'trillion', q: 'quadrillion' };
  function sig(v, s) { return v === 0 ? 0 : Number(v.toPrecision(s)); }
  function commas(s) { // s: plain digits, maybe with a decimal part
    var neg = s[0] === '-'; if (neg) s = s.slice(1);
    var p = s.split('.'); p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (neg ? '-' : '') + p[0] + (p[1] ? '.' + p[1] : '');
  }
  function digits(v, maxDec) { // no exponent; trailing zeros dropped
    var s = v.toFixed(Math.max(0, Math.min(20, maxDec)));
    if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
    return s;
  }
  function sci(v) { var e = Math.floor(Math.log10(Math.abs(v))), m = sig(v / Math.pow(10, e), 3); if (Math.abs(m) >= 10) { m /= 10; e++; } return m + ' × 10^' + e; }
  // Every digit, with separators: 2,500,000 or 0.69. Very big or very small numbers fall back to 1.2 × 10^24.
  function fmtFull(v) {
    if (!isFinite(v)) return '?';
    var a = Math.abs(v);
    if (a === 0) return '0';
    if (a >= 1e21 || a < 1e-9) return sci(v);
    if (a >= 1e15) return commas(digits(sig(v, 15), 0));
    if (a >= 1) return commas(digits(sig(v, Math.max(6, Math.floor(Math.log10(a)) + 1)), 6));
    return digits(sig(v, 3), 12);
  }
  // The short form people say out loud: 2.5 million, 157,788, 26.7, 0.69.
  function fmtNum(v) {
    if (!isFinite(v)) return '?';
    var a = Math.abs(v);
    if (a >= 1e21) return sci(v);
    if (a >= 1e6) { var r = sig(v, 4); for (var i = 0; i < WORDS.length; i++) if (Math.abs(r) >= WORDS[i][0]) return commas(digits(sig(r / WORDS[i][0], 4), 3)) + ' ' + WORDS[i][1]; }
    return fmtFull(v);
  }
  // A miss: 1.00×, 1.37×, 12.4×, 250×, 3.2 million×.
  function fmtMult(m) {
    if (!isFinite(m)) return '?';
    if (m < 9.995) return m.toFixed(2) + '×';
    if (m < 99.95) return m.toFixed(1) + '×';
    if (m < 1e6) return commas(String(Math.round(sig(m, 3)))) + '×';
    return fmtNum(sig(m, 2)) + '×';
  }
  function score(g, a) { return Math.max(g / a, a / g); }

  // ------------------------------------------------------------------ reading a typed number
  function cleanText(t) {
    return String(t == null ? '' : t).toLowerCase()
      .replace(/[−–—]/g, '-').replace(/[   _']/g, ' ')
      .replace(/^\s*(about|around|roughly|approx\.?|approximately|~|≈|=)\s*/, '').replace(/\s+/g, ' ').trim();
  }
  // "1,234,567" and "1 234 567" -> 1234567; a lone decimal comma is refused (2,5 could mean either)
  function plainNumber(t) {
    t = t.replace(/ /g, '');
    if (/,/.test(t)) {
      if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(t)) t = t.replace(/,/g, '');
      else return { err: 'Use a dot for the decimal point (2.5, not 2,5), and commas only between groups of three digits.' };
    }
    if (!/^(\d+\.?\d*|\.\d+)$/.test(t)) return { err: '' };
    return { v: parseFloat(t) };
  }
  var HELP = 'I couldn\'t read that as a number. Try 2500000, 2,500,000, 2.5 million, 40k or 2.5e6.';
  function parseGuess(text, unit) {
    var t = cleanText(text);
    if (!t) return { err: 'Type a number first.' };
    if (unit) { // a trailing unit is fine: "42 litres"
      var u = String(unit).toLowerCase(), cut = [u, u.replace(/s$/, ''), u + 's'];
      for (var i = 0; i < cut.length; i++) if (cut[i] && t.length > cut[i].length && t.slice(-cut[i].length) === cut[i] && /[\d\s.a-z]$/.test(t.slice(0, -cut[i].length))) {
        var rest = t.slice(0, -cut[i].length).trim(); if (/\d$|illion$|thousand$|hundred$|[kmbtq]$/.test(rest)) { t = rest; break; }
      }
    }
    var neg = false; if (t[0] === '-') { neg = true; t = t.slice(1).trim(); } else if (t[0] === '+') t = t.slice(1).trim();
    var m, v, mul = 1;
    if ((m = /^10 ?\^ ?([+-]?\d+)$/.exec(t))) v = Math.pow(10, +m[1]);
    else {
      m = /^([\d., ]*\d\.?)(?: ?e ?([+-]?\d+))?(?: ?(?:x|×|\*) ?10 ?\^ ?([+-]?\d+))?(?: ?([a-z]+)\.?)?$/.exec(t);
      if (!m) return { err: HELP };
      var p = plainNumber(m[1].trim()); if (p.err != null) return { err: p.err || HELP };
      v = p.v;
      if (m[2]) v *= Math.pow(10, +m[2]);
      if (m[3]) v *= Math.pow(10, +m[3]);
      if (m[4]) { if (!MULT.hasOwnProperty(m[4])) return { err: 'I don\'t know the word "' + m[4] + '". You can use thousand, million, billion or trillion (or k, m, bn).' }; mul = MULT[m[4]];
        // "5 m" where the unit is metres, "500 t" where it is tonnes: ask, rather than guess which was meant
        if (m[4].length === 1 && unit && String(unit).toLowerCase()[0] === m[4] && !(m[4] === 'k' && /\dk$/.test(t))) return { err: 'Is that "' + m[4] + '" short for ' + WORD1[m[4]] + ', or for ' + unit + '? Type the word ' + WORD1[m[4]] + ' in full, or leave the unit off.' };
      }
      v *= mul;
    }
    if (!isFinite(v) || isNaN(v)) return { err: 'That number is too big for this game to score. Try something smaller.' };
    if (neg && v !== 0) return { err: 'A guess can\'t be negative: every answer here is a count or a size, so it is more than zero.' };
    if (v === 0) return { err: 'A guess can\'t be zero. The score is how many times too big or too small you were, and nothing is zero times anything. Try your smallest sensible number.' };
    if (v > 1e60 || v < 1e-30) return { err: 'That is outside anything this game asks about. Check the number of zeros.' };
    return { v: v };
  }

  // ------------------------------------------------------------------ the calculator
  // expr = term (+|- term)* ; term = unary (×|÷ unary)* ; unary = -unary | power ; power = atom (^ unary)?
  // atom = number [word] | ( expr ) | pi | ans | sqrt(expr) | cbrt(expr) | √atom
  function calcEval(text, ans) {
    var s = String(text == null ? '' : text).toLowerCase().replace(/[−–—]/g, '-').replace(/[×x*·]/g, '*').replace(/[÷:]/g, '/').replace(/π/g, ' pi ').replace(/[   _]/g, ' ');
    var i = 0;
    function ws() { while (s[i] === ' ') i++; }
    function fail(m) { throw new Error(m || 'I can\'t work that out. Check the brackets and signs.'); }
    function number() {
      var m = /^(\d[\d,]*\.?\d*|\.\d+)(e[+-]?\d+)?/.exec(s.slice(i)); if (!m) fail();
      var raw = m[1];
      if (/,/.test(raw)) { if (!/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(raw)) fail('Use a dot for decimals, and commas only between groups of three digits.'); raw = raw.replace(/,/g, ''); }
      i += m[0].length; var v = parseFloat(raw + (m[2] || ''));
      var j = i; while (s[j] === ' ') j++;
      var w = /^[a-z]+/.exec(s.slice(j));
      if (w && MULT.hasOwnProperty(w[0]) && w[0].length > 1) { v *= MULT[w[0]]; i = j + w[0].length; }
      else if (w && w[0] === 'k') { v *= 1e3; i = j + 1; }
      return v;
    }
    function atom() {
      ws(); var c = s[i];
      if (c === '(') { i++; var v = expr(); ws(); if (s[i] !== ')') fail('A bracket is missing its partner.'); i++; return v; }
      if (c === '√') { i++; return root(atom(), 2); }
      var w = /^[a-z]+/.exec(s.slice(i));
      if (w) {
        var name = w[0];
        if (name === 'pi') { i += 2; return Math.PI; }
        if (name === 'ans') { i += 3; if (ans == null) fail('There is no earlier answer yet.'); return ans; }
        if (name === 'sqrt' || name === 'cbrt') { i += 4; ws(); if (s[i] !== '(') fail('Put brackets after ' + name + ', like ' + name + '(16).'); return root(atom(), name === 'sqrt' ? 2 : 3); }
        fail('I don\'t know "' + name + '".');
      }
      if (c == null) fail('Something is missing at the end.');
      return number();
    }
    function root(v, k) { if (v < 0 && k === 2) fail('You can\'t take the square root of a negative number.'); return k === 2 ? Math.sqrt(v) : Math.cbrt(v); }
    function power() { var b = atom(); ws(); if (s[i] === '^') { i++; var e = unary(); return Math.pow(b, e); } return b; }
    function unary() { ws(); if (s[i] === '-') { i++; return -unary(); } if (s[i] === '+') { i++; return unary(); } return power(); }
    function term() {
      var v = unary();
      for (;;) { ws(); var c = s[i]; if (c === '*') { i++; v *= unary(); } else if (c === '/') { i++; var d = unary(); if (d === 0) fail('You can\'t divide by zero.'); v /= d; } else if (c === '(') { v *= atom(); } else return v; }
    }
    function expr() { var v = term(); for (;;) { ws(); var c = s[i]; if (c === '+') { i++; v += term(); } else if (c === '-') { i++; v -= term(); } else return v; } }
    if (!s.trim()) fail('Type a sum first.');
    var out = expr(); ws();
    if (i < s.length) fail(s[i] === ')' ? 'A bracket is missing its partner.' : undefined);
    if (!isFinite(out) || isNaN(out)) fail('That comes out too big to show.');
    return out;
  }
  // a result as text that can be typed straight back in: no separators, up to 12 significant figures
  function plainResult(v) {
    var a = Math.abs(v);
    if (a !== 0 && (a >= 1e21 || a < 1e-9)) return v.toExponential(6).replace(/\.?0+e/, 'e').replace('e+', 'e');
    var t = String(sig(v, 12));
    return /e/.test(t) ? digits(sig(v, 12), 12) : t;
  }

  // ------------------------------------------------------------------ the day's three questions
  var CUTS = [100, 1e4, 1e6], BANDS = ['under 100', 'hundreds and thousands', 'ten thousand to a million', 'a million and up'];
  function band(a) { var b = 0; while (b < 3 && a >= CUTS[b]) b++; return b; }
  function hash(s) { var x = 2166136261 >>> 0; for (var i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; }
  function rng(seed) { var a = hash(String(seed)); return function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function shuffle(a, r) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  var cache = { key: '', cycles: {} };
  // One time through the list: every question used once, three a day. Each day's three come from different
  // categories and different answer sizes wherever the questions left allow it, and never three hard ones together.
  function cycle(list, c) {
    var key = list.length + ':' + (list[0] ? list[0].id : '') + ':' + (list.length ? list[list.length - 1].id : '');
    if (cache.key !== key) cache = { key: key, cycles: {} };
    if (cache.cycles[c]) return cache.cycles[c];
    var N = list.length, D = Math.floor(N / 3), order = [], i;
    for (i = 0; i < N; i++) order.push(i);
    order = shuffle(order, rng('thereabouts-cycle-' + c));
    if (c > 0) { // the questions from the last three days of the round before go to the back, so none comes round again within days
      var prev = cycle(list, c - 1), late = {};
      prev.slice(-3).forEach(function (d) { d.forEach(function (q) { late[q] = 1; }); });
      order = order.filter(function (q) { return !late[q]; }).concat(order.filter(function (q) { return late[q]; }));
    }
    var used = {}, remCat = {}, days = [];
    list.forEach(function (q) { remCat[q.c] = (remCat[q.c] || 0) + 1; });
    function pick(chosen) {
      var best = -1, bestKey = null;
      for (var k = 0; k < order.length; k++) {
        var qi = order[k]; if (used[qi]) continue;
        var q = list[qi], sameCat = 0, sameBand = 0, hard = q.d === 3 ? 1 : 0;
        for (var j = 0; j < chosen.length; j++) { var o = list[chosen[j]]; if (o.c === q.c) sameCat = 1; if (band(o.a) === band(q.a)) sameBand = 1; if (o.d !== 3) hard = 0; }
        var allHard = chosen.length === 2 && hard ? 1 : 0;
        var kk = [sameCat, sameBand, allHard, -remCat[q.c]];
        var better = bestKey == null;
        if (!better) for (var z = 0; z < 4; z++) { if (kk[z] < bestKey[z]) { better = true; break; } if (kk[z] > bestKey[z]) break; }
        if (better) { best = qi; bestKey = kk; }
      }
      used[best] = 1; remCat[list[best].c]--; return best;
    }
    for (var d = 0; d < D; d++) { var three = []; three.push(pick(three)); three.push(pick(three)); three.push(pick(three)); days.push(three); }
    // The last few days get whatever is left, so mend any day that breaks a rule by swapping one of its
    // questions with one from another day, when that leaves both days following the rules.
    function fine(t) {
      var a = list[t[0]], b = list[t[1]], e = list[t[2]];
      return a.c !== b.c && a.c !== e.c && b.c !== e.c && band(a.a) !== band(b.a) && band(a.a) !== band(e.a) && band(b.a) !== band(e.a) && !(a.d === 3 && b.d === 3 && e.d === 3);
    }
    for (var b = 0; b < D; b++) {
      if (fine(days[b])) continue;
      mend: for (var p = 0; p < 3; p++) for (var o = 0; o < D; o++) {
        if (o === b || (c > 0 && o < 3)) continue; // leave the first three days of a later round alone (see above)
        for (var q = 0; q < 3; q++) {
          var x = days[b][p], y = days[o][q]; days[b][p] = y; days[o][q] = x;
          if (fine(days[b]) && fine(days[o])) break mend;
          days[b][p] = x; days[o][q] = y;
        }
      }
    }
    days = days.map(function (t) { return t.map(function (q, n) { return [list[q].d, n, q]; }).sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; }).map(function (x) { return x[2]; }); });
    return (cache.cycles[c] = days);
  }
  // i: days since the first day (0 = day #1). Days before the first day wrap round, so previews always have a set.
  function daySet(list, i) {
    var D = Math.floor(list.length / 3); if (D < 1) return [];
    if (i < 0) i = ((i % D) + D) % D;
    var c = Math.floor(i / D);
    return cycle(list, c)[i - c * D].slice();
  }

  var api = { parseGuess: parseGuess, score: score, fmtNum: fmtNum, fmtFull: fmtFull, fmtMult: fmtMult, calcEval: calcEval, plainResult: plainResult, band: band, BANDS: BANDS, daySet: daySet, cycle: cycle };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else window.TBCore = api;
})();
