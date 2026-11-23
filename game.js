(() => {
  'use strict';

  // ================= Config =================
  const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);
  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const VOWEL_COST = 250;
  const ROUNDS = 3;
  const SOLVE_BONUS = 500;
  const MAX_COLS = 14;
  const CPU_CONSONANTS = 'RNTLSCDMPVGBFZHQKJWXY'.split('');
  const CPU_VOWELS = 'EAIOU'.split('');
  const PLAYER_COLORS = ['#ffcc4d', '#4dd4ac', '#7aa2ff'];
  const PALETTE = ['#ff5d73', '#ffb547', '#4dd4ac', '#5b8cff', '#b16cff', '#ff8a3d', '#2ec5e6', '#f25fd0'];
  const LB_KEY = 'giralafrase.leaderboard';
  const MUTE_KEY = 'giralafrase.muted';

  const SEGMENTS = [
    { v: 500 }, { v: 300 }, { v: 900 }, { t: 'PASSA' }, { v: 400 }, { v: 600 },
    { v: 250 }, { t: 'BANCAROTTA' }, { v: 700 }, { v: 350 }, { v: 800 }, { v: 450 },
    { v: 2500, special: true }, { v: 300 }, { v: 550 }, { t: 'PASSA' }, { v: 650 }, { v: 400 },
    { v: 1000 }, { t: 'BANCAROTTA' }, { v: 500 }, { v: 350 }, { v: 750 }, { v: 600 },
  ];
  const SEG = (Math.PI * 2) / SEGMENTS.length;

  // ================= Helpers =================
  const $ = (s) => document.querySelector(s);
  const base = (ch) => ch.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
  const isLetter = (ch) => /^[A-Z]$/.test(base(ch));
  const norm = (s) => base(s).replace(/[^A-Z]/g, '');
  const fmt = (n) => n.toLocaleString('it-IT') + ' €';
  const rand = (a, b) => a + Math.random() * (b - a);
  const shuffle = (arr) => arr.map((x) => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);

  // ================= State =================
  const S = {
    players: [],
    cur: 0,
    round: 0,
    puzzle: null,
    tiles: [],
    used: new Set(),
    phase: 'idle', // idle | turn | spinning | consonant | vowel | revealing | wait | roundEnd
    spinValue: 0,
    rotation: 0,
    deck: [],
    smart: 0.55,
    gen: 0,
    muted: localStorage.getItem(MUTE_KEY) === '1',
  };
  const P = () => S.players[S.cur];
  const humanTurn = () => P() && !P().cpu;

  // Ignora i timer di una partita precedente
  function later(fn, ms) {
    const g = S.gen;
    setTimeout(() => { if (g === S.gen) fn(); }, ms);
  }

  // ================= Audio (Web Audio, nessun file) =================
  let actx = null;
  function tone(freq, dur = 0.1, type = 'sine', vol = 0.15, when = 0) {
    if (S.muted) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const t = actx.currentTime + when;
      const o = actx.createOscillator();
      const g = actx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(actx.destination);
      o.start(t);
      o.stop(t + dur + 0.05);
    } catch (e) { /* audio non disponibile */ }
  }
  const sfx = {
    tick: () => tone(1500, 0.025, 'square', 0.04),
    ding: () => { tone(1046, 0.3, 'triangle', 0.14); tone(1568, 0.25, 'sine', 0.06, 0.03); },
    buzz: () => { tone(150, 0.35, 'sawtooth', 0.1); tone(110, 0.35, 'sawtooth', 0.08, 0.05); },
    bankrupt: () => [420, 320, 220, 140].forEach((f, i) => tone(f, 0.28, 'sawtooth', 0.09, i * 0.14)),
    win: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.35, 'triangle', 0.13, i * 0.11)),
    buy: () => { tone(1318, 0.12, 'sine', 0.1); tone(1760, 0.18, 'sine', 0.08, 0.08); },
  };

  // ================= Wheel =================
  const wheel = $('#wheel');
  const wctx = wheel.getContext('2d');

  function segStyle(s, i, r) {
    if (s.t === 'BANCAROTTA') return { fill: '#0b0a14', text: '#ff5d73' };
    if (s.t === 'PASSA') return { fill: '#f4f2ff', text: '#2a2368' };
    if (s.special) {
      const g = wctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r);
      g.addColorStop(0, '#fff3c4');
      g.addColorStop(1, '#e6a316');
      return { fill: g, text: '#3a2400' };
    }
    return { fill: PALETTE[i % PALETTE.length], text: '#ffffff' };
  }

  function drawWheel() {
    const c = wctx;
    const W = wheel.width;
    const R = W / 2;
    const r = R - 24;
    c.clearRect(0, 0, W, W);
    c.save();
    c.translate(R, R);

    // Cornice
    const rim = c.createLinearGradient(-R, -R, R, R);
    rim.addColorStop(0, '#3b2c8f');
    rim.addColorStop(1, '#140f3a');
    c.beginPath();
    c.arc(0, 0, R - 2, 0, Math.PI * 2);
    c.fillStyle = rim;
    c.fill();

    SEGMENTS.forEach((s, i) => {
      const a0 = S.rotation + i * SEG;
      const st = segStyle(s, i, r);
      c.beginPath();
      c.moveTo(0, 0);
      c.arc(0, 0, r, a0, a0 + SEG);
      c.closePath();
      c.fillStyle = st.fill;
      c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.55)';
      c.lineWidth = 2;
      c.stroke();

      c.save();
      c.rotate(a0 + SEG / 2);
      c.textAlign = 'right';
      c.textBaseline = 'middle';
      c.fillStyle = st.text;
      if (s.t) {
        c.font = `${s.t.length > 6 ? 19 : 24}px Bungee, sans-serif`;
        c.fillText(s.t, r - 16, 1);
      } else {
        c.font = '32px Bungee, sans-serif';
        c.shadowColor = 'rgba(0,0,0,0.35)';
        c.shadowBlur = 4;
        c.fillText(String(s.v), r - 16, 2);
      }
      c.restore();
    });

    // Lucine sulla cornice
    for (let i = 0; i < SEGMENTS.length; i++) {
      const a = S.rotation + i * SEG;
      c.beginPath();
      c.arc(Math.cos(a) * (R - 13), Math.sin(a) * (R - 13), 5, 0, Math.PI * 2);
      c.fillStyle = i % 2 ? '#ffe9a8' : '#ffffff';
      c.shadowColor = '#ffe9a8';
      c.shadowBlur = 10;
      c.fill();
    }
    c.shadowBlur = 0;

    // Ombra interna verso il centro
    const inner = c.createRadialGradient(0, 0, r * 0.1, 0, 0, r);
    inner.addColorStop(0, 'rgba(0,0,0,0.35)');
    inner.addColorStop(0.35, 'rgba(0,0,0,0)');
    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.fillStyle = inner;
    c.fill();
    c.restore();
  }

  // Indice del settore sotto la freccia (in alto, angolo -90°)
  function pointerIndex() {
    const a = (((1.5 * Math.PI - S.rotation) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    return Math.floor(a / SEG) % SEGMENTS.length;
  }

  function bumpPointer() {
    const p = $('#pointer');
    p.classList.remove('bump');
    void p.offsetWidth;
    p.classList.add('bump');
  }

  function spin() {
    if (S.phase !== 'turn' || !remaining('cons').length) return;
    S.phase = 'spinning';
    say(`${P().name} gira la ruota…`);
    $('#lastSpin').textContent = 'Gira, gira, gira…';
    updateUI();
    const g = S.gen;
    const start = S.rotation;
    const extra = Math.PI * 2 * rand(3.5, 5.5) + rand(0, Math.PI * 2);
    const dur = rand(4000, 5400);
    const t0 = performance.now();
    let last = pointerIndex();
    const frame = (now) => {
      if (g !== S.gen) return;
      const p = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - p, 4);
      S.rotation = start + extra * e;
      drawWheel();
      const idx = pointerIndex();
      if (idx !== last) { last = idx; sfx.tick(); bumpPointer(); }
      if (p < 1) requestAnimationFrame(frame);
      else { S.rotation %= Math.PI * 2; onLanded(SEGMENTS[idx]); }
    };
    requestAnimationFrame(frame);
  }

  function onLanded(seg) {
    const p = P();
    const ls = $('#lastSpin');
    if (seg.t === 'BANCAROTTA') {
      sfx.bankrupt();
      ls.innerHTML = '<b class="bad">BANCAROTTA</b>';
      const lost = p.round;
      p.round = 0;
      say(lost ? `💥 Bancarotta! ${p.name} perde ${fmt(lost)}.` : `💥 Bancarotta! Per fortuna ${p.name} non aveva niente da perdere.`, 'bad');
      shakePlayer(S.cur);
      nextTurn(1800);
    } else if (seg.t === 'PASSA') {
      sfx.buzz();
      ls.innerHTML = '<b class="bad">PASSA</b>';
      say(`⏭️ Passa! ${p.name} cede il turno.`, 'bad');
      nextTurn(1500);
    } else {
      S.spinValue = seg.v;
      S.phase = 'consonant';
      ls.innerHTML = `Valore: <b>${fmt(seg.v)}</b>`;
      say(p.cpu ? `${fmt(seg.v)} a consonante. ${p.name} ci pensa…` : `${fmt(seg.v)} a consonante! Scegli una consonante.`);
      updateUI();
      if (p.cpu) cpuAct();
    }
  }

  // ================= Puzzle board =================
  function layoutRows(text) {
    const rows = [];
    let line = '';
    for (const w of text.split(/\s+/)) {
      if (!line) line = w;
      else if ((line + ' ' + w).length <= MAX_COLS) line += ' ' + w;
      else { rows.push(line); line = w; }
    }
    if (line) rows.push(line);
    return rows;
  }

  function buildBoard() {
    const board = $('#board');
    board.innerHTML = '';
    S.tiles = [];
    for (const rowText of layoutRows(S.puzzle.t)) {
      const row = document.createElement('div');
      row.className = 'row';
      for (const ch of rowText) {
        const el = document.createElement('div');
        if (ch === ' ') {
          el.className = 'tile gap';
        } else if (isLetter(ch)) {
          el.className = 'tile letter';
          el.textContent = ch;
          S.tiles.push({ el, ch, key: base(ch), shown: false });
        } else {
          el.className = 'tile punct';
          el.textContent = ch;
        }
        row.appendChild(el);
      }
      board.appendChild(row);
    }
    $('#category').textContent = S.puzzle.c;
  }

  const letterTiles = (L) => S.tiles.filter((t) => t.key === L && !t.shown);
  const allRevealed = () => S.tiles.every((t) => t.shown);
  function remaining(kind) {
    const keys = new Set(S.tiles.filter((t) => !t.shown).map((t) => t.key));
    return [...keys].filter((k) => (kind === 'vow' ? VOWELS.has(k) : !VOWELS.has(k)));
  }

  // Accende e gira le caselle una per volta; ritorna la durata
  function revealLetter(L) {
    const tiles = letterTiles(L);
    tiles.forEach((t, i) => {
      t.shown = true;
      later(() => { t.el.classList.add('lit'); sfx.ding(); }, i * 420);
      later(() => { t.el.classList.remove('lit'); t.el.classList.add('show'); }, i * 420 + 380);
    });
    return tiles.length * 420 + 450;
  }

  function revealAll() {
    S.tiles.filter((t) => !t.shown).forEach((t, i) => {
      t.shown = true;
      later(() => t.el.classList.add('show'), i * 45);
    });
  }

  // ================= Turn logic =================
  function guess(L) {
    const p = P();
    const isV = VOWELS.has(L);
    if (!((S.phase === 'consonant' && !isV) || (S.phase === 'vowel' && isV))) return;
    if (S.used.has(L)) return;
    S.used.add(L);
    const count = letterTiles(L).length;
    S.phase = 'revealing';
    updateUI();

    if (count > 0) {
      const ms = revealLetter(L);
      if (!isV) {
        const gain = count * S.spinValue;
        p.round += gain;
        say(`✅ ${count === 1 ? "C'è una" : `Ci sono ${count}`} "${L}" — +${fmt(gain)}`, 'good');
      } else {
        say(`✅ ${count === 1 ? "C'è una" : `Ci sono ${count}`} "${L}"`, 'good');
      }
      later(() => {
        updateUI();
        if (allRevealed()) return winRound();
        S.phase = 'turn';
        promptTurn();
      }, ms);
    } else {
      sfx.buzz();
      say(`❌ Nessuna "${L}". ${S.players.length > 1 ? 'Il turno passa.' : ''}`, 'bad');
      nextTurn(1500);
    }
  }

  function buyVowel() {
    const p = P();
    if (S.phase !== 'turn' || p.round < VOWEL_COST || !remaining('vow').length) return;
    p.round -= VOWEL_COST;
    S.phase = 'vowel';
    sfx.buy();
    say(p.cpu ? `${p.name} compra una vocale…` : 'Vocale acquistata: scegline una.');
    updateUI();
    if (p.cpu) cpuAct();
  }

  function attemptSolve(text) {
    const p = P();
    if (norm(text) === norm(S.puzzle.t)) {
      say(`🎉 Esatto! ${p.name} risolve la frase!`, 'good');
      winRound();
    } else {
      sfx.buzz();
      say(`❌ "${text.toUpperCase()}" non è la soluzione.`, 'bad');
      S.phase = 'wait';
      nextTurn(1600);
    }
  }

  function nextTurn(delay) {
    S.phase = 'wait';
    updateUI();
    later(() => {
      S.cur = (S.cur + 1) % S.players.length;
      S.phase = 'turn';
      promptTurn();
    }, delay);
  }

  function promptTurn() {
    const p = P();
    const cons = remaining('cons').length;
    const vow = remaining('vow').length;
    if (p.cpu) {
      say(`Tocca a ${p.name}…`);
    } else if (!cons && (!vow || p.round < VOWEL_COST)) {
      say(`${p.name}, le consonanti sono finite: è il momento di risolvere!`);
    } else if (!cons) {
      say(`${p.name}, niente più consonanti: compra una vocale o risolvi.`);
    } else {
      say(`Tocca a ${p.name}: gira la ruota, compra una vocale o risolvi.`);
    }
    updateUI();
    if (p.cpu) cpuAct();
  }

  function winRound() {
    S.phase = 'roundEnd';
    const p = P();
    revealAll();
    const prize = p.round + SOLVE_BONUS;
    p.total += prize;
    S.players.forEach((q) => { q.round = 0; });
    sfx.win();
    confetti();
    updateUI();
    later(() => showRoundModal(p, prize), 1500);
  }

  // ================= CPU =================
  function cpuAct() {
    const p = P();
    p.thinking = true;
    updateUI();
    later(() => {
      p.thinking = false;
      if (S.phase === 'turn') cpuDecide(p);
      else if (S.phase === 'consonant') guess(cpuPick(CPU_CONSONANTS, 'cons'));
      else if (S.phase === 'vowel') guess(cpuPick(CPU_VOWELS, 'vow'));
      updateUI();
    }, rand(900, 1500));
  }

  function cpuDecide(p) {
    const letters = S.tiles.length;
    const shown = S.tiles.filter((t) => t.shown).length;
    const frac = shown / letters;
    const cons = remaining('cons');
    const vow = remaining('vow');
    const unknown = cons.length + vow.length;

    const confident =
      unknown <= 1 ||
      (frac > 0.5 && Math.random() < Math.pow(frac, 2) * (0.6 + S.smart)) ||
      (!cons.length && (p.round < VOWEL_COST || !vow.length));

    if (confident) {
      say(`🤖 ${p.name} vuole risolvere…`);
      later(() => attemptSolve(S.puzzle.t), 1100);
      return;
    }
    if (vow.length && p.round >= VOWEL_COST && (!cons.length || Math.random() < 0.3)) return buyVowel();
    if (cons.length) return spin();
    // Nessuna opzione rimasta: prova comunque a risolvere
    later(() => attemptSolve(S.puzzle.t), 800);
  }

  // Sceglie una lettera: con probabilità "smart" ne sceglie una presente, altrimenti per frequenza
  function cpuPick(order, kind) {
    const avail = order.filter((l) => !S.used.has(l));
    const present = remaining(kind);
    if (present.length && Math.random() < S.smart) {
      return avail.find((l) => present.includes(l)) || present[0];
    }
    // Pesca tra le più frequenti con un po' di casualità
    const top = avail.slice(0, Math.min(avail.length, kind === 'vow' ? 3 : 6));
    return top[Math.floor(Math.random() * top.length)];
  }

  // ================= UI =================
  function say(text, tone = '') {
    const m = $('#message');
    m.textContent = text;
    m.className = 'message pop ' + tone;
  }

  function shakePlayer(i) {
    const el = document.querySelectorAll('.player')[i];
    if (!el) return;
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
  }

  function renderKeyboard() {
    const kb = $('#keyboard');
    kb.innerHTML = '';
    ALPHABET.forEach((L) => {
      const b = document.createElement('button');
      b.className = 'key' + (VOWELS.has(L) ? ' vowel' : '');
      b.textContent = L;
      b.dataset.l = L;
      b.addEventListener('click', () => humanTurn() && guess(L));
      kb.appendChild(b);
    });
  }

  function updateUI() {
    const p = P();
    if (!p) return;
    const human = humanTurn();
    const cons = remaining('cons').length;
    const vow = remaining('vow').length;

    $('#roundLabel').textContent = `Round ${S.round} / ${ROUNDS}`;

    // Giocatori
    $('#players').innerHTML = S.players.map((q, i) => `
      <div class="player ${i === S.cur ? 'active' : ''}" style="--pc:${q.color}">
        <div class="name ${q.thinking ? 'thinking' : ''}">${escapeHtml(q.name)} ${q.cpu ? '<span class="badge">CPU</span>' : ''}</div>
        <div class="money">
          <div class="round"><span>Round</span><b>${fmt(q.round)}</b></div>
          <div><span>Totale</span><b>${fmt(q.total)}</b></div>
        </div>
      </div>`).join('');

    const canSpin = human && S.phase === 'turn' && cons > 0;
    $('#spinBtn').disabled = !canSpin;
    $('#wheelWrap').classList.toggle('ready', canSpin);
    $('#buyBtn').disabled = !(human && S.phase === 'turn' && p.round >= VOWEL_COST && vow > 0);
    $('#solveBtn').disabled = !(human && S.phase === 'turn');

    const puzzleKeys = new Set(S.tiles.map((t) => t.key));
    document.querySelectorAll('.key').forEach((k) => {
      const L = k.dataset.l;
      const used = S.used.has(L);
      const isV = VOWELS.has(L);
      k.classList.toggle('hit', used && puzzleKeys.has(L));
      k.classList.toggle('miss', used && !puzzleKeys.has(L));
      const active = human && !used && ((S.phase === 'consonant' && !isV) || (S.phase === 'vowel' && isV));
      k.disabled = !active;
    });
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // ================= Modals =================
  function openSolve() {
    if (!humanTurn() || S.phase !== 'turn') return;
    S.phase = 'solving';
    updateUI();
    $('#solveHint').textContent = `Categoria: ${S.puzzle.c} · ${S.tiles.length} lettere`;
    $('#solveInput').value = '';
    $('#solveModal').classList.remove('hidden');
    setTimeout(() => $('#solveInput').focus(), 50);
  }
  function closeSolve(restore = true) {
    $('#solveModal').classList.add('hidden');
    if (restore && S.phase === 'solving') { S.phase = 'turn'; updateUI(); }
  }

  function showModal(html) {
    $('#modalBody').innerHTML = html;
    $('#modal').classList.remove('hidden');
  }
  function hideModal() { $('#modal').classList.add('hidden'); }

  function showRoundModal(p, prize) {
    const last = S.round >= ROUNDS;
    showModal(`
      <h3>Round ${S.round} vinto!</h3>
      <p class="muted">${escapeHtml(p.name)} si aggiudica</p>
      <div class="result-big">+${fmt(prize)}</div>
      <div class="solution">${escapeHtml(S.puzzle.t)}</div>
      <p class="muted">incluso il bonus soluzione di ${fmt(SOLVE_BONUS)}</p>
      <button class="btn primary big" id="nextRoundBtn">${last ? 'Classifica finale' : 'Prossimo round'}</button>`);
    $('#nextRoundBtn').onclick = () => {
      hideModal();
      if (last) gameOver(); else startRound();
    };
  }

  function gameOver() {
    const ranking = [...S.players].sort((a, b) => b.total - a.total);
    const medals = ['🥇', '🥈', '🥉'];
    const winner = ranking[0];
    const isRecord = saveScores();
    confetti();
    sfx.win();
    showModal(`
      <h3>${winner.cpu ? `Vince ${escapeHtml(winner.name)} 🤖` : `Complimenti ${escapeHtml(winner.name)}! 🏆`}</h3>
      ${isRecord ? '<p class="muted" style="color:var(--gold)">Nuovo record in classifica!</p>' : ''}
      <ol class="ranking">
        ${ranking.map((q, i) => `<li><span>${medals[i] || ''} ${escapeHtml(q.name)}</span><b>${fmt(q.total)}</b></li>`).join('')}
      </ol>
      <div class="row">
        <button class="btn ghost" id="toSetupBtn">Cambia giocatori</button>
        <button class="btn primary" id="againBtn">Rigioca</button>
      </div>`);
    $('#againBtn').onclick = () => { hideModal(); startGame(S.players.map((q) => ({ name: q.name, cpu: q.cpu }))); };
    $('#toSetupBtn').onclick = () => { hideModal(); openSetup(); };
  }

  // ================= Leaderboard =================
  function loadScores() {
    try { return JSON.parse(localStorage.getItem(LB_KEY)) || []; } catch { return []; }
  }
  function saveScores() {
    const list = loadScores();
    const before = list.length ? list[0].score : 0;
    let record = false;
    S.players.filter((q) => !q.cpu && q.total > 0).forEach((q) => {
      list.push({ name: q.name, score: q.total, date: new Date().toLocaleDateString('it-IT') });
      if (q.total > before) record = true;
    });
    list.sort((a, b) => b.score - a.score);
    localStorage.setItem(LB_KEY, JSON.stringify(list.slice(0, 5)));
    return record;
  }
  function renderLeaderboard() {
    const list = loadScores();
    $('#leaderboard').innerHTML = list.length
      ? `<h4>🏆 Migliori punteggi</h4><ol>${list.map((e) => `<li><span>${escapeHtml(e.name)} <small class="muted">${e.date}</small></span><b>${fmt(e.score)}</b></li>`).join('')}</ol>`
      : '';
  }

  // ================= Setup & flow =================
  const DEFAULTS = [['Giocatore 1', 'human'], ['Robo', 'cpu'], ['Bit', 'off']];
  function renderSetup() {
    $('#playerRows').innerHTML = DEFAULTS.map(([n, t], i) => `
      <div class="prow ${t === 'off' ? 'off' : ''}">
        <span class="dot" style="background:${PLAYER_COLORS[i]}"></span>
        <input maxlength="12" value="${n}" aria-label="Nome giocatore ${i + 1}" />
        <select aria-label="Tipo giocatore ${i + 1}">
          <option value="human" ${t === 'human' ? 'selected' : ''}>Umano</option>
          <option value="cpu" ${t === 'cpu' ? 'selected' : ''}>CPU</option>
          <option value="off" ${t === 'off' ? 'selected' : ''}>— nessuno</option>
        </select>
      </div>`).join('');
    document.querySelectorAll('.prow select').forEach((sel) => {
      sel.addEventListener('change', () => sel.parentElement.classList.toggle('off', sel.value === 'off'));
    });
  }
  function openSetup() {
    S.gen++;
    renderLeaderboard();
    $('#setup').classList.remove('hidden');
  }

  function startFromSetup() {
    const players = [...document.querySelectorAll('.prow')]
      .map((row, i) => ({
        name: row.querySelector('input').value.trim() || `Giocatore ${i + 1}`,
        type: row.querySelector('select').value,
      }))
      .filter((p) => p.type !== 'off')
      .map((p) => ({ name: p.name, cpu: p.type === 'cpu' }));
    if (!players.length) { $('#setupError').textContent = 'Serve almeno un giocatore.'; return; }
    if (players.every((p) => p.cpu)) { $('#setupError').textContent = 'Serve almeno un giocatore umano.'; return; }
    $('#setupError').textContent = '';
    S.smart = parseFloat($('#difficulty').value);
    $('#setup').classList.add('hidden');
    startGame(players);
  }

  function startGame(players) {
    S.gen++;
    S.players = players.map((p, i) => ({ ...p, round: 0, total: 0, color: PLAYER_COLORS[i], thinking: false }));
    S.round = 0;
    if (S.deck.length < ROUNDS) S.deck = shuffle(window.PUZZLES);
    startRound();
  }

  function startRound() {
    S.round++;
    if (!S.deck.length) S.deck = shuffle(window.PUZZLES);
    S.puzzle = S.deck.pop();
    S.used = new Set();
    S.players.forEach((q) => { q.round = 0; q.thinking = false; });
    S.cur = (S.round - 1) % S.players.length;
    buildBoard();
    $('#lastSpin').textContent = 'Premi GIRA o la barra spaziatrice';
    S.phase = 'turn';
    promptTurn();
  }

  // ================= Confetti =================
  const fx = $('#fx');
  const fctx = fx.getContext('2d');
  let parts = [];
  let fxRunning = false;
  function confetti() {
    fx.width = innerWidth;
    fx.height = innerHeight;
    for (let i = 0; i < 200; i++) {
      parts.push({
        x: innerWidth / 2 + rand(-120, 120), y: innerHeight * 0.4,
        vx: rand(-13, 13), vy: rand(-17, -5), s: rand(6, 12),
        r: rand(0, 6), vr: rand(-0.3, 0.3), c: PALETTE[i % PALETTE.length],
      });
    }
    if (!fxRunning) { fxRunning = true; requestAnimationFrame(fxLoop); }
  }
  function fxLoop() {
    fctx.clearRect(0, 0, fx.width, fx.height);
    parts.forEach((p) => {
      p.vy += 0.35; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      fctx.save();
      fctx.translate(p.x, p.y);
      fctx.rotate(p.r);
      fctx.fillStyle = p.c;
      fctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      fctx.restore();
    });
    parts = parts.filter((p) => p.y < fx.height + 40);
    if (parts.length) requestAnimationFrame(fxLoop);
    else { fxRunning = false; fctx.clearRect(0, 0, fx.width, fx.height); }
  }

  // ================= Events =================
  $('#spinBtn').addEventListener('click', () => humanTurn() && spin());
  $('#buyBtn').addEventListener('click', () => humanTurn() && buyVowel());
  $('#solveBtn').addEventListener('click', openSolve);
  $('#solveCancel').addEventListener('click', () => closeSolve());
  $('#solveForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = $('#solveInput').value.trim();
    if (!v) return;
    closeSolve(false);
    attemptSolve(v);
  });
  $('#startBtn').addEventListener('click', startFromSetup);
  $('#newGameBtn').addEventListener('click', () => { hideModal(); closeSolve(false); openSetup(); });
  const muteBtn = $('#muteBtn');
  const syncMute = () => { muteBtn.textContent = S.muted ? '🔇' : '🔊'; };
  muteBtn.addEventListener('click', () => {
    S.muted = !S.muted;
    localStorage.setItem(MUTE_KEY, S.muted ? '1' : '0');
    syncMute();
  });

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (!$('#solveModal').classList.contains('hidden')) {
      if (e.key === 'Escape') closeSolve();
      return;
    }
    if (!$('#setup').classList.contains('hidden') || !$('#modal').classList.contains('hidden')) return;
    if (!humanTurn()) return;
    if (e.code === 'Space') { e.preventDefault(); spin(); }
    else if (e.key === 'Enter') { e.preventDefault(); openSolve(); }
    else if (/^[a-z]$/i.test(e.key)) {
      const L = e.key.toUpperCase();
      if (S.phase === 'turn' && VOWELS.has(L)) { buyVowel(); if (S.phase === 'vowel') guess(L); }
      else guess(L);
    }
  });

  // ================= Init =================
  syncMute();
  renderKeyboard();
  renderSetup();
  renderLeaderboard();
  drawWheel();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawWheel);
})();
