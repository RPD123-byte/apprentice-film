# diffmap.py DIR IDX : 50px block means of render and source (frame coords) and their difference (render-source)/16
import sys, cv2, glob, numpy as np
d, idx = sys.argv[1], int(sys.argv[2])
fr=cv2.cvtColor(cv2.imread(sorted(glob.glob(f"{d}/frame-{idx:02d}-*.png"))[0]),cv2.COLOR_BGR2GRAY).astype(float)
rf=cv2.cvtColor(cv2.imread(sorted(glob.glob(f"{d}/ref-{idx:02d}-*.png"))[0]),cv2.COLOR_BGR2GRAY).astype(float)
B=50
def m(g): return np.array([[g[y:y+B,x:x+B].mean() for x in range(0,2200,B)] for y in range(0,946,B)])
a,b=m(fr),m(rf)
print('diff (render-source)/16, + = render brighter; rows y, cols x/50')
print('     '+''.join(f"{x//100:<2d}" if x%100==0 else '  ' for x in range(0,2200,B)))
for i,y in enumerate(range(0,946,B)):
    print(f"{y:4d} "+''.join(f"{int(round(v/16)):+d}".rjust(2) if abs(v)>=8 else ' .' for v in (a[i]-b[i])))
print('overall mean render %.1f source %.1f'%(fr.mean(),rf.mean()))
