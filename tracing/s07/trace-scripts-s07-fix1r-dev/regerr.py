import cv2,numpy as np,sys
bl=lambda x,s: cv2.GaussianBlur(x.astype(np.float32),(0,0),s)
B=cv2.imread('../s07-p2-dev/w/frames/f_24.png',0)
R={'boxA':(830,21,895,160),'boxB':(861,171,977,352),'D1':(899,18,1049,133),'TF':(2066,604,2172,651),'sw':(1362,742,1490,900),'owl':(1714,540,1745,596)}
for f in sys.argv[1:]:
  A=cv2.imread(f,0); out=[]
  for nm,(x0,y0,x1,y1) in R.items():
    e8=np.abs(bl(A,8)-bl(B,8))[y0:y1,x0:x1].mean(); e2=np.abs(bl(A,2)-bl(B,2))[y0:y1,x0:x1].mean()
    hp=np.abs(A.astype(np.float32)-bl(A,4))[y0:y1,x0:x1].mean(); hs=np.abs(B.astype(np.float32)-bl(B,4))[y0:y1,x0:x1].mean()
    out.append('%s %.1f/%.1f hp%.0f(%.0f)'%(nm,e8,e2,hp,hs))
  print(f,' '.join(out))
