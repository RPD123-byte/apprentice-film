# per-frame slot positions: template-match each measured slot (rectified patch of its reference frame) on the same
# face id rectified in every frame of the take (search +-0.15 uv); keep frames whose match is good
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
    return cv2.warpPerspective(gray(f),M,(S,S),flags=cv2.INTER_AREA,borderValue=0)
res={}
for key,lst in J['q'].items():
    T,fid=key.split(':'); d=J['d'][T][fid]; b=B[T][fid]; ref=cv2.GaussianBlur(rect(b['f'],b['P']),(0,0),1.5)
    w,h=d[2],d[3]; cs=[(d[0],d[1])]+([(d[4],d[5])] if len(d)>4 else [])
    per=[{} for _ in cs]
    for k,(u,v) in enumerate(cs):
        tw=max(16,int(w*S*1.4)); th=max(16,int(h*S*1.4))
        cx,cy=u*S,(1-v)*S
        x0=int(np.clip(cx-tw/2,0,S-tw)); y0=int(np.clip(cy-th/2,0,S-th))
        tpl=ref[y0:y0+th,x0:x0+tw]
        if tpl.std()<3: continue
        for f,P in sorted(lst):
            im=cv2.GaussianBlur(rect(f,P),(0,0),1.5)
            m=45; X0=max(0,x0-m); Y0=max(0,y0-m); X1=min(S,x0+tw+m); Y1=min(S,y0+th+m)
            reg=im[Y0:Y1,X0:X1]
            if reg.shape[0]<th or reg.shape[1]<tw: continue
            r=cv2.matchTemplate(reg,tpl,cv2.TM_CCOEFF_NORMED); _,mx,_,loc=cv2.minMaxLoc(r)
            nu=(X0+loc[0]+(cx-x0))/S; nv=1-(Y0+loc[1]+(cy-y0))/S
            per[k][f]=(round(float(mx),2),round(nu,3),round(nv,3))
    res[key]={'d':d,'ref':b['f'],'per':per}
    print(key,b['f'],' | '.join(' '.join(f'{f}:{s[0]}' for f,s in sorted(p.items())) for p in per))
json.dump(res,open('slottrack.json','w'))
