#!/usr/bin/env python3
# metrics.py RENDERDIR [--pairs] [--crop x0,y0,x1,y1]: per frame blurred MAE (sigma 8, luma), raw MAE, means, fine-detail ratio
import sys, os, glob, re, cv2, numpy as np, json
V = '/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
D = sys.argv[1]; pairs = '--pairs' in sys.argv
crop = None
if '--crop' in sys.argv: crop = [int(v) for v in sys.argv[sys.argv.index('--crop') + 1].split(',')]
fr = sorted(set(int(re.search(r'r(\d+)\.(png|webp)', p).group(1)) for p in glob.glob(D + '/r*.png') + glob.glob(D + '/r*.webp')))
SRC = os.environ.get('SRCDIR', '/Users/computer/rootline/apprentice-film/snapshots/s02-fix1r-src')
os.makedirs(SRC, exist_ok=True)
need = [f for f in fr if not (os.path.exists(f'{SRC}/{f:04d}.png') or os.path.exists(f'{SRC}/{f:04d}.webp'))]
if need:
    cap = cv2.VideoCapture(V); i = 0; mx = max(need); ns = set(need)
    while i <= mx:
        ok, im = cap.read()
        if not ok: break
        if i in ns: cv2.imwrite(f'{SRC}/{i:04d}.webp', im, [cv2.IMWRITE_WEBP_QUALITY, 101])
        i += 1
def dog(g): return cv2.GaussianBlur(g, (0, 0), 1) - cv2.GaussianBlur(g, (0, 0), 3)
rows = []
for f in fr:
    rp = f'{D}/r{f:04d}.png'; rp = rp if os.path.exists(rp) else rp[:-4] + '.webp'; sp = f'{SRC}/{f:04d}.png'; sp = sp if os.path.exists(sp) else sp[:-4] + '.webp'
    r = cv2.imread(rp); s = cv2.imread(sp)
    if crop: x0, y0, x1, y1 = crop; r = r[y0:y1, x0:x1]; s = s[y0:y1, x0:x1]
    rg = cv2.cvtColor(r, cv2.COLOR_BGR2GRAY).astype(np.float32); sg = cv2.cvtColor(s, cv2.COLOR_BGR2GRAY).astype(np.float32)
    bm = float(np.mean(np.abs(cv2.GaussianBlur(rg, (0, 0), 8) - cv2.GaussianBlur(sg, (0, 0), 8))))
    raw = float(np.mean(np.abs(rg - sg)))
    fd = float(np.std(dog(rg)) / max(1e-6, np.std(dog(sg))))
    rb, rgc, rr = [float(v) for v in r.reshape(-1, 3).mean(0)]; sb, sgc, sr = [float(v) for v in s.reshape(-1, 3).mean(0)]
    rows.append(dict(f=f, bm=bm, raw=raw, fd=fd, rm=float(rg.mean()), sm=float(sg.mean()), rG=rgc - (rr + rb) / 2, sG=sgc - (sr + sb) / 2))
    print(f"f{f} t={f/25:6.2f} blurMAE={bm:5.2f} raw={raw:5.2f} mean r/s={rg.mean():5.1f}/{sg.mean():5.1f} fine={fd:4.2f} G r/s={rows[-1]['rG']:+.2f}/{rows[-1]['sG']:+.2f}")
    if pairs:
        pr = np.vstack([r, s]); h = pr.shape[0]; sc = 1100 / pr.shape[1] if pr.shape[1] > 1100 else 1
        pr = cv2.resize(pr, None, fx=sc, fy=sc, interpolation=cv2.INTER_AREA)
        cv2.putText(pr, str(f), (8, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
        cv2.imwrite(f'{D}/s{f:04d}.jpg', pr, [cv2.IMWRITE_JPEG_QUALITY, 88])
if rows:
    print('MEAN blurMAE %.2f raw %.2f fine %.2f  (n=%d)' % (np.mean([r['bm'] for r in rows]), np.mean([r['raw'] for r in rows]), np.mean([r['fd'] for r in rows]), len(rows)))
json.dump(rows, open(D + '/metrics.json', 'w'))
if '--keep' not in sys.argv:
    for f in fr:
        p = f'{D}/r{f:04d}.png'
        if os.path.exists(p):
            im = cv2.imread(p); cv2.imwrite(p[:-4] + '.webp', im, [cv2.IMWRITE_WEBP_QUALITY, 101]); os.remove(p)
