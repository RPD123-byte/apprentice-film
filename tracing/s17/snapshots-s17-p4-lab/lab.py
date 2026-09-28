# s17 pass-4 scratch driver: bundle entry.js, render frames headless (file://), grade with post.js, compare to source.
import subprocess, sys, os, base64, glob, time
import numpy as np, cv2
from playwright.sync_api import sync_playwright
D=os.path.dirname(os.path.abspath(__file__))
ESB='/Users/computer/node_modules/.bin/esbuild'
CH=glob.glob(os.path.expanduser('~/Library/Caches/ms-playwright/chromium_headless_shell-1228/*/chrome-headless-shell'))[0]
REF='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
def build():
    r=subprocess.run([ESB,f'{D}/entry.js','--bundle','--format=esm',f'--outfile={D}/bundle.js','--log-level=error'],capture_output=True,text=True)
    if r.returncode: print(r.stderr); sys.exit(1)
_cap=None
def src(t):
    global _cap
    if _cap is None: _cap=cv2.VideoCapture(REF)
    _cap.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,f=_cap.read(); return f
class Lab:
    def __init__(self):
        build()
        self.pw=sync_playwright().start()
        self.b=self.pw.chromium.launch(executable_path=CH,args=['--allow-file-access-from-files','--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        self.p=self.b.new_page(viewport={'width':2206,'height':946})
        self.p.on('console', lambda m: print('[js]', m.text) if m.type in ('error','warning') else None)
        self.p.on('pageerror', lambda e: print('[pageerror]', e))
        self.p.goto(f'file://{D}/h.html')
        self.p.wait_for_function('() => window.S17ready', timeout=60000)
        self.p.evaluate('() => window.S17ready')
    def js(self, code, arg=None): return self.p.evaluate(code, arg)
    def _open(self):
        self.p.goto(f'file://{D}/h.html')
        self.p.wait_for_function('() => window.S17ready', timeout=60000)
        self.p.evaluate('() => window.S17ready')
    def frame(self, t, graded=True, dbg=None):
        for k in range(4):
            url=self.p.evaluate('([t,g,d]) => { globalThis.__S17 = d || {}; const c = window.S17.render(t, g); return c.toDataURL("image/png"); }',[t,graded,dbg])
            b=base64.b64decode(url.split(',',1)[1]); f=cv2.imdecode(np.frombuffer(b,np.uint8),cv2.IMREAD_COLOR)
            if f.max()>0: return f
            print('black frame, reloading', t, flush=True); self._open()
        raise RuntimeError('black frame (WebGL lost?)')
    def close(self): self.b.close(); self.pw.stop()
def mae(a,b,sig=6,box=None):
    if box: x0,y0,x1,y1=box; a=a[y0:y1,x0:x1]; b=b[y0:y1,x0:x1]
    A=cv2.GaussianBlur(cv2.cvtColor(a,cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),sig)
    B=cv2.GaussianBlur(cv2.cvtColor(b,cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),sig)
    return float(np.abs(A-B).mean())
