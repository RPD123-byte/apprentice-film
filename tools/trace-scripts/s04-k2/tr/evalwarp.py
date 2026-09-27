# evalwarp.py key.json -- how well the key frame, warped by its tracks, predicts the frames it covers (hull MAE, sigma 3)
import cv2, numpy as np, json, sys
sys.path.insert(0,'tr'); from mls import warp_image
K=json.load(open(sys.argv[1])); T=K['t']
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'; cap=cv2.VideoCapture(V)
def fr(i): cap.set(cv2.CAP_PROP_POS_FRAMES,i); ok,f=cap.read(); return cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.float32)
f0=int(round(T*25)); A=fr(f0)
hull=K['hull']; hull=[hull] if isinstance(hull[0][0],(int,float)) else hull
m=np.zeros(A.shape,np.uint8)
for p in hull: cv2.fillPoly(m,[np.array(p,np.int32)],1)
src=np.array(K['tracks']['src']).reshape(-1,2)
for o,d in sorted(K['tracks']['f'].items(), key=lambda kv:int(kv[0])):
    d=np.array([np.nan if v is None else v for v in d],float).reshape(-1,2); ok=~np.isnan(d[:,0])
    B=fr(f0+int(o))
    Wp=warp_image(A,src[ok],d[ok])
    bl=lambda x:cv2.GaussianBlur(x,(0,0),3)
    e_id=np.abs(bl(A)-bl(B))[m>0].mean(); e_w=np.abs(bl(Wp)-bl(B))[m>0].mean()
    print(f"offset {o:>3}: {ok.sum()} pts  unwarped {e_id:5.1f}  warped {e_w:5.1f}")
