import numpy as np,cv2
fr=np.load('src_570_672.npy',mmap_mode='r')
ref=fr[625-570].astype(np.float32).mean(2)/255
im=fr[606-570].astype(np.float32).mean(2)/255   # 24.24
# refine translation for hand and arm by ECC on crops
def ecc(box):
  x0,y0,x1,y1=box; tpl=ref[y0:y1,x0:x1]
  best=None
  cc,W=cv2.findTransformECC(tpl,im[y0-40:y1+40,x0-10:x1+90].copy(),np.array([[1,0,76],[0,1,18]],np.float32),cv2.MOTION_TRANSLATION,(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,200,1e-6),None,5)
  return cc,W[0,2]-10,W[1,2]-40
print('hand',ecc((900,610,1150,740)))
print('arm',ecc((1180,640,1330,760)))
