#!/usr/bin/env python3
# s15 scratch driver: bundle entry.js (esbuild, esm), open h.html in headless chromium (file://, no server), render
# frames of s15 through the global grade, pair them with the source, score them.
# Usage: run.py OUTDIR T1,T2,...|all|a:b [--raw] [--pairs] [--sheet]
import subprocess, sys, os, base64, glob, time, json, argparse
import numpy as np, cv2
from playwright.sync_api import sync_playwright
D=os.path.dirname(os.path.abspath(__file__))
ESB='/Users/computer/node_modules/.bin/esbuild'
CH=glob.glob(os.path.expanduser('~/Library/Caches/ms-playwright/chromium_headless_shell-1228/*/chrome-headless-shell'))[0]
SRC='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
def build():
    r=subprocess.run([ESB,f'{D}/entry.js','--bundle','--format=esm','--target=es2022',f'--outfile={D}/bundle.js','--log-level=error'],capture_output=True,text=True)
    if r.returncode: print(r.stderr); sys.exit(1)
_cap=None
def src(f):
    global _cap
    if _cap is None: _cap=cv2.VideoCapture(SRC)
    _cap.set(cv2.CAP_PROP_POS_FRAMES,f); ok,im=_cap.read(); return im
def times(spec):
    if spec=='all': return [f/25 for f in range(1018,1143)]
    if ':' in spec:
        a,b=spec.split(':'); return [f/25 for f in range(int(round(float(a)*25)),int(round(float(b)*25))+1)]
    return [float(x)/25 if float(x)>500 else float(x) for x in spec.split(',')]
def score(r,s):
    a=cv2.cvtColor(r,cv2.COLOR_BGR2GRAY).astype(np.float32); b=cv2.cvtColor(s,cv2.COLOR_BGR2GRAY).astype(np.float32)
    o={}
    for sg in (4,12):
        A=cv2.GaussianBlur(a,(0,0),sg); B=cv2.GaussianBlur(b,(0,0),sg); o[f'mae{sg}']=float(np.abs(A-B).mean())
    o['meanR']=float(a.mean()); o['meanS']=float(b.mean())
    return o
if __name__=='__main__':
    ap=argparse.ArgumentParser(); ap.add_argument('out'); ap.add_argument('times'); ap.add_argument('--raw',action='store_true')
    ap.add_argument('--pairs',action='store_true'); ap.add_argument('--nosave',action='store_true')
    a=ap.parse_args(); os.makedirs(a.out,exist_ok=True)
    build()
    pw=sync_playwright().start()
    b=pw.chromium.launch(executable_path=CH,args=['--allow-file-access-from-files','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    p=b.new_page(viewport={'width':2206,'height':946})
    p.on('console', lambda m: print('[js]', m.text) if m.type in ('error','warning') else None)
    p.on('pageerror', lambda e: print('[pageerror]', e))
    p.goto(f'file://{D}/h.html'); p.wait_for_function('() => window.S15ready === true', timeout=120000)
    res={}
    T0=time.time()
    for t in times(a.times):
        url=p.evaluate('([t,raw]) => window.S15.render(t,raw)',[t,a.raw]); ms=p.evaluate('() => window.__ms')
        im=cv2.imdecode(np.frombuffer(base64.b64decode(url.split(',',1)[1]),np.uint8),cv2.IMREAD_COLOR)
        f=int(round(t*25)); s=src(f)
        sc=score(im,s); sc['ms']=ms; res[f'{t:.2f}']=sc
        if not a.nosave: cv2.imwrite(f'{a.out}/r{f}.png',im)
        if a.pairs:
            pr=np.hstack([im,s]); pr=cv2.resize(pr,(2206,473),interpolation=cv2.INTER_AREA)
            cv2.putText(pr,f'{t:.2f}',(8,24),0,0.8,(0,255,255),2); cv2.imwrite(f'{a.out}/p{f}.jpg',pr,[cv2.IMWRITE_JPEG_QUALITY,85])
        print(f'{t:.2f} mae12={sc["mae12"]:.1f} mae4={sc["mae4"]:.1f} mean {sc["meanR"]:.1f}/{sc["meanS"]:.1f} {ms:.0f}ms',flush=True)
    json.dump(res,open(f'{a.out}/scores.json','w'),indent=0)
    m12=np.mean([v['mae12'] for v in res.values()]); m4=np.mean([v['mae4'] for v in res.values()])
    print(f'MEAN mae12={m12:.2f} mae4={m4:.2f} n={len(res)} wall {time.time()-T0:.0f}s')
    b.close(); pw.stop()
