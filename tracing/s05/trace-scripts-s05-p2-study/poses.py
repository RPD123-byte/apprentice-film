import sys; sys.path.insert(0,'/Users/computer/rootline/apprentice-film/src/shots/s05/trace')
import numpy as np,cv2,frames
S=frames.static_target().mean(2).astype(np.float32)
B=np.mean([frames.pre(k).mean(2) for k in range(640,668)],0).astype(np.float32)   # pose B at (+43,-17)
np.save('cache/poseB_avg.npy',B)
x0,y0,x1,y1=860,630,1160,745
tA=S[y0:y1,x0:x1]; tB=B[y0-17:y1-17,x0+43:x1+43]
for k in range(578,668):
  F=frames.pre(k).mean(2).astype(np.float32)
  win=F[y0-80:y1+60,x0-60:x1+110]
  rA=cv2.matchTemplate(win,tA,cv2.TM_CCOEFF_NORMED); _,mA,_,lA=cv2.minMaxLoc(rA)
  rB=cv2.matchTemplate(win,tB,cv2.TM_CCOEFF_NORMED); _,mB,_,lB=cv2.minMaxLoc(rB)
  lab="A" if mA>mB else "B"
  print(f'{k/25:.2f} A {mA:.3f} at ({lA[0]-60:+d},{lA[1]-80:+d})  B {mB:.3f} at ({lB[0]-60:+d},{lB[1]-80:+d})  {lab}')
