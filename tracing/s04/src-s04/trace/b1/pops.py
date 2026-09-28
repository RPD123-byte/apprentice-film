# pops.py DIR : frame-to-frame change (blurred s2 MAE) of render vs source; flags pops (render change >> source change)
import cv2,numpy as np,sys
d=sys.argv[1]; fr=list(range(478,578)); R={}; S={}
for f in fr:
    t=f'{f/25:.2f}'; R[f]=cv2.GaussianBlur(cv2.imread(f'{d}/r-{t}.png',0).astype(np.float32),(0,0),2); S[f]=cv2.GaussianBlur(cv2.imread(f'{d}/src-{t}.png',0).astype(np.float32),(0,0),2)
out=[]
for f in fr[1:]:
    r=np.abs(R[f]-R[f-1]).mean(); s=np.abs(S[f]-S[f-1]).mean(); out.append((r-s,f,r,s))
for x in sorted(out,reverse=True)[:14]: print(f'{x[1]/25:.2f} render {x[2]:.2f} source {x[3]:.2f} excess {x[0]:+.2f}')
