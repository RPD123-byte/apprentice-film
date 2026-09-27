import cv2,numpy as np,json,sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V); res=[]
for i in range(33):
  t=round(61.80+0.04*i,2)
  c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,s=c.read(); s=cv2.GaussianBlur(cv2.cvtColor(s,cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),2)
  r=cv2.GaussianBlur(cv2.cvtColor(cv2.imread(f'out20/r-{t:.2f}.png'),cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),2)
  a=cv2.imread(f'owlonly/r-{t:.2f}.png',cv2.IMREAD_UNCHANGED)[...,3]
  m=cv2.dilate((a>128).astype(np.uint8),np.ones((25,25),np.uint8))
  Wp=np.eye(2,3,dtype=np.float32); cc=-1
  for sc in (4,2):
    ts=cv2.resize(r,None,fx=1/sc,fy=1/sc,interpolation=cv2.INTER_AREA); Is=cv2.resize(s,None,fx=1/sc,fy=1/sc,interpolation=cv2.INTER_AREA)
    ms=cv2.resize(m,(ts.shape[1],ts.shape[0]),interpolation=cv2.INTER_NEAREST)
    Ws=Wp.copy(); Ws[:,2]/=sc
    try: cc,Ws=cv2.findTransformECC(ts,Is,Ws,cv2.MOTION_AFFINE,(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,200,1e-5),ms,5)
    except cv2.error: cc=-1
    Ws[:,2]*=sc; Wp=Ws
  # correction evaluated at the owl's centroid
  ys,xs=np.nonzero(a>128); cx,cy=xs.mean(),ys.mean()
  d=Wp@np.array([cx,cy,1])-np.array([cx,cy]); sc_=np.sqrt(abs(np.linalg.det(Wp[:,:2])))
  res.append([t]+Wp.ravel().round(4).tolist())
  print(t,'cc',round(float(cc),3),'shift at centroid',d.round(1),'scale',round(float(sc_),3))
json.dump(res,open('owlalign.json','w'))
