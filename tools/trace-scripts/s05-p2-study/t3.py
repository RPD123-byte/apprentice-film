import sys; sys.path.insert(0,'/Users/computer/rootline/apprentice-film/src/shots/s05/trace')
import numpy as np, cv2, pickle, time
from recon import draw_strokes
T=np.load('avg25_pre.npy'); Y=T.mean(2).astype(np.float32)
res=pickle.load(open(sys.argv[1],'rb'))
# stroke mask for inpainting base
H,W=Y.shape
m=np.zeros((H,W),np.uint8)
for pol in (1,-1):
  for S in res[pol]:
    for k in range(len(S)-1):
      cv2.line(m,tuple(np.round(S[k,:2]).astype(int)),tuple(np.round(S[k+1,:2]).astype(int)),255,max(1,int(round(S[k,2]+1))))
base=cv2.inpaint((np.clip(Y,0,1)*255).astype(np.uint8),m,3,cv2.INPAINT_TELEA).astype(np.float32)/255
base=cv2.GaussianBlur(base,(0,0),float(sys.argv[2]) if len(sys.argv)>2 else 2)
cv2.imwrite('t3_base.png',(base*255).astype(np.uint8))
t0=time.time()
img=base.copy()
img=draw_strokes(img,res[-1]); img=draw_strokes(img,res[1])
print('draw',time.time()-t0)
cv2.imwrite('t3_recon.png',(np.clip(img,0,1)*255).astype(np.uint8))
k=lambda x,s: cv2.GaussianBlur(x,(0,0),s)
for s in (1,2,4):
  print('sigma',s,'MAE',np.abs(k(img,s)-k(Y,s)).mean()*255, 'base only', np.abs(k(base,s)-k(Y,s)).mean()*255)
print('raw MAE',np.abs(img-Y).mean()*255)
