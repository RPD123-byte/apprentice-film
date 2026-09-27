# depth.py T1 : inverse depth w per 60px block of the R40 frame from the source's flow 40.00 -> T1 (radial about C)
import cv2, numpy as np, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
T1=float(sys.argv[1])
DOLLY=[0,0.03,0.06,0.091,0.1221,0.1714,0.2052,0.2395,0.2726,0.3076,0.3413,0.3769,0.4122,0.4495,0.4857,0.5223,0.549,0.549,0.57]
d=DOLLY[int(round((T1-40)/0.04))]
c=cv2.VideoCapture(V)
def fr(t):
    c.set(1,int(round(t*25))); ok,f=c.read(); return cv2.cvtColor(f,cv2.COLOR_BGR2GRAY)
a=fr(40.0); b=fr(T1)
# normalise the 40.00 vignette a little (it brightens by 40.04)
a=cv2.equalizeHist(a); b=cv2.equalizeHist(b)
dis=cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
fl=dis.calc(a,b,None)
C=np.array([1104.5,642.9])
H,W=a.shape
ys,xs=np.mgrid[0:H,0:W].astype(np.float32)
px=xs+fl[...,0]; py=ys+fl[...,1]
r0=np.hypot(xs-C[0],ys-C[1]); r1=np.hypot(px-C[0],py-C[1])
w=(1-r0/np.maximum(r1,1))/d
w[r0<120]=np.nan
B=60
print(f'T1={T1} d={d}')
print('  y\\x '+''.join(f'{x+B//2:>6}' for x in range(0,W-B+1,B)))
for y in range(0,H-B+1,B):
    row=[]
    for x in range(0,W-B+1,B):
        blk=w[y:y+B,x:x+B]; v=np.nanmedian(blk) if np.isfinite(blk).any() else np.nan
        row.append(' ' + (f'{v:5.2f}' if np.isfinite(v) else '   . '))
    print(f'{y+B//2:>5} '+''.join(row))
