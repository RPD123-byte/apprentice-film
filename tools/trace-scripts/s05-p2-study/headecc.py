import numpy as np,cv2
fr=np.load('src_570_672.npy',mmap_mode='r')
ref=fr[625-570].astype(np.float32).mean(2)/255
x0,y0,x1,y1=1390,200,1720,470
tpl=ref[y0:y1,x0:x1]
res=[]
for k in range(636,662):
  im=fr[k-570].astype(np.float32).mean(2)/255
  W=np.eye(2,3,dtype=np.float32)
  # search: warp maps template coords -> image coords
  big=im
  try:
    cc,W=cv2.findTransformECC(tpl,big[y0-40:y1+40,x0-40:x1+40].copy(),np.array([[1,0,40],[0,1,40]],np.float32),cv2.MOTION_EUCLIDEAN,(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,200,1e-6),None,5)
  except Exception as e:
    cc=0
  ang=np.degrees(np.arctan2(W[1,0],W[0,0])); dx=W[0,2]-40; dy=W[1,2]-40
  # displacement of head centre (1540,330) and the neck (1540,460)
  def mv(px,py):
    u,v=px-x0,py-y0; return (W[0,0]*u+W[0,1]*v+W[0,2]-40-u, W[1,0]*u+W[1,1]*v+W[1,2]-40-v)
  print(f'{k/25:.2f} cc {cc:.3f} rot {ang:+.2f} t ({dx:+.1f},{dy:+.1f}) centre {tuple(round(v,1) for v in mv(1540,330))} top {tuple(round(v,1) for v in mv(1540,230))} neck {tuple(round(v,1) for v in mv(1540,460))}')
