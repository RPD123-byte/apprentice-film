# fitshade.py rdir frame x0 y0 x1 y1 N -> json blobs (tone.js form, frame coords), shade only, blur 4
import sys, json, math, numpy as np, cv2
rdir=sys.argv[1]; n=int(sys.argv[2]); x0,y0,x1,y1=map(int,sys.argv[3:7]); N=int(sys.argv[7])
pad=48; X0,Y0,X1,Y1=max(0,x0-pad),max(0,y0-pad),min(2206,x1+pad),min(946,y1+pad)
T=cv2.imread('../s18-fix2-src/f%04d.png'%n,0)[Y0:Y1,X0:X1].astype(np.float32)/255
R=cv2.imread('%s/r%d.png'%(rdir,n),0)[Y0:Y1,X0:X1].astype(np.float32)/255
H,W=T.shape; bl=4.0; M=np.zeros_like(T); M[y0-Y0:y1-Y0,x0-X0:x1-X0]=1; C=M>0
bT=cv2.GaussianBlur(T,(0,0),bl); B=R.copy(); yy,xx=np.mgrid[0:H,0:W].astype(np.float32); blobs=[]
err=lambda B: np.abs(bT-cv2.GaussianBlur(B,(0,0),bl))[M>0].mean()
e0=err(B)
for it in range(N):
    bB=cv2.GaussianBlur(B,(0,0),bl); r=(bT-bB)*M; best=None
    for s in (10.0,16.0,24.0):
        w=bB*M
        num=cv2.GaussianBlur(r*w,(0,0),s)*(2*math.pi*s*s); den=cv2.GaussianBlur(w*w,(0,0),s/math.sqrt(2))*(math.pi*s*s)+1e-6
        A=np.clip(num/den,-0.85,0); red=np.where(C,2*A*num-A*A*den,-1); i=int(np.argmax(red)); v=red.flat[i]
        if best is None or v>best[0]: best=(v,i%W,i//W,s,float(A.flat[i]))
    v,x,y,s,amp=best
    if v<=1e-6 or abs(amp)<0.02: break
    g=np.exp(-((xx-x-0.5)**2+(yy-y-0.5)**2)/(2*s*s)); B=B*(1+amp*g)
    blobs.append([round(x+0.5+X0,1),round(y+0.5+Y0,1),s,round(amp,4)])
print('frame %d blur-4 MAE (x255) %.2f -> %.2f, %d blobs'%(n,e0*255,err(B)*255,len(blobs)))
print(json.dumps(blobs))
