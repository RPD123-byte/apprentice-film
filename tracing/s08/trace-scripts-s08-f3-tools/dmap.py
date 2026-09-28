import cv2,numpy as np,sys
rd=sys.argv[1]; k=int(sys.argv[2]); out=sys.argv[3]
a=cv2.imread(f'{rd}/r{k}.png').astype(np.float32); b=cv2.imread(f'snapshots/s08-f3-src/f{k}.png').astype(np.float32)
ab=cv2.GaussianBlur(a,(0,0),3); bb=cv2.GaussianBlur(b,(0,0),3)
dl=(ab-bb).mean(-1)
v=np.clip(dl*8,-255,255)
vis=np.zeros_like(a); vis[...,2]=np.clip(v,0,255); vis[...,0]=np.clip(-v,0,255)
vis=vis*0.85+cv2.cvtColor(b.mean(-1).astype(np.uint8),cv2.COLOR_GRAY2BGR)*0.25
for x in range(0,2206,100): cv2.line(vis,(x,0),(x,946),(70,70,70),1); cv2.putText(vis,str(x),(x+2,14),0,0.45,(200,200,200),1)
for y in range(0,946,100): cv2.line(vis,(0,y),(2206,y),(70,70,70),1); cv2.putText(vis,str(y),(2,y-2),0,0.45,(200,200,200),1)
cv2.imwrite(out,np.clip(vis,0,255).astype(np.uint8),[cv2.IMWRITE_JPEG_QUALITY,88])
