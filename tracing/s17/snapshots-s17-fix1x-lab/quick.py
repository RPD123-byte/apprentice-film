# quick.py T1,T2,... outdir : render frames (graded) with the harness and print full / owl-silhouette errors
import sys, time, cv2, numpy as np
sys.path.insert(0,'.')
from lab import *
from owlm import om, mask, gray
L=Lab()
ts=[float(x) for x in sys.argv[1].split(',')]; out=sys.argv[2]
os.makedirs(out,exist_ok=True)
tot=[]
for t in ts:
    f=L.frame(t); s=src(t)
    cv2.imwrite(f'{out}/f{t:.2f}.jpg',f,[cv2.IMWRITE_JPEG_QUALITY,93])
    m=mask(t,0); m=cv2.erode(m.astype(np.uint8),np.ones((5,5),np.uint8))>0
    G=gray(f); S=gray(s)
    p=np.percentile(G[m],[5,10,25]); q=np.percentile(S[m],[5,10,25])
    r=(t,mae(f,s),om(f,s,t,1.5),om(f,s,t,4)); tot.append(r[2])
    print(f't={t:.2f} full={r[1]:.2f} om1.5={r[2]:.2f} om4={r[3]:.2f} p5/10/25 ren {p[0]:.0f} {p[1]:.0f} {p[2]:.0f} src {q[0]:.0f} {q[1]:.0f} {q[2]:.0f}',flush=True)
print('mean om1.5 %.3f'%np.mean(tot))
L.close()
