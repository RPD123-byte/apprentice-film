import cv2, numpy as np, glob, re, sys
d=sys.argv[1]
fs=sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
ren=[cv2.cvtColor(cv2.imread(f),cv2.COLOR_BGR2GRAY).astype(np.float32) for f in fs]
Ts=[float(re.search(r'at-([\d.]+)s',p).group(1)) for p in fs]
idx=[int(np.floor((np.floor(t*30+1e-6)/30-29.04)*25+1e-6)) for t in Ts]
c=cv2.VideoCapture('/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'); c.set(1,726)
src=[]
for i in range(38): ok,f=c.read(); src.append(cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.float32))
def shift(a,b,box):
    x0,y0,x1,y1=box; A=a[y0:y1,x0:x1]; B=b[y0:y1,x0:x1]
    w=cv2.createHanningWindow(A.shape[::-1],cv2.CV_32F); (dx,dy),_=cv2.phaseCorrelate(A,B,w); return dx,dy
boxes={'Rhand':(876,550,1200,715),'Lhand':(600,640,880,860),'Rindex':(876,556,990,660),'Rthumb':(930,655,1060,712),'Rback':(1040,560,1190,700),'Lring':(615,675,720,745)}
print('frames rendered ->',idx)
for k,b in boxes.items():
    rs=[shift(ren[0],r,b) for r in ren]; ss=[shift(src[0],src[i],b) for i in idx]
    print(k)
    print('  src dy',' '.join('%+.1f'%v[1] for v in ss))
    print('  ren dy',' '.join('%+.1f'%v[1] for v in rs))
    fl=lambda seq,box: [cv2.calcOpticalFlowFarneback(seq[i][box[1]:box[3],box[0]:box[2]].astype(np.uint8),seq[i+1][box[1]:box[3],box[0]:box[2]].astype(np.uint8),None,0.5,3,15,3,5,1.2,0) for i in range(len(seq)-1)]
    S=[src[i] for i in idx]; 
    fs_=fl(S,b); fr_=fl(ren,b)
    m=lambda F: np.mean([np.linalg.norm(f,axis=2).mean() for f in F]); M=lambda F: np.max([np.linalg.norm(f,axis=2).mean() for f in F])
    print('  farneback mean/max per frame: src %.2f/%.2f ren %.2f/%.2f'%(m(fs_),M(fs_),m(fr_),M(fr_)))
