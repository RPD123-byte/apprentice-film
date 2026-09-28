# srcgrab.py out.jpg w h T:cx:cy ... -> tiles of source crops centred on cx,cy
import cv2, sys, numpy as np
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
out=sys.argv[1]; w=int(sys.argv[2]); h=int(sys.argv[3]); specs=sys.argv[4:]
cols=int([s for s in specs if s.startswith('cols=')][0][5:]) if any(s.startswith('cols=') for s in specs) else 4
specs=[s for s in specs if not s.startswith('cols=')]
c=cv2.VideoCapture(V); tiles=[]
for s in specs:
    t,cx,cy=map(float,s.split(':'))
    c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,f=c.read()
    x0=int(cx-w/2); y0=int(cy-h/2)
    pad=cv2.copyMakeBorder(f,h,h,w,w,cv2.BORDER_CONSTANT)
    cr=pad[y0+h:y0+2*h,x0+w:x0+2*w].copy()
    cv2.putText(cr,f"{t:.2f}",(4,16),0,0.5,(0,255,255),1); tiles.append(cr)
while len(tiles)%cols: tiles.append(np.zeros_like(tiles[0]))
rows=[np.hstack(tiles[i:i+cols]) for i in range(0,len(tiles),cols)]
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,92]); print(out)
