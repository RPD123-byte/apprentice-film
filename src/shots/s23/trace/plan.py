# which frames get their own cel (the rest repeat the previous drawing), and the trace settings per frame
import json
HS=json.load(open('holdstats.json'))
HOLD_E=0.025
def is_hold(k):
    v=HS.get(str(k))
    e=0.03 if 2316<=k<=2398 else HOLD_E    # the power-up is on twos; shaken frames leave ~0.025 of resampling residue
    return v is not None and v[1]<e and v[0]>0.85
def holds(a=2101,b=2426):
    ref={}; cur=None
    for k in range(a,b+1):
        if cur is not None and is_hold(k): ref[k]=cur
        else: cur=k
    return ref
L9=[0.15,0.3,0.45,0.58,0.69,0.78,0.85,0.91,0.95]
L7=[0.18,0.38,0.56,0.7,0.8,0.88,0.94]
def params(k):
    # a low first level (0.08) keeps the faint grey edges on dark (the headphone band); finer contours where the
    # frame budget allows (the power-up frames are big: coarser there)
    if 2316<=k<=2398: return dict(levels=[0.08]+L7,eps=1.0,smooth=0.9)
    return dict(levels=[0.08]+L9,eps=0.6,smooth=0.55)
if __name__=='__main__':
    r=holds(); print(len(r),'holds; unique',326-len(r))
    json.dump({str(k):v for k,v in r.items()},open('holdref.json','w'))
