import sys, os, base64, glob, time
import numpy as np, cv2
from playwright.sync_api import sync_playwright
D = os.path.dirname(os.path.abspath(__file__))
CH = glob.glob(os.path.expanduser('~/Library/Caches/ms-playwright/chromium_headless_shell-1228/*/chrome-headless-shell'))[0]
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
frames = [int(x) for x in sys.argv[2:]]
with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path=CH, args=['--allow-file-access-from-files', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    p = b.new_page(viewport={'width': 2206, 'height': 946})
    p.on('console', lambda m: print('[js]', m.text) if m.type in ('error', 'warning') else None)
    p.on('pageerror', lambda e: print('[pageerror]', e))
    p.goto(f'file://{D}/h.html')
    p.wait_for_function('() => window.REVready', timeout=180000)
    for n in frames:
        t0 = time.time()
        url = p.evaluate('(n) => REV.frame(n).toDataURL("image/png")', n)
        a = cv2.imdecode(np.frombuffer(base64.b64decode(url.split(',', 1)[1]), np.uint8), cv2.IMREAD_COLOR)
        cv2.imwrite(f'{out}/r{n}.png', a); print(n, f'{(time.time()-t0)*1000:.0f} ms', flush=True)
    b.close()
