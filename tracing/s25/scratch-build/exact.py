import cv2, numpy as np, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
d=sys.argv[1]; out=sys.argv[2]; ts=sys.argv[3].split(',')
crop=[int(v) for v in sys.argv[4:8]] if len(sys.argv)>=8 else None
w=int(sys.argv[8]) if len(sys.argv)>=9 else 900
c=cv2.VideoCapture(V); rows=[]
for t in ts:
    tt=f"{float(t):.2f}"; a=cv2.imread(f'{d}/r-{tt}.png'); c.set(1,round(float(t)*25)); ok,b=c.read()
    cv2.imwrite(f'{d}/s-{tt}.png',b)
    ga=cv2.cvtColor(a,cv2.COLOR_BGR2GRAY).astype(np.float32); gb=cv2.cvtColor(b,cv2.COLOR_BGR2GRAY).astype(np.float32)
    e8=np.abs(cv2.GaussianBlur(ga,(0,0),8)-cv2.GaussianBlur(gb,(0,0),8)).mean()
    print(tt,'s8=%.1f'%e8)
    if crop: x0,y0,x1,y1=crop; a=a[y0:y1,x0:x1]; b=b[y0:y1,x0:x1]
    p=np.hstack([a,np.full((a.shape[0],6,3),(0,0,255),np.uint8),b]); p=cv2.resize(p,(2*w,int(p.shape[0]*2*w/p.shape[1])),interpolation=cv2.INTER_AREA)
    cv2.putText(p,tt+' render | source',(6,24),0,0.8,(0,255,255),2); rows.append(p)
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,88])
