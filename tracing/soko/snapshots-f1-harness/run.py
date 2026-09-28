# F1 scratch driver: bundle entry.js, open h.html in headless chromium (file://, no server), evaluate JS that
# paints into canvas#out, and fetch PNGs. Not part of the film.
import subprocess, sys, os, base64, json, glob, time
import numpy as np, cv2
from playwright.sync_api import sync_playwright
D=os.path.dirname(os.path.abspath(__file__))
ESB='/Users/computer/node_modules/.bin/esbuild'
CH=glob.glob(os.path.expanduser('~/Library/Caches/ms-playwright/chromium_headless_shell-1228/*/chrome-headless-shell'))[0]
def build(entry='entry.js', out='bundle.js'):
    r=subprocess.run([ESB,f'{D}/{entry}','--bundle','--format=iife',f'--outfile={D}/{out}','--log-level=error'],capture_output=True,text=True)
    if r.returncode: print(r.stderr); sys.exit(1)
class Lab:
    def __init__(self, html='h.html', w=2206, h=946):
        self.pw=sync_playwright().start()
        self.b=self.pw.chromium.launch(executable_path=CH,args=['--allow-file-access-from-files','--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        self.p=self.b.new_page(viewport={'width':w,'height':h})
        self.p.on('console', lambda m: print('[js]', m.text) if m.type in ('error','warning','log') else None)
        self.p.on('pageerror', lambda e: print('[pageerror]', e))
        self.p.goto(f'file://{D}/{html}')
        self.p.evaluate('() => window.F1ready')
    def js(self, code, arg=None):
        return self.p.evaluate(code, arg)
    def png(self, code, arg=None):
        """code: JS arrow (arg) => canvas|dataURL"""
        url=self.p.evaluate(f'async (arg) => {{ const r = await ({code})(arg); return typeof r === "string" ? r : r.toDataURL("image/png"); }}', arg)
        b=base64.b64decode(url.split(',',1)[1]); a=np.frombuffer(b,np.uint8)
        return cv2.imdecode(a, cv2.IMREAD_UNCHANGED)
    def close(self):
        self.b.close(); self.pw.stop()
