# lab2.py: fast headless render of s17 at times (full res) + metrics vs the source.
# usage: python3 lab2.py TIMES OUT [--dbg JSON] [--crop x0,y0,x1,y1] [--noowl]
import cv2, numpy as np, subprocess, sys, json, os, glob, argparse
D='/Users/computer/rootline/apprentice-film/snapshots/s17-lab'
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
CH=glob.glob(os.path.expanduser('~/Library/Caches/ms-playwright/chromium_headless_shell-1228/*/chrome-headless-shell'))[0]
FONTS='''<style>
@font-face { font-family: "Archivo"; src: url("../../assets/fonts/Archivo-Var.woff2") format("woff2"); font-weight: 100 900; font-stretch: 62% 125%; }
@font-face { font-family: "Geist"; src: url("../../assets/fonts/Geist-Var.woff2") format("woff2"); font-weight: 100 900; }
@font-face { font-family: "Geist Mono"; src: url("../../assets/fonts/GeistMono-Var.woff2") format("woff2"); font-weight: 100 900; }
html,body{margin:0;background:#000}</style>'''
def build():
    r=subprocess.run(['/Users/computer/node_modules/.bin/esbuild',f'{D}/lab2.js','--bundle','--format=iife',f'--outfile={D}/lab2.bundle.js','--log-level=error'],capture_output=True,text=True)
    if r.returncode: print(r.stderr); sys.exit(1)
def render(times, dbg=None, crop=(0,0,2206,946), tag='l2', grade=True):
    x0,y0,x1,y1=crop; tw=x1-x0; th=y1-y0
    cfg=f'{D}/{tag}-cfg.js'; html=f'{D}/{tag}.html'
    open(cfg,'w').write('window.LAB='+json.dumps(dict(times=times,crop=list(crop),dbg=dbg or {},grade=grade))+';')
    open(html,'w').write('<!doctype html><html><head>'+FONTS+f'</head><body><canvas id="c"></canvas><script src="{tag}-cfg.js"></script><script src="lab2.bundle.js"></script></body></html>')
    png=f'{D}/{tag}-raw.png'
    if os.path.exists(png): os.remove(png)
    r=subprocess.run([CH,'--headless','--allow-file-access-from-files','--use-gl=swiftshader','--enable-unsafe-swiftshader',f'--window-size={tw},{th*len(times)}','--virtual-time-budget=120000','--hide-scrollbars',f'--screenshot={png}',f'file://{html}'],capture_output=True,text=True)
    img=cv2.imread(png)
    return [img[i*th:(i+1)*th] for i in range(len(times))]
_cap=None
def src(t):
    global _cap
    if _cap is None: _cap=cv2.VideoCapture(V)
    _cap.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,f=_cap.read(); return f
def gb(x,s=6): return cv2.GaussianBlur(cv2.cvtColor(x,cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),s)
OWLBOX=(330,280,900,610); DES=(900,150,1300,900)
def metrics(ren,ref):
    a,b=gb(ren),gb(ref); d=np.abs(a-b)
    m=np.ones(d.shape,bool); x0,y0,x1,y1=OWLBOX; m[y0:y1,x0:x1]=False
    x0,y0,x1,y1=DES; des=d[y0:y1,x0:x1].mean()
    x0,y0,x1,y1=OWLBOX; owl=d[y0:y1,x0:x1].mean()
    return dict(full=d.mean(),page=d[m].mean(),des=des,owl=owl)
if __name__=='__main__':
    ap=argparse.ArgumentParser(); ap.add_argument('times'); ap.add_argument('out'); ap.add_argument('--dbg',default='{}'); ap.add_argument('--nobuild',action='store_true')
    ap.add_argument('--save',action='store_true'); ap.add_argument('--raw',action='store_true')
    a=ap.parse_args()
    if not a.nobuild: build()
    ts=[float(v) for v in a.times.split(',')]
    fr=render(ts,json.loads(a.dbg),tag=a.out,grade=not a.raw)
    os.makedirs(f'{D}/{a.out}',exist_ok=True)
    acc=[]
    for t,f in zip(ts,fr):
        r=src(t); m=metrics(f,r); acc.append(m)
        print(f"{t:6.2f} full {m['full']:5.2f} page {m['page']:5.2f} des {m['des']:5.2f} owl {m['owl']:5.2f}")
        if a.save: cv2.imwrite(f'{D}/{a.out}/r-{t:.2f}.png',f); cv2.imwrite(f'{D}/{a.out}/s-{t:.2f}.png',r)
    print('mean', {k:round(float(np.mean([m[k] for m in acc])),2) for k in acc[0]})
