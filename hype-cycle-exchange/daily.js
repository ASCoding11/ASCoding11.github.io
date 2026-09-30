/* Hype Cycle Exchange: Daily Challenge (single player).
   Every day a new market is generated from the date, so everyone gets the same puzzle.
   Five rounds: read the briefing (rumors are usually right, not always), trade, then see what happened.
   Progress and stats are saved in this browser only. */
(function(){
  "use strict";
  const H = window.HCE;
  if (!H) return;
  const $ = id => document.getElementById(id);
  const {money} = H;
  const pct = v => (Math.abs(v) < .0005 ? "0.0%" : H.pct(v));
  const ROUNDS = 5, START_CASH = 10000, LAUNCH = "2026-09-29";
  const store = {
    get(k){ try { return JSON.parse(localStorage.getItem(k)); } catch (e){ return null; } },
    set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch (e){} }
  };

  /* ---------- seeded randomness ---------- */
  function hashStr(s){ let h = 1779033703 ^ s.length; for (let i = 0; i < s.length; i++){ h = Math.imul(h ^ s.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); } return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return (h ^= h >>> 16) >>> 0; }; }
  function mulberry(a){ return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const makeRng = seed => mulberry(hashStr(String(seed))());
  const pick = (r, a) => a[Math.floor(r() * a.length)];
  const shuffle = (r, a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--){ const j = Math.floor(r() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const normal = r => Math.sqrt(-2 * Math.log(r() || 1e-9)) * Math.cos(2 * Math.PI * r());
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const r2 = v => Math.round(v * 100) / 100;

  /* ---------- the universe ---------- */
  const SECTOR = {tech: "Tech", semis: "Chip", oil: "Oil", clean: "Clean-energy", banks: "Bank", retail: "Retail", luxury: "Luxury", health: "Health-care",
    housing: "Housing", travel: "Travel", utilities: "Utility", food: "Food", farm: "Farm", autos: "Car", ev: "Electric-car", media: "Media", defense: "Defense",
    crypto: "Crypto", gold: "Gold", shipping: "Shipping"};
  const COMPANIES = [
    {t: "NOVA", name: "Nova Robotics", s: ["tech"], beta: 1.3, vol: .10, px: [40, 90], blurb: "Warehouse and factory robots"},
    {t: "CHIP", name: "Siliconia Chips", s: ["semis", "tech"], beta: 1.4, vol: .12, px: [60, 140], blurb: "Designs computer chips for AI and phones"},
    {t: "PIXL", name: "Pixelforge Games", s: ["tech", "media"], beta: 1.2, vol: .12, px: [20, 60], blurb: "Video games and a gaming subscription"},
    {t: "CLDN", name: "CloudNine Software", s: ["tech"], beta: 1.2, vol: .09, px: [80, 200], blurb: "Business software sold by subscription"},
    {t: "DRIL", name: "Deepwell Oil", s: ["oil"], beta: .9, vol: .08, px: [30, 70], blurb: "Drills for oil and natural gas"},
    {t: "SUNR", name: "Sunrise Solar", s: ["clean"], beta: 1.3, vol: .14, px: [10, 35], blurb: "Solar panels and home batteries"},
    {t: "BANK", name: "Granite Trust Bank", s: ["banks"], beta: 1.0, vol: .07, px: [30, 60], blurb: "A big, old-fashioned national bank"},
    {t: "LOAN", name: "QuickCash Lending", s: ["banks"], beta: 1.5, vol: .14, px: [8, 25], blurb: "Fast, risky loans through an app", risky: true},
    {t: "MART", name: "Everyday Mart", s: ["retail"], beta: .7, vol: .05, px: [50, 110], blurb: "Discount superstores in every town"},
    {t: "LUXE", name: "Maison Luxe", s: ["luxury", "retail"], beta: 1.2, vol: .08, px: [150, 400], blurb: "Designer handbags and watches"},
    {t: "CURE", name: "Helix Therapeutics", s: ["health"], beta: .8, vol: .18, px: [15, 50], blurb: "Biotech testing a new cancer drug"},
    {t: "PILL", name: "SteadyCare Pharma", s: ["health"], beta: .6, vol: .05, px: [40, 90], blurb: "Everyday medicines and vaccines"},
    {t: "HOME", name: "Hearthstone Homes", s: ["housing"], beta: 1.3, vol: .09, px: [25, 70], blurb: "Builds new houses in the suburbs"},
    {t: "JETS", name: "SkyHop Airlines", s: ["travel"], beta: 1.4, vol: .11, px: [10, 40], blurb: "A budget airline", risky: true},
    {t: "CRUZ", name: "Starboard Cruises", s: ["travel"], beta: 1.5, vol: .12, px: [8, 30], blurb: "Cruise ships in the Caribbean", risky: true},
    {t: "POWR", name: "Evergrid Utilities", s: ["utilities"], beta: .4, vol: .03, px: [40, 80], blurb: "Electricity for 10 million homes"},
    {t: "SNAK", name: "Crunchtime Foods", s: ["food"], beta: .5, vol: .04, px: [30, 70], blurb: "Chips, cereal and snacks"},
    {t: "FARM", name: "GreenAcre Farms", s: ["farm", "food"], beta: .7, vol: .08, px: [20, 50], blurb: "Grows corn, wheat and soybeans"},
    {t: "AUTO", name: "Torque Motors", s: ["autos"], beta: 1.1, vol: .08, px: [20, 50], blurb: "Pickup trucks and SUVs"},
    {t: "SPRK", name: "Spark EV", s: ["ev", "autos", "clean"], beta: 1.8, vol: .18, px: [15, 60], blurb: "A young electric-car maker", risky: true},
    {t: "STRM", name: "StreamBox Media", s: ["media"], beta: 1.1, vol: .10, px: [40, 120], blurb: "Movies and shows by subscription"},
    {t: "SHLD", name: "Aegis Defense", s: ["defense"], beta: .6, vol: .06, px: [100, 250], blurb: "Fighter jets and missiles"},
    {t: "COIN", name: "BlockVault", s: ["crypto"], beta: 2.0, vol: .22, px: [5, 30], blurb: "A crypto exchange and wallet app", risky: true},
    {t: "GOLD", name: "Summit Gold Mining", s: ["gold"], beta: .3, vol: .08, px: [15, 45], blurb: "Gold mines in Nevada and Canada"},
    {t: "SHIP", name: "Tidewater Shipping", s: ["shipping"], beta: 1.1, vol: .10, px: [15, 45], blurb: "Container ships between Asia and the U.S."}
  ];
  const EVENTS = [
    {id: "hike", short: "interest-rate hike", head: "The Fed raises interest rates sharply to fight inflation.", rumor: "Prices are rising fast. Traders expect the Fed to raise interest rates.", m: -.05,
      s: {tech: -.07, semis: -.05, housing: -.12, banks: .06, utilities: -.05, crypto: -.15, ev: -.08, clean: -.06, gold: -.04}},
    {id: "cut", short: "interest-rate cut", head: "The Fed cuts interest rates to boost the economy.", rumor: "The economy is slowing. Traders expect the Fed to cut interest rates.", m: .06,
      s: {tech: .08, housing: .12, banks: -.03, crypto: .15, ev: .08, clean: .06, utilities: .04, gold: .04}},
    {id: "oilup", short: "oil spike", head: "War in the Middle East sends oil prices soaring.", rumor: "Tensions are rising in the Middle East, where much of the world's oil comes from.", m: -.03,
      s: {oil: .22, travel: -.18, autos: -.06, shipping: -.08, defense: .10, gold: .08, clean: .08}},
    {id: "oildown", short: "oil crash", head: "An oil price war breaks out and gas gets cheap.", rumor: "Oil-producing countries are fighting over how much oil to pump.", m: .02,
      s: {oil: -.22, travel: .14, autos: .05, shipping: .06, clean: -.06}},
    {id: "recession", short: "recession", head: "The economy slips into a recession.", rumor: "Factories are slowing down and layoffs are rising.", m: -.12,
      s: {retail: -.06, luxury: -.15, travel: -.14, banks: -.10, housing: -.10, utilities: .08, food: .07, health: .05, gold: .12, crypto: -.10}},
    {id: "boom", short: "jobs boom", head: "A blowout jobs report: the economy is booming.", rumor: "Businesses are hiring like crazy.", m: .09,
      s: {luxury: .12, travel: .10, retail: .06, banks: .07, housing: .06, utilities: -.03, gold: -.06}},
    {id: "ai", short: "AI craze", head: "AI mania sweeps Wall Street.", rumor: "A powerful new AI model has everyone talking.", m: .05,
      s: {tech: .16, semis: .25, utilities: .06, media: -.03}},
    {id: "chips", short: "chip shortage", head: "A chip shortage hits factories worldwide.", rumor: "Chip factories in Asia are struggling to keep up with orders.", m: -.02,
      s: {semis: .12, autos: -.14, ev: -.12, tech: -.05}},
    {id: "virus", short: "pandemic", head: "A new virus spreads and cities lock down.", rumor: "Doctors are tracking a fast-spreading new virus overseas.", m: -.14,
      s: {travel: -.35, retail: -.05, luxury: -.10, media: .18, tech: .06, health: .14, food: .06, oil: -.12, gold: .08}},
    {id: "homes", short: "housing boom", head: "Mortgage rates fall and home sales hit a record.", rumor: "Home buyers are lining up at open houses.", m: .03,
      s: {housing: .18, banks: .05, retail: .03}},
    {id: "bankrun", short: "bank panic", head: "A big bank collapses and depositors panic.", rumor: "Some banks are said to be sitting on big hidden losses.", m: -.06,
      s: {banks: -.20, gold: .12, crypto: .12, housing: -.06}},
    {id: "cryptobust", short: "crypto crash", head: "A giant crypto exchange goes bankrupt.", rumor: "Customers say they can't withdraw money from a big crypto exchange.", m: -.01,
      s: {crypto: -.40, banks: -.02}},
    {id: "cryptoboom", short: "crypto rally", head: "The government approves crypto funds and Bitcoin hits a record.", rumor: "Regulators are said to be warming up to crypto.", m: .02,
      s: {crypto: .40, banks: .03}},
    {id: "drought", short: "drought", head: "A historic drought destroys crops and food prices jump.", rumor: "Farmers are worried about a very dry summer.", m: -.01,
      s: {farm: .14, food: -.10, utilities: .04}},
    {id: "tariffs", short: "trade war", head: "Surprise tariffs spark a trade war.", rumor: "The President is threatening big taxes on imports.", m: -.05,
      s: {retail: -.10, autos: -.10, semis: -.12, shipping: -.14, farm: -.10, defense: .03, ev: -.08}},
    {id: "deal", short: "trade deal", head: "A huge trade deal is signed.", rumor: "Trade talks are going better than expected.", m: .05,
      s: {shipping: .14, semis: .08, farm: .10, retail: .05, autos: .05}},
    {id: "defense", short: "defense budget", head: "Congress passes a record defense budget.", rumor: "Lawmakers are arguing about military spending.", m: .01,
      s: {defense: .18, tech: .03}},
    {id: "climate", short: "climate law", head: "A new climate law pays for solar power and electric cars.", rumor: "Congress is debating a big climate bill.", m: .02,
      s: {clean: .22, ev: .18, utilities: .06, oil: -.10, autos: -.03}},
    {id: "subs", short: "subscription cutbacks", head: "Families cancel streaming and gaming subscriptions to save money.", rumor: "Surveys say families are cutting back on subscriptions.", m: -.01,
      s: {media: -.16, tech: -.03}},
    {id: "bigtech", short: "Big Tech crackdown", head: "Congress cracks down on Big Tech.", rumor: "Lawmakers are holding angry hearings about tech companies.", m: -.02,
      s: {tech: -.12, media: -.08, semis: -.04}},
    {id: "drugs", short: "drug-price law", head: "A new law caps prescription drug prices.", rumor: "Politicians are promising to lower drug prices.", m: 0,
      s: {health: -.12}},
    {id: "heat", short: "heat wave", head: "A record heat wave strains the power grid.", rumor: "Forecasters are warning about an extremely hot summer.", m: 0,
      s: {utilities: .08, oil: .05, farm: -.06, food: -.03}},
    {id: "travel", short: "travel boom", head: "Record summer travel: planes and ships are packed.", rumor: "Airlines say bookings are through the roof.", m: .02,
      s: {travel: .18, oil: .04, luxury: .05}},
    {id: "calm", short: "calm year", head: "A calm stretch: steady growth and low inflation.", rumor: "Economists expect a quiet, steady few months.", m: .05, s: {}}
  ];
  const GOOD = [["{n} lands a huge new contract.", .18], ["{n}'s new product is a surprise hit.", .22], ["{n} crushes its earnings forecast.", .15],
    ["A famous investor buys a big stake in {n}.", .12], ["{n} agrees to be bought by a bigger rival at a big premium.", .35], ["{n} wins a key patent lawsuit.", .10]];
  const BAD = [["{n}'s CEO resigns after a scandal.", -.18], ["{n} recalls its best-selling product.", -.20], ["{n} badly misses its earnings forecast.", -.15],
    ["Regulators fine {n} billions of dollars.", -.12], ["Hackers steal {n}'s customer data.", -.14], ["A short seller accuses {n} of cooking its books.", -.25]];
  const RUMOR_GOOD = ["Whispers on Wall Street: {n} is about to announce big news.", "Analysts hear {n}'s sales are much stronger than expected.", "Insiders have been quietly buying {n} stock."];
  const RUMOR_BAD = ["Rumor: trouble is brewing inside {n}.", "Insiders have been quietly selling {n} stock.", "Employees at {n} are said to be updating their résumés."];
  const fill = (s, n) => s.replace(/\{n\}/g, n);
  const sectorEff = (ev, c) => c.s.reduce((a, k) => a + (ev.s[k] || 0), 0);

  function generate(seed){
    const r = makeRng(seed);
    // five companies from different industries
    const chosen = [], used = new Set();
    for (const c of shuffle(r, COMPANIES)){ if (chosen.length >= 5) break; if (used.has(c.s[0])) continue; used.add(c.s[0]); chosen.push(c); }
    const secs = [{t: "MKT", name: "Daily 500 Index", s: [], beta: 1, vol: .01, sector: "Index fund · the whole market", blurb: "Owns a slice of 500 companies. Moves with the overall market.", start: 100}]
      .concat(chosen.map(c => ({t: c.t, name: c.name, s: c.s, beta: c.beta, vol: c.vol, risky: !!c.risky, blurb: c.blurb,
        sector: c.s.map(k => SECTOR[k]).join(" · "), start: Math.round(c.px[0] + r() * (c.px[1] - c.px[0]))})));
    const events = shuffle(r, EVENTS).slice(0, ROUNDS);
    const dead = new Set(), rounds = [];
    events.forEach((ev, i) => {
      const m = ev.m + .012 + normal(r) * .02; // markets drift up a little over time
      const newsFor = shuffle(r, chosen.map(c => c.t)).slice(0, 2);
      const moves = {}, stories = {}, kind = {};
      for (const s of secs){
        if (dead.has(s.t)){ moves[s.t] = 0; stories[s.t] = s.name + " is bankrupt. Its shares are worthless."; kind[s.t] = "dead"; continue; }
        if (s.t === "MKT"){
          const avg = chosen.reduce((a, c) => a + sectorEff(ev, c), 0) / chosen.length;
          moves.MKT = clamp(m + avg * .3 + normal(r) * .01, -.3, .3);
          stories.MKT = (moves.MKT >= 0 ? "The overall market rose" : "The overall market fell") + " after the " + ev.short + ".";
          kind.MKT = "market"; continue;
        }
        const eff = sectorEff(ev, s);
        let idio = 0, story = null;
        if (s.risky && i >= 2 && r() < .035){ moves[s.t] = -1; stories[s.t] = fill("{n} runs out of cash and files for bankruptcy. Its shares are wiped out.", s.name); kind[s.t] = "bankrupt"; dead.add(s.t); continue; }
        if (newsFor.includes(s.t)){ const [txt, mag] = r() < .5 ? pick(r, GOOD) : pick(r, BAD); idio = mag * (.8 + r() * .4); story = fill(txt, s.name); kind[s.t] = mag > 0 ? "good" : "bad"; }
        moves[s.t] = clamp(s.beta * m + eff + idio + normal(r) * s.vol * .5, -.7, 1.0);
        if (!story){
          const main = s.s.find(k => Math.abs(ev.s[k] || 0) >= .05);
          const mv = s.beta * m + eff;
          story = main ? SECTOR[main] + " stocks " + ((ev.s[main] || 0) > 0 ? "jumped" : "slid") + " on the " + ev.short + " news."
            : "No big company news, so " + s.name + (Math.abs(mv) < .02 ? " barely moved." : mv > 0 ? " rose along with the market." : " fell along with the market.");
          kind[s.t] = "sector";
        }
        stories[s.t] = story;
      }
      // briefing: rumors are right about 70% of the time
      const macroTrue = r() < .7;
      const macroRumor = macroTrue ? ev.rumor : pick(r, EVENTS.filter(e => e.id !== ev.id && e.id !== "calm")).rumor;
      const alive = chosen.filter(c => !dead.has(c.t) || moves[c.t] === -1);
      const target = pick(r, alive.length ? alive : chosen);
      const dir = moves[target.t] >= (moves.MKT || 0) ? 1 : -1;
      const coTrue = r() < .65;
      const coRumor = fill(pick(r, (coTrue ? dir : -dir) > 0 ? RUMOR_GOOD : RUMOR_BAD), target.name);
      rounds.push({event: ev, moves, stories, kind, macroRumor, coRumor, rumorT: target.t, macroTrue, coTrue});
    });
    return {secs, rounds};
  }

  /* ---------- dates ---------- */
  const ymd = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const today = () => ymd(new Date());
  const dayNum = key => { const [a, b, c] = key.split("-").map(Number), [x, y, z] = LAUNCH.split("-").map(Number); return Math.round((Date.UTC(a, b - 1, c) - Date.UTC(x, y - 1, z)) / 864e5) + 1; };
  function untilMidnight(){ const n = new Date(), m = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1); const s = Math.max(0, Math.floor((m - n) / 1000)); return String(Math.floor(s / 3600)).padStart(2, "0") + ":" + String(Math.floor(s / 60) % 60).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0"); }

  /* ---------- state ---------- */
  let S = null, G = null, open = false;
  const key = d => "hce.daily." + d;
  function fresh(date, practice){
    const seed = practice ? "practice-" + Date.now() + "-" + Math.random() : "daily-" + date;
    return {v: 1, date, practice: !!practice, seed, round: 0, phase: "trade", cash: START_CASH, pos: {}, trades: 0, history: [{you: START_CASH, mkt: 100}], roundRet: []};
  }
  const save = () => { if (S && !S.practice) store.set(key(S.date), S); };
  function after(k){ // prices after k rounds have been revealed
    const p = {};
    for (const s of G.secs){ let v = s.start; for (let i = 0; i < k; i++){ const mv = G.rounds[i].moves[s.t]; v = mv <= -1 ? 0 : r2(v * (1 + mv)); } p[s.t] = v; }
    return p;
  }
  const revealedCount = () => S.round + (S.phase === "trade" ? 0 : 1);
  const prices = () => after(revealedCount());
  const prevPrices = () => after(Math.max(0, revealedCount() - 1));
  const value = p => G.secs.reduce((a, s) => a + (S.pos[s.t] || 0) * p[s.t], S.cash);
  const shortEx = p => G.secs.reduce((a, s) => a + Math.max(0, -(S.pos[s.t] || 0)) * p[s.t], 0);

  /* ---------- UI shell ---------- */
  function build(){
    const v = $("dailyView"); v.textContent = "";
    v.innerHTML =
      '<div class="d-top"><button type="button" class="link" id="dBack">← All game modes</button><span class="label" id="dDate"></span></div>' +
      '<div class="tape" aria-label="Prices"><div class="tape-row" id="dTape"></div></div>' +
      '<div class="d-steps" id="dSteps" aria-label="Rounds"></div>' +
      '<section class="panel brief" id="dBrief" aria-label="Briefing"><div class="panel-head"><h2 id="dBriefTitle"></h2><span class="label">Rumors are right most of the time, not always</span></div><ul class="d-rumors" id="dRumors"></ul><div class="d-actions"><button type="button" class="primary" id="dGo">Lock in trades · see what happens →</button></div></section>' +
      '<section class="panel d-result" id="dResult" hidden aria-label="What happened"><div class="panel-head"><h2 id="dResTitle"></h2><span class="label" id="dResYou"></span></div><p class="d-head" id="dHead"></p><p class="d-truth" id="dTruth"></p><ul class="moves" id="dMoves"></ul><div class="d-actions"><button type="button" class="primary" id="dNext"></button></div></section>' +
      '<section class="panel d-final" id="dFinal" hidden aria-label="Final results"></section>' +
      '<div class="grid" id="dPlay">' +
        '<section class="panel" aria-label="Market"><div class="panel-head"><h2>Market</h2><label class="label" for="dQty">Shares per trade <input type="number" id="dQty" min="1" step="1" value="10"></label></div><div class="market" id="dMarket"></div><div class="msg" id="dMsg" role="status"></div><div class="d-actions" id="dGoWrap"><button type="button" class="primary" id="dGo2">Lock in trades · see what happens →</button></div></section>' +
        '<div class="col"><section class="panel" aria-label="Your portfolio"><div class="panel-head"><h2>Your portfolio</h2><span class="label" id="dMode"></span></div>' +
          '<div class="stats"><div class="stat big"><div class="label">Portfolio value</div><div class="v" id="dValue"></div></div><div class="stat"><div class="label">Your return</div><div class="v" id="dRet"></div></div><div class="stat"><div class="label">The market</div><div class="v" id="dMkt"></div></div><div class="stat"><div class="label">Cash</div><div class="v" id="dCash"></div></div><div class="stat"><div class="label">Trades</div><div class="v" id="dTrades"></div></div></div>' +
          '<div style="overflow-x:auto"><table class="holdings"><thead><tr><th>Stock</th><th>Shares</th><th>Value</th></tr></thead><tbody id="dHold"></tbody></table></div></section>' +
        '<section class="panel" aria-label="How it works"><div class="panel-head"><h2>How the daily works</h2></div><ul class="rules"><li>Everyone gets the same market today. A new one arrives at midnight.</li><li>Five rounds. Before each one, read the briefing, then buy what you think will rise and short what you think will fall.</li><li>Rumors are right about two times out of three. Think about which industries the news would help or hurt.</li><li>Beat the <b>Daily 500 Index</b> to win the day. No taxes in the daily.</li></ul></section></div>' +
      '</div>';
    $("dBack").addEventListener("click", close);
    $("dGo").addEventListener("click", lockIn);
    $("dGo2").addEventListener("click", lockIn);
    $("dNext").addEventListener("click", next);
    $("dQty").addEventListener("input", render);
    const m = $("dMarket");
    G.secs.forEach((s, i) => {
      const tt = document.createElement("div"); tt.className = "t"; tt.id = "dt-" + s.t;
      tt.innerHTML = '<b></b><span class="p"></span><span class="chg flat"></span>'; tt.querySelector("b").textContent = s.t; $("dTape").appendChild(tt);
      const row = document.createElement("div"); row.className = "mrow"; row.id = "dr-" + s.t;
      row.innerHTML = '<div class="co"><b></b><span class="nm"></span><span class="sector"></span></div><div class="px"><div class="pv"></div><span class="chg flat"></span></div><div class="pos"></div>' +
        '<div class="act"><button class="buy" type="button">Buy</button><button class="sell" type="button">Sell / short</button><div class="hint"></div></div>';
      row.querySelector(".co b").textContent = s.t;
      row.querySelector(".nm").textContent = s.name;
      row.querySelector(".sector").textContent = s.sector + " · " + s.blurb;
      row.style.setProperty("--dot", "var(--c" + (i + 1) + ")");
      row.querySelector(".buy").addEventListener("click", ev => trade(s.t, 1, ev.currentTarget));
      row.querySelector(".sell").addEventListener("click", ev => trade(s.t, -1, ev.currentTarget));
      m.appendChild(row);
    });
    for (let i = 0; i < ROUNDS; i++){ const d = document.createElement("span"); d.className = "d-step"; d.id = "ds-" + i; d.textContent = i + 1; $("dSteps").appendChild(d); }
  }

  function setChg(el, cur, prev){
    el.classList.remove("up", "down", "flat", "dead");
    if (cur <= 0 && prev > 0){ el.textContent = "Bankrupt"; el.classList.add("dead"); return; }
    if (cur <= 0){ el.textContent = "Gone"; el.classList.add("dead"); return; }
    if (!prev || revealedCount() === 0){ el.textContent = "—"; el.classList.add("flat"); return; }
    const c = cur / prev - 1; el.textContent = pct(c); el.classList.add(c > .0005 ? "up" : c < -.0005 ? "down" : "flat");
  }

  function render(){
    if (!open || !S) return;
    const p = prices(), pv = prevPrices(), trading = S.phase === "trade";
    const label = (S.practice ? "Practice market" : "Daily Challenge #" + dayNum(S.date));
    $("roundLabel").textContent = label + " · " + (S.phase === "done" ? "Final results" : "Round " + (S.round + 1) + " of " + ROUNDS);
    $("dDate").textContent = S.practice ? "Practice · doesn't count toward your stats" : new Date(S.date + "T12:00:00").toLocaleDateString(undefined, {weekday: "long", month: "long", day: "numeric"});
    $("dMode").textContent = S.practice ? "Practice" : "Today";
    for (let i = 0; i < ROUNDS; i++){
      const d = $("ds-" + i), done = i < S.round || (i === S.round && S.phase !== "trade");
      d.className = "d-step" + (i === S.round && S.phase === "trade" ? " now" : "") + (done ? (S.roundRet[i] > 0 ? " win" : S.roundRet[i] < 0 ? " loss" : " even") : "");
      d.title = done ? "Round " + (i + 1) + ": " + pct(S.roundRet[i] || 0) : "Round " + (i + 1);
    }
    for (const s of G.secs){
      const tt = $("dt-" + s.t), row = $("dr-" + s.t), cur = p[s.t], prev = pv[s.t];
      tt.querySelector(".p").textContent = "$" + cur.toFixed(2); setChg(tt.querySelector(".chg"), cur, prev);
      row.querySelector(".pv").textContent = "$" + cur.toFixed(2); setChg(row.querySelector(".px .chg"), cur, prev);
      const held = S.pos[s.t] || 0, posEl = row.querySelector(".pos");
      posEl.className = "pos" + (held > 0 ? " long" : held < 0 ? " short" : ""); posEl.textContent = held > 0 ? "Own " + held : held < 0 ? "Short " + (-held) : "—";
      const dead = cur <= 0, can = trading && S.phase !== "done" && !dead;
      row.querySelector(".buy").disabled = !can; row.querySelector(".sell").disabled = !can;
      const eq = value(p), maxBuy = dead ? 0 : Math.max(0, Math.floor(S.cash / cur + 1e-9)), maxSell = dead ? 0 : Math.max(0, held) + Math.max(0, Math.floor((eq - shortEx(p)) / cur + 1e-9));
      row.querySelector(".hint").textContent = dead ? "Bankrupt: can't be traded" : trading ? "Max buy " + maxBuy + " · max sell " + maxSell : "Trading reopens next round";
      row.classList.toggle("rumored", trading && G.rounds[S.round] && G.rounds[S.round].rumorT === s.t);
    }
    const val = value(p), mkt = p.MKT / G.secs[0].start - 1, ret = val / START_CASH - 1;
    $("dValue").textContent = money(val);
    $("dRet").textContent = pct(ret); $("dRet").style.color = ret > .0005 ? "var(--up)" : ret < -.0005 ? "var(--down)" : "";
    $("dMkt").textContent = pct(mkt); $("dMkt").style.color = mkt > .0005 ? "var(--up)" : mkt < -.0005 ? "var(--down)" : "";
    $("dCash").textContent = money(S.cash); $("dTrades").textContent = S.trades;
    const hb = $("dHold"); hb.textContent = "";
    const keys = G.secs.filter(s => S.pos[s.t]);
    if (!keys.length){ const tr = document.createElement("tr"), td = document.createElement("td"); td.colSpan = 3; td.style.cssText = "font-family:var(--body);color:var(--ink-2)"; td.textContent = "All cash. Make a trade to get in the game."; tr.appendChild(td); hb.appendChild(tr); }
    for (const s of keys){ const tr = document.createElement("tr"), q = S.pos[s.t]; [s.t + (q < 0 ? " (short)" : ""), String(q), money(q * p[s.t])].forEach(t => { const td = document.createElement("td"); td.textContent = t; tr.appendChild(td); }); hb.appendChild(tr); }

    // briefing / results / final panels
    $("dBrief").hidden = S.phase !== "trade";
    $("dResult").hidden = S.phase !== "results";
    $("dFinal").hidden = S.phase !== "done";
    $("dPlay").hidden = S.phase === "done";
    $("dGoWrap").hidden = S.phase !== "trade";
    $("dSteps").hidden = false;
    if (S.phase === "trade") renderBrief();
    if (S.phase === "results") renderResult(p, pv);
    if (S.phase === "done") renderFinal();
  }

  function renderBrief(){
    const R = G.rounds[S.round];
    $("dBriefTitle").textContent = "Round " + (S.round + 1) + " briefing";
    const ul = $("dRumors"); ul.textContent = "";
    [["The economy", R.macroRumor], ["Company rumor", R.coRumor]].forEach(([k, t]) => {
      const li = document.createElement("li"), b = document.createElement("b"); b.textContent = k; li.append(b, " " + t); ul.appendChild(li);
    });
    $("dGo").textContent = $("dGo2").textContent = S.round === ROUNDS - 1 ? "Lock in final trades · see what happens →" : "Lock in trades · see what happens →";
  }

  function renderResult(p, pv){
    const R = G.rounds[S.round], you = S.roundRet[S.round] || 0;
    $("dResTitle").textContent = "Round " + (S.round + 1) + ": what happened";
    $("dResYou").textContent = "Your portfolio " + pct(you) + " this round";
    $("dResYou").style.color = you > .0005 ? "var(--up)" : you < -.0005 ? "var(--down)" : "";
    $("dHead").textContent = R.event.head;
    $("dTruth").textContent = "The economy rumor was " + (R.macroTrue ? "right" : "wrong") + ". The company rumor was " + (R.coTrue ? "right" : "wrong") + ".";
    const ul = $("dMoves"); ul.textContent = "";
    for (const s of G.secs){
      const li = document.createElement("li"), b = document.createElement("b"), c = document.createElement("span"), para = document.createElement("p");
      b.textContent = s.t; c.className = "chg";
      const mv = R.moves[s.t];
      if (R.kind[s.t] === "dead"){ c.classList.add("gone"); c.textContent = "Gone"; }
      else if (mv <= -1){ c.classList.add("dead"); c.textContent = "Bankrupt"; }
      else { c.classList.add(mv > 0 ? "up" : mv < 0 ? "down" : "flat"); c.textContent = pct(mv); }
      para.textContent = R.stories[s.t];
      const held = S.pos[s.t] || 0;
      if (held && R.kind[s.t] !== "dead"){ const g = held * (p[s.t] - pv[s.t]); const e = document.createElement("span"); e.className = "d-pl"; e.textContent = " You " + (g >= 0 ? "made " : "lost ") + money(Math.abs(g)) + "."; e.style.color = g >= 0 ? "var(--up)" : "var(--down)"; para.appendChild(e); }
      li.append(b, c, para); ul.appendChild(li);
    }
    $("dNext").textContent = S.round === ROUNDS - 1 ? "See final results →" : "Start round " + (S.round + 2) + " →";
  }

  function stats(){
    const out = {played: 0, wins: 0, best: null, streak: 0, maxStreak: 0};
    const days = [];
    try { for (let i = 0; i < localStorage.length; i++){ const k = localStorage.key(i); if (k && k.startsWith("hce.daily.")){ const d = store.get(k); if (d && d.phase === "done" && !d.practice) days.push(d); } } } catch (e){}
    days.sort((a, b) => a.date < b.date ? -1 : 1);
    let run = 0, prev = null;
    for (const d of days){
      out.played++; if (d.final && d.final.you > d.final.mkt) out.wins++;
      if (d.final && (out.best == null || d.final.you > out.best)) out.best = d.final.you;
      run = prev && dayNum(d.date) === dayNum(prev) + 1 ? run + 1 : 1; prev = d.date; out.maxStreak = Math.max(out.maxStreak, run);
    }
    const t = dayNum(today()), last = prev ? dayNum(prev) : -9;
    out.streak = last === t || last === t - 1 ? run : 0;
    return out;
  }
  function shareText(){
    const f = S.final, n = dayNum(S.date);
    const sq = S.roundRet.map(x => x > .0005 ? "🟩" : x < -.0005 ? "🟥" : "⬜").join("");
    return "Hype Cycle Daily #" + n + (f.you > f.mkt ? " 📈" : " 📉") + "\nMy return: " + pct(f.you) + " (market " + pct(f.mkt) + ")\n" + sq + "\n" + location.origin + location.pathname + "?mode=daily";
  }
  let tickTimer = null;
  function renderFinal(){
    const f = S.final, box = $("dFinal"), beat = f.you > f.mkt;
    box.textContent = "";
    const head = document.createElement("div"); head.className = "d-verdict";
    const badge = document.createElement("div"); badge.className = "d-badge " + (beat ? "win" : "loss"); badge.textContent = beat ? "You beat the market" : "The market won today";
    const big = document.createElement("div"); big.className = "d-big " + (f.you > .0005 ? "up" : f.you < -.0005 ? "down" : ""); big.textContent = pct(f.you);
    const sub = document.createElement("div"); sub.className = "d-sub";
    sub.textContent = (beat ? "You beat the market by " : "The market beat you by ") + (Math.abs(f.you - f.mkt) * 100).toFixed(1) + " points. The Daily 500 did " + pct(f.mkt) + ".";
    const tag = document.createElement("div"); tag.className = "label"; tag.textContent = S.practice ? "Practice market" : "Daily Challenge #" + dayNum(S.date);
    head.append(tag, badge, big, sub); box.appendChild(head);
    const sq = document.createElement("div"); sq.className = "d-squares"; sq.setAttribute("aria-label", "Your result each round");
    S.roundRet.forEach((x, i) => { const d = document.createElement("span"); d.className = x > .0005 ? "win" : x < -.0005 ? "loss" : "even"; d.textContent = pct(x); d.title = "Round " + (i + 1); sq.appendChild(d); });
    box.appendChild(sq);
    const ch = document.createElement("div"); ch.className = "chart"; box.appendChild(ch);
    const xs = ["Start"].concat(S.roundRet.map((_, i) => "R" + (i + 1)));
    requestAnimationFrame(() => H.lineChart(ch, [
      {key: "you", label: "You", color: "var(--c1)", values: S.history.map(h => h.you / START_CASH * 100), fmt: v => "$" + v.toFixed(0)},
      {key: "mkt", label: "Daily 500", color: "var(--c2)", values: S.history.map(h => h.mkt), fmt: v => "$" + v.toFixed(0)}
    ], xs, {h: 220, aria: "Your portfolio versus the market, growth of $100", yFmt: v => "$" + Math.round(v)}));
    const lg = document.createElement("div"); lg.className = "legend"; lg.innerHTML = '<span><i style="background:var(--c1)"></i>You</span><span><i style="background:var(--c2)"></i>Daily 500 Index</span>'; box.appendChild(lg);
    const acts = document.createElement("div"); acts.className = "d-actions";
    if (!S.practice){
      const sh = document.createElement("button"); sh.type = "button"; sh.className = "primary"; sh.textContent = "Share my result";
      sh.addEventListener("click", async () => {
        const t = shareText();
        try { if (navigator.share) { await navigator.share({text: t}); return; } } catch (e){}
        try { await navigator.clipboard.writeText(t); H.toast("COPIED", "Your result is on the clipboard. Paste it anywhere!"); }
        catch (e){ window.prompt("Copy your result:", t); }
      });
      acts.appendChild(sh);
    }
    const pr = document.createElement("button"); pr.type = "button"; pr.textContent = "Play a practice market"; pr.addEventListener("click", () => start(true)); acts.appendChild(pr);
    if (S.practice && !(store.get(key(today())) || {}).final){ const td = document.createElement("button"); td.type = "button"; td.textContent = "Play today's challenge"; td.addEventListener("click", () => start(false)); acts.appendChild(td); }
    box.appendChild(acts);
    if (!S.practice){
      const st = stats(), grid = document.createElement("div"); grid.className = "d-stats";
      [["Played", st.played], ["Beat the market", st.played ? Math.round(st.wins / st.played * 100) + "%" : "—"], ["Current streak", st.streak], ["Best streak", st.maxStreak], ["Best return", st.best == null ? "—" : pct(st.best)]]
        .forEach(([k, v]) => { const d = document.createElement("div"); d.className = "stat"; const a = document.createElement("div"); a.className = "label"; a.textContent = k; const b = document.createElement("div"); b.className = "v"; b.textContent = v; d.append(a, b); grid.appendChild(d); });
      box.appendChild(grid);
      const nx = document.createElement("p"); nx.className = "d-next"; box.appendChild(nx);
      const tick = () => { if (!document.body.contains(nx)) return clearInterval(tickTimer); nx.textContent = S.date === today() ? "Next market in " + untilMidnight() : "A new market is ready. Reload to play it!"; };
      clearInterval(tickTimer); tick(); tickTimer = setInterval(tick, 1000);
    }
  }

  /* ---------- actions ---------- */
  function say(t, kind){ const el = $("dMsg"); el.textContent = t; el.className = "msg" + (kind ? " " + kind : ""); }
  function trade(t, dir, btn){
    if (S.phase !== "trade") return;
    const q = Math.floor(Number($("dQty").value));
    if (!(q >= 1)){ say("Enter a whole number of shares, 1 or more.", "err"); return; }
    const p = prices(), px = p[t]; if (!(px > 0)) return;
    const held = S.pos[t] || 0, next = held + dir * q, cash = S.cash - dir * q * px;
    if (cash < -.005){ say("Not enough cash. You can buy up to " + Math.floor(S.cash / px) + " shares of " + t + ".", "err"); return; }
    const trial = {...S.pos, [t]: next}, eq = value(p);
    const sx = G.secs.reduce((a, s) => a + Math.max(0, -(trial[s.t] || 0)) * p[s.t], 0);
    if (sx > eq + .005){ say("That short is too big. Your shorts can't be worth more than your whole portfolio.", "err"); return; }
    S.cash = r2(cash); if (next) S.pos[t] = next; else delete S.pos[t]; S.trades++;
    const verb = dir > 0 ? (held < 0 ? "Covered" : "Bought") : (held > 0 && next >= 0 ? "Sold" : "Shorted");
    say(verb + " " + q + " " + t + " at $" + px.toFixed(2) + ".", "ok");
    H.tradeFx(btn, verb + " " + q + " " + t, dir > 0 ? "buy" : "sell", $("dr-" + t));
    if (dir > 0) H.SFX.buy(); else H.SFX.sell();
    save(); render();
  }
  function lockIn(){
    const before = value(prices());
    S.phase = "results";
    const p = prices(), after = value(p);
    S.roundRet[S.round] = before > 0 ? after / before - 1 : 0;
    S.history[S.round + 1] = {you: after, mkt: p.MKT};
    H.SFX.reveal();
    save(); render(); window.scrollTo({top: 0, behavior: "smooth"});
    const you = S.roundRet[S.round];
    if (you > .0005) H.toast("NICE", "Your portfolio gained " + pct(you) + " this round.");
    else if (you < -.0005) H.toast("OUCH", "Your portfolio lost " + pct(Math.abs(you)).replace("+", "") + " this round.");
  }
  function next(){
    if (S.round >= ROUNDS - 1){
      const p = prices(), you = value(p) / START_CASH - 1, mkt = p.MKT / G.secs[0].start - 1;
      S.phase = "done"; S.final = {you, mkt};
      save(); render(); window.scrollTo({top: 0, behavior: "smooth"});
      H.toast(you > mkt ? "YOU BEAT THE MARKET" : "THE MARKET WINS TODAY", "Final return " + pct(you) + " vs. " + pct(mkt) + ".");
      return;
    }
    S.round++; S.phase = "trade"; say("");
    H.SFX.start(); save(); render(); window.scrollTo({top: 0, behavior: "smooth"});
  }
  function start(practice){
    const d = today();
    S = practice ? fresh(d, true) : (store.get(key(d)) || fresh(d, false));
    if (!S || S.v !== 1) S = fresh(d, !!practice);
    G = generate(S.seed);
    build(); render(); window.scrollTo(0, 0);
  }
  function openDaily(){
    open = true;
    H.hideAll();
    $("dailyView").hidden = false;
    document.body.classList.add("daily-on");
    start(false);
    try { const u = new URL(location.href); u.searchParams.set("mode", "daily"); history.replaceState(null, "", u); } catch (e){}
  }
  function close(){
    open = false; clearInterval(tickTimer);
    $("dailyView").hidden = true; document.body.classList.remove("daily-on");
    try { const u = new URL(location.href); u.searchParams.delete("mode"); history.replaceState(null, "", u); } catch (e){}
    H.showMenu(); renderCard();
  }
  // Card on the start screen
  function renderCard(){
    const el = $("dailyCardStatus"); if (!el) return;
    const d = store.get(key(today()));
    if (d && d.phase === "done" && d.final) el.textContent = "You played today: " + pct(d.final.you) + " vs. market " + pct(d.final.mkt) + ". New market in " + untilMidnight() + ".";
    else if (d && d.round > 0) el.textContent = "In progress: round " + (d.round + 1) + " of " + ROUNDS + ".";
    else el.textContent = "Daily Challenge #" + dayNum(today()) + " · 5 rounds · about 5 minutes";
    $("dailyPlay").textContent = d && d.phase === "done" ? "See today's result" : d && d.round > 0 ? "Keep playing" : "Play today's market";
  }
  $("dailyPlay").addEventListener("click", openDaily);
  renderCard(); setInterval(() => { if (!open) renderCard(); }, 1000);

  window.HCEDaily = {open: openDaily, isOpen: () => open, generate, _state: () => S};
  if (new URLSearchParams(location.search).get("mode") === "daily") openDaily();
})();
