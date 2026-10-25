# 把 build/samples/*.mp3 打包成 js/samples.js（data URI），双击打开 HTML 也能加载
import base64, os
here = os.path.dirname(os.path.abspath(__file__))
src = os.path.join(here, "samples")
out = os.path.join(here, "..", "js", "samples.js")
lines = ["// 由 build/make_samples.py 生成，勿手改。Salamander Grand Piano by Alexander Holm (CC-BY 3.0)", "window.PIANO_SAMPLES = {"]
for f in sorted(os.listdir(src)):
    if not f.endswith(".mp3"):
        continue
    note = f[:-4].replace("s", "#")
    b64 = base64.b64encode(open(os.path.join(src, f), "rb").read()).decode()
    lines.append(f'  "{note}": "data:audio/mp3;base64,{b64}",')
lines.append("};")
open(out, "w").write("\n".join(lines) + "\n")
print("wrote", out)
