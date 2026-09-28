# ovl.py k silfile NAME[,NAME] dx dy x0 y0 x1 y1 scale out.jpg
import sys,cv2,numpy as np; sys.path.insert(0,'/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s24fix1')
from sil import load
SP='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s24fix1'
k=int(sys.argv[1]); d=load('/Users/computer/rootline/apprentice-film/src/shots/s24/d/%s.js'%sys.argv[2]); names=sys.argv[3].split(',')
dx,dy=float(sys.argv[4]),float(sys.argv[5]); x0,y0,x1,y1=[int(v) for v in sys.argv[6:10]]; sc=float(sys.argv[10]); out=sys.argv[11]
im=cv2.imread(SP+'/src/f%04d.png'%(2420+k))[y0:y1,x0:x1]; im=cv2.resize(im,None,fx=sc,fy=sc)
cols=[(0,0,255),(0,255,0),(255,0,0),(0,255,255),(255,0,255)]
for i,n in enumerate(names):
  p=np.array(d[n]['pts'])+[dx,dy]; q=((p-[x0,y0])*sc).astype(np.int32)
  cv2.polylines(im,[q],True,cols[i%5],1)
  for j,(x,y) in enumerate(d[n].get('notch',[])):
    X,Y=int((x+dx-x0)*sc),int((y+dy-y0)*sc); cv2.circle(im,(X,Y),3,cols[i%5],-1); cv2.putText(im,str(j),(X+3,Y),0,0.35,cols[i%5],1)
for x in range((x0//100+1)*100,x1,100): X=int((x-x0)*sc); cv2.line(im,(X,0),(X,8),(0,255,255),1); cv2.putText(im,str(x),(X+2,18),0,0.4,(0,255,255),1)
for y in range((y0//100+1)*100,y1,100): Y=int((y-y0)*sc); cv2.line(im,(0,Y),(8,Y),(0,255,255),1); cv2.putText(im,str(y),(2,Y-2),0,0.4,(0,255,255),1)
cv2.imwrite(out,im)
