# om_sheet.py out.jpg T... : contact sheet of owl masks (source dimmed outside the mask)
import cv2, numpy as np, sys
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/snapshots/s27-meas')
from common import load
D='/Users/computer/rootline/apprentice-film/snapshots/s27-k-owl/'
tiles=[]
for a in sys.argv[2:]:
    t=float(a); m=cv2.imread(f'{D}om-{t:.2f}.png')[...,0]>128; f=load(t).copy()
    ys,xs=np.nonzero(m); x0,x1,y0,y1=max(0,xs.min()-40),min(2206,xs.max()+40),max(0,ys.min()-40),min(946,ys.max()+40)
    f[~m]=(f[~m]*0.3).astype(np.uint8); c=f[y0:y1,x0:x1]; s=260/max(c.shape[:2]); c=cv2.resize(c,None,fx=s,fy=s)
    T=np.zeros((260,260,3),np.uint8); T[:c.shape[0],:c.shape[1]]=c; cv2.putText(T,f'{t:.2f}',(4,16),0,0.5,(0,255,255),1); tiles.append(T)
while len(tiles)%8: tiles.append(np.zeros((260,260,3),np.uint8))
cv2.imwrite(sys.argv[1],np.vstack([np.hstack(tiles[i:i+8]) for i in range(0,len(tiles),8)]))
