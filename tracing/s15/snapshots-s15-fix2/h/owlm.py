#!/usr/bin/env python3
# owlm.py OUT.jpg F1,F2,... : render only s15's owl (no grade) at those frames; print the render silhouette's extents
# vs the source's (bright bird connected near the track centre), and write crops with the render outline on the source
import subprocess, sys, os, base64, glob
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
from playwright.sync_api import sync_playwright
D = os.path.dirname(os.path.abspath(__file__))
ESB = '/Users/computer/node_modules/.bin/esbuild'
CH = glob.glob(os.path.expanduser('~/Library/Caches/ms-playwright/chromium_headless_shell-1228/*/chrome-headless-shell'))[0]
out = sys.argv[1]; fs = [int(x) for x in sys.argv[2].split(',')]
r = subprocess.run([ESB, f'{D}/entry_owl.js', '--bundle', '--format=esm', '--target=es2022', f'--outfile={D}/bundle_owlm.js', '--log-level=error'], capture_output=True, text=True)
if r.returncode: print(r.stderr); sys.exit(1)
open(f'{D}/hom.html', 'w').write(open(f'{D}/h.html').read().replace('bundle.js', 'bundle_owlm.js'))
pw = sync_playwright().start(); b = pw.chromium.launch(executable_path=CH, args=['--allow-file-access-from-files'])
p = b.new_page(viewport={'width': 2206, 'height': 946}); p.on('pageerror', lambda e: print('[pageerror]', e))
p.goto(f'file://{D}/hom.html'); p.wait_for_function('() => window.S15ready === true', timeout=120000)
def src_mask(f):
    g = gray(frame(f)); o = owl(f)
    m = (g > 215).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    k, lab, st, cen = cv2.connectedComponentsWithStats(m)
    cx, cy = int(o[1]), int(o[2]); best = 0; bd = 1e9
    for i in range(1, k):
        x, y, w, h, a = st[i]
        if a < 1500: continue
        d = abs(cen[i][0] - cx) + abs(cen[i][1] - cy)
        if d < bd: bd, best = d, i
    return (lab == best).astype(np.uint8) if best else np.zeros_like(m)
tiles = []
for f in fs:
    url = p.evaluate('(t) => window.S15.render(t)', f / 25)
    im = cv2.imdecode(np.frombuffer(base64.b64decode(url.split(',', 1)[1]), np.uint8), cv2.IMREAD_COLOR)
    rg = gray(im)
    rm = (rg > 150).astype(np.uint8)
    sm = src_mask(f)
    def ext(m):
        ys, xs = np.nonzero(m)
        return (xs.min(), xs.max(), ys.min(), ys.max()) if len(xs) else (0, 0, 0, 0)
    a, c = ext(rm), ext(sm)
    print(f'{f} {f/25:.2f} render x {a[0]}-{a[1]} (w {a[1]-a[0]}) y {a[2]}-{a[3]} | source x {c[0]}-{c[1]} (w {c[1]-c[0]}) y {c[2]}-{c[3]}', flush=True)
    s = frame(f).copy(); o = owl(f); cx, cy = int(o[1]), int(o[2])
    x0 = max(0, min(W - 520, cx - 260)); y0 = max(0, min(H - 460, cy - 240))
    cs, _ = cv2.findContours(rm, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE); cv2.drawContours(s, cs, -1, (0, 0, 255), 1)
    cs2, _ = cv2.findContours(sm, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE); cv2.drawContours(s, cs2, -1, (0, 255, 0), 1)
    A = im[y0:y0 + 460, x0:x0 + 520].copy(); B = s[y0:y0 + 460, x0:x0 + 520]
    cv2.putText(A, f'{f} {f/25:.2f}', (4, 18), 0, 0.55, (0, 255, 255), 1)
    tiles.append(np.hstack([A, B]))
while len(tiles) % 2: tiles.append(np.zeros_like(tiles[0]))
cv2.imwrite(out, np.vstack([np.hstack(tiles[i:i + 2]) for i in range(0, len(tiles), 2)]), [cv2.IMWRITE_JPEG_QUALITY, 86]); print('wrote', out)
b.close(); pw.stop()
