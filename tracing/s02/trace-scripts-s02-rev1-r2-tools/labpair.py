import cv2, glob, re, numpy as np, os, json
os.chdir('/Users/computer/rootline/apprentice-film/snapshots')
F=list(map(int,open('s02-rev1-r2-lab/frames.txt').read().split(',')))
os.makedirs('s02-rev1-r2-labpairs',exist_ok=True)
res={}
for b in range(3):
    for p in glob.glob(f's02-rev1-r2-labout{b}/frame-*.png'):
        v=float(re.search(r'at-([\d.]+)s',p).group(1)); k=int(v); f=F[k]
        a=cv2.imread(p); s=cv2.imread(f's02-rev1-r2-src/{f:04d}.png')
        cv2.imwrite(f's02-rev1-r2-labpairs/r{f:04d}.png',a)
        A=cv2.GaussianBlur(a.astype(np.float32),(0,0),8); B=cv2.GaussianBlur(s.astype(np.float32),(0,0),8)
        mae=np.abs(A-B).mean(); raw=np.abs(a.astype(np.float32)-s).mean()
        ga=cv2.GaussianBlur(cv2.cvtColor(a,cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),2); gb=cv2.GaussianBlur(cv2.cvtColor(s,cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),2)
        win=cv2.createHanningWindow(ga.shape[::-1],cv2.CV_32F)
        (dx,dy),r=cv2.phaseCorrelate(gb,ga,win)
        res[f]=(mae,raw,a.mean(),s.mean(),dx,dy,r)
        st=np.vstack([a,np.full((6,a.shape[1],3),(0,0,255),np.uint8),s])
        st=cv2.resize(st,(1300,int(st.shape[0]*1300/st.shape[1])),interpolation=cv2.INTER_AREA)
        cv2.putText(st,f'f{f} t={f/25:.2f}',(10,30),cv2.FONT_HERSHEY_SIMPLEX,0.9,(0,0,255),2)
        cv2.imwrite(f's02-rev1-r2-labpairs/s{f:04d}.jpg',st,[cv2.IMWRITE_JPEG_QUALITY,85])
for f in sorted(res):
    m=res[f]; print(f"f{f:3d} t={f/25:6.2f} blurMAE={m[0]:5.2f} raw={m[1]:5.2f} mean r/s={m[2]:5.1f}/{m[3]:5.1f} shift=({m[4]:+6.1f},{m[5]:+6.1f}) r={m[6]:.2f}")
json.dump({str(k):v for k,v in res.items()},open('s02-rev1-r2-labpairs/metrics.json','w'))
