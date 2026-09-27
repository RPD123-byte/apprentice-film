#!/usr/bin/env python3
# harness.py NAME "t:x0,y0,x1,y1;t:...;..." [--z 2.5] [--cols 2] [--raw]
# Renders s21 (shot + the film's grade) at each time in ONE browser page (caches stay warm), packing the crops into
# mosaic pages; then pairs each crop with the same crop of the SOURCE frame (25 fps index round(t*25)).
# Output: snapshots/s21-fix1n-h/out-NAME/pairs-K.jpg (render | source per tile), tiles kept as npz-free pngs? no: only jpgs.
import sys, os, json, subprocess, re, glob, cv2, numpy as np, shutil
H='/Users/computer/rootline/apprentice-film/snapshots/s21-fix1n-h'
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
name=sys.argv[1]; spec=sys.argv[2]; a=sys.argv[3:]
z=float(a[a.index('--z')+1]) if '--z' in a else 2.5
cols=int(a[a.index('--cols')+1]) if '--cols' in a else 2
shot=a[a.index('--shot')+1] if '--shot' in a else 's21'
tiles=[]
for it in spec.split(';'):
    if not it.strip(): continue
    t,b=it.split(':'); x0,y0,x1,y1=[int(float(v)) for v in b.split(',')]
    tiles.append({'t':float(t),'box':[x0,y0,x1,y1]})
# shelf-pack into 2206x946 pages
W,Hh=2206,946; pages=[]; cur=[]; x=y=rowh=0
for tl in tiles:
    w=tl['box'][2]-tl['box'][0]; h=tl['box'][3]-tl['box'][1]
    if x+w>W: x=0; y+=rowh; rowh=0
    if y+h>Hh: pages.append(cur); cur=[]; x=y=rowh=0
    tl['at']=[x,y]; tl['page']=len(pages); cur.append(tl); x+=w; rowh=max(rowh,h)
if cur: pages.append(cur)
html=open(H+'/template.html').read().replace('__SPEC__',json.dumps(pages)).replace('__DUR__',str(len(pages)+1)).replace('__SHOT__',shot).replace('__MOD__',(a[a.index('--mod')+1] if '--mod' in a else f'src/shots/{shot}.js'))
open(H+'/index.html','w').write(html)
out=H+'/out-'+name
if os.path.exists(out): shutil.rmtree(out)
ats=','.join(f'{k+0.5}' for k in range(len(pages)))
r=subprocess.run(['npx','--yes','hyperframes@0.8.69','snapshot',H,'--at',ats,'--no-end','--describe','false','--timeout','60000','-o',out],capture_output=True,text=True)
if r.returncode: print(r.stdout[-2000:],r.stderr[-2000:])
fs=sorted(glob.glob(out+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
if len(fs)!=len(pages): print('pages',len(pages),'frames',len(fs)); print(r.stdout[-3000:])
c=cv2.VideoCapture(V); rows=[]
os.makedirs(out+'/t',exist_ok=True)
if '--full' in a:
    # full frames: frame-/ref- pairs for metrics.py / tone.py / masks.py, plus a small side-by-side sheet
    k=0; sm=[]
    for pi,pg in enumerate(pages):
        M=cv2.imread(fs[pi])
        for tl in pg:
            F=int(round(tl['t']*25)); c.set(1,F); ok,f=c.read()
            cv2.imwrite(f"{out}/frame-{k:02d}-at-{tl['t']:g}s.png",M); cv2.imwrite(f"{out}/ref-{k:02d}-at-{tl['t']:g}s.png",f)
            sm.append(np.hstack([cv2.resize(M,(552,237)),cv2.resize(f,(552,237))])); k+=1
    for f in fs: os.remove(f)
    for i in range(0,len(sm),12): cv2.imwrite(f'{out}/sheet-{i//12}.jpg',np.vstack(sm[i:i+12]),[cv2.IMWRITE_JPEG_QUALITY,85])
    print('full',k); sys.exit(0)
for k,pg in enumerate(pages):
    M=cv2.imread(fs[k])
    for tl in pg:
        x0,y0,x1,y1=tl['box']; X,Y=tl['at']; w,h=x1-x0,y1-y0
        R=M[Y:Y+h,X:X+w]
        F=int(round(tl['t']*25)); c.set(1,F); ok,f=c.read(); S=f[y0:y1,x0:x1]
        cv2.imwrite(f"{out}/t/r-{tl['t']:.2f}-{x0}-{y0}.png",R); cv2.imwrite(f"{out}/t/s-{tl['t']:.2f}-{x0}-{y0}.png",S)
        def zz(im):
            im=cv2.resize(im,None,fx=z,fy=z,interpolation=cv2.INTER_CUBIC)
            for gx in range((x0//20+1)*20,x1,20):
                Xx=int((gx-x0)*z); cv2.line(im,(Xx,0),(Xx,5 if gx%100 else 12),(0,220,255),1)
                if gx%100==0: cv2.putText(im,str(gx),(Xx+2,22),0,0.45,(0,220,255),1)
            for gy in range((y0//20+1)*20,y1,20):
                Yy=int((gy-y0)*z); cv2.line(im,(0,Yy),(5 if gy%100 else 12,Yy),(0,220,255),1)
                if gy%100==0: cv2.putText(im,str(gy),(14,Yy+4),0,0.45,(0,220,255),1)
            return im
        a_,b_=zz(R),zz(S)
        cv2.putText(a_,f"R {tl['t']:.2f}",(a_.shape[1]-110,a_.shape[0]-8),0,0.6,(0,0,255),2)
        cv2.putText(b_,f"S {tl['t']:.2f}",(b_.shape[1]-110,b_.shape[0]-8),0,0.6,(0,255,0),2)
        rows.append(np.hstack([a_,np.full((a_.shape[0],4,3),(0,0,200),np.uint8),b_]))
# sheets
Wm=max(r.shape[1] for r in rows)
rows=[np.pad(r,((0,4),(0,Wm-r.shape[1]),(0,0))) for r in rows]
sheets=[];cur=[];hh=0
for r in rows:
    if hh+r.shape[0]>2000 and cur: sheets.append(np.vstack(cur)); cur=[]; hh=0
    cur.append(r); hh+=r.shape[0]
if cur: sheets.append(np.vstack(cur))
for i,s in enumerate(sheets): cv2.imwrite(f'{out}/pairs-{i}.jpg',s,[cv2.IMWRITE_JPEG_QUALITY,88]); print(f'{out}/pairs-{i}.jpg')
for f in fs: os.remove(f)
