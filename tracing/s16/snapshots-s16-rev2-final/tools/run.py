# usage: run.py OUTDIR [grain|nograin|raw] frames...
import sys, os, base64, glob, time, subprocess
import numpy as np, cv2
from playwright.sync_api import sync_playwright
D = os.path.dirname(os.path.abspath(__file__))
ESB = '/Users/computer/node_modules/.bin/esbuild'
r = subprocess.run([ESB, f'{D}/entry.js', '--bundle', '--format=esm', '--target=es2022', f'--outfile={D}/bundle.js', '--log-level=error'], capture_output=True, text=True)
if r.returncode: print(r.stderr); sys.exit(1)
CH = glob.glob(os.path.expanduser('~/Library/Caches/ms-playwright/chromium_headless_shell-1228/*/chrome-headless-shell'))[0]
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
mode = sys.argv[2]
frames = [int(x) for x in sys.argv[3:]]
with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path=CH, args=['--allow-file-access-from-files', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    p = b.new_page(viewport={'width': 2206, 'height': 946})
    p.on('console', lambda m: print('[js]', m.type, m.text) if m.type in ('error', 'warning') else None)
    p.on('pageerror', lambda e: print('[pageerror]', e))
    p.goto(f'file://{D}/h.html')
    p.wait_for_function('() => window.REVready', timeout=180000)
    for n in frames:
        t0 = time.time()
        js = '(n) => REV.raw(n).toDataURL("image/png")' if mode == 'raw' else f'(n) => REV.frame(n, {str(mode=="grain").lower()}).toDataURL("image/png")'
        url = p.evaluate(js, n)
        a = cv2.imdecode(np.frombuffer(base64.b64decode(url.split(',', 1)[1]), np.uint8), cv2.IMREAD_COLOR)
        cv2.imwrite(f'{out}/r{n}.png', a); print(n, f'{(time.time()-t0)*1000:.0f} ms', 'mean', round(float(a.mean()),2), flush=True)
    b.close()
