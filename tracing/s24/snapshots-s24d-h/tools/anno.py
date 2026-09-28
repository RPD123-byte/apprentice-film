import cv2,numpy as np,sys
from holes import holes
def tile(k,R,step=50,sc=1.0,mark=True):
  g=cv2.imread('src/f%04d.png'%(2420+k))
  x0,y0,x1,y1=R; f=g[y0:y1,x0:x1].copy()
  f=cv2.resize(f,None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC)
  for x in range((x0//step+1)*step,x1,step):
    X=int((x-x0)*sc); cv2.line(f,(X,0),(X,f.shape[0]),(0,140,255),1); cv2.putText(f,str(x),(X+2,12),0,0.4,(0,255,255),1)
  for y in range((y0//step+1)*step,y1,step):
    Y=int((y-y0)*sc); cv2.line(f,(0,Y),(f.shape[1],Y),(0,140,255),1); cv2.putText(f,str(y),(2,Y-2),0,0.4,(0,255,255),1)
  if mark:
    for (ex,ey,ea,eb,ang,a) in holes(k,R):
      cv2.ellipse(f,((int((ex-x0)*sc),int((ey-y0)*sc)),(int(ea*sc),int(eb*sc)),ang),(255,0,255),1)
  cv2.putText(f,'k%d'%k,(6,f.shape[0]-8),0,0.9,(0,255,0),2)
  return f
if __name__=='__main__':
  which=sys.argv[1]; ks=[int(v) for v in sys.argv[2].split(',')]; out=sys.argv[3]
  R={'A':(150,150,700,720),'B':(560,0,1120,440)}[which]
  ts=[tile(k,R) for k in ks]
  while len(ts)%2: ts.append(np.zeros_like(ts[0]))
  rows=[np.hstack(ts[i:i+2]) for i in range(0,len(ts),2)]
  cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,90])
