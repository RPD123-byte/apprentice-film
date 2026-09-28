# snap.py T1,T2,... outdir [--nograde]: render frames with the harness, save r*.png / s*.png, print σ6 full MAE and timing
import sys, time, os, cv2, numpy as np
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from lab import *
ts=[float(x) for x in sys.argv[1].split(',')]; out=sys.argv[2]
graded='--nograde' not in sys.argv
os.makedirs(out,exist_ok=True)
L=Lab()
for t in ts:
    t0=time.time(); f=L.frame(t,graded); dt=time.time()-t0
    s=src(t)
    cv2.imwrite(f'{out}/r{t:.2f}.png',f); cv2.imwrite(f'{out}/s{t:.2f}.png',s)
    print(f't={t:.2f} full6={mae(f,s):.2f} ms={dt*1000:.0f} draw={L.ms():.0f}',flush=True)
L.close()
