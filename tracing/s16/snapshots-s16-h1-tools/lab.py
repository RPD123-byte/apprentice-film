# s16 scratch driver: bundle entry.js (esbuild, ESM), open h.html in headless chromium (file://, no server),
# run JS that paints a canvas and fetch it as a numpy array. Not part of the film.
import subprocess, sys, os, base64, glob
import numpy as np, cv2
from playwright.sync_api import sync_playwright
D = os.path.dirname(os.path.abspath(__file__))
ESB = '/Users/computer/node_modules/.bin/esbuild'
CH = glob.glob(os.path.expanduser('~/Library/Caches/ms-playwright/chromium_headless_shell-1228/*/chrome-headless-shell'))[0]
def build():
    r = subprocess.run([ESB, f'{D}/entry.js', '--bundle', '--format=esm', '--target=es2022', f'--outfile={D}/bundle.js', '--log-level=error'], capture_output=True, text=True)
    if r.returncode: print(r.stderr); sys.exit(1)
class Lab:
    def __init__(self, gpu=False):
        build()
        self.pw = sync_playwright().start()
        args = ['--allow-file-access-from-files', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
        self.b = self.pw.chromium.launch(executable_path=CH, args=args)
        self.p = self.b.new_page(viewport={'width': 2206, 'height': 946})
        self.p.on('console', lambda m: print('[js]', m.text) if m.type in ('error', 'warning') else None)
        self.p.on('pageerror', lambda e: print('[pageerror]', e))
        self.p.goto(f'file://{D}/h.html')
        self.p.wait_for_function('() => window.S16ready', timeout=120000)
    def js(self, code, arg=None): return self.p.evaluate(code, arg)
    def png(self, code, arg=None):
        url = self.p.evaluate(f'async (arg) => {{ const r = await ({code})(arg); return r.toDataURL("image/png"); }}', arg)
        a = np.frombuffer(base64.b64decode(url.split(',', 1)[1]), np.uint8)
        return cv2.imdecode(a, cv2.IMREAD_COLOR)
    def raw(self, n): return self.png('(n) => S16H.raw(n)', n)
    def graded(self, n, grain=True): return self.png('(a) => S16H.graded(a[0], a[1])', [n, grain])
    def close(self): self.b.close(); self.pw.stop()
