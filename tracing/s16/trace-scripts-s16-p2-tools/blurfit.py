import sys; sys.path.insert(0,'/Users/computer/rootline/apprentice-film/src/shots/s16/trace')
import tr, cv2, numpy as np, json
E=np.load('plateE.npy'); M=90; W,H=2206,946
cams=json.load(open('cams.json'))
def warp(A):
    Ai=np.linalg.inv(np.vstack([A,[0,0,1]]).astype(np.float64)); T=np.array([[1,0,M],[0,1,M],[0,0,1]],np.float64)
    return cv2.warpAffine(E,(T@Ai)[:2].astype(np.float32),(W,H),flags=cv2.INTER_LINEAR+cv2.WARP_INVERSE_MAP)
res={}
for f in list(range(1143,1166))+list(range(1186,1193)):
    A=np.array(cams[str(f)]['A'],np.float32) if str(f) in cams else np.float32([[1,0,0],[0,1,0]])
    Pw=warp(A); Y=tr.pre(f)
    x0,y0,x1,y1=(1400,30,2100,760)
    a=Y[y0:y1,x0:x1]; 
    best=None
    for sx in (0,0.5,0.8,1.1,1.4,1.7,2.0,2.4,2.8,3.3):
        for sy in (0,0.5,0.8,1.1,1.4,1.7,2.0,2.4,2.8,3.3):
            b=Pw[y0-20:y1+20,x0-20:x1+20]
            if sx>0 or sy>0:
                b=cv2.GaussianBlur(b,(0,0),sigmaX=max(sx,0.01),sigmaY=max(sy,0.01))
            b=b[20:-20,20:-20]
            e=np.abs(cv2.GaussianBlur(a,(0,0),0.7)-cv2.GaussianBlur(b,(0,0),0.7)).mean()*255
            if best is None or e<best[0]: best=(e,sx,sy)
    e0=np.abs(cv2.GaussianBlur(a,(0,0),0.7)-cv2.GaussianBlur(Pw[y0:y1,x0:x1],(0,0),0.7)).mean()*255
    res[f]=best[1:]
    print(f,'best sx %.1f sy %.1f err %.2f (sharp %.2f)'%(best[1],best[2],best[0],e0),flush=True)
json.dump(res,open('blur.json','w'))
