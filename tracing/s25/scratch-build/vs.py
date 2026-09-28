# usage: vs.py DIR IDX out.jpg [x0 y0 x1 y1] [--w W]  -> render (top) over source (bottom), crop, + diff score
import cv2, sys, glob, numpy as np
d, idx, out = sys.argv[1], sys.argv[2], sys.argv[3]
args=[a for a in sys.argv[4:]]
W=1400
if '--w' in args: i=args.index('--w'); W=int(args[i+1]); del args[i:i+2]
r=cv2.imread(glob.glob(f'{d}/frame-{int(idx):02d}-*.png')[0]); s=cv2.imread(glob.glob(f'{d}/ref-{int(idx):02d}-*.png')[0])
if s.shape!=r.shape: s=cv2.resize(s,(r.shape[1],r.shape[0]))
if len(args)>=4:
    x0,y0,x1,y1=map(int,args[:4]); r=r[y0:y1,x0:x1]; s=s[y0:y1,x0:x1]
gr=cv2.GaussianBlur(cv2.cvtColor(r,cv2.COLOR_BGR2GRAY).astype(float),(0,0),8); gs=cv2.GaussianBlur(cv2.cvtColor(s,cv2.COLOR_BGR2GRAY).astype(float),(0,0),8)
print('sigma8 MAE', np.abs(gr-gs).mean().round(2), 'mean r/s', gr.mean().round(1), gs.mean().round(1))
st=np.vstack([r,s]); sc=W/st.shape[1]
cv2.imwrite(out, cv2.resize(st,(W,int(st.shape[0]*sc))), [cv2.IMWRITE_JPEG_QUALITY,88])
