// 乐理：生成所有题目（形状 × 12 个调）
// 一个"形状"= 相对音高，transpose 到某个调才是一道具体的题
(function () {
  const NAMES = ["C", "D♭", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
  const SHARPS = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
  const SHARP_KEYS = new Set([2, 4, 6, 7, 9, 11]); // D E F♯ G A B 用升号拼写
  const pc = n => ((n % 12) + 12) % 12;
  const FLATS = ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"];
  const noteName = (m, key = 0) => (SHARP_KEYS.has(pc(key)) ? SHARPS : FLATS)[pc(m)] + (Math.floor(m / 12) - 1);

  // ---------- 和弦 ----------
  const TRIADS = [["", [0, 4, 7]], ["m", [0, 3, 7]], ["dim", [0, 3, 6]], ["aug", [0, 4, 8]], ["sus2", [0, 2, 7]], ["sus4", [0, 5, 7]]];
  const SHELLS = [["maj7", [0, 4, 11]], ["7", [0, 4, 10]], ["m7", [0, 3, 10]], ["6", [0, 4, 9]], ["dim7", [0, 3, 9]], ["mMaj7", [0, 3, 11]]];
  const SEVENTHS = [["maj7", [0, 4, 7, 11]], ["7", [0, 4, 7, 10]], ["m7", [0, 3, 7, 10]], ["m7♭5", [0, 3, 6, 10]], ["dim7", [0, 3, 6, 9]],
    ["mMaj7", [0, 3, 7, 11]], ["6", [0, 4, 7, 9]], ["m6", [0, 3, 7, 9]], ["7sus4", [0, 5, 7, 10]], ["maj7♯5", [0, 4, 8, 11]],
    ["7♯5", [0, 4, 8, 10]], ["add9", [0, 2, 4, 7]]];
  const FIVES = [["maj9", [0, 4, 7, 11, 2]], ["9", [0, 4, 7, 10, 2]], ["m9", [0, 3, 7, 10, 2]], ["7♭9", [0, 4, 7, 10, 1]], ["7♯9", [0, 4, 7, 10, 3]],
    ["6/9", [0, 4, 7, 9, 2]], ["m11", [0, 3, 7, 10, 5]], ["13", [0, 4, 10, 2, 9]], ["7♯11", [0, 4, 7, 10, 6]], ["maj7♯11", [0, 4, 7, 11, 6]]];

  // 枚举一个和弦的所有排列：低音是某个和弦音，其余音在跨度内任意摆放
  // doubled=true 时恰好有一个音重复（八度加倍）
  function voicings(pcs, n, { rootBass = false, maxSpan = 24, maxGap = 12, bassGap = 19 } = {}) {
    const out = [];
    const set = new Set(pcs.map(pc));
    const basses = rootBass ? [pcs[0]] : [...set];
    for (const b of basses) {
      const cands = [];
      for (let p = 1; p <= maxSpan; p++) if (set.has(pc(b + p))) cands.push(p);
      const pick = (start, chosen) => {
        if (chosen.length === n) {
          const notes = [0, ...chosen.slice(1)];
          const covered = new Set(notes.map(x => pc(x + b)));
          if (covered.size !== set.size) return;
          for (let i = 1; i < notes.length; i++) {
            const g = notes[i] - notes[i - 1];
            if (g > (i === 1 ? bassGap : maxGap)) return;
          }
          out.push({ bass: pc(b), notes });
          return;
        }
        for (let i = start; i < cands.length; i++) pick(i + 1, [...chosen, cands[i]]);
      };
      pick(0, [0]);
    }
    return out;
  }

  // 越常用越靠前：低音是根音、跨度小、先出现的和弦类型
  function chordShapes(list, n, opts) {
    const seen = new Set(), shapes = [];
    list.forEach(([sym, pcs], qi) => {
      for (const v of voicings(pcs, n, opts)) {
        const key = v.notes.join(",");
        if (seen.has(key)) continue; // 转位后音程结构相同的（如 dim7）只留一个
        seen.add(key);
        const span = v.notes[v.notes.length - 1];
        shapes.push({ notes: v.notes, sym, bass: v.bass, score: (v.bass === 0 ? 0 : 30) + span + qi * 2 });
      }
    });
    return shapes.sort((a, b) => a.score - b.score);
  }

  // ---------- 音程 ----------
  const IV_NAMES = ["纯一度", "小二度 m2", "大二度 M2", "小三度 m3", "大三度 M3", "纯四度 P4", "三全音 TT", "纯五度 P5", "小六度 m6", "大六度 M6", "小七度 m7", "大七度 M7", "纯八度 P8"];
  const ivName = i => i <= 12 ? IV_NAMES[i] : "复音程 " + IV_NAMES[i - 12].replace(/\s.*/, "") + "+八度";
  const intervalShapes = [];
  for (const i of [3, 4, 7, 5, 9, 8, 2, 10, 12, 1, 11, 6, 15, 16, 14, 13, 17, 19, 18, 21, 20, 22, 23, 24]) intervalShapes.push({ notes: [0, i], bass: 0, label: ivName(i) });

  // ---------- 单音（先给主和弦定调，再听一个音） ----------
  const DEG = ["1", "♭2", "2", "♭3", "3", "4", "♯4", "5", "♭6", "6", "♭7", "7"];
  const singleShapes = [];
  for (const r of [0, 12, -12]) for (const d of [0, 7, 4, 5, 2, 9, 11, 3, 10, 8, 1, 6]) singleShapes.push({ notes: [d + r], label: "第 " + DEG[d] + " 级" + (r > 0 ? "（高八度）" : r < 0 ? "（低八度）" : ""), ref: true });

  // ---------- 乐句 ----------
  const SCALES = [["大调", [0, 2, 4, 5, 7, 9, 11]], ["多利亚", [0, 2, 3, 5, 7, 9, 10]], ["混合利底亚", [0, 2, 4, 5, 7, 9, 10]], ["自然小调", [0, 2, 3, 5, 7, 8, 10]],
    ["利底亚", [0, 2, 4, 6, 7, 9, 11]], ["弗里几亚", [0, 1, 3, 5, 7, 8, 10]], ["洛克里亚", [0, 1, 3, 5, 6, 8, 10]], ["旋律小调", [0, 2, 3, 5, 7, 9, 11]],
    ["和声小调", [0, 2, 3, 5, 7, 8, 11]], ["Bebop 属", [0, 2, 4, 5, 7, 9, 10, 11]], ["Bebop 大调", [0, 2, 4, 5, 7, 8, 9, 11]],
    ["大调五声", [0, 2, 4, 7, 9]], ["小调五声", [0, 3, 5, 7, 10]], ["布鲁斯", [0, 3, 5, 6, 7, 10]]];
  const ARPS = [["大三", [0, 4, 7]], ["小三", [0, 3, 7]], ["maj7", [0, 4, 7, 11]], ["m7", [0, 3, 7, 10]], ["7", [0, 4, 7, 10]], ["m7♭5", [0, 3, 6, 10]],
    ["dim7", [0, 3, 6, 9]], ["maj9", [0, 4, 7, 11, 14]], ["m9", [0, 3, 7, 10, 14]], ["9", [0, 4, 7, 10, 14]]];
  // 音阶第 i 级（可越过八度）的音高
  const deg = (sc, i) => sc[((i % sc.length) + sc.length) % sc.length] + 12 * Math.floor(i / sc.length);
  const MAXN = 17;

  function phraseShapes() {
    const byLen = {};
    const seen = new Set();
    const add = (pitches, label) => {
      const n = pitches.length;
      if (n < 3 || n > MAXN) return;
      const lo = Math.min(...pitches), hi = Math.max(...pitches);
      if (hi - lo > 26) return;
      const notes = pitches.map(p => p - pitches[0]);
      const key = notes.join(",");
      if (seen.has(key)) return;
      seen.add(key);
      (byLen[n] = byLen[n] || []).push({ notes, start: pitches[0], label });
    };
    // 1. 音阶直线上行/下行，从各级出发
    for (const [name, sc] of SCALES) for (let s = 0; s < sc.length; s++) for (let n = 3; n <= MAXN; n++) {
      add(Array.from({ length: n }, (_, i) => deg(sc, s + i)), `${name}音阶 · 从第${s + 1}音上行`);
      add(Array.from({ length: n }, (_, i) => deg(sc, s - i)), `${name}音阶 · 从第${s + 1}音下行`);
    }
    // 2. 琶音：上行、下行、上去再下来
    for (const [name, ch] of ARPS) for (let s = 0; s < ch.length; s++) for (let n = 3; n <= MAXN; n++) {
      const up = Array.from({ length: n }, (_, i) => deg(ch, s + i));
      add(up, `${name} 琶音 · 上行`);
      add(Array.from({ length: n }, (_, i) => deg(ch, s - i)), `${name} 琶音 · 下行`);
      const half = Math.ceil(n / 2);
      add(Array.from({ length: n }, (_, i) => deg(ch, s + (i < half ? i : 2 * half - 2 - i))), `${name} 琶音 · 上去再下来`);
    }
    // 3. 模进型：1235 / 5321 / 三度 等小单元沿音阶走
    const CELLS = [["1-2-3-5", [0, 1, 2, 4]], ["5-3-2-1", [4, 2, 1, 0]], ["1-3-5-7", [0, 2, 4, 6]], ["7-5-3-1", [6, 4, 2, 0]], ["三度", [0, 2]], ["下行三度", [2, 0]], ["1-2-3", [0, 1, 2]]];
    for (const [name, sc] of SCALES.slice(0, 9)) for (const [cn, cell] of CELLS) for (const dir of [1, -1]) for (let s = 0; s < 7; s++) for (let n = 3; n <= MAXN; n++) {
      const p = [];
      for (let k = 0; p.length < n; k++) for (const c of cell) if (p.length < n) p.push(deg(sc, s + dir * k + c));
      add(p, `${name} · ${cn} 模进${dir > 0 ? "上行" : "下行"}`);
    }
    // 4. Bebop：包围音（上方音阶音 + 下方半音 → 目标）接琶音/音阶
    for (const [name, ch] of ARPS.slice(2, 7)) for (let t = 0; t < 4; t++) for (let n = 5; n <= MAXN; n++) {
      const target = deg(ch, t);
      const head = [target + 2, target - 1];
      add([...head, ...Array.from({ length: n - 2 }, (_, i) => deg(ch, t + i))], `Bebop · 包围 ${name} 第${t + 1}音后琶音上行`);
      add([...head, ...Array.from({ length: n - 2 }, (_, i) => deg(SCALES[9][1], [0, 2, 4, 6][t] - i))], `Bebop · 包围后 Bebop 属音阶下行`);
      add([target + 1, target - 1, ...Array.from({ length: n - 2 }, (_, i) => deg(ch, t - i))], `Bebop · 半音包围 ${name} 第${t + 1}音后琶音下行`);
    }
    return byLen;
  }

  // ---------- 和弦进行 ----------
  // [级数根音(半音), 和弦类型]；大调
  const Q = { maj7: [4, 11, 14], m7: [3, 10, 14], "7": [4, 10, 14], "7♭9": [4, 10, 13], "m7♭5": [3, 10, 6], mMaj7: [3, 11, 14], "6": [4, 9, 14] };
  const R = { I: [0, "maj7"], ii: [2, "m7"], iii: [4, "m7"], IV: [5, "maj7"], V: [7, "7"], vi: [9, "m7"], VI7: [9, "7"], II7: [2, "7"], III7: [4, "7"],
    bII7: [1, "7"], "iiø": [2, "m7♭5"], V7b9: [7, "7♭9"], i: [0, "mMaj7"], IV7: [5, "7"], "#ivø": [6, "m7♭5"], I7: [0, "7"], iv: [5, "m7"], "viiø": [11, "m7♭5"] };
  const PROGS = [
    "ii V", "V I", "ii V I", "iiø V7b9 i", "ii bII7 I", "I vi ii V", "iii vi ii V", "I VI7 ii V", "ii V iii VI7",
    "iii vi ii V I", "I vi ii V I", "I IV7 iii VI7 ii V", "I7 IV iv iii VI7 ii V", "#ivø VI7 ii V I",
    "I vi ii V iii VI7 ii V", "ii V I IV viiø III7 vi vi", "I VI7 II7 V iii VI7 ii V", "iii VI7 ii V I IV7 iii VI7"];
  function progShapes() {
    return PROGS.map(p => {
      const chords = p.split(" ").map(r => R[r]);
      let prev = [64, 67, 71];
      const seq = chords.map(([root, q]) => {
        const bass = 36 + root + (root < 5 ? 12 : 0);
        // 上方三个音（3、7、色彩音）各自就近走，prev 按声部角色记，不排序
        const upper = Q[q].map((iv, k) => {
          const target = prev[k];
          let best = null;
          for (let o = 48; o <= 84; o += 12) {
            const m = o + pc(root + iv);
            if (m < 57 || m > 79) continue;
            if (best === null || Math.abs(m - target) < Math.abs(best - target)) best = m;
          }
          return best;
        });
        prev = upper;
        return { root, q, notes: [bass, ...[...upper].sort((a, b) => a - b)] };
      });
      return { roman: p.replace(/ /g, " – ").replace(/b/g, "♭").replace("V7♭9", "V7♭9").replace("#", "♯"), chords: seq, notes: seq[0].notes };
    });
  }

  // ---------- 模块 ----------
  const modules = [];
  const leaf = (id, title, shapes, kind, extra = {}) => ({ id, title, shapes, kind, count: shapes.length * 12, ...extra });

  const single = leaf("single", "单音", singleShapes, "single", { icon: "single", sub: "一次一个音（先给主和弦定调）" });
  const phr = phraseShapes();
  const phraseLeaves = Object.keys(phr).map(Number).sort((a, b) => a - b).map(n => leaf("ph" + n, `${n} 音乐句`, phr[n], "phrase"));
  const phrases = { id: "phrases", title: "乐句", sub: "音阶 · 琶音 · bebop 乐句", icon: "phrases", children: phraseLeaves };
  const intervals = leaf("iv", "音程", intervalShapes, "chord", { icon: "two", sub: "两个音一起响 — m3、P5、M3…" });

  const c3 = { id: "c3", title: "3 音和弦", icon: "three", children: [
    leaf("c3t", "三和弦", chordShapes(TRIADS, 3), "chord"),
    leaf("c3s", "壳和弦（根-3-7）", chordShapes(SHELLS, 3, { rootBass: true }), "chord")] };
  const c4 = { id: "c4", title: "4 音和弦", icon: "four", children: SEVENTHS.map(([s, p], i) => leaf("c4_" + i, "X" + s, chordShapes([[s, p]], 4), "chord")) };
  const c5 = { id: "c5", title: "5 音和弦", icon: "five", children: [
    leaf("c5d", "七和弦加倍一个音", chordShapes(SEVENTHS.slice(0, 8), 5, { maxSpan: 28 }), "chord"),
    leaf("c5f", "九和弦/十一/十三", chordShapes(FIVES, 5, { maxSpan: 28 }), "chord")] };
  const sum = m => m.children.reduce((s, c) => s + c.count, 0);
  c3.sub = `${sum(c3).toLocaleString()} 种排列 · 三和弦与壳和弦`;
  c4.sub = `${sum(c4).toLocaleString()} 种排列 · 所有间距`;
  c5.sub = `${sum(c5).toLocaleString()} 种排列 · 加倍与完整`;
  const progs = leaf("prog", "和弦进行", progShapes(), "prog", { icon: "prog", sub: "从 ii–V 小单元到 8 个和弦的进行" });

  // 主页顺序；river / review 由 app.js 处理
  const LIST = [single, phrases, intervals, c3, c4, c5, progs];
  const leaves = [];
  LIST.forEach(m => m.children ? m.children.forEach(c => { c.parent = m.id; leaves.push(c); }) : leaves.push(m));

  // 把形状 + 调 变成一道具体的题
  function makeItem(lf, idx) {
    const shape = lf.shapes[Math.floor(idx / 12)];
    const key = idx % 12;
    const it = { id: lf.id + ":" + idx, leaf: lf, key, kind: lf.kind };
    if (lf.kind === "single") {
      const base = 60 + key - (key >= 6 ? 12 : 0);
      it.notes = [base + shape.notes[0]];
      it.ref = [base - 12, base - 8, base - 5]; // 主和弦 1-3-5（低八度）
      it.title = `${NAMES[key]} 大调 · ${shape.label}`;
      it.answer = noteName(it.notes[0], key);
    } else if (lf.kind === "chord") {
      const rootPc = key, bassPc = pc(key + shape.bass);
      let bass = 36 + bassPc;
      while (bass < 45) bass += 12; // 最低音落在 A2–G♯3，太低会发闷
      if (lf.id === "iv") bass += 12; // 音程放在中音区
      it.notes = shape.notes.map(n => bass + n);
      if (shape.label) { it.title = shape.label; it.answer = it.notes.map(n => noteName(n, bassPc)).join(" "); }
      else {
        const sym = lf.id.startsWith("c3s") ? shape.sym + "（壳）" : shape.sym;
        it.title = NAMES[rootPc] + sym + (shape.bass ? " / " + NAMES[bassPc] : "");
        it.answer = it.notes.map(n => noteName(n, rootPc)).join(" ");
      }
    } else if (lf.kind === "phrase") {
      const lo = Math.min(...shape.notes);
      let first = 48 + pc(key + shape.start); // 第一个音本身的音高
      while (first + lo < 52) first += 12;      // 整句最低音不低于 E3
      it.notes = shape.notes.map(n => first + n);
      it.title = `${NAMES[key]} ${shape.label}`;
      it.answer = it.notes.map(n => noteName(n, key)).join(" ");
      const t = 48 + key - (key > 7 ? 12 : 0);
      it.ref = [t, t + 7]; // 只给根音+五度，不暗示大小调
    } else if (lf.kind === "prog") {
      const shift = key > 6 ? key - 12 : key;
      // guide：宽松判定只要求 根音在最低 + 3 音 + 7 音
      it.chords = shape.chords.map(c => {
        const root = pc(c.root + key);
        return { name: NAMES[root] + c.q, notes: c.notes.map(n => n + shift), root, guide: [root, pc(root + Q[c.q][0]), pc(root + Q[c.q][1])] };
      });
      it.notes = it.chords.flatMap(c => c.notes);
      it.title = `${NAMES[key]} ${/(^| )i( |$)/.test(shape.roman.replace(/ – /g, " ")) ? "小调" : "大调"} · ${shape.roman}`;
      it.answer = it.chords.map(c => c.name).join(" → ");
    }
    return it;
  }

  window.Theory = { NAMES, pc, noteName, LIST, leaves, makeItem };
})();
