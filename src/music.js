// ---------- The score: generative music that sounds like home near Earth and grows strange as you leave ----------
// Built live in the browser with the Web Audio API: no recordings, no licence, nothing downloaded. On by default: browsers
// only allow sound after the visitor's first click, tap or key, so it starts then, unless the visitor has stopped it before
// (♪, remembered on this device). setScale(s) takes 0 at Earth and 1 at the edge of the observable universe.
// Near Earth: a high, bright melody over a warm D-major chord. Flying out, everything sinks: the chord glides down about two
// octaves, major turns minor, then half-diminished, then a dissonant cluster (a minor second and a tritone); the melody
// slows, drops lower and loses its consonant notes, then falls silent; a low drone, a slow heartbeat and a dark tremolo
// rise underneath. Flying back reverses all of it, so returning to Earth sounds like coming home.
(function () {
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) { window.OwlMusic = { on: false, toggle() { }, setScale() { }, autoOn() { }, start() { }, stop() { } }; return; }
  let ctx = null, master = null, verb = null, L = {}, scale = 0, melT = null, pulseT = null, on = false, melPos = 3, melCount = 0;
  const hz = m => 440 * Math.pow(2, (m - 69) / 12); // MIDI note → Hz
  const band = (s, a, b) => Math.max(0, Math.min(1, (s - a) / (b - a))); // 0 below a, 1 above b
  const ramp = (p, v, t = 0.8) => { p.cancelScheduledValues(ctx.currentTime); p.setTargetAtTime(v, ctx.currentTime, t); };
  function impulse(sec, decay) { const n = ctx.sampleRate * sec, b = ctx.createBuffer(2, n, ctx.sampleRate); for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay); } return b; }
  function voice(type, freq, detune, gain, dest) { const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq; o.detune.value = detune || 0; const g = ctx.createGain(); g.gain.value = gain; o.connect(g); g.connect(dest); o.start(); return { o, g }; }
  function layer(cut, q) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cut; f.Q.value = q || 0.7; const g = ctx.createGain(); g.gain.value = 0; f.connect(g); g.connect(master); g.connect(verb); return { f, g, v: [] }; }

  // The harmony at a given distance. root: the chord's bass note (MIDI), gliding from D4 (62) at home down to C2 (36) at the edge.
  // chord: intervals above the root. scale: the notes the melody may use (semitones above the root, two octaves).
  const rootAt = s => 62 - 26 * band(s, 0.04, 1);
  function harmony(s) {
    if (s < 0.36) return { chord: [0, 4, 7, 12], scale: [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24] };        // D major, pentatonic melody: home
    if (s < 0.6) return { chord: [0, 3, 7, 10], scale: [0, 3, 5, 7, 10, 12, 15, 17, 19, 22, 24] };        // minor seventh, minor pentatonic
    if (s < 0.8) return { chord: [0, 3, 6, 10], scale: [0, 1, 3, 6, 7, 10, 12, 13, 15, 18, 19] };         // half-diminished, a flat second and a tritone in the tune
    return { chord: [0, 1, 6, 11], scale: [0, 1, 6, 7, 11, 12, 13, 18] };                                 // cluster: minor second, tritone, major seventh
  }

  function build() {
    ctx = new AC(); master = ctx.createGain(); master.gain.value = 0; const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3; master.connect(comp); comp.connect(ctx.destination);
    verb = ctx.createConvolver(); verb.buffer = impulse(5, 2.6); const vg = ctx.createGain(); vg.gain.value = 0.55; verb.connect(vg); vg.connect(comp);
    // 1. the chord: four soft voices whose pitches glide with distance (bright and high at home, low and dark far out)
    L.pad = layer(2600, 0.5); for (let i = 0; i < 4; i++) { L.pad.v.push(voice('triangle', hz(62), -4, 0.11, L.pad.f)); L.pad.v.push(voice('sawtooth', hz(62), 5, 0.035, L.pad.f)); }
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.06; lg.gain.value = 260; lfo.connect(lg); lg.connect(L.pad.f.frequency); lfo.start(); /* the chord breathes */
    // 2. the melody: single plucked notes, scheduled below
    L.mel = layer(7000, 0.5);
    // 3. a low drone that rises underneath as you leave the Solar System
    L.drone = layer(420, 0.8); [[-12, -6], [-12, 7], [-5, 0]].forEach(([d, c]) => L.drone.v.push(voice('sawtooth', hz(50), c, 0.16, L.drone.f))); L.drone.int = [-12, -12, -5];
    // 4. the heartbeat, scheduled below
    L.pulse = layer(180);
    // 5. the dark: a low minor-second cluster with a tremolo, for the cosmic web
    L.dark = layer(700, 1.2); [26, 27, 32].forEach((m, i) => L.dark.v.push(voice('sawtooth', hz(m), i * 4, 0.16, L.dark.f))); /* D, E♭ and the tritone A♭ */
    const trem = ctx.createOscillator(), tg = ctx.createGain(); trem.frequency.value = 5.5; tg.gain.value = 0.35; trem.connect(tg); const tremAmp = ctx.createGain(); tremAmp.gain.value = 0.65; tg.connect(tremAmp.gain); L.dark.g.disconnect(); L.dark.g.connect(tremAmp); tremAmp.connect(master); tremAmp.connect(verb); trem.start();
    // 6. the edge: a wide swell of filtered noise
    L.edge = layer(900, 0.4); const nb = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate), nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1; const ns = ctx.createBufferSource(); ns.buffer = nb; ns.loop = true; const ng = ctx.createGain(); ng.gain.value = 0.25; ns.connect(ng); ng.connect(L.edge.f); ns.start();
    [36, 37, 42].forEach(m => L.edge.v.push(voice('triangle', hz(m), 0, 0.07, L.edge.f)));
  }

  // the melody: a gentle random walk over the scale, in phrases with rests; higher, quicker and brighter near home
  function melody() { if (!on || !ctx) return; const s = scale, lvl = 1 - band(s, 0.55, 0.86);
    const gap = 420 + 1500 * band(s, 0, 0.75);
    if (lvl > 0.02) {
      const sc = harmony(s).scale; melPos = Math.max(0, Math.min(sc.length - 1, melPos + [-2, -1, -1, 1, 1, 2][Math.floor(Math.random() * 6)]));
      melCount++;
      const rest = melCount % (6 + Math.floor(Math.random() * 3)) === 0; /* a breath between phrases */
      if (!rest) { const octave = s < 0.2 ? 12 : s < 0.5 ? 0 : -12; /* home sits an octave above the chord */
        const m = Math.round(rootAt(s)) + 12 + octave + sc[melPos], t = ctx.currentTime, dur = 1.6 + 1.6 * band(s, 0, 0.7);
        const o = ctx.createOscillator(); o.type = s < 0.36 ? 'sine' : 'triangle'; o.frequency.value = hz(m);
        const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = hz(m + 12); const g2 = ctx.createGain(); g2.gain.value = 0.25 * (1 - band(s, 0.2, 0.6)); /* a glassy overtone at home */
        const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.13 * lvl, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
        o.connect(g); o2.connect(g2); g2.connect(g); g.connect(L.mel.f); o.start(t); o2.start(t); o.stop(t + dur + 0.1); o2.stop(t + dur + 0.1); } }
    melT = setTimeout(melody, gap * (0.85 + Math.random() * 0.3)); }
  function pulse() { if (!on || !ctx) return; const lvl = band(scale, 0.45, 0.7) + 0.6 * band(scale, 0.75, 0.95); if (lvl > 0.02) { const t = ctx.currentTime; [0, 0.28].forEach((dt, k) => { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(58, t + dt); o.frequency.exponentialRampToValueAtTime(38, t + dt + 0.25); const g = ctx.createGain(); g.gain.setValueAtTime(0, t + dt); g.gain.linearRampToValueAtTime((k ? 0.22 : 0.32) * Math.min(1, lvl), t + dt + 0.015); g.gain.exponentialRampToValueAtTime(0.0005, t + dt + 0.45); o.connect(g); g.connect(L.pulse.f); o.start(t + dt); o.stop(t + dt + 0.5); }); }
    pulseT = setTimeout(pulse, scale > 0.75 ? 1100 : 1600); } /* the heartbeat quickens out in the web */

  function mix() { if (!ctx) return; const s = scale, root = rootAt(s), ch = harmony(s).chord;
    // the chord: each voice glides to its note (two oscillators per note), brightness falls with distance
    ch.forEach((iv, i) => { const f = hz(root + iv); ramp(L.pad.v[2 * i].o.frequency, f, 1.4); ramp(L.pad.v[2 * i + 1].o.frequency, f, 1.4); });
    ramp(L.pad.g.gain, 0.85 - 0.35 * band(s, 0.6, 1), 1.2); ramp(L.pad.f.frequency, 3000 - 2400 * band(s, 0, 0.9), 2);
    ramp(L.mel.g.gain, 1, 0.5); ramp(L.mel.f.frequency, 7000 - 5000 * band(s, 0.2, 0.8), 2);
    L.drone.v.forEach((v, i) => ramp(v.o.frequency, hz(root + L.drone.int[i]), 1.6));
    ramp(L.drone.g.gain, 0.75 * band(s, 0.3, 0.6), 2); ramp(L.drone.f.frequency, 300 + 400 * band(s, 0.5, 1), 3);
    ramp(L.pulse.g.gain, 1, 0.5);
    ramp(L.dark.g.gain, 0.8 * band(s, 0.62, 0.88), 2); ramp(L.dark.f.frequency, 400 + 900 * band(s, 0.7, 1), 3);
    ramp(L.edge.g.gain, 0.9 * band(s, 0.9, 1), 3); ramp(L.edge.f.frequency, 500 + 2500 * band(s, 0.92, 1), 4); }

  let lastMix = 0;
  const api = {
    get on() { return on || !!this.armed; }, /* armed (waiting for the first click) counts as on, so ♪ shows it will play */
    toggle() { if (on || this.armed) { if (this._disarm) this._disarm(); this.stop(); } else this.start(); },
    start() { try { if (!ctx) build(); ctx.resume(); on = true; ramp(master.gain, 0.55, 1.5); mix(); clearTimeout(melT); clearTimeout(pulseT); melody(); pulse(); try { localStorage.setItem('owl-music', 'on'); } catch (e) { } } catch (e) { console.warn('music', e); } dispatchEvent(new Event('owlmusic')); },
    stop() { on = false; if (ctx) { ramp(master.gain, 0, 0.6); setTimeout(() => { if (!on && ctx) ctx.suspend(); }, 2500); } clearTimeout(melT); clearTimeout(pulseT); try { localStorage.setItem('owl-music', 'off'); } catch (e) { } dispatchEvent(new Event('owlmusic')); },
    autoOn() { let pref = null; try { pref = localStorage.getItem('owl-music'); } catch (e) { } if (!on && pref !== 'off') this.start(); }, /* the tour starts the music unless the visitor has turned it off before */
    setScale(s, force) { scale = Math.max(0, Math.min(1, s)); const now = performance.now(); if (on && (force || now - lastMix > 400)) { lastMix = now; mix(); } }, /* the audio ramps do the smoothing */
    get scale() { return scale; }
  };
  window.OwlMusic = api;
  /* on by default: start at the first click, tap or key (browsers block sound before one), unless the visitor stopped it before.
     A press on a ♪ button is left to that button, so stopping the music never plays a note first. */
  { let pref = null; try { pref = localStorage.getItem('owl-music'); } catch (e) { } api.armed = pref !== 'off';
    const first = e => { const t = e.target; if (t && t.closest && t.closest('#gnMusic,#uniMusic')) return; /* the button's own toggle sees it armed and stops it */ disarm(); if (!on) api.start(); };
    const evs = ['pointerdown', 'keydown', 'touchend'];
    const disarm = () => { api.armed = false; evs.forEach(k => removeEventListener(k, first, true)); };
    if (api.armed) evs.forEach(k => addEventListener(k, first, true));
    api._disarm = disarm; }
  document.addEventListener('visibilitychange', () => { if (!ctx || !on) return; if (document.hidden) ctx.suspend(); else ctx.resume(); });
})();
