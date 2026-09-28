import numpy as np, cv2, re, sys, json
txt=open('../../src/shots/s40/data.js').read()
def band(name):
    a=txt.index(name+': ['); b=txt.index('],\n  ]',a)
    rows=re.findall(r'\[([-0-9., ]+)\]',txt[a:b+3])
    return np.array([[float(v) for v in r.split(',')] for r in rows])
B={k:band(k) for k in ['leftB','leftA','rightB','rightA']}
s=np.load('smean138.npy'); r=np.load(sys.argv[1])
from grade import hb_map
raw=cv2.imread('raw/r-138.000.png').astype(np.float32)  # BGR 0..255
hb=hb_map(raw[:,:,::-1]/255)[:,:,::-1]
H,W=946,2206; yy,xx=np.mgrid[0:H,0:W]; u=(xx+0.5)/W; v=1-(yy+0.5)/H; qx=(u-0.5)*2; qy=(v-0.5)*2
vig=1-0.38*np.minimum(1,(qx*qx+qy*qy)/2)**1.15
m=cv2.imread('../s40-fix1c-h/mask.png'); rib=(m[:,:,0]>128)&(m[:,:,2]<128)  # BGR: blue channel = ribbon, red channel = cloud
rib=cv2.erode(rib.astype(np.uint8),np.ones((5,5),np.uint8))>0
def xs_at(Bk,y):
    rows=Bk; 
    if y<rows[0,0] or y>rows[-1,0]: return None
    return np.array([np.interp(y,rows[:,0],rows[:,k]) for k in range(1,9)])
names=['dark','red','peach','cream','peach2','red2','dark2']
res={}
for k,Bk in B.items():
    upper={'leftB':'leftA','rightB':'rightA'}.get(k)
    acc={i:[[],[]] for i in range(7)}
    for y in range(int(max(0,Bk[0,0])),int(min(945,Bk[-1,0]))):
        xs=xs_at(Bk,y)
        cov=xs_at(B[upper],y) if upper else None
        for i in range(7):
            x0,x1=xs[i]+3,xs[i+1]-3
            for x in range(int(np.ceil(x0)),int(np.floor(x1))+1):
                if x<0 or x>=2206 or not rib[y,x]: continue
                if cov is not None and cov[0]-6<=x<=cov[7]+6: continue
                acc[i][0].append(r[y,x]); acc[i][1].append(s[y,x])
                p=raw[y,x]/255; h=hb[y,x]; hh=1-(1-p)*(1-0.5*h); acc[i].append(((0.65+2.1*hh*(1-hh))*(1-0.5*h)*vig[y,x], p*255))
    print(k)
    for i in range(7):
        if len(acc[i][0])<50: continue
        a=np.mean(acc[i][0],0)[::-1]; b=np.mean(acc[i][1],0)[::-1]
        gs=np.mean([t[0] for t in acc[i][2:]],0)[::-1]; pr=np.mean([t[1] for t in acc[i][2:]],0)[::-1]
        dp=-(a-b)/gs
        print(f'  {names[i]:6s} n={len(acc[i][0]):6d} R({a[0]:3.0f},{a[1]:3.0f},{a[2]:3.0f}) S({b[0]:3.0f},{b[1]:3.0f},{b[2]:3.0f}) d({a[0]-b[0]:+3.0f},{a[1]-b[1]:+3.0f},{a[2]-b[2]:+3.0f})  pre({pr[0]:3.0f},{pr[1]:3.0f},{pr[2]:3.0f}) dpre({dp[0]:+3.0f},{dp[1]:+3.0f},{dp[2]:+3.0f})')
