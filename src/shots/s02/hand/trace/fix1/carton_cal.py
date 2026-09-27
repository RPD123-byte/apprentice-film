# per-face calibration of the carton stack (study script): render the room layer alone at the hold (f370, pre-grade,
# with the room gain), measure each face's mean against the hold average (pre-grade), update FACE_K in cartons.js
import sys, re, json, subprocess, numpy as np, cv2
from run import Lab
CJ='/Users/computer/rootline/apprentice-film/src/shots/s02/hand/cartons.js'
A=np.load('../s02-r3-meas/hold_pre.npy')
def faces():
    s=open(CJ).read(); body=s[s.index('export const FACES = ['):s.index('];\n// per-face gain')]
    return [json.loads('['+m.group(1)+']') for m in re.finditer(r'\{ p: \[(\[.*?\])\]', body)]
def run_iter(it):
    L=Lab(); L.js('(o)=>window.__labset(o)',{'only':{'room':True,'chars':False}}); img,_=L.frame(370,False); L.close()
    R=cv2.cvtColor(img,cv2.COLOR_BGR2GRAY).astype(np.float32)
    F=faces(); s=open(CJ).read(); m=re.search(r'export const FACE_K = \[(.*?)\];',s); K=[float(v) for v in m.group(1).split(',')] if m.group(1).strip() else []
    K=K+[1.0]*(len(F)-len(K))
    occ=np.zeros(A.shape,np.uint8); cv2.rectangle(occ,(975,80),(1200,365),1,-1)   # the owl
    out=[]; tot=0
    for i,P in enumerate(F):
        m=np.zeros(A.shape,np.uint8); cv2.fillPoly(m,[np.array(P,np.int32)],1)
        # only the visible part: later faces paint over earlier ones
        for Q in F[i+1:]: cv2.fillPoly(m,[np.array(Q,np.int32)],0)
        m=cv2.erode(m,np.ones((7,7),np.uint8)); m[occ>0]=0
        n=int(m.sum())
        if n<300: out.append((i,n,None,None)); continue
        sm=float(A[m>0].mean()); rm=float(R[m>0].mean())
        k=K[i]*(max(sm,0.5)/max(rm,0.5))**0.9; k=min(3.0,max(0.15,k))
        out.append((i,n,round(sm,1),round(rm,1))); K[i]=round(k,3)
    s=s[:m.start()] if False else s
    s=re.sub(r'export const FACE_K = \[.*?\];','export const FACE_K = ['+','.join(str(k) for k in K)+'];',s)
    open(CJ,'w').write(s)
    for o in out: print(it,o, K[o[0]])
    bg=np.ones(A.shape,np.uint8)
    for P in F: cv2.fillPoly(bg,[np.array(P,np.int32)],0)
    bg[occ>0]=0; print(it,'background src %.1f render %.1f'%(A[bg>0].mean(),R[bg>0].mean()))
for it in range(int(sys.argv[1]) if len(sys.argv)>1 else 2): run_iter(it)
