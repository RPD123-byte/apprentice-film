import json
R=json.load(open('slottrack.json'))
TH=0.7
out={}
for key,e in R.items():
    T,fid=key.split(':'); d=e['d']; ref=e['ref']
    ps=[]
    for per in e['per']:
        per={int(k):v for k,v in per.items()}
        fs=sorted(per); keep={}
        if ref not in per: ps.append({}); continue
        i0=fs.index(ref); keep[ref]=per[ref]
        for dirn in (1,-1):
            miss=0; i=i0+dirn
            while 0<=i<len(fs) and abs(fs[i]-fs[i-dirn])<=2:
                if per[fs[i]][0]>=TH: keep[fs[i]]=per[fs[i]]; miss=0
                else:
                    miss+=1
                    if miss>1: break
                i+=dirn
        # the matched centres wander on flat faces: fit a straight drift through the reference position (robust:
        # iteratively drop the worst frame while its residual > 0.04 uv) and keep the frames that sit on it
        import numpy as np
        fr=sorted(keep); ru,rv=keep[ref][1],keep[ref][2]
        while True:
            F=np.array(fr,float)-ref; U=np.array([keep[f][1] for f in fr])-ru; V=np.array([keep[f][2] for f in fr])-rv
            den=max(1e-9,(F*F).sum()); a=(F*U).sum()/den; b=(F*V).sum()/den
            r=np.hypot(U-a*F,V-b*F); j=int(np.argmax(r))
            if r[j]<=0.04 or len(fr)<=1: break
            if fr[j]==ref: r[j]=0; j=int(np.argmax(r))
            fr.pop(j)
        # (the drift comes from the frames that sit on it; the slot is drawn over the whole contiguous run of good
        # matches, holes filled, at the fitted place, so it neither flickers nor jitters)
        a=float(np.clip(a,-0.03,0.03)); b=float(np.clip(b,-0.03,0.03))
        allf=sorted(keep); run=[f for f in fs if allf[0]<=f<=allf[-1]]
        ps.append({f:[round(ru+a*(f-ref),3),round(rv+b*(f-ref),3)] for f in run})
    ent={'wh':d[2:4],'p1':ps[0]}
    if len(ps)>1: ent['p2']=ps[1]
    out.setdefault(T,{})[fid]=ent
src=open('/Users/computer/rootline/apprentice-film/src/shots/s15/decals.js').read()
head=src[:src.index('// The roto face ids')]
head=head.replace("""// Numbers only. Per take, face id -> [u, v, w, h] (the slot's centre and size in the face's own uv: u = 0 at the
// face's left edge, v = 0 at its bottom edge), optionally a second slot centre [u2, v2] of the same size (many faces
// span a box and the top of the one below it). Faces not listed have no slot.""","""// Numbers only. Per take, face id -> { wh: the slot's size [w, h] in the face's own uv (u = 0 at the face's left edge,
// v = 0 at its bottom edge), p1: { source frame: [u, v] slot centre }, p2: a second slot of the same size (many faces
// span a box and the top of the one below it) }. Faces not listed have no slot.""")
head+="""// The roto face ids are screen-position labels, not physical boxes (take E's "LL" is a different box at 43.80 than at
// 43.20), and a face's uv drifts a little from frame to frame, so each slot was tracked: its patch on the measured
// frame, template-matched on the same face rectified in the take's other frames (+-0.15 uv); a slot is drawn on the
// frames where it matched (score >= 0.7, contiguous with the measured frame), at the matched place
// (snapshots/s15-fix1/slottrack.py, mkdecals2.py).
"""
js=head+'export const DECALS = {\n'
for T,faces in out.items():
    js+=f'  {T}: {{\n'
    for fid,e in faces.items():
        s=json.dumps(e,separators=(",",":"))
        for k in ('wh','p1','p2'): s=s.replace(f'"{k}"',k)
        js+=f'    {fid}: {s},\n'
    js+='  },\n'
js+='};\n'
open('/Users/computer/rootline/apprentice-film/src/shots/s15/decals.js','w').write(js)
