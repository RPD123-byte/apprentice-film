# blobs.py N x0 y0 x1 y1 [thr_dark] : bright-region bbox (owl) and dark blobs inside it
import cv2,numpy as np,sys
n=int(sys.argv[1]); x0,y0,x1,y1=map(int,sys.argv[2:6]); thr=int(sys.argv[6]) if len(sys.argv)>6 else 80
im=cv2.cvtColor(cv2.imread('/Users/computer/rootline/apprentice-film/snapshots/s20-rev1-src/n%d.png'%n),cv2.COLOR_BGR2GRAY)
c=im[y0:y1,x0:x1]
b=(c>200).astype(np.uint8)
b=cv2.morphologyEx(b,cv2.MORPH_CLOSE,np.ones((5,5),np.uint8))
k,lab,st,cen=cv2.connectedComponentsWithStats(b)
for i in np.argsort(-st[:,4])[:4]:
    if i==0: continue
    x,y,w,h,a=st[i]; print('bright',x+x0,y+y0,x+x0+w,y+y0+h,'area',a)
d=(c<thr).astype(np.uint8)
k,lab,st,cen=cv2.connectedComponentsWithStats(d)
for i in np.argsort(-st[:,4])[:8]:
    if i==0: continue
    x,y,w,h,a=st[i]
    if a<150: continue
    print('dark',x+x0,y+y0,x+x0+w,y+y0+h,'area',a,'c',int(cen[i][0]+x0),int(cen[i][1]+y0))
