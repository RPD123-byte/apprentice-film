import cv2,numpy as np,glob,re
src=open('src/shots/s08.js').read()
cam=re.search(r'const CAM = \[(.*?)\];',src,re.S).group(1)
CAM=[list(map(float,m)) for m in re.findall(r'\[([\d.\-]+), ([\d.\-]+), ([\d.\-]+), ([\d.\-]+)\]',cam)]
def camat(u):
    for i in range(1,len(CAM)):
        if u<=CAM[i][0]+1e-9:
            a,b=CAM[i-1],CAM[i]; f=(u-a[0])/(b[0]-a[0]); return [a[j]+(b[j]-a[j])*f for j in range(1,4)]
    return CAM[-1][1:]
def rect(u,x0,y0,x1,y1):
    s,tx,ty=camat(u); return [int(round(v)) for v in (s*x0+tx,s*y0+ty,s*x1+tx,s*y1+ty)]
g=lambda im: cv2.cvtColor(im,cv2.COLOR_BGR2GRAY).astype(float)
regs={'text':(1530,362,1870,400),'cancel':(1540,730,1645,765),'save':(1740,730,1815,765),'smiley':(1598,212,1682,300),'trash':(1700,225,1740,270)}
for t in ['30.6','31','31.2','31.6','32','32.2','32.4']:
    k=round(float(t)*25); u=float(t)-30.56
    R=cv2.imread(glob.glob(f'snapshots/s08-rev2-a/frame-*-at-{t}s.png')[0]); S=cv2.imread(f'snapshots/s08-rev2-src/f{k}.png')
    lr,ls=g(R),g(S)
    out=[t]
    for nm,rc in regs.items():
        x0,y0,x1,y1=rect(u,*rc)
        a=lr[y0:y1,x0:x1]; b=ls[y0:y1,x0:x1]
        pa,pb=np.percentile(a,90),np.percentile(b,90)
        ma=np.clip(pa-a,0,None).sum()/1000; mb=np.clip(pb-b,0,None).sum()/1000
        out.append(f'{nm}: p1 {np.percentile(a,1):.0f}/{np.percentile(b,1):.0f} p5 {np.percentile(a,5):.0f}/{np.percentile(b,5):.0f} mass {ma:.0f}/{mb:.0f}')
    print(' | '.join(out))
