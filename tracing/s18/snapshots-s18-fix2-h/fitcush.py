# fitcush.py rdir out.json N  -- tone blobs (tone.js form) fitted on the registered medians of the standing frames,
# graded values, blob centres in the cup box, error at blur 3 over the box grown by 24 px
import sys, json, math, re, numpy as np, cv2
rdir, out, N = sys.argv[1], sys.argv[2], int(sys.argv[3])
txt=open('../../src/shots/s18/shotA.js').read(); PATH=eval(re.search(r'PATH_A = (\[.*?\]);', txt, re.S).group(1)); P={r[0]:(r[1],r[2]) for r in PATH}
X0,Y0,X1,Y1=600,230,820,430; box=(640,260,780,400)
S=[];R=[]
for n in range(1346,1382):
    if n in (1351,1376): continue
    dx,dy=P[n]
    S.append(cv2.imread('../s18-fix2-src/f%04d.png'%n,0)[Y0+dy:Y1+dy,X0+dx:X1+dx]); R.append(cv2.imread('%s/r%d.png'%(rdir,n),0)[Y0+dy:Y1+dy,X0+dx:X1+dx])
T=np.median(np.stack(S),0).astype(np.float32)/255; Rm=np.median(np.stack(R),0).astype(np.float32)/255
H,W=T.shape; bl=3.0
M=np.zeros_like(T); M[box[1]-24-Y0:box[3]+24-Y0, box[0]-24-X0:box[2]+24-X0]=1
C=np.zeros_like(T,bool); C[box[1]-Y0:box[3]-Y0, box[0]-X0:box[2]-X0]=True
bT=cv2.GaussianBlur(T,(0,0),bl); B=Rm.copy(); yy,xx=np.mgrid[0:H,0:W].astype(np.float32); blobs=[]
err=lambda B: np.abs(bT-cv2.GaussianBlur(B,(0,0),bl))[M>0].mean()
e0=err(B)
for it in range(N):
    bB=cv2.GaussianBlur(B,(0,0),bl); r=(bT-bB)*M; best=None
    for s in (5.0,8.0,12.0):
        w=bB*M
        num=cv2.GaussianBlur(r*w,(0,0),s)*(2*math.pi*s*s); den=cv2.GaussianBlur(w*w,(0,0),s/math.sqrt(2))*(math.pi*s*s)+1e-6
        for sign in (-1,1):
            A=num/den; A=np.clip(A,-0.85,0) if sign<0 else np.clip(A,0,0.85)
            red=np.where(C,2*A*num-A*A*den,-1); i=int(np.argmax(red)); v=red.flat[i]
            if best is None or v>best[0]: best=(v,i%W,i//W,s,float(A.flat[i]))
    v,x,y,s,amp=best
    if v<=1e-6 or abs(amp)<0.01: break
    g=np.exp(-((xx-x-0.5)**2+(yy-y-0.5)**2)/(2*s*s)); B=np.minimum(B*(1+amp*g),1)
    blobs.append([round(x+0.5+X0,1),round(y+0.5+Y0,1),s,round(amp,4)])
print('blur-3 MAE over box+24 (x255) %.2f -> %.2f, %d blobs'%(e0*255,err(B)*255,len(blobs)))
json.dump(blobs,open(out,'w'))
