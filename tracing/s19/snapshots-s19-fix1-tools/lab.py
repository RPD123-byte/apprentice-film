# s19 rebuild scratch driver: bundle entry.js, open h.html in headless chromium (file://), render frames, compare.
import subprocess, sys, os, base64, glob
import numpy as np, cv2
from playwright.sync_api import sync_playwright
D = os.path.dirname(os.path.abspath(__file__))
ESB = '/Users/computer/node_modules/.bin/esbuild'
CH = glob.glob(os.path.expanduser('~/Library/Caches/ms-playwright/chromium_headless_shell-1228/*/chrome-headless-shell'))[0]
VID = '/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
W, H = 2206, 946
def build():
    r = subprocess.run([ESB, f'{D}/entry.js', '--bundle', '--format=iife', f'--outfile={D}/bundle.js', '--log-level=error'], capture_output=True, text=True)
    if r.returncode: print(r.stderr); sys.exit(1)
_cap = None
_cache = {}
def src(t, gray=False):
    global _cap
    k = int(round(t * 25))
    if k not in _cache:
        if _cap is None: _cap = cv2.VideoCapture(VID)
        _cap.set(cv2.CAP_PROP_POS_FRAMES, k); ok, f = _cap.read(); assert ok
        _cache[k] = f
    f = _cache[k]
    return cv2.cvtColor(f, cv2.COLOR_BGR2GRAY) if gray else f
class Lab:
    def __init__(self, rebuild=True):
        if rebuild: build()
        self.pw = sync_playwright().start()
        self.b = self.pw.chromium.launch(executable_path=CH, args=['--allow-file-access-from-files', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        self.lost = False
        self._open()
    def _open(self):
        self.p = self.b.new_page(viewport={'width': W, 'height': H})
        def con(m):
            if 'LOST' in m.text or 'CONTEXT_LOST' in m.text: self.lost = True; return
            if m.type in ('error', 'warning') and 'GPU stall' not in m.text: print('[js]', m.text)
        self.p.on('console', con)
        self.p.on('pageerror', lambda e: print('[pageerror]', e))
        self.p.goto(f'file://{D}/h.html')
        self.p.evaluate('() => window.S19ready')
    def reopen(self):
        try: self.p.close()
        except Exception: pass
        self.lost = False; self._open()
    def _png(self, code, arg=None):
        url = self.p.evaluate(f'async (arg) => {{ const r = await ({code})(arg); return r.toDataURL("image/png"); }}', arg)
        a = np.frombuffer(base64.b64decode(url.split(',', 1)[1]), np.uint8)
        return cv2.imdecode(a, cv2.IMREAD_COLOR)
    def render(self, t, graded=True):
        for k in range(3):
            n0 = self.p.evaluate('() => window.__lostN || 0')
            if n0: print('[lab] GL context was lost earlier, reopening'); self.reopen(); continue
            im = self._png('(a) => S19.render(a.t, a.g)', {'t': t, 'g': graded})
            if not self.p.evaluate('() => window.__lostN || 0'): return im
            print('[lab] GL context lost, reopening and re-rendering', t); self.reopen()
        return im
    def dev(self, name, arg=None, graded=False):
        return self._png('(a) => S19.dev(a.n, a.a, a.g)', {'n': name, 'a': arg, 'g': graded})
    def devc(self, name, arg=None):
        url = self.p.evaluate('(a) => S19.devc(a.n, a.a).toDataURL("image/png")', {'n': name, 'a': arg})
        a = np.frombuffer(base64.b64decode(url.split(',', 1)[1]), np.uint8)
        return cv2.imdecode(a, cv2.IMREAD_UNCHANGED)
    def js(self, code, arg=None): return self.p.evaluate(code, arg)
    def close(self): self.b.close(); self.pw.stop()
def mae(a, b, sigma=8, box=None):
    a = cv2.cvtColor(a, cv2.COLOR_BGR2GRAY).astype(np.float32) if a.ndim == 3 else a.astype(np.float32)
    b = cv2.cvtColor(b, cv2.COLOR_BGR2GRAY).astype(np.float32) if b.ndim == 3 else b.astype(np.float32)
    if sigma: a = cv2.GaussianBlur(a, (0, 0), sigma); b = cv2.GaussianBlur(b, (0, 0), sigma)
    d = np.abs(a - b)
    if box: x0, y0, x1, y1 = box; d = d[y0:y1, x0:x1]
    return float(d.mean())
def pair(a, b, path, scale=0.5, box=None):
    if box: x0, y0, x1, y1 = box; a = a[y0:y1, x0:x1]; b = b[y0:y1, x0:x1]
    im = np.hstack([a, b]) if a.shape[1] < a.shape[0] * 1.2 else np.vstack([a, b])
    if scale != 1: im = cv2.resize(im, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
    cv2.imwrite(path, im, [cv2.IMWRITE_JPEG_QUALITY, 88])
def ungr_small(t, f=4):
    from s19common import ungrade
    u = ungrade(src(t, True).astype(np.float32), t)
    u = np.clip(np.nan_to_num(u), 0, 1)
    return cv2.resize(u, (round(W / f), round(H / f)), interpolation=cv2.INTER_AREA)
