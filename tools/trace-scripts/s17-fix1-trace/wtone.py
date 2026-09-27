import cv2, numpy as np, json, sys
def load(p,name):
    s=open(p).read(); j=s[s.index(name+' = ')+len(name)+3:s.rindex(';')]; return json.loads(j)
W=load('/Users/computer/rootline/apprentice-film/src/shots/s17/wing_data.js','WINGS')
d=sys.argv[1]
for t in sys.argv[2].split(','):
    r=cv2.imread(f'{d}/r-{t}.png',0).astype(float); s=cv2.imread(f'{d}/s-{t}.png',0).astype(float)
    out=[]
    for nm in ['L','R']:
        if nm not in W[t]: continue
        m=np.zeros(r.shape,np.uint8); pts=np.array(W[t][nm]).reshape(-1,2).astype(np.int32); cv2.fillPoly(m,[pts],1)
        m=cv2.erode(m,np.ones((5,5),np.uint8))>0
        out.append(f"{nm}: src mean {s[m].mean():.0f} p10 {np.percentile(s[m],10):.0f} p50 {np.percentile(s[m],50):.0f} | ren mean {r[m].mean():.0f} p10 {np.percentile(r[m],10):.0f} p50 {np.percentile(r[m],50):.0f}")
    print(t,' ; '.join(out))
