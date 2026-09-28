# s22 pass-4 scratch driver: bundle entry.js, render frames headless, pair with source frames, metrics. Not part of the film.
import subprocess, sys, os, base64, glob, time, json, argparse
import numpy as np, cv2
from playwright.sync_api import sync_playwright
D = os.path.dirname(os.path.abspath(__file__))
ESB = '/Users/computer/node_modules/.bin/esbuild'
CH = glob.glob(os.path.expanduser('~/Library/Caches/ms-playwright/chromium_headless_shell-1228/*/chrome-headless-shell'))[0]
SRC = os.environ.get('S22SRC', '/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/src22')
def build(entry='entry.js', out='bundle.js'):
    r = subprocess.run([ESB, f'{D}/{entry}', '--bundle', '--format=iife', f'--outfile={D}/{out}', '--log-level=error'], capture_output=True, text=True)
    if r.returncode: print(r.stderr); sys.exit(1)
    open(f'{D}/h_{out}.html', 'w').write(open(f'{D}/h.tmpl').read().replace('BUNDLE', out))
    return f'h_{out}.html'
class Lab:
    def __init__(self, html):
        self.pw = sync_playwright().start()
        self.b = self.pw.chromium.launch(executable_path=CH, args=['--allow-file-access-from-files', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        self.p = self.b.new_page(viewport={'width': 2206, 'height': 946})
        self.p.on('console', lambda m: print('[js]', m.text) if m.type in ('error', 'warning') else None)
        self.p.on('pageerror', lambda e: print('[pageerror]', e))
        self.p.goto(f'file://{D}/{html}')
        self.p.evaluate('() => window.ready')
    def frame(self, t, raw=False):
        r = self.p.evaluate('([t, raw]) => window.R(t, {raw})', [t, raw])
        b = base64.b64decode(r['url'].split(',', 1)[1])
        return cv2.imdecode(np.frombuffer(b, np.uint8), cv2.IMREAD_COLOR), r['ms']
    def close(self): self.b.close(); self.pw.stop()
def src(F): return cv2.imread(f'{SRC}/f{F:04d}.png')
def gray(a): return cv2.cvtColor(a, cv2.COLOR_BGR2GRAY).astype(np.float32)
if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('out'); ap.add_argument('frames', help='F0:F1:step or comma list of frame numbers')
    ap.add_argument('--raw', action='store_true'); ap.add_argument('--nopair', action='store_true'); ap.add_argument('--entry', default='entry.js')
    a = ap.parse_args()
    if ':' in a.frames: f0, f1, st = [int(v) for v in a.frames.split(':')]; Fs = list(range(f0, f1 + 1, st))
    else: Fs = [int(v) for v in a.frames.split(',')]
    html = build(a.entry, 'bundle.js' if a.entry == 'entry.js' else a.entry.replace('.js', '.b.js'))
    os.makedirs(a.out, exist_ok=True)
    L = Lab(html); rows = []
    for F in Fs:
        t = F / 25; im, ms = L.frame(t, a.raw)
        cv2.imwrite(f'{a.out}/r{F:04d}.png', im)
        S = src(F)
        if S is not None and not a.raw:
            e3 = np.abs(cv2.GaussianBlur(gray(im), (0, 0), 3) - cv2.GaussianBlur(gray(S), (0, 0), 3)).mean()
            rows.append((F, t, ms, e3)); print(f'{F} {t:.2f}s {ms:.0f}ms s3MAE {e3:.2f}', flush=True)
            if not a.nopair:
                p = np.vstack([im, np.full((6, 2206, 3), (0, 0, 200), np.uint8), S])
                cv2.imwrite(f'{a.out}/pair{F:04d}.jpg', cv2.resize(p, None, fx=0.5, fy=0.5, interpolation=cv2.INTER_AREA), [cv2.IMWRITE_JPEG_QUALITY, 88])
        else: print(f'{F} {t:.2f}s {ms:.0f}ms', flush=True)
    L.close()
    if rows: print('mean s3MAE', np.mean([r[3] for r in rows]))
