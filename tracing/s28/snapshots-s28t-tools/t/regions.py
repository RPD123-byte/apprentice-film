# Extract region outlines from a colour-class label map: union of classes, connected to a seed, optional clip polygon
# and cut polylines (drawn as barriers). Output simplified polygons (JSON) + overlay.
# spec: {name: {"classes":[...], "seed":[x,y], "close":r, "open":r, "clip":[[x,y]..], "cuts":[[[x,y]..],..], "eps":1.5}}
import sys,json,cv2,numpy as np
sys.path.insert(0,'snapshots/s28t-tools/t')
from grade import grab
from classes import classify
t=float(sys.argv[1]); refs=json.loads(open(sys.argv[2]).read()); spec=json.loads(open(sys.argv[3]).read()); out=sys.argv[4]
refs={k:tuple(int(v[i:i+2],16) for i in (1,3,5)) for k,v in refs.items()}
L,names=classify(t,refs)
f=grab(t); o=f.copy(); res={}
cols=[(0,0,255),(0,255,0),(255,0,0),(0,255,255),(255,0,255),(255,255,0),(0,128,255),(128,0,255),(255,128,0),(0,255,128)]
for i,(name,s) in enumerate(spec.items()):
    m=np.isin(L,[names.index(c) for c in s['classes']]).astype(np.uint8)*255
    if s.get('close'): k=s['close']; m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(2*k+1,2*k+1)))
    if s.get('open'): k=s['open']; m=cv2.morphologyEx(m,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(2*k+1,2*k+1)))
    if 'clip' in s:
        cm=np.zeros_like(m); cv2.fillPoly(cm,[np.int32(s['clip'])],255); m&=cm
    for cut in s.get('cuts',[]): cv2.polylines(m,[np.int32(cut)],False,0,3)
    n,lab=cv2.connectedComponents(m,connectivity=4)
    x,y=s['seed']; lid=lab[y,x]
    if lid==0: print(name,'seed not in mask',file=sys.stderr); continue
    mm=(lab==lid).astype(np.uint8)*255
    if s.get('fill_holes',True):
        cs,_=cv2.findContours(mm,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
        mm=np.zeros_like(mm); cv2.drawContours(mm,cs,-1,255,-1)
    cs,_=cv2.findContours(mm,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
    c=max(cs,key=cv2.contourArea)
    ap=cv2.approxPolyDP(c,s.get('eps',1.5),True).reshape(-1,2)
    res[name]=ap.tolist()
    col=cols[i%len(cols)]
    cv2.polylines(o,[ap.reshape(-1,1,2)],True,col,2); cv2.circle(o,(x,y),6,col,-1); cv2.putText(o,name,(x+8,y),0,0.6,col,2)
    print(name,len(ap),'area',int(mm.sum()/255),file=sys.stderr)
json.dump(res,open(out+'.json','w'))
cv2.imwrite(out+'.jpg',o)
