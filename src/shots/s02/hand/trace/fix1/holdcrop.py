import cv2, numpy as np, re, sys
T=open('/Users/computer/rootline/apprentice-film/src/shots/s02/hand/tracks.js').read()
CAM=[float(v) for v in re.search(r'export const CAM = \[([^\]]*)\]',T).group(1).split(',')]
def cam(f): i=min(len(CAM)//2-1,f-261); return CAM[2*i],CAM[2*i+1]
BO=(2203.3,-1893.4)
# holdcrop.py frames x0 y0 x1 y1 out [rdir]  : crops of source (and render) frames in HOLD coords with a grid
fr=[int(v) for v in sys.argv[1].split(',')]; x0,y0,x1,y1=map(int,sys.argv[2:6]); out=sys.argv[6]; rd=sys.argv[7] if len(sys.argv)>7 else None
rows=[]
for f in fr:
    cx,cy=cam(f); ox=BO[0]+cx; oy=BO[1]+cy
    ims=[]
    for im in ([cv2.imread(f'{rd}/r{f:04d}.png')] if rd else [])+[cv2.imread(f'../s02-fix1h-src/{f:04d}.png')]:
        can=np.zeros((y1-y0,x1-x0,3),np.uint8)
        for yy in range(y0,y1):
            pass
        fx0=int(round(x0+ox)); fy0=int(round(y0+oy))
        sx0=max(0,fx0); sy0=max(0,fy0); sx1=min(im.shape[1],fx0+(x1-x0)); sy1=min(im.shape[0],fy0+(y1-y0))
        if sx1>sx0 and sy1>sy0: can[sy0-fy0:sy1-fy0, sx0-fx0:sx1-fx0]=im[sy0:sy1,sx0:sx1]
        can=np.clip(255*(can/255.0)**0.7,0,255).astype(np.uint8)
        for x in range((x0//50+1)*50,x1,50): cv2.line(can,(x-x0,0),(x-x0,y1-y0),(0,0,255) if x%100==0 else (0,120,200),1); cv2.putText(can,str(x),(x-x0+2,12),0,0.35,(0,255,255),1) if x%100==0 else None
        for y in range((y0//50+1)*50,y1,50): cv2.line(can,(0,y-y0),(x1-x0,y-y0),(0,0,255) if y%100==0 else (0,120,200),1); cv2.putText(can,str(y),(2,y-y0-2),0,0.35,(0,255,255),1) if y%100==0 else None
        cv2.putText(can,str(f),(x1-x0-60,20),0,0.6,(0,255,0),2)
        ims.append(can)
    rows.append(np.hstack(ims))
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,88])
