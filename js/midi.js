// MIDI 输入：Mac 上 Chrome 原生支持；iPhone 要用 Web MIDI Browser 之类的 App 打开
(function () {
  const handlers = { on: () => {}, off: () => {}, status: () => {} };
  let access = null;

  function names() {
    return access ? [...access.inputs.values()].map(i => i.name) : [];
  }

  function attach() {
    for (const input of access.inputs.values()) {
      input.onmidimessage = e => {
        const [st, d1, d2] = e.data;
        const type = st & 0xf0;
        if (type === 0x90 && d2 > 0) handlers.on(d1, d2 / 127);
        else if (type === 0x80 || (type === 0x90 && d2 === 0)) handlers.off(d1);
      };
    }
    handlers.status(names());
  }

  async function init(on, off, status) {
    Object.assign(handlers, { on, off, status });
    if (!navigator.requestMIDIAccess) { status(null); return; }
    try {
      access = await navigator.requestMIDIAccess();
      access.onstatechange = attach;
      attach();
    } catch (e) {
      status(null);
    }
  }

  window.Midi = { init };
})();
