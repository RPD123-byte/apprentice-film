import cv2,numpy as np,sys
b=cv2.imread(sys.argv[1],0).astype(np.float32)
bl=lambda x,s: cv2.GaussianBlur(x,(0,0),s)
boxes={'hands':(560,470,1200,860),'lhand':(580,620,900,860),'rhand':(880,480,1200,700),'kbd':(450,560,1000,800)}
for f in sys.argv[2:]:
  a=cv2.imread(f,0).astype(np.float32)
  out=[]
  for k,(x0,y0,x1,y1) in boxes.items():
    e8=np.abs(bl(a,8)-bl(b,8))[y0:y1,x0:x1].mean(); e2=np.abs(bl(a,2)-bl(b,2))[y0:y1,x0:x1].mean()
    hp=lambda x: np.abs(x-bl(x,4))
    en=(hp(a)[y0:y1,x0:x1].mean(), hp(b)[y0:y1,x0:x1].mean())
    out.append('%s e8 %.2f e2 %.2f hp4 %.1f/%.1f'%(k,e8,e2,*en))
  print(f,' | '.join(out))
