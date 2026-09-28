import sys, base64, cv2, numpy as np
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s22-fix1-h')
import run
from playwright.sync_api import sync_playwright
html = run.build('entry.js', 'bundle.js')
pw = sync_playwright().start()
out = {}
for name, args in [('gpu', ['--allow-file-access-from-files']), ('ss', ['--allow-file-access-from-files', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])]:
    b = pw.chromium.launch(executable_path=run.CH, args=args)
    p = b.new_page(viewport={'width': 2206, 'height': 946})
    p.goto(f'file://{run.D}/{html}'); p.evaluate('() => window.ready')
    print(name, p.evaluate('() => { const c = document.createElement("canvas"); const gl = c.getContext("webgl"); const e = gl && gl.getExtension("WEBGL_debug_renderer_info"); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : "?"; }'))
    for t in (76.0, 84.0):
        r = p.evaluate('(t) => window.R(t, {})', t)
        im = cv2.imdecode(np.frombuffer(base64.b64decode(r['url'].split(',', 1)[1]), np.uint8), cv2.IMREAD_COLOR)
        cv2.imwrite(f'/Users/computer/rootline/apprentice-film/snapshots/s22-fix1-gpu/{name}_{t}.png', im)
        rr = p.evaluate('(t) => window.R(t, {raw: true})', t)
        im = cv2.imdecode(np.frombuffer(base64.b64decode(rr['url'].split(',', 1)[1]), np.uint8), cv2.IMREAD_COLOR)
        cv2.imwrite(f'/Users/computer/rootline/apprentice-film/snapshots/s22-fix1-gpu/{name}_raw_{t}.png', im)
    b.close()
pw.stop()
