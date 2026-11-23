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
  const PALETTE = ['#e63946', '#f7b538', '#2a9d8f', '#ff7b39', '#c9406a', '#e9a23b', '#3d8bd9', '#8e4ec6'];
  const LB_KEY = 'ruotamatta.leaderboard';
  const MUTE_KEY = 'ruotamatta.muted';

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
  // Catena: voci → master → filtro morbido → compressore → uscita, più un riverbero leggero.
  let actx = null;
  let master = null;
  let verb = null;
  let noiseBuf = null;
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function audio() {
    if (S.muted) return null;
    try {
      if (!actx) {
        actx = new (window.AudioContext || window.webkitAudioContext)();
        const comp = actx.createDynamicsCompressor();
        comp.threshold.value = -20;
        comp.ratio.value = 4;
        const soft = actx.createBiquadFilter();
        soft.type = 'lowpass';
        soft.frequency.value = 6500;
        master = actx.createGain();
        master.gain.value = 0.85;
        master.connect(soft).connect(comp).connect(actx.destination);

        // Riverbero generato (nessun file): rumore che decade
        const len = Math.floor(actx.sampleRate * 1.6);
        const ir = actx.createBuffer(2, len, actx.sampleRate);
        for (let ch = 0; ch < 2; ch++) {
          const d = ir.getChannelData(ch);
          for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
        }
        const conv = actx.createConvolver();
        conv.buffer = ir;
        verb = actx.createGain();
        verb.gain.value = 0.22;
        verb.connect(conv).connect(soft);

        noiseBuf = actx.createBuffer(1, actx.sampleRate, actx.sampleRate);
        const nd = noiseBuf.getChannelData(0);
        for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
      }
      if (actx.state === 'suspended') actx.resume();
      return actx;
    } catch (e) {
      return null;
    }
  }

  // Voce singola con attacco morbido (niente "click") e decadimento esponenziale
  function voice(freq, { type = 'sine', vol = 0.15, when = 0, dur = 0.4, attack = 0.006, wet = 0.4, glideTo = 0 } = {}) {
    const a = audio();
    if (!a) return;
    const t = a.currentTime + when;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master);
    if (wet) {
      const s = a.createGain();
      s.gain.value = wet;
      g.connect(s).connect(verb);
    }
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  // Rumore filtrato: legnetto della ruota e "whoosh"
  function noise({ when = 0, dur = 0.05, vol = 0.1, freq = 2500, q = 1.5, freqTo = 0, attack = 0.002, wet = 0 } = {}) {
    const a = audio();
    if (!a) return;
    const t = a.currentTime + when;
    const src = a.createBufferSource();
    src.buffer = noiseBuf;
    const f = a.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = q;
    f.frequency.setValueAtTime(freq, t);
    if (freqTo) f.frequency.exponentialRampToValueAtTime(freqTo, t + dur);
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(master);
    if (wet) {
      const s = a.createGain();
      s.gain.value = wet;
      g.connect(s).connect(verb);
    }
    src.start(t, Math.random() * 0.5, dur + 0.05);
  }

  // Campanella: fondamentale + armoniche che si spengono prima
  function bell(m, { vol = 0.13, when = 0, dur = 1.3 } = {}) {
    const f = mtof(m);
    voice(f, { vol, when, dur });
    voice(f * 2, { vol: vol * 0.3, when, dur: dur * 0.55 });
    voice(f * 3.01, { vol: vol * 0.1, when, dur: dur * 0.3 });
  }
  // Marimba: corpo caldo e "colpo" breve
  function marimba(m, { vol = 0.16, when = 0 } = {}) {
    const f = mtof(m);
    voice(f, { vol, when, dur: 0.55, wet: 0.3 });
    voice(f * 4, { vol: vol * 0.18, when, dur: 0.08, wet: 0 });
  }

  const PENTA = [72, 74, 76, 79, 81, 84, 86, 88, 91, 93]; // Do maggiore pentatonica
  const SPIN_ARP = [72, 76, 79, 84, 79, 76]; // Do-Mi-Sol-Do, su e giù
  const sfx = {
    // Legnetto morbido sui pioli: leggermente diverso ogni volta
    // Carillon: ogni piolo suona la nota successiva di un arpeggio pentatonico (sempre consonante).
    // slow = 0 a piena velocità → 1 quando la ruota sta per fermarsi.
    tick: (step, slow) => {
      const m = SPIN_ARP[step % SPIN_ARP.length];
      const f = mtof(m);
      const vol = 0.035 + 0.07 * slow;
      const dur = 0.25 + 0.6 * slow;
      voice(f, { vol, dur, attack: 0.004, wet: 0.45 });
      voice(f * 2, { vol: vol * 0.25, dur: dur * 0.4, attack: 0.003, wet: 0.2 });
    },
    // Partenza: accordo morbido che si gonfia e svanisce
    whoosh: () => [60, 67, 72].forEach((m, i) =>
      voice(mtof(m), { vol: 0.05, dur: 1.4, attack: 0.35, wet: 0.6, when: i * 0.04 })),
    land: () => { marimba(79); marimba(84, { when: 0.1 }); },
    ding: (i = 0) => bell(PENTA[i % PENTA.length], { vol: 0.12 }),
    miss: () => {
      marimba(64, { vol: 0.14 });
      marimba(60, { vol: 0.12, when: 0.16 });
    },
    passa: () => {
      marimba(69, { vol: 0.12 });
      marimba(64, { vol: 0.12, when: 0.14 });
      marimba(62, { vol: 0.1, when: 0.28 });
    },
    bankrupt: () => {
      voice(mtof(67), { type: 'triangle', vol: 0.14, dur: 1.1, glideTo: mtof(43), wet: 0.35 });
      voice(mtof(55), { type: 'sine', vol: 0.12, dur: 1.1, glideTo: mtof(31), wet: 0.2 });
      noise({ when: 0.05, dur: 0.4, vol: 0.06, freq: 220, q: 0.8 });
    },
    buy: () => { bell(83, { vol: 0.09, dur: 0.25 }); bell(88, { vol: 0.11, when: 0.08, dur: 0.9 }); },
    win: () => {
      [72, 76, 79, 84].forEach((m, i) => bell(m, { vol: 0.12, when: i * 0.1 }));
      [84, 88, 91].forEach((m) => bell(m, { vol: 0.08, when: 0.45, dur: 2 }));
      for (let i = 0; i < 6; i++) bell(PENTA[5 + (i % 5)] + 12, { vol: 0.03, when: 0.6 + i * 0.07, dur: 0.5 });
    },
    fanfare: () => {
      [67, 72, 76, 79, 76, 79, 84].forEach((m, i) => marimba(m, { vol: 0.14, when: i * 0.13 }));
      [72, 76, 79, 84].forEach((m) => bell(m, { vol: 0.09, when: 0.95, dur: 2.4 }));
    },
    // Applausi: tanti battiti di mani brevi e casuali, che salgono e poi si spengono
    applause: (sec = 2.6) => {
      if (!audio()) return;
      const n = Math.floor(sec * 55);
      for (let i = 0; i < n; i++) {
        const when = Math.random() * sec;
        const env = Math.sin(Math.PI * Math.min(1, when / sec)) * 0.8 + 0.2;
        noise({ when, dur: rand(0.02, 0.05), vol: rand(0.02, 0.06) * env, freq: rand(900, 2600), q: rand(0.8, 2), wet: 0.4 });
      }
    },
    // Ba-dum-tss: due colpi di tamburo e il piatto
    rimshot: (when = 0) => {
      voice(190, { vol: 0.2, dur: 0.18, when, glideTo: 110, wet: 0.2 });
      voice(150, { vol: 0.2, dur: 0.2, when: when + 0.13, glideTo: 85, wet: 0.2 });
      noise({ when: when + 0.3, dur: 0.9, vol: 0.09, freq: 6500, q: 0.4, attack: 0.003, wet: 0.5 });
    },
    // "Ooooh" del pubblico: voci morbide filtrate che scendono
    ooh: () => {
      const a = audio();
      if (!a) return;
      const t = a.currentTime;
      const lp = a.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 650;
      lp.Q.value = 3;
      lp.connect(master);
      const s = a.createGain();
      s.gain.value = 0.6;
      lp.connect(s).connect(verb);
      [196, 233, 262, 294, 175].forEach((f) => {
        const o = a.createOscillator();
        const g = a.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(f * rand(0.98, 1.02), t);
        o.frequency.exponentialRampToValueAtTime(f * 0.78, t + 1.2);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.035, t + 0.25);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
        o.connect(g).connect(lp);
        o.start(t);
        o.stop(t + 1.4);
      });
    },
  };

  // ================= Presentatore & pubblico =================
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  let hostTimer = null;
  let bubbleTimer = null;
  let jokeTimer = null;
  let jokeDeck = [];
  const nextJoke = () => {
    if (!jokeDeck.length) jokeDeck = shuffle(window.JOKES || []);
    return jokeDeck.pop();
  };
  // mood: idle | present | spin | happy | wow | shock | sad | think. ms = 0 → resta così
  function host(mood, text, ms = 2600) {
    const h = $('#host');
    const b = $('#bubble');
    h.dataset.mood = 'idle';
    void h.offsetWidth; // riavvia le animazioni anche se il mood è lo stesso
    h.dataset.mood = mood;
    clearTimeout(hostTimer);
    clearTimeout(bubbleTimer);
    clearTimeout(jokeTimer);
    if (text) {
      b.textContent = text;
      b.classList.remove('hide', 'pop');
      void b.offsetWidth;
      b.classList.add('pop');
    }
    if (ms) {
      hostTimer = setTimeout(() => { h.dataset.mood = 'idle'; }, ms);
      bubbleTimer = setTimeout(() => b.classList.add('hide'), ms + 400);
    }
  }

  // Il presentatore racconta una freddura: domanda, pausa, risposta + ba-dum-tss
  function tellJoke() {
    const j = nextJoke();
    if (!j) return;
    host('think', j.q, 0);
    jokeTimer = setTimeout(() => {
      host('happy', `${j.a} 🥁`, 3800);
      sfx.rimshot();
      crowd('clap', 1000);
    }, 2800);
  }

  let crowdTimer = null;
  function crowd(kind, ms = 2600) {
    const a = $('#audience');
    a.classList.remove('cheer', 'ooh', 'clap');
    void a.offsetWidth;
    a.classList.add(kind);
    clearTimeout(crowdTimer);
    crowdTimer = setTimeout(() => a.classList.remove(kind), ms);
  }

  const SKIN = ['#f1c7a5', '#e0a982', '#c68863', '#8d5a3b', '#f6d5bd', '#a86b48'];
  const HAIR = ['#2b1d16', '#5a3a22', '#c9a15a', '#1a1a1a', '#8a3b1e', '#d9d2c5'];
  const SHIRT = ['#e63946', '#2a9d8f', '#f7b538', '#3d8bd9', '#8e4ec6', '#ff7b39', '#c9406a', '#4caf50'];
  function buildAudience() {
    const a = $('#audience');
    const n = Math.max(8, Math.ceil(innerWidth / 54));
    a.innerHTML = Array.from({ length: n }, () => {
      const style = `--s:${pick(SKIN)};--h:${pick(HAIR)};--c:${pick(SHIRT)};--o:${Math.round(rand(-6, 10))}px;--d:${rand(0, 0.25).toFixed(2)}s;--w:${pick(['-3px', '3px'])}`;
      return `<div class="fan" style="${style}"><span class="hand l"></span><span class="hand r"></span><span class="head"></span><span class="torso"></span></div>`;
    }).join('');
  }

  // ================= Wheel =================
  const wheel = $('#wheel');
  const wctx = wheel.getContext('2d');

  function segStyle(s, i, r) {
    if (s.t === 'BANCAROTTA') return { fill: '#0b0a14', text: '#ff5d73' };
    if (s.t === 'PASSA') return { fill: '#fff4e6', text: '#7a2433' };
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
    rim.addColorStop(0, '#a8452a');
    rim.addColorStop(1, '#4a1414');
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
    sfx.whoosh();
    host('spin', pick(['Vai con la ruota!', 'Gira, gira, gira…', 'Forza, che giro!', 'Vediamo dove si ferma…']), 0);
    const start = S.rotation;
    const extra = Math.PI * 2 * rand(3.5, 5.5) + rand(0, Math.PI * 2);
    const dur = rand(4000, 5400);
    const t0 = performance.now();
    let last = pointerIndex();
    let lastNote = 0;
    let step = 0;
    const frame = (now) => {
      if (g !== S.gen) return;
      // Il primo timestamp di rAF può precedere t0: limita il progresso a [0, 1]
      const p = Math.max(0, Math.min(1, (now - t0) / dur));
      const e = 1 - Math.pow(1 - p, 4);
      S.rotation = start + extra * e;
      drawWheel();
      const idx = pointerIndex();
      if (idx !== last) {
        last = idx;
        bumpPointer();
        // Diradare le note quando la ruota è veloce, così non diventano un ronzio
        if (now - lastNote > 90) {
          lastNote = now;
          sfx.tick(step++, Math.pow(p, 1.5));
        }
      }
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
      host('shock', pick(['Noooo! Bancarotta!', 'Ahia… che sfortuna!', 'Oh no, si riparte da zero!']));
      crowd('ooh', 1400);
      sfx.ooh();
      nextTurn(1800);
    } else if (seg.t === 'PASSA') {
      sfx.passa();
      ls.innerHTML = '<b class="bad">PASSA</b>';
      say(`⏭️ Passa! ${p.name} cede il turno.`, 'bad');
      host('sad', pick(['Passa la mano!', 'Turno al prossimo!', 'Peccato, si passa!']));
      nextTurn(1500);
    } else {
      S.spinValue = seg.v;
      sfx.land();
      S.phase = 'consonant';
      ls.innerHTML = `Valore: <b>${fmt(seg.v)}</b>`;
      if (seg.v >= 900) { host('wow', `${fmt(seg.v)}! Che colpo!`); crowd('clap', 900); }
      else host('present', pick([`${fmt(seg.v)}! Una consonante?`, `${fmt(seg.v)} a lettera!`, `Bene, ${fmt(seg.v)}!`]));
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
    const rows = layoutRows(S.puzzle.t);
    // Le caselle si adattano alla riga più lunga (min 10 colonne per non diventare enormi)
    board.style.setProperty('--cols', Math.max(10, ...rows.map((r) => r.length)));
    for (const rowText of rows) {
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
    $('#hint').innerHTML = S.puzzle.h ? `💡 <b>Indizio:</b> ${escapeHtml(S.puzzle.h)}` : '';
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
      later(() => { t.el.classList.add('lit'); sfx.ding(i); }, i * 420);
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
      if (count >= 3) { host('wow', `Ben ${count} "${L}"! Fantastico!`); crowd('clap', 1000); sfx.applause(1); }
      else if (count === 2) host('happy', pick([`Due "${L}"! Bravo!`, 'Doppietta!']));
      else host('happy', pick(["C'è!", 'Ottima scelta!', 'Eccola lì!', 'Sì!']));
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
      sfx.miss();
      host('sad', pick([`Niente "${L}"…`, 'Peccato!', 'Eh no…', "Nooo, non c'è!"]));
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
    host('present', pick(['Una vocale, ottima idea!', 'Vocale in arrivo!', 'Quale vocale?']));
    say(p.cpu ? `${p.name} compra una vocale…` : 'Vocale acquistata: scegline una.');
    updateUI();
    if (p.cpu) cpuAct();
  }

  // Restituisce i soldi se la vocale è stata comprata per sbaglio
  function cancelVowel() {
    if (S.phase !== 'vowel') return;
    P().round += VOWEL_COST;
    S.phase = 'turn';
    host('present', 'Nessun problema, soldi restituiti!');
    say(`Acquisto annullato: ${fmt(VOWEL_COST)} restituiti.`);
    updateUI();
  }

  function attemptSolve(text) {
    const p = P();
    if (norm(text) === norm(S.puzzle.t)) {
      say(`🎉 Esatto! ${p.name} risolve la frase!`, 'good');
      winRound();
    } else {
      sfx.miss();
      sfx.ooh();
      crowd('ooh', 1400);
      host('sad', pick(['Quasi… ma no!', 'Uh, non è quella!', 'Che peccato!']));
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
      promptTurn(true);
    }, delay);
  }

  function promptTurn(newTurn = false) {
    const p = P();
    const cons = remaining('cons').length;
    const vow = remaining('vow').length;
    if (newTurn) {
      if (p.cpu) host('think', `Vediamo cosa fa ${p.name}…`, 0);
      else host('present', pick([`Tocca a te, ${p.name}!`, `${p.name}, a te la ruota!`, `Forza ${p.name}!`]));
    }
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
    sfx.applause(3);
    crowd('cheer', 3200);
    host('wow', pick(['WOW! Risolta!!', 'Incredibile! Bravissimo!', 'Che campione!']), 4500);
    confetti();
    updateUI();
    later(() => showRoundModal(p, prize), 1800);
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
    // Durante la scelta della vocale il pulsante diventa "Annulla vocale" (rimborso)
    const buy = $('#buyBtn');
    const canCancel = human && S.phase === 'vowel';
    buy.classList.toggle('cancel', canCancel);
    buy.innerHTML = canCancel ? `Annulla vocale <small>+${VOWEL_COST} €</small>` : `Compra vocale <small>${VOWEL_COST} €</small>`;
    buy.disabled = !(canCancel || (human && S.phase === 'turn' && p.round >= VOWEL_COST && vow > 0));
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
    $('#solveHint').textContent = `${S.puzzle.c} · ${S.tiles.length} lettere${S.puzzle.h ? ' · 💡 ' + S.puzzle.h : ''}`;
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
    const joke = nextJoke() || { q: '', a: '' };
    showModal(`
      <h3>Round ${S.round} vinto!</h3>
      <p class="muted">${escapeHtml(p.name)} si aggiudica</p>
      <div class="result-big">+${fmt(prize)}</div>
      <div class="solution">${escapeHtml(S.puzzle.t)}</div>
      <p class="muted">incluso il bonus soluzione di ${fmt(SOLVE_BONUS)}</p>
      <div class="joke">
        <span class="joke-who">🎤 Paolo chiede:</span>
        <p class="joke-q">${escapeHtml(joke.q)}</p>
        <button class="btn ghost" id="jokeBtn">Sentiamo la risposta…</button>
        <p class="joke-a hidden" id="jokeA">${escapeHtml(joke.a)} 🥁</p>
      </div>
      <button class="btn primary big" id="nextRoundBtn">${last ? 'Classifica finale' : 'Prossimo round'}</button>`);
    $('#jokeBtn').onclick = () => {
      $('#jokeBtn').classList.add('hidden');
      $('#jokeA').classList.remove('hidden');
      sfx.rimshot();
      sfx.applause(1.2);
    };
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
    sfx.fanfare();
    sfx.applause(4);
    crowd('cheer', 4500);
    host('wow', winner.cpu ? 'Che partita! Applausi!' : `Complimenti ${winner.name}!`, 0);
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
    host('present', `Round ${S.round}! Categoria: ${S.puzzle.c}`, 3200);
    crowd('clap', 900);
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
  $('#buyBtn').addEventListener('click', () => {
    if (!humanTurn()) return;
    if (S.phase === 'vowel') cancelVowel();
    else buyVowel();
  });
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
  $('#host').addEventListener('click', () => {
    if (['spinning', 'revealing', 'roundEnd'].includes(S.phase)) return;
    tellJoke();
  });
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
  buildAudience();
  let resizeT = null;
  addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(buildAudience, 250); });
  host('present', 'Benvenuti a Ruota Matta! Cliccami per una battuta 😄', 0);
  drawWheel();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawWheel);
})();
