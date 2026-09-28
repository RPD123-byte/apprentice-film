# plate-coordinate strip: pstrip.py T0 T1 out.jpg x0 y0 x1 y1 [Z] [cols]
import sys, cv2, numpy as np
exec(open('/Users/computer/rootline/apprentice-film/snapshots/s01-fix1-meas/camlib.py').read())
t0,t1=float(sys.argv[1]),float(sys.argv[2]); out=sys.argv[3]; x0,y0,x1,y1=[int(v) for v in sys.argv[4:8]]
Z=float(sys.argv[8]) if len(sys.argv)>8 else 1; cols=int(sys.argv[9]) if len(sys.argv)>9 else 4
tiles=[]
for n in range(int(round(t0*25)),int(round(t1*25))+1):
    g=plate_frame(n/25,x0,y0,x1,y1,Z); cv2.putText(g,f"{n/25:.2f}",(4,16),0,0.5,(0,255,255),1)
    # ticks every 50 plate px
    for x in range((x0//50+1)*50,x1,50): X=int((x-x0)*Z); cv2.line(g,(X,0),(X,6),(0,0,255),1)
    tiles.append(g)
while len(tiles)%cols: tiles.append(np.zeros_like(tiles[0]))
cv2.imwrite(out,np.vstack([np.hstack(tiles[i:i+cols]) for i in range(0,len(tiles),cols)]),[cv2.IMWRITE_JPEG_QUALITY,88])
