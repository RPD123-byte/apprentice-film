import sys; sys.path.insert(0,'/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad')
from grade import *
from scipy.optimize import least_squares
S=load('/Users/computer/rootline/apprentice-film/snapshots/s40-fix1-ref/src-138.0.png')
Sb=cv2.GaussianBlur(S,(0,0),3)
P=invert(Sb)
# candidate bg mask
M=np.zeros((H,W),bool)
def box(x0,y0,x1,y1): M[y0:y1,x0:x1]=True
box(440,0,1880,235); box(1490,180,1700,235); 
box(430,625,1720,650); box(420,712,1800,800)
box(150,330,500,620); box(1700,330,1950,700)
box(0,0,200,250); box(1850,0,2206,300); box(1700,620,1950,760)
# remove objects: exclude by colour (cream, maroon) and known features
R_,G_,B_=S[...,0]*255,S[...,1]*255,S[...,2]*255
obj=((G_>135)&(B_>100)&(R_-B_<80))|((R_<130)&(G_<70))
obj=cv2.dilate(obj.astype(np.uint8),np.ones((25,25),np.uint8))>0
M&=~obj
# exclude the wordmark / owl / tagline boxes
M[230:625,480:1730]=False; M[650:712,540:1640]=False; M[190:470,1490:1700]=False
ys,xs=np.where(M); idx=np.arange(len(xs))[::37]; xs,ys=xs[idx],ys[idx]
T=P[ys,xs]
NS=9
def model(p,xs,ys):
    cx,cy,ax,ay=p[:4]; stops=p[4:4+NS*3].reshape(NS,3)
    rho=np.sqrt(((xs-cx)/ax)**2+((ys-cy)/ay)**2)
    pos=np.linspace(0,1,NS)
    out=np.stack([np.interp(np.clip(rho,0,1),pos,stops[:,k]) for k in range(3)],-1)
    return out
def res(p): return (model(p,xs,ys)-T).ravel()
p0=np.concatenate([[1100,60,1300,700],np.linspace([0.95,0.75,0.4],[0.8,0.3,0.12],NS).ravel()])
keep=np.ones(len(xs),bool)
for it in range(3):
    xs_,ys_,T_=xs[keep],ys[keep],T[keep]
    r=least_squares(lambda p:(model(p,xs_,ys_)-T_).ravel(),p0)
    p0=r.x
    e=np.abs(model(p0,xs,ys)-T).max(1)
    keep=e<np.percentile(e,90)
    print('iter',it,'rms',np.sqrt(np.mean((model(p0,xs_,ys_)-T_)**2))*255, 'n',keep.sum())
cx,cy,ax,ay=p0[:4]; st=p0[4:].reshape(NS,3)
print('centre',cx,cy,'axes',ax,ay)
for i,s in enumerate(st): print(round(i/(NS-1),3),'#%02x%02x%02x'%tuple(np.clip(s*255,0,255).astype(int)))
np.save('/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/bgp.npy',p0)
# residual map (post space) for inspection
yy2,xx2=np.mgrid[0:H:4,0:W:4]
Mo=model(p0,xx2.ravel().astype(float),yy2.ravel().astype(float)).reshape(yy2.shape+(3,))
full=cv2.resize(Mo.astype(np.float32),(W,H))
G=grade(full)
d=(G-Sb)*255
vis=np.clip(128+d*4,0,255).astype(np.uint8)
vis[~M]=vis[~M]//3
cv2.imwrite('/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/bgres.jpg',cv2.cvtColor(cv2.resize(vis,None,fx=0.5,fy=0.5),cv2.COLOR_RGB2BGR))
for (x,y) in [(1100,40),(600,150),(1600,150),(1750,150),(1000,660),(1000,720),(300,450),(800,300),(1300,250),(1100,780),(100,150),(2100,200),(1800,500)]:
  print((x,y),'src',(Sb[y,x]*255).astype(int),'fit',(G[y,x]*255).astype(int))
# coarse residual table (post space, mean over mask cells)
print('coarse residual (fit - src) L = mean RGB, per 200x100 cell, masked')
for y0 in range(0,900,100):
    row=[]
    for x0 in range(0,2206,200):
        m=M[y0:y0+100,x0:x0+200]
        if m.sum()<300: row.append('   .  '); continue
        dd=d[y0:y0+100,x0:x0+200][m].mean(0)
        row.append('%+3d%+3d' % (dd[0],dd[1]))
    print(y0, ' '.join(row))

# ---- second stage: cubic polynomial correction in pre-grade space on the masked bg samples ----
res_=T-model(p0,xs,ys)
X=(xs-1103)/1103.; Y=(ys-473)/473.
A=np.stack([np.ones_like(X),X,Y,X*X,X*Y,Y*Y,X**3,X*X*Y,X*Y*Y,Y**3],-1)
keep2=np.abs(res_).max(1)<0.08
coef=np.linalg.lstsq(A[keep2],res_[keep2],rcond=None)[0]
after=res_-A@coef
print('rms before %.2f after %.2f'%(np.sqrt((res_[keep2]**2).mean())*255,np.sqrt((after[keep2]**2).mean())*255))
np.set_printoptions(suppress=True,precision=4)
print('poly coef (rows=terms 1,X,Y,XX,XY,YY,XXX,XXY,XYY,YYY; cols=R,G,B, in 0..255 units):')
print((coef*255).round(2).tolist())
