// ---------- The score: generative ambient music that grows with distance ----------
// Built live in the browser with the Web Audio API: no recordings, no licence, nothing downloaded. Off until the visitor
// turns it on (♪). setScale(s) takes 0 at Earth and 1 at the edge of the observable universe; each layer fades in with
// distance: a warm drone at home, a soft chord among the planets, a slow pulse and high bells among the stars, a dark
// low cluster and a rising tremolo in the cosmic web, and a wide swell at the edge. The key darkens from D major to D minor.
(function () {
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) { window.OwlMusic = { on: false, toggle() { }, setScale() { }, autoOn() { } }; return; }
  let ctx = null, master = null, verb = null, L = {}, scale = 0, target = 0, bellT = null, pulseT = null, on = false;
  const hz = m => 440 * Math.pow(2, (m - 69) / 12); // MIDI note → Hz
  const ramp = (p, v, t = 0.8) => { p.cancelScheduledValues(ctx.currentTime); p.setTargetAtTime(v, ctx.currentTime, t); };
  function impulse(sec, decay) { const n = ctx.sampleRate * sec, b = ctx.createBuffer(2, n, ctx.sampleRate); for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay); } return b; }
  function voice(type, freq, detune, gain, filt) { const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq; o.detune.value = detune || 0; const g = ctx.createGain(); g.gain.value = gain; o.connect(g); g.connect(filt); o.start(); return { o, g }; }
  function layer(cut, q) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cut; f.Q.value = q || 0.7; const g = ctx.createGain(); g.gain.value = 0; f.connect(g); g.connect(master); g.connect(verb); return { f, g, v: [] }; }
  function build() {
    ctx = new AC(); master = ctx.createGain(); master.gain.value = 0; const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3; master.connect(comp); comp.connect(ctx.destination);
    verb = ctx.createConvolver(); verb.buffer = impulse(5, 2.6); const vg = ctx.createGain(); vg.gain.value = 0.55; verb.connect(vg); vg.connect(comp);
    // 1. home: a warm drone on D, with slow movement in its filter
    L.home = layer(520); [[38, -6], [38, 7], [45, 0], [50, -3]].forEach(([m, d], i) => L.home.v.push(voice(i < 2 ? 'sawtooth' : 'triangle', hz(m), d, i < 2 ? 0.18 : 0.12, L.home.f)));
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.05; lg.gain.value = 180; lfo.connect(lg); lg.connect(L.home.f.frequency); lfo.start();
    // 2. planets: a soft open chord (D, A, E, F♯ → F as it darkens)
    L.chord = layer(1400, 0.5); [50, 57, 64, 66].forEach((m, i) => L.chord.v.push(voice('sawtooth', hz(m), (i % 2 ? 5 : -5), 0.07, L.chord.f))); L.third = L.chord.v[3];
    // 3. stars: a slow pulse (a felt heartbeat) and high bells, scheduled below
    L.pulse = layer(180); L.bell = layer(6000);
    // 4. the web: a dark low cluster (D and E♭) with tremolo, and a slowly rising tone
    L.dark = layer(700, 1.2); [26, 27, 38].forEach((m, i) => L.dark.v.push(voice('sawtooth', hz(m), i * 4, 0.16, L.dark.f)));
    const trem = ctx.createOscillator(), tg = ctx.createGain(); trem.frequency.value = 5.5; tg.gain.value = 0.35; trem.connect(tg); const tremAmp = ctx.createGain(); tremAmp.gain.value = 0.65; tg.connect(tremAmp.gain); L.dark.g.disconnect(); L.dark.g.connect(tremAmp); tremAmp.connect(master); tremAmp.connect(verb); trem.start();
    L.rise = layer(2400, 2); L.rise.v.push(voice('sine', hz(74), 0, 0.09, L.rise.f)); L.rise.v.push(voice('sine', hz(81), 0, 0.05, L.rise.f));
    // 5. the edge: a wide swell of filtered noise and octaves
    L.edge = layer(900, 0.4); const nb = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate), nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1; const ns = ctx.createBufferSource(); ns.buffer = nb; ns.loop = true; const ng = ctx.createGain(); ng.gain.value = 0.25; ns.connect(ng); ng.connect(L.edge.f); ns.start();
    [38, 50, 62, 69].forEach(m => L.edge.v.push(voice('triangle', hz(m), 0, 0.08, L.edge.f)));
  }
  function bell() { if (!on || !ctx) return; const lvl = band(scale, 0.38, 0.62); if (lvl > 0.02) { const notes = scale > 0.7 ? [74, 77, 79, 81, 84, 86] : [74, 76, 78, 81, 83, 86]; const t = ctx.currentTime; const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = hz(notes[Math.floor(Math.random() * notes.length)]); const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.11 * lvl, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0005, t + 4); o.connect(g); g.connect(L.bell.f); o.start(t); o.stop(t + 4.2); }
    bellT = setTimeout(bell, 1400 + Math.random() * 2600); }
  function pulse() { if (!on || !ctx) return; const lvl = band(scale, 0.42, 0.7) + 0.6 * band(scale, 0.72, 0.95); if (lvl > 0.02) { const t = ctx.currentTime; [0, 0.28].forEach((dt, k) => { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(58, t + dt); o.frequency.exponentialRampToValueAtTime(38, t + dt + 0.25); const g = ctx.createGain(); g.gain.setValueAtTime(0, t + dt); g.gain.linearRampToValueAtTime((k ? 0.22 : 0.32) * Math.min(1, lvl), t + dt + 0.015); g.gain.exponentialRampToValueAtTime(0.0005, t + dt + 0.45); o.connect(g); g.connect(L.pulse.f); o.start(t + dt); o.stop(t + dt + 0.5); }); }
    pulseT = setTimeout(pulse, scale > 0.72 ? 1100 : 1600); } /* the heartbeat quickens out in the web */
  const band = (s, a, b) => Math.max(0, Math.min(1, (s - a) / (b - a))); // 0 below a, 1 above b
  function mix() { if (!ctx) return; const s = scale;
    ramp(L.home.g.gain, 0.9 * (1 - 0.55 * band(s, 0.5, 0.9)), 1.2);
    ramp(L.chord.g.gain, 0.75 * band(s, 0.12, 0.3) * (1 - 0.7 * band(s, 0.72, 0.92)), 1.5);
    ramp(L.third.o.frequency, hz(band(s, 0.55, 0.75) > 0.5 ? 65 : 66), 3); /* F♯ falls to F: major to minor */
    ramp(L.chord.f.frequency, 900 + 1600 * band(s, 0.15, 0.6), 2);
    ramp(L.pulse.g.gain, 1, 0.5); ramp(L.bell.g.gain, 1, 0.5);
    ramp(L.dark.g.gain, 0.8 * band(s, 0.62, 0.85), 2); ramp(L.dark.f.frequency, 400 + 900 * band(s, 0.7, 1), 3);
    ramp(L.rise.g.gain, 0.6 * band(s, 0.7, 0.9), 2.5); L.rise.v.forEach((v, i) => ramp(v.o.frequency, hz((i ? 81 : 74) + 3 * band(s, 0.7, 1)), 6)); /* the high tone climbs a minor third */
    ramp(L.edge.g.gain, 0.9 * band(s, 0.9, 1), 3); ramp(L.edge.f.frequency, 500 + 2500 * band(s, 0.92, 1), 4); }
  let lastMix = 0;
  const api = {
    get on() { return on; },
    toggle() { if (on) this.stop(); else this.start(); },
    start() { try { if (!ctx) build(); ctx.resume(); on = true; ramp(master.gain, 0.55, 1.5); mix(); clearTimeout(bellT); clearTimeout(pulseT); bell(); pulse(); try { localStorage.setItem('owl-music', 'on'); } catch (e) { } } catch (e) { console.warn('music', e); } dispatchEvent(new Event('owlmusic')); },
    stop() { on = false; if (ctx) { ramp(master.gain, 0, 0.6); setTimeout(() => { if (!on && ctx) ctx.suspend(); }, 2500); } clearTimeout(bellT); clearTimeout(pulseT); try { localStorage.setItem('owl-music', 'off'); } catch (e) { } dispatchEvent(new Event('owlmusic')); },
    autoOn() { let pref = null; try { pref = localStorage.getItem('owl-music'); } catch (e) { } if (!on && pref !== 'off') this.start(); }, /* the tour starts the music unless the visitor has turned it off before */
    setScale(s, force) { target = Math.max(0, Math.min(1, s)); scale = target; const now = performance.now(); if (on && (force || now - lastMix > 400)) { lastMix = now; mix(); } } /* the audio ramps do the smoothing */
  };
  window.OwlMusic = api;
  document.addEventListener('visibilitychange', () => { if (!ctx || !on) return; if (document.hidden) ctx.suspend(); else ctx.resume(); });
})();
