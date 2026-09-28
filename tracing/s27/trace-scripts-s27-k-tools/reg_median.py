# reg_median.py T out.png [halfspan=2] [nlm=5]: grain-free source frame at T = median of frames T-k..T+k (0.04 s steps)
# registered onto T by dense DIS flow, then a light non-local-means pass. Measurement only.
import cv2, numpy as np, sys
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/snapshots/s27-meas')
from common import load
T=float(sys.argv[1]); out=sys.argv[2]; K=int(sys.argv[3]) if len(sys.argv)>3 else 2; h=float(sys.argv[4]) if len(sys.argv)>4 else 5
ref=load(T); g0=cv2.cvtColor(ref,cv2.COLOR_BGR2GRAY); H,W=g0.shape
dis=cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM); dis.setFinestScale(0); dis.setPatchSize(12); dis.setPatchStride(3)
yy,xx=np.mgrid[0:H,0:W].astype(np.float32)
st=[ref]
for k in range(-K,K+1):
    if k==0: continue
    t=round(T+k*0.04,2)
    try: f=load(t); g=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY)
    except Exception: continue
    fl=dis.calc(cv2.GaussianBlur(g0,(0,0),1.2),cv2.GaussianBlur(g,(0,0),1.2),None)
    for c in range(2): fl[...,c]=cv2.GaussianBlur(fl[...,c],(0,0),3)
    wr=cv2.remap(f,xx+fl[...,0],yy+fl[...,1],cv2.INTER_LINEAR,borderMode=cv2.BORDER_REPLICATE)
    d=np.abs(cv2.cvtColor(wr,cv2.COLOR_BGR2GRAY).astype(np.float32)-g0)
    wr[d>40]=ref[d>40]          # badly registered pixels fall back to the reference
    st.append(wr)
med=np.median(np.stack(st),0).astype(np.uint8)
if h>0: med=cv2.fastNlMeansDenoisingColored(med,None,h,h,5,13)
cv2.imwrite(out,med)
