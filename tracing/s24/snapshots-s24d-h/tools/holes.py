import cv2,numpy as np,sys
def holes(k,R,thr=110):
  g=cv2.imread('src/f%04d.png'%(2420+k),0)
  x0,y0,x1,y1=R; c=g[y0:y1,x0:x1]
  b=(c>thr).astype(np.uint8)
  inv=1-b
  nl,lab,st,cen=cv2.connectedComponentsWithStats(inv,connectivity=4)
  out=[]
  h,w=c.shape
  for i in range(1,nl):
    xx,yy,ww,hh,a=st[i]
    if xx==0 or yy==0 or xx+ww>=w or yy+hh>=h: continue
    if a<150 or a>9000: continue
    cnt,_=cv2.findContours((lab==i).astype(np.uint8),cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
    cn=cnt[0]
    if len(cn)<6: continue
    (ex,ey),(ea,eb),ang=cv2.fitEllipse(cn)
    ea_=np.pi*ea*eb/4
    fill=a/ea_ if ea_>0 else 0
    if fill<0.75 or fill>1.25: continue
    if min(ea,eb)<8: continue
    out.append((round(ex+x0,1),round(ey+y0,1),round(ea,1),round(eb,1),round(ang,1),a))
  return out
if __name__=='__main__':
  RA=(150,150,700,720); RB=(560,0,1120,440)
  for k in range(24,54):
    print('k%d'%k,'A',holes(k,RA),' B',holes(k,RB))
