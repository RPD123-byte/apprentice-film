import sys, time, cv2, numpy as np
sys.path.insert(0,'.')
from run import Lab, build
from common import *
build()
L=Lab()
t0=time.time()
# raw page (pre-grade) and graded page without grain at t=50
raw=L.png('''async () => { const {S}=F1; const c=document.createElement('canvas'); c.width=2206; c.height=946; const g=c.getContext('2d'); g.fillStyle='#000'; g.fillRect(0,0,2206,946); g.drawImage(S.sokoPageCanvas({gaze:'owl'}),0,0); return c; }''')
print('page ms', time.time()-t0)
cv2.imwrite('../f1-p3/cur_raw.png', raw[...,:3])
L.close()
g=grade(raw[...,:3].astype(np.float32),50.0)
cv2.imwrite('../f1-p3/cur_g.png', g.astype(np.uint8))
S=cv2.imread('../f1-p3/clean_g.png').astype(np.float32)
a=cv2.GaussianBlur(gray(g.astype(np.uint8)).astype(np.float32),(0,0),6); b=cv2.GaussianBlur(gray(S.astype(np.uint8)).astype(np.float32),(0,0),6)
print('graded sigma6 MAE full', np.abs(a-b).mean(), ' designer', np.abs(a-b)[150:900,900:1300].mean())
