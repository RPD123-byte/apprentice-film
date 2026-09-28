# shift.py DIR frames x0 y0 x1 y1 : phase-correlation shift of render vs source in a box (+x: render is right of source)
import cv2,numpy as np,sys
d=sys.argv[1]; fr=[int(x) for x in sys.argv[2].split(',')]; x0,y0,x1,y1=[int(v) for v in sys.argv[3:7]]
win=cv2.createHanningWindow((x1-x0,y1-y0),cv2.CV_32F)
for n in fr:
    a=cv2.imread(f'{d}/f-{n}.png',0).astype(np.float32)[y0:y1,x0:x1]; b=cv2.imread(f'/Users/computer/rootline/apprentice-film/snapshots/s06-fix1-src/s-{n}.png',0).astype(np.float32)[y0:y1,x0:x1]
    a=cv2.GaussianBlur(a,(0,0),1.5); b=cv2.GaussianBlur(b,(0,0),1.5)
    (dx,dy),r=cv2.phaseCorrelate(b,a,win)
    print(n,'dx %.2f dy %.2f resp %.2f'%(dx,dy,r), 'mae1.5 %.2f'%np.abs(a-b).mean())
