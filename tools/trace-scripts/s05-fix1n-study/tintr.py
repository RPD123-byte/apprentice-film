import sys, glob, re, math, numpy as np, cv2
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/src/shots/s05/trace')
import frames
from tint import st
d=sys.argv[1]
for f in sorted(glob.glob(d+'/frame-*.png')):
    P=float(re.search(r'at-([\d.]+)s',f).group(1)); n=math.floor(P*30+1e-6); k=578+n
    a=cv2.imread(f).astype(np.float32)/255; b=frames.frame(k)
    ra=st(a); rb=st(b)
    tl=lambda x: x[0:80,0:500].reshape(-1,3).mean(0)*255
    rd=lambda x: x[100:300,1950:2206].reshape(-1,3).mean(0)*255
    print(k,'render G-R %.2f G-B %.2f R-B %.2f'%ra,'| src %.2f %.2f %.2f'%rb, '| TL', np.round(tl(a),1), np.round(tl(b),1), '| RD', np.round(rd(a),1), np.round(rd(b),1))
