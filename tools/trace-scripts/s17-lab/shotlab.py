import cv2, numpy as np, subprocess, sys, json, os, glob, re
D='/Users/computer/rootline/apprentice-film/snapshots/s17-lab'
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
CH=glob.glob(os.path.expanduser('~/Library/Caches/ms-playwright/chromium_headless_shell-1228/*/chrome-headless-shell'))[0]
FONTS='''<style>
@font-face { font-family: "Archivo"; src: url("../../assets/fonts/Archivo-Var.woff2") format("woff2"); font-weight: 100 900; font-stretch: 62% 125%; }
@font-face { font-family: "Geist"; src: url("../../assets/fonts/Geist-Var.woff2") format("woff2"); font-weight: 100 900; }
@font-face { font-family: "Geist Mono"; src: url("../../assets/fonts/GeistMono-Var.woff2") format("woff2"); font-weight: 100 900; }
html,body{margin:0;background:#000}</style>'''
def build():
    r=subprocess.run(['/Users/computer/node_modules/.bin/esbuild',f'{D}/shotlab.js','--bundle','--format=iife',f'--outfile={D}/shotlab.bundle.js','--log-level=error'],capture_output=True,text=True)
    if r.returncode: print(r.stderr); sys.exit(1)
ANA=False
def render(times, crop=(0,0,2206,946), scale=0.5, cols=2, out='sl', grade=True):
    x0,y0,x1,y1=crop; tw=round((x1-x0)*scale); th=round((y1-y0)*scale); rows=(len(times)+cols-1)//cols
    open(f'{D}/shotlab-config.js','w').write('window.LAB='+json.dumps(dict(times=times,crop=list(crop),scale=scale,cols=cols,grade=grade))+';')
    open(f'{D}/shotlab.html','w').write('<!doctype html><html><head>'+FONTS+'</head><body><canvas id="c"></canvas><script src="shotlab-config.js"></script><script src="shotlab.bundle.js"></script></body></html>')
    W,H=tw*cols,th*rows
    r=subprocess.run([CH,'--headless','--allow-file-access-from-files','--use-gl=swiftshader','--enable-unsafe-swiftshader',f'--window-size={W},{H}','--virtual-time-budget=60000','--hide-scrollbars',f'--screenshot={D}/{out}-raw.png',f'file://{D}/shotlab.html'],capture_output=True,text=True)
    img=cv2.imread(f'{D}/{out}-raw.png')
    c=cv2.VideoCapture(V); tiles=[]
    for i,t in enumerate(times):
        rr,cc=divmod(i,cols)
        ren=img[rr*th:(rr+1)*th, cc*tw:(cc+1)*tw]
        c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,f=c.read()
        src=cv2.resize(f[y0:y1,x0:x1],(tw,th),interpolation=cv2.INTER_AREA)
        sg=cv2.cvtColor(src,cv2.COLOR_BGR2GRAY); rg=cv2.cvtColor(ren,cv2.COLOR_BGR2GRAY)
        tile=np.hstack([ren,np.full((th,3,3),90,np.uint8),src]+([np.full((th,3,3),90,np.uint8),np.dstack([rg,rg,sg])] if ANA else []))
        cv2.putText(tile,f"{t:.2f}",(6,22),0,0.7,(0,255,0),2)
        tiles.append(tile)
    sheet=np.vstack(tiles) if len(tiles)>0 else None
    cv2.imwrite(f'{D}/{out}.jpg',sheet,[cv2.IMWRITE_JPEG_QUALITY,88])
    return img
if __name__=='__main__':
    build()
    ts=[float(v) for v in sys.argv[1].split(',')]
    crop=tuple(int(v) for v in sys.argv[2].split(',')) if len(sys.argv)>2 and sys.argv[2]!='full' else (0,0,2206,946)
    sc=float(sys.argv[3]) if len(sys.argv)>3 else 0.5
    out=sys.argv[4] if len(sys.argv)>4 else 'sl'
    render(ts,crop,sc,1,out)
