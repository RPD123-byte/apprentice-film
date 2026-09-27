import sys; sys.path.insert(0,'src/shots/s20/trace')
import composite2 as C, numpy as np, cv2
M=C.M; OUT=C.OUT
B=np.load(OUT+'/B2full.npy'); A=np.load(OUT+'/Afull.npy')
a,b,c,d,e,f=C.B2
T=np.array([[1,0,M],[0,1,M],[0,0,1]]); Ti=np.array([[1,0,-M],[0,1,-M],[0,0,1]])
Mm=(T@np.vstack([[a,c,e],[b,d,f],[0,0,1]])@Ti)[:2].astype(np.float32)
Aw=cv2.warpAffine(A,Mm,(C.WW,C.HH),flags=cv2.INTER_LINEAR,borderValue=0)*0.93   # B2 is exposed 7 % darker than A
np.save(OUT+'/Aw_B2.npy',Aw)
d=np.abs(cv2.GaussianBlur(B,(0,0),2)-cv2.GaussianBlur(Aw,(0,0),2))
cv2.imwrite(OUT+'/holddiff.png',np.clip(d*400,0,255).astype(np.uint8))
x0,y0,x1,y1=650,40,1400,920
crop=np.hstack([np.clip(B[M+y0:M+y1,M+x0:M+x1]*255,0,255),np.clip(Aw[M+y0:M+y1,M+x0:M+x1]*255,0,255),np.clip(d[M+y0:M+y1,M+x0:M+x1]*500,0,255)]).astype(np.uint8)
cv2.imwrite(OUT+'/holddiff_c.png',cv2.resize(crop,None,fx=0.6,fy=0.6))
HP=[(1211, 82), (1233, 80), (1281, 98), (1272, 123), (1174, 373), (1219, 407), (1237, 507), (1262, 560), (1276, 600), (1281, 650), (1270, 700), (1240, 722), (1217, 751), (1228, 820), (1011, 820), (1028, 751), (983, 698), (928, 712), (833, 712), (756, 668), (756, 568), (822, 512), (861, 490), (903, 460), (963, 423), (981, 373), (1017, 353)]
reg=C.poly_mask([HP])
m=((d>0.07)|(cv2.GaussianBlur(B,(0,0),1.5)>0.35))&reg
m=cv2.morphologyEx(m.astype(np.uint8),cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(7,7)))
# fill holes
ff=m.copy(); h,w=m.shape; mm=np.zeros((h+2,w+2),np.uint8); cv2.floodFill(ff,mm,(0,0),1); m=m|(1-ff)
m=cv2.morphologyEx(m,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(5,5)))
n,lab,st,_=cv2.connectedComponentsWithStats(m)
keep=np.zeros_like(m)
for i in range(1,n):
    if st[i,4]>800: keep[lab==i]=1
np.save(OUT+'/holdmask.npy',keep)
vis=cv2.cvtColor(np.clip(B*255,0,255).astype(np.uint8),cv2.COLOR_GRAY2BGR)
cs,_=cv2.findContours(keep,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
cv2.drawContours(vis,cs,-1,(0,0,255),1)
x0,y0,x1,y1=650,40,1400,920
cv2.imwrite(OUT+'/holdmask_c.png',cv2.resize(vis[M+y0:M+y1,M+x0:M+x1],None,fx=0.9,fy=0.9))
print('components kept', [st[i,4] for i in range(1,n) if st[i,4]>800])

# B2 room: B2full outside the owl; under the owl the A room warped by B2, except where A still has the leaning
# scissors (gone in B2) -> inpainted from the surroundings
a,b,c,d_,e,f=C.B2
scB=[(a*x+c*y+e, b*x+d_*y+f) for x,y in C.SC_POLY]
sc=C.poly_mask([scB],6)
k=cv2.dilate(keep,np.ones((7,7),np.uint8))>0
room=np.where(k,Aw,B)
hole=(k&sc).astype(np.uint8)
u=np.clip(room*255,0,255).astype(np.uint8); u[hole>0]=0
inp=cv2.inpaint(u,hole,7,cv2.INPAINT_TELEA).astype(np.float32)/255
room=np.where(hole>0,np.minimum(inp,0.05),room)
np.save(OUT+'/B2room.npy',room.astype(np.float32)); cv2.imwrite(OUT+'/B2room.png',np.clip(room*255,0,255).astype(np.uint8))
