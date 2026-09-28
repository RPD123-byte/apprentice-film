#!/usr/bin/env python3
# owl.py OUT F1,F2,... : render only s15's owl at those source frames, crop round the track, pair with the source crop
import subprocess, sys, os, base64, glob, time
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__))+'/../tools')
from common import *
from playwright.sync_api import sync_playwright
D=os.path.dirname(os.path.abspath(__file__))
ESB='/Users/computer/node_modules/.bin/esbuild'
CH=glob.glob(os.path.expanduser('~/Library/Caches/ms-playwright/chromium_headless_shell-1228/*/chrome-headless-shell'))[0]
out=sys.argv[1]; fs=[int(x) for x in sys.argv[2].split(',')]
r=subprocess.run([ESB,f'{D}/entry_owl.js','--bundle','--format=esm','--target=es2022',f'--outfile={D}/bundle_owl.js','--log-level=error'],capture_output=True,text=True)
if r.returncode: print(r.stderr); sys.exit(1)
open(f'{D}/ho.html','w').write(open(f'{D}/h.html').read().replace('bundle.js','bundle_owl.js'))
pw=sync_playwright().start(); b=pw.chromium.launch(executable_path=CH,args=['--allow-file-access-from-files'])
p=b.new_page(viewport={'width':2206,'height':946}); p.on('pageerror', lambda e: print('[pageerror]', e)); p.on('console', lambda m: print('[js]', m.text) if m.type=='error' else None)
p.goto(f'file://{D}/ho.html'); p.wait_for_function('() => window.S15ready === true', timeout=120000)
tiles=[]
for f in fs:
    url=p.evaluate('(t) => window.S15.render(t)', f/25)
    im=cv2.imdecode(np.frombuffer(base64.b64decode(url.split(',',1)[1]),np.uint8),cv2.IMREAD_COLOR)
    s=frame(f); o=owl(f); cx,cy=int(o[1]),int(o[2]); x0=max(0,min(W-480,cx-240)); y0=max(0,min(H-440,cy-230))
    a=im[y0:y0+440,x0:x0+480].copy(); c=s[y0:y0+440,x0:x0+480].copy()
    # outline of the render's owl drawn over the source crop (fit check)
    m=(cv2.cvtColor(a,cv2.COLOR_BGR2GRAY)>40).astype(np.uint8)
    cs,_=cv2.findContours(m,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE); cv2.drawContours(c,cs,-1,(0,0,255),1)
    cv2.putText(a,f'{f} {f/25:.2f}',(4,18),0,0.55,(0,255,255),1); tiles.append(np.hstack([a,c]))
while len(tiles)%2: tiles.append(np.zeros_like(tiles[0]))
cv2.imwrite(out,np.vstack([np.hstack(tiles[i:i+2]) for i in range(0,len(tiles),2)]),[cv2.IMWRITE_JPEG_QUALITY,88]); print('wrote',out)
b.close(); pw.stop()
