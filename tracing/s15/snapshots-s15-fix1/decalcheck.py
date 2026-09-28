import json,cv2,numpy as np,sys
sys.path.insert(0,'h'); from common import frame
J=json.load(open('decalq.json')); B=json.load(open('facebest.json'))
S=300
def rect(f,P):
    P=np.float32(P).reshape(4,2); dst=np.float32([[0,S],[S,S],[S,0],[0,0]])
    M=cv2.getPerspectiveTransform(P,dst)
    g=cv2.cvtColor(frame(f),cv2.COLOR_BGR2GRAY)
    return cv2.warpPerspective(g,M,(S,S),flags=cv2.INTER_AREA,borderValue=0).astype(np.float32)
res={}
for key,lst in J['q'].items():
    T,fid=key.split(':'); d=J['d'][T][fid]
    b=B[T][fid]; ref=rect(b['f'],b['P'])
    cs=[(d[0],d[1])]+([(d[4],d[5])] if len(d)>4 else [])
    rows=[]
    for f,P in sorted(lst):
        im=rect(f,P); sc=[]
        for (u,v) in cs:
            w,h=d[2],d[3]
            x0=int(max(0,(u-w)*S)); x1=int(min(S,(u+w)*S)); y0=int(max(0,(1-v-h)*S)); y1=int(min(S,(1-v+h)*S))
            a=cv2.GaussianBlur(ref,(0,0),2)[y0:y1,x0:x1]; c=cv2.GaussianBlur(im,(0,0),2)[y0:y1,x0:x1]
            if a.size<20 or c.std()<1e-3 or a.std()<1e-3: sc.append(0); continue
            sc.append(float(np.corrcoef(a.ravel(),c.ravel())[0,1]))
        rows.append((f,[round(x,2) for x in sc]))
    res[key]=rows
    print(key, b['f'], ' '.join(f'{f}:{"/".join(str(x) for x in s)}' for f,s in rows))
json.dump(res,open('decalncc.json','w'))
