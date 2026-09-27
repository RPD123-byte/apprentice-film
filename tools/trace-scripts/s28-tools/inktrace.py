# Vector trace of the ink of a SOURCE frame inside a mask polygon: tone layers -> filled polygons (with holes),
# each with its measured median colour. Output JSON {"ink":[{"c":col,"layer":i,"rings":[[[x,y]..],..]}]}.
# Usage: inktrace.py T spec.json out.json [--overlay img]
import sys,json,cv2,numpy as np
sys.path.insert(0,'snapshots/s28-tools')
from grade import pre_frame,hexc
def lum(p): return 0.299*p[...,0]+0.587*p[...,1]+0.114*p[...,2]
def main():
    t=float(sys.argv[1]); spec=json.load(open(sys.argv[2])); outp=sys.argv[3]
    pre=pre_frame(t)
    S=spec.get('up',2)
    P2=cv2.resize(pre,None,fx=S,fy=S,interpolation=cv2.INTER_CUBIC)
    L=cv2.GaussianBlur(lum(P2),(0,0),spec.get('blur',0.8)*S)
    bg=cv2.dilate(L,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(int(10*S)+1,)*2)); bg=cv2.GaussianBlur(bg,(0,0),3*S)
    H,W=L.shape
    area=np.zeros((H,W),np.uint8)
    for poly in spec['polys']: cv2.fillPoly(area,[np.int32(np.array(poly)*S)],255)
    for poly in spec.get('exclude',[]): cv2.fillPoly(area,[np.int32(np.array(poly)*S)],0)
    out=[]
    for li,lay in enumerate(spec['layers']):
        m=(L<lay['lmax'])
        if 'contrast' in lay: m&=(bg-L)>lay['contrast']
        m&=area>0
        m=m.astype(np.uint8)*255
        if lay.get('open'): m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((lay['open'],)*2,np.uint8))
        cs,hier=cv2.findContours(m,cv2.RETR_CCOMP,cv2.CHAIN_APPROX_NONE)
        if hier is None: continue
        hier=hier[0]
        for i,c in enumerate(cs):
            if hier[i][3]>=0: continue   # holes handled with their parent
            a=cv2.contourArea(c)/(S*S)
            if a<lay.get('min_area',3): continue
            rings=[]
            def simp(cc):
                cc=cc.reshape(-1,2).astype(np.float32)
                if len(cc)>6:
                    n=len(cc); idx=(np.arange(n)[:,None]+np.arange(-1,2)[None])%n; cc=cc[idx].mean(1)
                ap=cv2.approxPolyDP(cc.reshape(-1,1,2),lay.get('eps',0.6)*S,True).reshape(-1,2)
                return [[round(float(x)/S+0.5/S-0.5,1),round(float(y)/S+0.5/S-0.5,1)] for x,y in ap]
            rings.append(simp(c))
            j=hier[i][2]
            while j>=0:
                if cv2.contourArea(cs[j])/(S*S)>=lay.get('min_hole',2): 
                    r=simp(cs[j])
                    if len(r)>=3: rings.append(r)
                j=hier[j][0]
            if len(rings[0])<3: continue
            mm=np.zeros((H,W),np.uint8); cv2.drawContours(mm,cs,i,255,-1)
            j=hier[i][2]
            while j>=0: cv2.drawContours(mm,cs,j,0,-1); j=hier[j][0]
            px=P2[mm>0]
            col=np.percentile(px,lay.get('pct',50),axis=0) if len(px) else np.array([0,0,0])
            out.append({'c':hexc(col),'l':li,'r':rings})
        print('layer',li,'shapes',sum(1 for o in out if o['l']==li),'pts',sum(len(r) for o in out if o['l']==li for r in o['r']),file=sys.stderr)
    json.dump({spec.get('key','ink'):out},open(outp,'w'),separators=(',',':'))
main()
