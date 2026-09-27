# overlay: render (red) vs source (cyan) edges/brightness, plus side-by-side crop
import cv2, numpy as np, sys
r=cv2.imread(sys.argv[1]); s=cv2.imread(sys.argv[2]); out=sys.argv[3]
crop=[int(v) for v in sys.argv[4:8]] if len(sys.argv)>=8 else [0,0,2206,946]
x0,y0,x1,y1=crop
rg=cv2.cvtColor(r,cv2.COLOR_BGR2GRAY)[y0:y1,x0:x1]; sg=cv2.cvtColor(s,cv2.COLOR_BGR2GRAY)[y0:y1,x0:x1]
o=np.zeros((y1-y0,x1-x0,3),np.uint8)
o[:,:,2]=rg; o[:,:,1]=sg; o[:,:,0]=sg
cv2.imwrite(out,o)
