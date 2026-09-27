import cv2,numpy as np,sys
f=int(sys.argv[1]); x0,y0,x1,y1=map(int,sys.argv[2:6]); out=sys.argv[6]
b=cv2.imread(f'snapshots/s08-rev1-src/f{f}.png'); b=cv2.bilateralFilter(b,7,40,5).astype(float)
c=b[y0:y1,x0:x1]
B,G,R=c[...,0],c[...,1],c[...,2]
mx=np.maximum(np.maximum(R,G),B); mn=np.minimum(np.minimum(R,G),B); L=(R+G+B)/3
hsv=cv2.cvtColor(np.clip(c,0,255).astype(np.uint8),cv2.COLOR_BGR2HSV).astype(float); H=hsv[...,0]*2; S=hsv[...,1]/255
cls=np.zeros(L.shape,np.uint8)  # 0 bg
cls[(L<38)&(R>G+2)]=1                      # outline (warm black)
cls[(mx>60)&(S>0.25)&((H>215)&(H<275))]=2   # violet
cls[(mx>70)&(S>0.3)&((H>=300)|(H<5))]=3    # pink
cls[(mx>70)&(S>0.4)&(H>=5)&(H<28)]=4       # orange/red
cls[(mx>70)&(S>0.4)&(H>=28)&(H<65)]=5      # yellow
cls[(L>110)&(S<0.25)]=6                    # cream/white
cols=np.array([[25,35,25],[0,0,0],[200,80,90],[150,70,220],[50,100,240],[60,200,240],[235,235,235]],np.uint8)
im=cols[cls]
s=float(sys.argv[7]) if len(sys.argv)>7 else 1
im=cv2.resize(im,None,fx=s,fy=s,interpolation=cv2.INTER_NEAREST)
st=20
for x in range((x0//st+1)*st,x1,st):
  X=int((x-x0)*s); cv2.line(im,(X,0),(X,im.shape[0]),(0,255,0) if x%100==0 else (0,90,0),1)
  if x%100==0: cv2.putText(im,str(x),(X+2,12),0,0.45,(0,255,0),1)
for y in range((y0//st+1)*st,y1,st):
  Y=int((y-y0)*s); cv2.line(im,(0,Y),(im.shape[1],Y),(0,255,0) if y%100==0 else (0,90,0),1)
  if y%100==0: cv2.putText(im,str(y),(2,Y+12),0,0.45,(0,255,0),1)
cv2.imwrite(out,im)
np.save(out+'.npy',cls)
