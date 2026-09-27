import cv2, numpy as np, subprocess, sys, json, os, glob
D='/Users/computer/rootline/apprentice-film/snapshots/s17-lab'
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
CH=glob.glob(os.path.expanduser('~/Library/Caches/ms-playwright/chromium_headless_shell-1228/*/chrome-headless-shell'))[0]
REP=False
FIT=False
PROF=False
def run(times, crop, z=2, cols=4, out='lab', tone=True):
    x0,y0,x1,y1=crop; cw=int(round((x1-x0)*z)); ch=int(round((y1-y0)*z)); rows=(len(times)+cols-1)//cols
    open(f'{D}/lab-config.js','w').write('window.LAB='+json.dumps(dict(times=times,crop=crop,z=z,cols=cols,tone=tone))+';')
    open(f'{D}/lab.html','w').write('<!doctype html><html><body style="margin:0;background:#000"><canvas id="c"></canvas><script src="lab-config.js"></script><script src="lab.bundle.js"></script></body></html>')
    r=subprocess.run(['/Users/computer/node_modules/.bin/esbuild',f'{D}/lab.js','--bundle','--format=iife',f'--outfile={D}/lab.bundle.js','--log-level=error'],capture_output=True,text=True)
    if r.returncode: print(r.stderr); sys.exit(1)
    W,H=cw*cols,ch*rows
    subprocess.run([CH,'--headless','--allow-file-access-from-files',f'--window-size={W},{H}','--virtual-time-budget=20000','--hide-scrollbars',f'--screenshot={D}/{out}-raw.png',f'file://{D}/lab.html'],capture_output=True)
    img=cv2.imread(f'{D}/{out}-raw.png')
    c=cv2.VideoCapture(V)
    bg=cv2.imread('/Users/computer/rootline/apprentice-film/snapshots/s17-meas/bg.png')
    tiles=[]; ious=[]
    for i,t in enumerate(times):
        rr,cc=divmod(i,cols)
        ren=img[rr*ch:(rr+1)*ch, cc*cw:(cc+1)*cw]
        c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,f=c.read()
        src=cv2.resize(f[y0:y1,x0:x1],(cw,ch),interpolation=cv2.INTER_CUBIC)
        # masks
        g=cv2.GaussianBlur(cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),1.5)
        gb=cv2.GaussianBlur(cv2.cvtColor(bg,cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),1.5)
        ms=((np.abs(g-gb)>35)&(g>110)).astype(np.uint8)
        ms[280:470,800:880]=0
        ms=cv2.morphologyEx(ms,cv2.MORPH_CLOSE,np.ones((5,5),np.uint8))
        ms=cv2.resize(ms[y0:y1,x0:x1],(cw,ch),interpolation=cv2.INTER_NEAREST)
        mr=(cv2.cvtColor(ren,cv2.COLOR_BGR2GRAY)>60).astype(np.uint8)
        inter=(ms&mr).sum(); uni=(ms|mr).sum(); iou=inter/max(1,uni); ious.append(iou)
        if FIT:
            best=(iou,0,0)
            for dy in range(-24,25,2):
                for dx in range(-30,31,2):
                    m2=np.roll(np.roll(mr,int(dy*z),0),int(dx*z),1)
                    i2=(ms&m2).sum()/max(1,(ms|m2).sum())
                    if i2>best[0]: best=(i2,dx,dy)
            print(f'  FIT {t:.2f}: iou {iou:.3f} -> {best[0]:.3f} at dx={best[1]} dy={best[2]}')
        sg=cv2.cvtColor(src,cv2.COLOR_BGR2GRAY); rg=cv2.cvtColor(ren,cv2.COLOR_BGR2GRAY)
        ov=np.dstack([rg,rg,sg])
        dm=np.zeros_like(src); dm[(ms>0)&(mr==0)]=(0,255,0); dm[(ms==0)&(mr>0)]=(255,0,255); dm[(ms>0)&(mr>0)]=(90,90,90)
        tile=np.hstack([src,ren,ov,dm])
        if PROF:
            xs=list(range(0,cw,int(10*z)))
            def prof(m):
                o=[]
                for x in xs:
                    col=np.nonzero(m[:,x])[0]
                    o.append((int(y0+col.min()/z),int(y0+col.max()/z)) if len(col) else None)
                return o
            ps,pr=prof(ms),prof(mr)
            print(f'  {t:.2f} x: top src/ren  bottom src/ren')
            print('   '+' '.join(f'{int(x0+x/z)}:{a[0] if a else "-"}/{b[0] if b else "-"},{a[1] if a else "-"}/{b[1] if b else "-"}' for x,a,b in zip(xs,ps,pr)))
        if REP:
            for nm,m in (('SRC-only',((ms>0)&(mr==0)).astype(np.uint8)),('REN-only',((ms==0)&(mr>0)).astype(np.uint8))):
                m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((3,3),np.uint8))
                n,lab,st,cen=cv2.connectedComponentsWithStats(m)
                big=sorted([(st[k,4],k) for k in range(1,n)],reverse=True)[:4]
                print(f'  {t:.2f} {nm}: '+'; '.join(f'A{int(a/z/z)} x{x0+st[k,0]/z:.0f}-{x0+(st[k,0]+st[k,2])/z:.0f} y{y0+st[k,1]/z:.0f}-{y0+(st[k,1]+st[k,3])/z:.0f}' for a,k in big))
        cv2.putText(tile,f"{t:.2f} IoU {iou:.2f}",(6,22),0,0.7,(0,255,0),2)
        tiles.append(tile)
    sheet=np.vstack(tiles)
    cv2.imwrite(f'{D}/{out}.jpg',sheet,[cv2.IMWRITE_JPEG_QUALITY,88])
    print(out, ' '.join(f'{t:.2f}:{v:.2f}' for t,v in zip(times,ious)), 'mean', f'{np.mean(ious):.3f}')
if __name__=='__main__':
    ts=[float(v) for v in sys.argv[1].split(',')]
    crop=[int(v) for v in sys.argv[2].split(',')] if len(sys.argv)>2 else [540,330,860,590]
    z=float(sys.argv[3]) if len(sys.argv)>3 else 2
    out=sys.argv[4] if len(sys.argv)>4 else 'lab'
    run(ts,crop,z=int(z) if z==int(z) else z,cols=1,out=out)
