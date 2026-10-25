// 播放：Salamander 钢琴采样（js/samples.js 里的 data URI），Tone.Sampler 移调补齐中间的音
(function () {
  let piano = null, ready = false;
  const waiters = [];

  function init() {
    piano = new Tone.Sampler({
      urls: window.PIANO_SAMPLES,
      release: 1.2,
      onload: () => { ready = true; waiters.splice(0).forEach(f => f()); },
    }).toDestination();
  }

  // 苹果设备：必须在用户点击里启动音频；audioSession=playback 让静音键开着也能出声
  async function unlock() {
    try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) {}
    await Tone.start();
  }

  const whenReady = () => ready ? Promise.resolve() : new Promise(r => waiters.push(r));
  const f = m => Tone.Frequency(m, "midi").toNote();

  function stop() { if (piano) piano.releaseAll(); }

  function setVolume(v) { Tone.Destination.volume.value = v <= 0 ? -Infinity : 20 * Math.log10(v); }

  // 按题型安排播放，返回总时长（秒）
  function play(it, opt) {
    stop();
    let t = Tone.now() + 0.05;
    const hit = (notes, dur, at, vel = 0.7) => piano.triggerAttackRelease(notes.map(f), dur, at, vel);
    if (it.ref && (it.kind === "single" || opt.ref)) {
      hit(it.ref, 1.0, t, 0.5);
      t += 1.4;
    }
    if (it.kind === "single") {
      hit(it.notes, 1.6, t);
      t += 1.6;
    } else if (it.kind === "chord") {
      if (opt.arp) {
        it.notes.forEach((n, i) => hit([n], 0.6, t + i * 0.22));
        t += it.notes.length * 0.22 + 0.4;
      }
      hit(it.notes, 2.2, t);
      t += 2.2;
    } else if (it.kind === "phrase") {
      const step = 30 / opt.bpm; // 八分音符
      it.notes.forEach((n, i) => hit([n], step * 1.6, t + i * step, i === 0 ? 0.75 : 0.65));
      t += it.notes.length * step + 0.6;
    } else if (it.kind === "prog") {
      it.chords.forEach((c, i) => hit(c.notes, 1.35, t + i * 1.4));
      t += it.chords.length * 1.4;
    }
    return t - Tone.now();
  }

  function note(m, vel = 0.7) { if (ready) piano.triggerAttackRelease(f(m), 1.2, Tone.now(), vel); }
  function chord(ms, dur = 1.6) { if (ready) piano.triggerAttackRelease(ms.map(f), dur, Tone.now() + 0.02, 0.6); }

  window.Audio2 = { init, unlock, whenReady, play, stop, note, chord, setVolume };
})();
