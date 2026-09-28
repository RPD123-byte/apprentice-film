import os, glob
from playwright.sync_api import sync_playwright
D = os.path.dirname(os.path.abspath(__file__))
CH = glob.glob(os.path.expanduser('~/Library/Caches/ms-playwright/chromium_headless_shell-1228/*/chrome-headless-shell'))[0]
with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path=CH, args=['--allow-file-access-from-files', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    p = b.new_page(viewport={'width': 2206, 'height': 946})
    p.goto(f'file://{D}/h.html'); p.wait_for_function('() => window.REVready', timeout=180000)
    r = p.evaluate('''() => { const o = []; for (let n = 1143; n <= 1194; n++) { const a = performance.now(); REV.frame(n); o.push([n, Math.round(performance.now() - a)]); } return o; }''')
    print(r)
    r = p.evaluate('''() => { const o = []; for (let n = 1143; n <= 1194; n++) { const a = performance.now(); REV.frame(n); o.push([n, Math.round(performance.now() - a)]); } return o; }''')
    print('second pass', r)
    b.close()
