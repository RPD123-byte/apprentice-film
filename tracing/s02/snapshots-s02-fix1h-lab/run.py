#!/usr/bin/env python3
# s02 r3 scratch driver (not part of the film): bundle entry.js, open h.html in headless chromium, render exact frames.
#   python3 run.py FRAMES OUTDIR [--raw] [--nopair]     FRAMES = "151,200,250" or "151-477:4"
# Writes OUTDIR/r####.png (render), pair-####.jpg (render | source), and prints sigma-8 blurred MAE per frame.
import subprocess, sys, os, base64, glob, time
import numpy as np, cv2
from playwright.sync_api import sync_playwright
D = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(D, '..', 's02-fix1h-src')
ESB = '/Users/computer/node_modules/.bin/esbuild'
CH = glob.glob(os.path.expanduser('~/Library/Caches/ms-playwright/chromium_headless_shell-1228/*/chrome-headless-shell'))[0]

ENTRY = os.environ.get('ENTRY', 'entry.js')
def build():
    r = subprocess.run([ESB, f'{D}/{ENTRY}', '--bundle', '--format=iife', f'--outfile={D}/bundle.js', '--log-level=error'], capture_output=True, text=True)
    if r.returncode: print(r.stderr); sys.exit(1)

def parse(s):
    out = []
    for part in s.split(','):
        if '-' in part:
            a, b = part.split('-'); st = 1
            if ':' in b: b, st = b.split(':'); st = int(st)
            out += list(range(int(a), int(b) + 1, st))
        else: out.append(int(part))
    return out

def src(f):
    return cv2.imread(f'{SRC}/{f:04d}.png')

def mae(a, b, s=8):
    ga = cv2.GaussianBlur(cv2.cvtColor(a, cv2.COLOR_BGR2GRAY).astype(np.float32), (0, 0), s)
    gb = cv2.GaussianBlur(cv2.cvtColor(b, cv2.COLOR_BGR2GRAY).astype(np.float32), (0, 0), s)
    return float(np.abs(ga - gb).mean()), float(ga.mean() - gb.mean())

class Lab:
    def __init__(self):
        build()
        self.pw = sync_playwright().start()
        self.b = self.pw.chromium.launch(executable_path=CH, args=['--allow-file-access-from-files', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        self.p = self.b.new_page(viewport={'width': 2206, 'height': 946})
        self.p.on('console', lambda m: print('[js]', m.text) if m.type in ('error', 'warning', 'log') else None)
        self.p.on('pageerror', lambda e: print('[pageerror]', e))
        self.p.goto(f'file://{D}/h.html')
        self.p.wait_for_function('() => window.LABready === true')
    def frame(self, f, graded=True):
        r = self.p.evaluate('([t, g]) => { const r = LAB.frame(t, g); return r; }', [f / 25, graded])
        b = base64.b64decode(r['url'].split(',', 1)[1])
        return cv2.imdecode(np.frombuffer(b, np.uint8), cv2.IMREAD_COLOR), r['ms']
    def js(self, code, arg=None):
        return self.p.evaluate(code, arg)
    def close(self):
        self.b.close(); self.pw.stop()

if __name__ == '__main__':
    frames = parse(sys.argv[1]); out = sys.argv[2]; raw = '--raw' in sys.argv; nopair = '--nopair' in sys.argv
    os.makedirs(out, exist_ok=True)
    L = Lab(); tot = []
    for f in frames:
        img, ms = L.frame(f, not raw)
        cv2.imwrite(f'{out}/r{f:04d}.png', img)
        s = src(f)
        m, d = mae(img, s)
        tot.append(m)
        print(f'f={f} t={f/25:.2f} ms={ms:.0f} mae8={m:.2f} mean-diff={d:+.2f}', flush=True)
        if not nopair:
            cv2.imwrite(f'{out}/pair-{f:04d}.jpg', np.hstack([img, s]), [cv2.IMWRITE_JPEG_QUALITY, 88])
            ga = cv2.GaussianBlur(img, (0, 0), 6); gb = cv2.GaussianBlur(s, (0, 0), 6)
            dd = cv2.cvtColor(np.clip(128 + (ga.astype(np.int16) - gb.astype(np.int16)) * 2, 0, 255).astype(np.uint8), cv2.COLOR_BGR2GRAY)
            top = np.hstack([ga, gb]); bot = np.hstack([cv2.cvtColor(dd, cv2.COLOR_GRAY2BGR), np.zeros_like(ga)])
            cv2.imwrite(f'{out}/blur-{f:04d}.jpg', cv2.resize(np.vstack([top, bot]), None, fx=0.5, fy=0.5), [cv2.IMWRITE_JPEG_QUALITY, 85])
    print('MEAN mae8', round(float(np.mean(tot)), 3))
    L.close()
