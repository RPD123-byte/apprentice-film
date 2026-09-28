import sys
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s22-fix1-h')
from run import build, Lab
L = Lab(build('entry.js', 'bundle.js'))
js = r'''() => {
  const W = 2206, H = 946;
  const mk = (w, h, wr) => { const c = document.createElement("canvas"); c.width = w; c.height = h; c.getContext("2d", wr ? { willReadFrequently: true } : undefined); return c; };
  const out = {};
  for (const wr of [true, false]) {
    const A = mk(W, H, wr), B = mk(W, H, wr), h2 = mk(1103, 473, wr), sm = mk(276, 118, wr);
    const a = A.getContext("2d"), b = B.getContext("2d");
    a.fillStyle = "#888"; a.fillRect(0, 0, W, H);
    const sync = () => { b.getImageData(0, 0, 1, 1); h2.getContext("2d").getImageData(0, 0, 1, 1); }; const T = (name, fn) => { fn(); sync(); const t0 = performance.now(); for (let i = 0; i < 5; i++) { fn(); sync(); } out[(wr ? "cpu " : "gpu ") + name] = ((performance.now() - t0) / 5).toFixed(1); };
    T("clear", () => b.clearRect(0, 0, W, H));
    T("copy", () => { b.globalCompositeOperation = "copy"; b.drawImage(A, 0, 0); b.globalCompositeOperation = "source-over"; });
    T("lighter", () => { b.globalCompositeOperation = "lighter"; b.drawImage(A, 0, 0); b.globalCompositeOperation = "source-over"; });
    T("half", () => { const g = h2.getContext("2d"); g.drawImage(A, 0, 0, 1103, 473); });
    T("up8", () => { b.drawImage(sm, 0, 0, W, H); });
    T("up8clip", () => { b.save(); b.beginPath(); b.rect(0, 0, W, 160); b.rect(0, 160, 176, H - 160); b.rect(2000, 160, W - 2000, H - 160); b.clip(); b.drawImage(sm, 0, 0, W, H); b.restore(); });
  }
  return out;
}'''
print(L.p.evaluate(js))
L.close()
