# Figure silhouette at a SOURCE time: colour classes of the figure (vs room classes), connected to seeds, inside a clip,
# minus the lid quad, plus manual include polygons; holes filled, outline snapped to the ink.
import sys,json,cv2,numpy as np
sys.path.insert(0,'snapshots/s28-tools')
from grade import pre_frame,grab
from classes import classify
from extract import smooth_contour,snap_out,simplify
def silhouette(t,spec,lidq=None):
    refs={k:tuple(int(v[i:i+2],16) for i in (1,3,5)) for k,v in spec['refs'].items()}
    L,names=classify(t,refs,7)
    figc=[names.index(c) for c in spec['fig_classes']]
    m=np.isin(L,figc).astype(np.uint8)*255
    H,W=m.shape
    cm=np.zeros_like(m); cv2.fillPoly(cm,[np.int32(spec['clip'])],255); m&=cm
    for p in spec.get('cut',[]): cv2.fillPoly(m,[np.int32(p)],0)
    k=spec.get('close',3)
    m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(2*k+1,)*2))
    m=cv2.morphologyEx(m,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(7,7)))
    n,lab=cv2.connectedComponents(m)
    keep=set(lab[y,x] for x,y in spec['seeds'])-{0}
    s=np.isin(lab,list(keep)).astype(np.uint8)*255
    for p in spec.get('include',[]): cv2.fillPoly(s,[np.int32(p)],255)
    cs,_=cv2.findContours(s,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
    s2=np.zeros_like(s); cv2.drawContours(s2,cs,-1,255,-1)
    k=spec.get('close2',6)
    s2=cv2.morphologyEx(s2,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(2*k+1,)*2))
    # remove thin spikes (window frames, cables): keep only what lies near the opened body
    r=spec.get('despike',11)
    so=cv2.morphologyEx(s2,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(2*r+1,)*2))
    s2&=cv2.dilate(so,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(13,13)))
    for p in spec.get('include',[]): cv2.fillPoly(s2,[np.int32(p)],255)
    for p in spec.get('cut',[]): cv2.fillPoly(s2,[np.int32(p)],0)
    # drop room pixels that the closings pulled in: keep only what lies within 4 px of a figure-class pixel,
    # then fill the holes that leaves inside (ink lines, highlights)
    fc=np.isin(L,figc).astype(np.uint8)*255
    s2&=cv2.dilate(fc,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(9,9)))
    s2=cv2.morphologyEx(s2,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(7,7)))
    n_,lab_,st_,_=cv2.connectedComponentsWithStats(s2)
    if n_>1:
        big=1+np.argmax(st_[1:,4]); keepc=[i for i in range(1,n_) if st_[i,4]>0.05*st_[big,4]]
        s2=np.isin(lab_,keepc).astype(np.uint8)*255
    cutm=np.zeros_like(s2)
    for p in spec.get('cut',[])[:1]: cv2.fillPoly(cutm,[np.int32(p)],255)
    s2|=cutm
    inv=255-s2; n_,lab_,st_,_=cv2.connectedComponentsWithStats(inv)
    for i in range(1,n_):
        if st_[i,4]<40000 and st_[i,0]>0 and st_[i,1]>0 and st_[i,0]+st_[i,2]<s2.shape[1] and st_[i,1]+st_[i,3]<s2.shape[0]: s2[lab_==i]=255
    for p in spec.get('cut',[]): cv2.fillPoly(s2,[np.int32(p)],0)
    f=grab(t); gg=cv2.GaussianBlur(cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),1.2); dark=255-gg
    cs,_=cv2.findContours(s2,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
    rings=[]
    for c in cs:
        if cv2.contourArea(c)<3000: continue
        c=smooth_contour(c,2); c=smooth_contour(snap_out(c,dark,-2,5),2)
        rings.append([[round(float(a),1),round(float(b),1)] for a,b in simplify(c,1.0)])
    return rings
if __name__=='__main__':
    spec=json.load(open(sys.argv[1])); outp=sys.argv[2]
    res={}
    ims=[]
    for key in spec['keys']:
        t=key['t']; sp=dict(spec['common']); sp.update(key)
        rings=silhouette(t,sp)
        res[f"{t:.2f}"]=rings
        f=grab(t)
        for r in rings: cv2.polylines(f,[np.int32(r).reshape(-1,1,2)],True,(255,0,255),3)
        cv2.putText(f,f"{t:.2f}",(20,60),0,1.5,(255,255,255),3)
        ims.append(cv2.resize(f,None,fx=0.4,fy=0.4))
    json.dump(res,open(outp,'w'))
    while len(ims)%2: ims.append(np.zeros_like(ims[0]))
    cv2.imwrite(sys.argv[3],np.vstack([np.hstack(ims[i:i+2]) for i in range(0,len(ims),2)]))
