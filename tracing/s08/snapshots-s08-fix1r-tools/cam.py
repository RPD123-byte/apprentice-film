import re,cv2,numpy as np
src=open('/Users/computer/rootline/apprentice-film/src/shots/s08.js').read()
blk=src[src.index('const CAM = ['):src.index('];',src.index('const CAM = ['))]
CAM=[list(map(float,m.split(','))) for m in re.findall(r'\[([-\d., ]+)\]',blk)]
def cam(u):
    if u<=0: return CAM[0]
    for i in range(1,len(CAM)):
        if u<=CAM[i][0]+1e-9:
            a,b=CAM[i-1],CAM[i]; f=(u-a[0])/(b[0]-a[0]); return [a[j]+(b[j]-a[j])*f for j in range(5)]
    return CAM[-1]
def M(k):
    u=(k-764)/25; _,s,tx,ty,rot=cam(u); r=np.deg2rad(rot); c=s*np.cos(r); sn=s*np.sin(r)
    return np.array([[c,-sn,tx],[sn,c,ty]],np.float64)
def f0(im,k,interp=cv2.INTER_CUBIC):
    """warp an output-frame image of frame k into F0 coordinates"""
    return cv2.warpAffine(im,M(k),(im.shape[1],im.shape[0]),flags=interp|cv2.WARP_INVERSE_MAP)
def src(k): return cv2.imread(f'/Users/computer/rootline/apprentice-film/snapshots/s08-p4-src/f{k}.png')
A,B,TX,TY=0.418768349,0.00105950832,670.585031,106.503905
PC_X,PC_Y,PC_W,PC_H=1278.2,185.3,193.9,270.2
CARD_DX=-0.5
def page2f0(px,py):
    det=A*A+B*B; ia=A/det; ib=B/det
    return (ia*(px-TX)+ib*(py-TY), -ib*(px-TX)+ia*(py-TY))
def card2page(u,v):
    s=PC_W/465; return (PC_X+CARD_DX+u*s, PC_Y+v*s)
def card2f0(u,v): return page2f0(*card2page(u,v))
K=float(np.hypot(A,B))
_c=card2page(465/2,648/2); _f=page2f0(*_c)
OX=_f[0]-_c[0]/K; OY=_f[1]-_c[1]/K
def card2f0u(u,v):
    p=card2page(u,v); return (p[0]/K+OX, p[1]/K+OY)
def f02cardu(x,y):
    s=PC_W/465
    return (((x-OX)*K-(PC_X+CARD_DX))/s, ((y-OY)*K-PC_Y)/s)
