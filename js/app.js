// 界面与练习流程
(function () {
  const T = window.Theory, A = window.Audio2;
  const $ = s => document.querySelector(s);
  const pcOf = T.pc;

  // ---------- 存储 ----------
  // progress[itemId] = [练过几次, 最近一次是否一次就对(1/0)]
  const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
  const progress = load("ear.progress", {});
  const settings = Object.assign({ loop: true, gap: 3, strict: false, arp: false, bpm: 120, ref: true, autoNext: true, volume: 0.8, midiSound: false }, load("ear.settings", {}));
  const save = () => localStorage.setItem("ear.progress", JSON.stringify(progress));
  const saveSettings = () => localStorage.setItem("ear.settings", JSON.stringify(settings));

  // 每个小模块已听过多少、哪些没一次弹对
  const seen = {}, missed = {};
  function indexProgress() {
    for (const lf of T.leaves) { seen[lf.id] = new Set(); missed[lf.id] = new Set(); }
    for (const [id, [, ok]] of Object.entries(progress)) {
      const [lid, idx] = id.split(":");
      if (!seen[lid]) continue;
      seen[lid].add(+idx);
      if (!ok) missed[lid].add(+idx);
    }
  }
  indexProgress();

  const leafById = Object.fromEntries(T.leaves.map(l => [l.id, l]));
  const leavesOf = m => m.children || [m];
  const done = m => leavesOf(m).every(l => seen[l.id].size >= l.count);

  // ---------- 出题 ----------
  function pickInLeaf(lf) {
    const miss = [...missed[lf.id]];
    if (miss.length && Math.random() < 0.15) return T.makeItem(lf, miss[(Math.random() * miss.length) | 0]);
    const s = seen[lf.id];
    if (s.size < lf.count) {
      // 从常用的形状往后找，前几个没听全的形状里随机挑，调也随机
      const cands = [];
      for (let k = 0; k < lf.shapes.length && cands.length < 6; k++) {
        const keys = [];
        for (let j = 0; j < 12; j++) if (!s.has(k * 12 + j)) keys.push(k * 12 + j);
        if (keys.length) cands.push(keys);
      }
      const keys = cands[(Math.random() * cands.length) | 0];
      return T.makeItem(lf, keys[(Math.random() * keys.length) | 0]);
    }
    return T.makeItem(lf, (Math.random() * lf.count) | 0);
  }

  // 有多个小模块时：没听完的、靠前的更常出
  function pickInLeaves(leaves) {
    const w = leaves.map((l, i) => (seen[l.id].size < l.count ? 1 : 0.15) / (1 + i * 0.35));
    return pickInLeaf(leaves[weighted(w)]);
  }
  function weighted(w) {
    let r = Math.random() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < w.length; i++) if ((r -= w[i]) <= 0) return i;
    return w.length - 1;
  }

  // 混练：按真实音乐里出现的多少给权重
  const RIVER_W = { single: 1, phrases: 3, iv: 1.5, c3: 2, c4: 3, c5: 1, prog: 2 };
  function pickRiver() {
    const ms = T.LIST;
    return pickInLeaves(leavesOf(ms[weighted(ms.map(m => RIVER_W[m.id] || 1))]));
  }

  // ---------- 图标 ----------
  const svg = (inner, vb = "0 0 32 32") => `<svg viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
  const circ = n => svg(`<circle cx="16" cy="16" r="12"/><text x="16" y="21" font-size="14" text-anchor="middle" fill="currentColor" stroke="none" font-family="-apple-system,sans-serif">${n}</text>`);
  const ICONS = {
    river: svg(`<path d="M4 10c4-3 8 3 12 0s8 3 12 0M4 16c4-3 8 3 12 0s8 3 12 0M4 22c4-3 8 3 12 0s8 3 12 0"/>`),
    single: `<span class="glyph">♪</span>`,
    phrases: `<span class="glyph">♫</span>`,
    two: circ(2), three: circ(3), four: circ(4), five: circ(5),
    prog: svg(`<circle cx="16" cy="16" r="12"/><path d="M10 16h12M17 11l5 5-5 5"/>`),
    review: svg(`<circle cx="16" cy="16" r="12"/><circle cx="16" cy="16" r="6"/><circle cx="16" cy="16" r="1.5" fill="currentColor"/>`),
  };
  const RESET = svg(`<path d="M9 10a9 9 0 1 1-1.8 9.5M9 4v6h6"/>`);
  const CHEV = svg(`<path d="M10 13l6 6 6-6"/>`);
  const CHECK = svg(`<path d="M7 17l6 6 12-14"/>`);

  // ---------- 主页 ----------
  const RIVER = { id: "river", title: "全部混练", sub: "所有内容混在一起，按真实音乐里的常见程度出题", icon: "river" };
  const REVIEW = { id: "review", title: "回顾", sub: "自动播放你听过的每一个和弦", icon: "review" };
  const open = load("ear.open", {});

  function renderHome() {
    const rows = [RIVER, ...T.LIST, REVIEW];
    $("#list").innerHTML = rows.map(m => {
      const kids = m.children ? `<div class="kids ${open[m.id] ? "" : "hide"}">${m.children.map(c => `
        <div class="row kid" data-start="${c.id}">
          <div class="txt"><span class="t">${c.title.replace(/^X/, "")}</span><span class="n">${c.count.toLocaleString()}</span></div>
          ${done(c) ? `<span class="check">${CHECK}</span>` : ""}
          <button class="reset" data-reset="${c.id}">${RESET}</button>
        </div>`).join("")}</div>` : "";
      const ok = m.id !== "river" && m.id !== "review" && done(m);
      return `<div class="row top" data-start="${m.id}">
          <div class="icon">${ICONS[m.icon]}</div>
          <div class="txt"><div class="t">${m.title}${m.children ? `<button class="chev ${open[m.id] ? "up" : ""}" data-toggle="${m.id}">${CHEV}</button>` : ""}</div><div class="d">${m.sub}</div></div>
          ${ok ? `<span class="check">${CHECK}</span>` : ""}
          ${m.id === "review" ? "" : `<button class="reset" data-reset="${m.id}">${RESET}</button>`}
        </div>${kids}`;
    }).join("");
  }

  $("#list").addEventListener("click", async e => {
    const tg = e.target.closest("[data-toggle]");
    if (tg) { open[tg.dataset.toggle] = !open[tg.dataset.toggle]; localStorage.setItem("ear.open", JSON.stringify(open)); renderHome(); return; }
    const rs = e.target.closest("[data-reset]");
    if (rs) return askReset(rs);
    const st = e.target.closest("[data-start]");
    if (st) { await A.unlock(); start(st.dataset.start); }
  });

  // 重置要点两次：第一次变成"重置？"，3 秒内再点才清
  function askReset(btn) {
    if (!btn.classList.contains("armed")) {
      btn.classList.add("armed");
      btn.innerHTML = btn.dataset.reset === "river" ? "全部重置？" : "重置？";
      setTimeout(() => { if (btn.isConnected) renderHome(); }, 3000);
      return;
    }
    const id = btn.dataset.reset;
    const ids = id === "river" ? T.leaves.map(l => l.id) : leavesOf(leafById[id] || T.LIST.find(m => m.id === id)).map(l => l.id);
    for (const k of Object.keys(progress)) if (ids.includes(k.split(":")[0])) delete progress[k];
    save(); indexProgress(); renderHome();
  }

  // ---------- 练习 ----------
  let mode = null;   // {id, title, pick, leaves}
  let cur = null;    // 当前题
  let st = null;     // 作答状态
  let midiNames = null;

  function start(id) {
    if (id === "review") return startReview();
    let pick, leaves, title;
    if (id === "river") { pick = pickRiver; leaves = T.leaves; title = RIVER.title; }
    else {
      const m = T.LIST.find(x => x.id === id) || leafById[id];
      leaves = leavesOf(m);
      pick = () => pickInLeaves(leaves);
      title = (m.parent ? T.LIST.find(x => x.id === m.parent).title + " · " : "") + m.title.replace(/^X/, "");
    }
    mode = { id, title, pick, leaves };
    show("practice");
    next();
  }

  function stopTimers() { if (st) { clearTimeout(st.timer); clearTimeout(st.loop); } }

  function next() {
    stopTimers();
    const prev = cur && cur.id;
    for (let i = 0; i < 6; i++) { cur = mode.pick(); if (cur.id !== prev) break; } // 别连着出同一题
    st = { tries: 0, failed: false, revealed: false, solved: false, held: new Set(), group: new Set(), touch: new Set(), pos: 0, ci: 0, played: [] };
    renderPractice();
    listen();
  }

  // again=true 是自动重放：不再给参考和弦，状态文字也不覆盖（保留"不对"的提示）
  async function listen(again = false) {
    const s0 = st;
    if (!again) setStatus("听…", "");
    await A.whenReady();
    if (st !== s0) return;
    const dur = A.play(cur, again ? { ...settings, ref: false, noRef: true } : settings);
    stopTimers();
    st.timer = setTimeout(() => {
      if (st.solved || st.revealed) return;
      if (!again) setStatus(inputHint(), "");
      loopLater();
    }, dur * 1000);
  }

  // 没弹对就隔几秒再放一遍；正在按键/弹乐句弹到一半时往后推
  function loopLater(delay = settings.gap * 1000) {
    clearTimeout(st.loop);
    if (!settings.loop || st.solved || st.revealed) return;
    const s0 = st;
    st.loop = setTimeout(() => {
      if (st !== s0 || st.solved || st.revealed) return;
      if (st.held.size || st.touch.size || st.pos || st.ci) return loopLater();
      listen(true);
    }, delay);
  }

  const inputHint = () => midiNames && midiNames.length ? "在琴上弹出来" : "点下面的琴键弹出来";

  function renderPractice() {
    const seenN = mode.leaves.reduce((s, l) => s + seen[l.id].size, 0);
    const total = mode.leaves.reduce((s, l) => s + l.count, 0);
    $("#ptitle").textContent = mode.title;
    $("#pcount").textContent = `已练 ${seenN.toLocaleString()} / ${total.toLocaleString()}`;
    $("#answer").classList.toggle("shown", st.solved || st.revealed);
    $("#atitle").textContent = cur.title;
    $("#anotes").textContent = cur.answer;
    // 乐句/进行：显示进度点
    let dots = "";
    if (cur.kind === "phrase") dots = cur.notes.map((_, i) => `<i class="${i < st.pos ? "on" : ""}"></i>`).join("");
    if (cur.kind === "prog") dots = cur.chords.map((_, i) => `<i class="wide ${i < st.ci ? "on" : ""}"></i>`).join("");
    $("#dots").innerHTML = dots;
    $("#btnOk").classList.toggle("hide", !st.touch.size);
    $("#btnReveal").classList.toggle("hide", st.solved || st.revealed);
    renderKeys();
    renderMidi();
  }

  function setStatus(text, cls) {
    const el = $("#status");
    el.textContent = text;
    el.className = cls;
  }

  // ---------- 屏幕琴键 ----------
  const BLACK = new Set([1, 3, 6, 8, 10]);
  let kbLo = 48, kbHi = 83;
  function renderKeys() {
    const ns = cur.notes;
    kbLo = Math.min(...ns) - pcOf(Math.min(...ns));      // 从 C 开始
    kbHi = Math.max(...ns) + (11 - pcOf(Math.max(...ns))); // 到 B 结束
    if (kbHi - kbLo < 35) kbHi = kbLo + 35;                 // 至少三个八度
    const showAns = st.solved || st.revealed;
    const ans = new Set(cur.kind === "prog" ? cur.chords[Math.min(st.ci, cur.chords.length - 1)].notes : ns);
    const whites = [];
    for (let m = kbLo; m <= kbHi; m++) if (!BLACK.has(pcOf(m))) whites.push(m);
    const w = 100 / whites.length;
    let html = "";
    whites.forEach((m, i) => {
      html += `<div class="wk ${keyCls(m, ans, showAns)}" data-m="${m}" style="left:${i * w}%;width:${w}%">${pcOf(m) === 0 ? `<span>C${Math.floor(m / 12) - 1}</span>` : ""}</div>`;
    });
    whites.forEach((m, i) => {
      if (BLACK.has(pcOf(m + 1)) && m + 1 <= kbHi) html += `<div class="bk ${keyCls(m + 1, ans, showAns)}" data-m="${m + 1}" style="left:${(i + 1) * w - w * 0.3}%;width:${w * 0.6}%"></div>`;
    });
    $("#keys").innerHTML = html;
  }
  function keyCls(m, ans, showAns) {
    return [st.held.has(m) || st.touch.has(m) ? "down" : "", showAns && ans.has(m) ? "ans" : ""].join(" ");
  }

  $("#keys").addEventListener("pointerdown", e => {
    const k = e.target.closest("[data-m]");
    if (!k) return;
    e.preventDefault();
    const m = +k.dataset.m;
    A.note(m);
    if (st.timer && !st.solved) loopLater();
    // 单音/乐句：点一下就算弹一个音；和弦类：点选几个键再按"确定"
    if (cur.kind === "single" || cur.kind === "phrase") { onNotes([m]); flash(k); }
    else { st.touch.has(m) ? st.touch.delete(m) : st.touch.add(m); renderPractice(); }
  });
  function flash(k) { k.classList.add("down"); setTimeout(() => k.classList.remove("down"), 180); }
  $("#btnOk").onclick = () => { const g = [...st.touch]; st.touch.clear(); onNotes(g); };

  // ---------- MIDI ----------
  // 和弦类：从第一个键按下到全部松开算一组
  function midiOn(m, vel) {
    if (!cur || $("#practice").classList.contains("hide")) return;
    if (settings.midiSound) A.note(m, vel);
    st.held.add(m);
    if (!st.solved) loopLater();
    if (cur.kind === "single" || cur.kind === "phrase") onNotes([m]);
    else st.group.add(m);
    renderKeys();
  }
  function midiOff(m) {
    if (!cur || !st) return;
    st.held.delete(m);
    if (!st.held.size && st.group.size && cur.kind !== "single" && cur.kind !== "phrase") {
      const g = [...st.group];
      st.group.clear();
      onNotes(g);
    }
    renderKeys();
  }
  function renderMidi() {
    $("#midi").textContent = midiNames === null ? "这个浏览器读不了 MIDI · 可以点屏幕琴键作答"
      : midiNames.length ? "已连接：" + midiNames.join("、") : "没找到 MIDI 琴 · 插上琴就行，也可以点屏幕琴键";
    $("#midi").className = midiNames && midiNames.length ? "ok" : "";
  }

  // ---------- 判定 ----------
  const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
  function matchChord(input, target) {
    const a = [...input].sort((x, y) => x - y), b = [...target].sort((x, y) => x - y);
    if (settings.strict) return same(a, b);
    // 宽松：音名集合一样，最低音也一样（转位要对，八度随意）
    const sa = [...new Set(a.map(pcOf))].sort(), sb = [...new Set(b.map(pcOf))].sort();
    return same(sa, sb) && pcOf(a[0]) === pcOf(b[0]);
  }
  const matchNote = (m, t) => settings.strict ? m === t : pcOf(m) === pcOf(t);

  function onNotes(notes) {
    if (st.solved) return;
    if (cur.kind === "single") {
      notes.some(m => matchNote(m, cur.notes[0])) ? win() : miss("不对，再试试");
    } else if (cur.kind === "chord") {
      matchChord(notes, cur.notes) ? win() : miss(notes.length !== cur.notes.length && settings.strict ? `要弹 ${cur.notes.length} 个音` : "不对，再试试");
    } else if (cur.kind === "phrase") {
      if (matchNote(notes[0], cur.notes[st.pos])) {
        st.pos++;
        if (st.pos === cur.notes.length) win(); else renderPractice();
      } else {
        miss(`第 ${st.pos + 1} 个音不对，从头再来`);
        st.pos = 0;
        renderPractice();
      }
    } else if (cur.kind === "prog") {
      const c = cur.chords[st.ci];
      let ok;
      if (settings.strict) ok = matchChord(notes, c.notes);
      else {
        const s = new Set(notes.map(pcOf));
        ok = pcOf(Math.min(...notes)) === c.root && c.guide.every(p => s.has(p));
      }
      if (ok) {
        st.ci++;
        if (st.ci === cur.chords.length) win(); else { setStatus(`第 ${st.ci} 个对了，接着弹`, "good"); renderPractice(); }
      } else { miss(`第 ${st.ci + 1} 个和弦不对，从头再来（根音在最低，3、7 音要有）`); renderPractice(); }
    }
  }

  function miss(text) {
    st.tries++; st.failed = true;
    setStatus("✗ " + text, "bad");
    if (cur.kind === "prog") st.ci = 0;
    loopLater(1500);
  }

  function record(ok) {
    const prev = progress[cur.id];
    progress[cur.id] = [(prev ? prev[0] : 0) + 1, ok ? 1 : 0];
    const [lid, idx] = cur.id.split(":");
    seen[lid].add(+idx);
    ok ? missed[lid].delete(+idx) : missed[lid].add(+idx);
    save();
  }

  function win() {
    stopTimers();
    st.solved = true;
    if (!st.revealed) record(!st.failed);
    setStatus(st.failed ? "✓ 对了" : "✓ 一次就对", "good");
    renderPractice();
    if (settings.autoNext && !st.revealed) st.timer = setTimeout(() => { if (cur && st.solved) next(); }, 1600);
  }

  $("#btnReveal").onclick = () => {
    if (!st.revealed && !st.solved) record(false);
    st.revealed = true; st.failed = true;
    stopTimers();
    setStatus("答案在下面，可以照着弹一遍", "");
    renderPractice();
  };
  $("#btnAgain").onclick = () => listen(st.tries > 0);
  $("#btnNext").onclick = () => next();
  $("#btnBack").onclick = () => { stopTimers(); A.stop(); cur = null; show("home"); };

  // ---------- 回顾：自动播放听过的和弦 ----------
  let rv = null;
  function startReview() {
    const ids = Object.keys(progress).filter(id => {
      const lf = leafById[id.split(":")[0]];
      return lf && (lf.kind === "chord" || lf.kind === "prog");
    });
    for (let i = ids.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [ids[i], ids[j]] = [ids[j], ids[i]]; }
    rv = { ids, i: 0, paused: false, timer: null };
    show("review");
    if (!ids.length) { $("#rtitle").textContent = "还没有听过的和弦"; $("#rnotes").textContent = "先去练几题和弦或音程再来"; $("#rcount").textContent = ""; return; }
    reviewStep();
  }
  async function reviewStep() {
    clearTimeout(rv.timer);
    if (rv.i >= rv.ids.length) rv.i = 0;
    const [lid, idx] = rv.ids[rv.i].split(":");
    const it = T.makeItem(leafById[lid], +idx);
    $("#rtitle").textContent = it.title;
    $("#rnotes").textContent = it.answer;
    $("#rcount").textContent = `${rv.i + 1} / ${rv.ids.length}`;
    await A.whenReady();
    const dur = A.play(it, { ...settings, ref: false });
    rv.timer = setTimeout(() => { if (!rv.paused) { rv.i++; reviewStep(); } }, (dur + 0.8) * 1000);
  }
  $("#rPause").onclick = () => {
    rv.paused = !rv.paused;
    $("#rPause").textContent = rv.paused ? "继续" : "暂停";
    if (!rv.paused && rv.ids.length) { rv.i++; reviewStep(); } else { clearTimeout(rv.timer); A.stop(); }
  };
  $("#rNext").onclick = () => { if (rv.ids.length) { rv.i++; reviewStep(); } };
  $("#rBack").onclick = () => { clearTimeout(rv.timer); A.stop(); show("home"); };

  // ---------- 设置 ----------
  function renderSettings() {
    const tg = (k, label, desc) => `<label class="set"><div><div class="t">${label}</div><div class="d">${desc}</div></div><input type="checkbox" data-k="${k}" ${settings[k] ? "checked" : ""}></label>`;
    $("#setbody").innerHTML =
      tg("loop", "没弹对就反复播放", "隔几秒自动再放一遍，直到弹对或揭晓；你按键时会等你") +
      `<label class="set"><div><div class="t">重放间隔</div><div class="d"><span id="gapv">${settings.gap}</span> 秒没动静就再放</div></div><input type="range" min="1" max="10" step="1" value="${settings.gap}" data-k="gap"></label>` +
      tg("strict", "严格判定", "八度也要和听到的一样；关掉时只看音名，转位要对") +
      tg("arp", "和弦先分解再柱式", "先一个一个音弹，再一起响") +
      tg("ref", "乐句前先给调", "放乐句前先弹一下主音+五度（单音题总会先给主和弦）") +
      tg("autoNext", "答对自动下一题", "") +
      tg("midiSound", "接琴时网页也出声", "电钢琴自己会响，一般不用开") +
      `<label class="set"><div><div class="t">乐句速度</div><div class="d"><span id="bpmv">${settings.bpm}</span> BPM（八分音符）</div></div><input type="range" min="60" max="220" step="10" value="${settings.bpm}" data-k="bpm"></label>` +
      `<label class="set"><div><div class="t">音量</div></div><input type="range" min="0" max="1" step="0.05" value="${settings.volume}" data-k="volume"></label>`;
  }
  $("#setbody").addEventListener("input", e => {
    const k = e.target.dataset.k;
    if (!k) return;
    settings[k] = e.target.type === "checkbox" ? e.target.checked : +e.target.value;
    if (k === "bpm") $("#bpmv").textContent = settings.bpm;
    if (k === "gap") $("#gapv").textContent = settings.gap;
    if (k === "volume") A.setVolume(settings.volume);
    saveSettings();
  });
  $("#btnSet").onclick = () => { renderSettings(); $("#settings").classList.remove("hide"); };
  $("#setClose").onclick = () => $("#settings").classList.add("hide");
  $("#settings").onclick = e => { if (e.target.id === "settings") $("#settings").classList.add("hide"); };

  // 音叉：练习中弹当前调的主和弦，主页弹 A4
  document.querySelectorAll(".fork").forEach(b => b.onclick = async () => {
    await A.unlock(); await A.whenReady();
    if (cur && cur.ref) A.chord(cur.ref); else A.note(69);
  });

  // ---------- 页面切换 ----------
  function show(page) {
    for (const p of ["home", "practice", "review"]) $("#" + p).classList.toggle("hide", p !== page);
    if (page === "home") renderHome();
    window.scrollTo(0, 0);
  }

  A.init();
  A.setVolume(settings.volume);
  Midi.init(midiOn, midiOff, names => { midiNames = names; if (cur) renderMidi(); });
  show("home");
})();
