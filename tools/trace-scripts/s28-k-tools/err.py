# usage: err.py dir  -> per frame blurred abs diff (sigma 4, 12) render vs source (frame round(t*25)); writes pairs + diff maps
import sys,glob,re,cv2,numpy as np,os
d=sys.argv[1]
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
rows=[]
for fp in sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1))):
    m=re.search(r'frame-(\d+)-at-([\d.]+)s',fp); idx,t=m.group(1),float(m.group(2))
    c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,b=c.read()
    a=cv2.imread(fp)
    af=a.astype(np.float32); bf=b.astype(np.float32)
    e={}
    for s in (4,12):
        e[s]=np.abs(cv2.GaussianBlur(af,(0,0),s)-cv2.GaussianBlur(bf,(0,0),s)).mean()
    dm=np.abs(cv2.GaussianBlur(af,(0,0),6)-cv2.GaussianBlur(bf,(0,0),6)).mean(2)
    dmv=np.clip(dm*6,0,255).astype(np.uint8)
    dmc=cv2.applyColorMap(dmv,cv2.COLORMAP_INFERNO)
    s=np.hstack([a,np.zeros((a.shape[0],8,3),np.uint8),b])
    s2=np.hstack([dmc,np.zeros((a.shape[0],8,3),np.uint8),cv2.addWeighted(a,0.5,b,0.5,0)])
    cv2.imwrite(f"{d}/P-{t:.2f}.jpg",cv2.resize(np.vstack([s,s2]),None,fx=0.45,fy=0.45),[cv2.IMWRITE_JPEG_QUALITY,85])
    rows.append((t,e[4],e[12]))
    print(f"{t:.2f}  s4 {e[4]:.2f}  s12 {e[12]:.2f}")
if rows: print('mean s4 %.2f s12 %.2f'%(np.mean([r[1] for r in rows]),np.mean([r[2] for r in rows])))
