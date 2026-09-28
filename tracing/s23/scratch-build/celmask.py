import re,cv2,numpy as np
ALPH="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
LUT={c:i for i,c in enumerate(ALPH)}
def varints(s):
    out=[];v=0;sh=0
    for ch in s:
        c=LUT[ch]
        if c>=32: v+=(c-32)<<sh; sh+=5
        else:
            v+=c<<sh; out.append(v); v=0; sh=0
    return out
def zz(v): return -((v+1)>>1) if v&1 else v>>1
def ring(s):
    z=[zz(v) for v in varints(s)]
    x,y=z[0],z[1]; pts=[(x,y)]
    for i in range(2,len(z)-1,2):
        x+=z[i];y+=z[i+1];pts.append((x,y))
    return np.array(pts,np.float32)/2
src=open('/Users/computer/rootline/apprentice-film/src/shots/s23/cels.js').read()
D={}
for k,q,v in re.findall(r'^(\d+):("?)([^\n]*?)\2,?$',src,re.M): D[int(k)]=v if q else int(v)
def res(k):
    v=D.get(k)
    while isinstance(v,int): k=v; v=D.get(k)
    return k,v
def mask(k,shape=(946,2206)):
    kk,v=res(k)
    m=np.zeros(shape,np.uint8)
    if not v: return m,kk,0
    parts=v.split('#'); body=parts[1] if len(parts)>1 else ''
    levels=body.split('!') if body else []
    if not levels: return m,kk,0
    lv=levels[0]; tr=lv.startswith('*'); o=9 if tr else 6
    rings=[ring(r) for r in lv[o:].split('~') if r]
    pts=[(r*16).astype(np.int32) for r in rings if len(r)>=3]
    # even-odd: xor each ring
    for p in pts:
        t=np.zeros(shape,np.uint8); cv2.fillPoly(t,[p],1,lineType=cv2.LINE_8,shift=4); m^=t
    return m,kk,len(levels)
