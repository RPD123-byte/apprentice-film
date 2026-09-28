# overlay the designer outlines (des_outlines.json, 125.0 coords) warped by a measured mesh onto source frames
import cv2, json, numpy as np, sys
from src import frame
M=json.load(open(sys.argv[1])); O=json.load(open('../s27d-meas/des_outlines.json'))
X0,Y0,X1,Y1,GX,GY=M['grid']; F={round(r[0],2):np.array(r[1:]).reshape(-1,2) for r in M['frames']}
def apply(N,P):
    P=np.float64(P); fx=np.clip((P[:,0]-X0)/(X1-X0)*(GX-1),0,GX-1-1e-6); fy=np.clip((P[:,1]-Y0)/(Y1-Y0)*(GY-1),0,GY-1-1e-6)
    i=np.floor(fx).astype(int); j=np.floor(fy).astype(int); u=fx-i; v=fy-j
    return N[j*GX+i]*((1-u)*(1-v))[:,None]+N[j*GX+i+1]*(u*(1-v))[:,None]+N[(j+1)*GX+i]*((1-u)*v)[:,None]+N[(j+1)*GX+i+1]*(u*v)[:,None]
tiles=[]
for a in sys.argv[3:]:
    t=float(a); f=frame(t); N=F[min(F,key=lambda k:abs(k-t))]
    for k,P in O.items():
        Q=apply(N,P); cv2.polylines(f,[np.int32(np.round(Q))],False,(0,255,0) if k!='beanie' else (0,255,255),2)
    f=cv2.resize(f,(1103,473)); cv2.putText(f,a,(5,20),0,0.7,(0,0,255),2); tiles.append(f)
while len(tiles)%2: tiles.append(np.zeros_like(tiles[0]))
cv2.imwrite(sys.argv[2],np.vstack([np.hstack(tiles[i:i+2]) for i in range(0,len(tiles),2)]),[cv2.IMWRITE_JPEG_QUALITY,80])
