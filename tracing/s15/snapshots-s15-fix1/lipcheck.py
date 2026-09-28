import json,cv2,numpy as np,sys
sys.path.insert(0,'h'); from common import frame
J=json.load(open('decalq.json')); B=json.load(open('facebest.json'))
S=300
_g={}
def gray(f):
    if f not in _g: _g[f]=cv2.cvtColor(frame(f),cv2.COLOR_BGR2GRAY)
    return _g[f]
def rect(f,P):
    P=np.float32(P).reshape(4,2); dst=np.float32([[0,S],[S,S],[S,0],[0,0]])
    M=cv2.getPerspectiveTransform(P,dst)
    return cv2.warpPerspective(gray(f),M,(S,S),flags=cv2.INTER_AREA,borderValue=0).astype(np.float32)
def lip(im,u,v,w,h):
    x0=int(max(0,(u-w*0.4)*S)); x1=int(min(S,(u+w*0.4)*S))
    yb=(1-(v-h/2))*S
    best=0
    for dy in range(-12,13,2):
        y=int(yb+dy)
        if y-16<0 or y+16>S or x1-x0<3: continue
        a=im[y-3:y+3,x0:x1].mean(); o=0.5*(im[y-15:y-8,x0:x1].mean()+im[y+8:y+15,x0:x1].mean())
        best=min(best,a-o)
    return best
res={}
for key,lst in J['q'].items():
    T,fid=key.split(':'); d=J['d'][T][fid]
    cs=[(d[0],d[1])]+([(d[4],d[5])] if len(d)>4 else [])
    rows=[]
    for f,P in sorted(lst):
        im=rect(f,P); rows.append((f,[round(lip(im,u,v,d[2],d[3]),1) for u,v in cs]))
    res[key]=rows
    print(key,B[T][fid]['f'],' '.join(f'{f}:{"/".join(str(x) for x in s)}' for f,s in rows))
json.dump(res,open('lip.json','w'))
