import cv2, glob, re, sys, numpy as np, os
d=sys.argv[1]; out=d+'/v'; os.makedirs(out,exist_ok=True)
W=int(sys.argv[2]) if len(sys.argv)>2 else 1400
rows=[]
for f in sorted(glob.glob(d+'/frame-*.png')):
    m=re.search(r'frame-(\d+)-at-([\d.]+)s',f); i,t=m.group(1),m.group(2)
    r=f.replace('frame-','ref-')
    a=cv2.imread(f); b=cv2.imread(r)
    ga=cv2.GaussianBlur(cv2.cvtColor(a,cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),8)
    gb=cv2.GaussianBlur(cv2.cvtColor(b,cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),8)
    mae=np.abs(ga-gb).mean(); ma=cv2.cvtColor(a,cv2.COLOR_BGR2GRAY).mean(); mb=cv2.cvtColor(b,cv2.COLOR_BGR2GRAY).mean()
    rows.append((float(t),mae,ma,mb))
    h=int(W*946/2206)
    A=cv2.resize(a,(W,h),interpolation=cv2.INTER_AREA); B=cv2.resize(b,(W,h),interpolation=cv2.INTER_AREA)
    cv2.putText(A,'RENDER '+t,(10,30),cv2.FONT_HERSHEY_SIMPLEX,0.9,(0,0,255),2)
    cv2.putText(B,'SOURCE '+t,(10,30),cv2.FONT_HERSHEY_SIMPLEX,0.9,(0,0,255),2)
    cv2.imwrite(f'{out}/v-{i}-{t}.jpg',np.vstack([A,np.full((4,W,3),255,np.uint8),B]),[cv2.IMWRITE_JPEG_QUALITY,88])
for r in sorted(rows): print('%.2f  mae %.1f  mean render %.1f src %.1f'%r)
