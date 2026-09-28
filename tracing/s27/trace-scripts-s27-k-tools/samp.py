# samp.py T x,y[,r] ... : pre-grade (ungraded) source colour at points (median over a (2r+1)^2 patch) as hex
# also: samp.py T --render dir  x,y ... to sample the render (graded->ungraded the same way) for comparison
import cv2, sys, numpy as np
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/snapshots/s27-meas')
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/snapshots/f2k-tools')
from common import load
from ungrade import ungrade
args=sys.argv[1:]; t=float(args.pop(0)); rdir=None
if args and args[0]=='--render': args.pop(0); rdir=args.pop(0)
src=ungrade(load(t),t)
rnd=ungrade(cv2.imread(f'{rdir}/r-{t:.2f}.png'),t) if rdir else None
def med(im,x,y,r): p=im[max(0,y-r):y+r+1,max(0,x-r):x+r+1].reshape(-1,3); m=np.median(p,0)*255; return m
for a in args:
    v=list(map(int,a.split(','))); x,y=v[0],v[1]; r=v[2] if len(v)>2 else 6
    m=med(src,x,y,r); s=f'#{int(m[2]):02x}{int(m[1]):02x}{int(m[0]):02x}'
    line=f'({x},{y}) src {s}'
    if rnd is not None:
        n=med(rnd,x,y,r); line+=f'  render #{int(n[2]):02x}{int(n[1]):02x}{int(n[0]):02x}  d=({int(n[2]-m[2]):+d},{int(n[1]-m[1]):+d},{int(n[0]-m[0]):+d})'
    print(line)
