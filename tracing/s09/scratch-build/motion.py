import cv2, glob, re, sys, numpy as np
d=sys.argv[1]
fs=sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
REG={'beanie':(20,20,460,540),'hairR':(300,540,760,700),'slab':(640,740,900,940),'room':(1560,20,2020,700),'owl':(800,100,1500,700)}
def pc(a,b):
    w=cv2.createHanningWindow(a.shape[::-1],cv2.CV_32F)
    (dx,dy),r=cv2.phaseCorrelate(a,b,w); return dx,dy,r
base={}
print('t     '+'  '.join(f'{k:>22}' for k in REG))
for f in fs:
    t=re.search(r'at-([\d.]+)s',f).group(1)
    r=f.replace('frame-','ref-')
    A=cv2.imread(f,0).astype(np.float32); B=cv2.imread(r,0).astype(np.float32)
    if not base: base['A']=A; base['B']=B
    out=[]
    for k,(x0,y0,x1,y1) in REG.items():
        ra=pc(base['A'][y0:y1,x0:x1],A[y0:y1,x0:x1]); rb=pc(base['B'][y0:y1,x0:x1],B[y0:y1,x0:x1])
        out.append(f'R{ra[0]:+5.1f},{ra[1]:+5.1f} S{rb[0]:+5.1f},{rb[1]:+5.1f}')
    print(f'{t:6}'+'  '.join(out))
