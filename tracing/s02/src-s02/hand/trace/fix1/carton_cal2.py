# calibrate the lower-row faces (35-39) on a flight frame (room only, pre-grade, with gain) against the ungraded source
import sys, re, json, numpy as np, cv2
from run import Lab
from common import ungrade, src
CJ='/Users/computer/rootline/apprentice-film/src/shots/s02/hand/cartons.js'
T=open('/Users/computer/rootline/apprentice-film/src/shots/s02/hand/tracks.js').read()
CAM=[float(v) for v in re.search(r'export const CAM = \[([^\]]*)\]',T).group(1).split(',')]
def cam(f): i=min(len(CAM)//2-1,f-261); return CAM[2*i],CAM[2*i+1]
BO=(2203.3,-1893.4)
FR=[int(v) for v in sys.argv[2].split(',')]; IDX=[int(v) for v in sys.argv[3].split(',')]
def faces():
    s=open(CJ).read(); body=s[s.index('export const FACES = ['):s.index('];\n// per-face gain')]
    return [json.loads('['+m.group(1)+']') for m in re.finditer(r'\{ p: \[(\[.*?\])\]', body)]
for it in range(int(sys.argv[1])):
    L=Lab(); L.js('(o)=>window.__labset(o)',{'only':{'room':True,'chars':False}})
    R={f:cv2.cvtColor(L.frame(f,False)[0],cv2.COLOR_BGR2GRAY).astype(np.float32) for f in FR}; L.close()
    S={f:ungrade(src(f).astype(np.float32),f/25) for f in FR}
    F=faces(); s=open(CJ).read(); K=[float(v) for v in re.search(r'export const FACE_K = \[(.*?)\];',s).group(1).split(',')]
    for i in IDX:
        sm=rm=n=0
        for f in FR:
            cx,cy=cam(f); P=np.array([[x+BO[0]+cx,y+BO[1]+cy] for x,y in F[i]],np.int32)
            m=np.zeros(R[f].shape,np.uint8); cv2.fillPoly(m,[P],1)
            for Q in F[i+1:]: cv2.fillPoly(m,[np.array([[x+BO[0]+cx,y+BO[1]+cy] for x,y in Q],np.int32)],0)
            m=cv2.erode(m,np.ones((9,9),np.uint8)); k=int(m.sum())
            if k<200: continue
            sm+=float(S[f][m>0].sum()); rm+=float(R[f][m>0].sum()); n+=k
        if n<300: print(it,i,'not visible'); continue
        sm/=n; rm/=n; K[i]=round(min(3,max(0.15,K[i]*(max(sm,0.5)/max(rm,0.5))**0.9)),3)
        print(it,i,n,round(sm,1),round(rm,1),K[i])
    s=re.sub(r'export const FACE_K = \[.*?\];','export const FACE_K = ['+','.join(str(k) for k in K)+'];',s); open(CJ,'w').write(s)
