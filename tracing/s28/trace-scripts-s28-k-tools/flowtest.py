import sys; sys.path.insert(0,'.')
from geo import *
def gray(k):
    f=frame(k); g=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY); return cv2.GaussianBlur(g,(0,0),1.2)
dis=cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_ULTRAFAST)
dis=cv2.DISOpticalFlow_create(2)
def flow(ka,kb):
    a,b=gray(ka),gray(kb)
    fw=dis.calc(a,b,None); bw=dis.calc(b,a,None)
    return fw,bw
def lidmask(t,grow=30):
    m=np.zeros((H,W),np.uint8); q=lidQuad(t).copy(); q[2:,1]+=200
    cv2.fillPoly(m,[np.int32(q)],255); return cv2.dilate(m,np.ones((grow*2+1,grow*2+1),np.uint8))
for name,gname,tk,t in [('fig12932','fig12932',129.32,129.40),('fig12932','fig12932',129.32,129.44),('fig12952','fig12952',129.52,129.44),('fig12952','fig12952',129.52,129.60)]:
    D=loadKey(name); G=DEPTH[gname]
    uv,X=keyVerts(G,tk); p3,_=project(camAt(frameT(t)),X)
    ka,kb=round(tk*25),round(t*25)
    fw,bw=flow(ka,kb)
    sil=ringsMask(D['sil']); sil=cv2.erode(sil,np.ones((25,25),np.uint8))
    valid=(sil>0)&(lidmask(tk)==0)
    ui=np.round(uv[:,0]).astype(int); vi=np.round(uv[:,1]).astype(int)
    ins=(ui>=0)&(ui<W)&(vi>=0)&(vi<H)
    ok=np.zeros(len(uv),bool); ok[ins]=valid[vi[ins],ui[ins]]
    d=fw[vi[ok],ui[ok]]; pm=uv[ok]+d
    # fb check
    pi=np.clip(np.round(pm).astype(int),0,[W-1,H-1]); back=bw[pi[:,1],pi[:,0]]
    fb=np.linalg.norm(d+back,axis=1)
    lm=lidmask(t); notlid=lm[pi[:,1],pi[:,0]]==0
    good=(fb<1.5)&notlid
    r=pm[good]-p3[ok][good]
    print(name,tk,'->',t,'n',good.sum(),'/',ok.sum(),'measured disp med',np.median(np.linalg.norm(d[good],axis=1)).round(1),'3D-pred disp med',np.median(np.linalg.norm(p3[ok][good]-uv[ok][good],axis=1)).round(1),'residual med',np.median(r,0).round(2),'|r| p50/p90',np.percentile(np.linalg.norm(r,axis=1),[50,90]).round(2))
