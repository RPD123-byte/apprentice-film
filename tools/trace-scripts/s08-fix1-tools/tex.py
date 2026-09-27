import cv2,numpy as np,sys
rd=sys.argv[1]; f=int(sys.argv[2])
a=cv2.imread(f'{rd}/r{f}.png').astype(np.float32).mean(-1); b=cv2.imread(f'snapshots/s08-rev1-src/f{f}.png').astype(np.float32).mean(-1)
def bands(im):
  g1=cv2.GaussianBlur(im,(0,0),1.2); g3=cv2.GaussianBlur(im,(0,0),3); g10=cv2.GaussianBlur(im,(0,0),10)
  return im-g1, g1-g3, g3-g10
for nm,(x0,y0,x1,y1) in [('bg1',(1150,720,1400,900)),('bg2',(1950,380,2180,640)),('card',(1520,400,1860,520)),('cream',(262,650,338,880))]:
  ra=[np.std(q[y0:y1,x0:x1]) for q in bands(a)]; rb=[np.std(q[y0:y1,x0:x1]) for q in bands(b)]
  print(f,nm,'ren hf %.2f mid %.2f low %.2f | src hf %.2f mid %.2f low %.2f'%(*ra,*rb))
