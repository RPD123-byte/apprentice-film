# Label pixels of a source frame by nearest reference colour (pre-grade, median-blurred), to trace region outlines.
import sys,json,cv2,numpy as np
sys.path.insert(0,'snapshots/s28t-tools/t')
from grade import pre_frame
def classify(t,refs,blur=7):
    p=(pre_frame(t)*255).astype(np.uint8)
    p=cv2.medianBlur(p,blur)
    lab=cv2.cvtColor(p[...,::-1],cv2.COLOR_BGR2LAB).astype(np.float32)
    R=np.array([cv2.cvtColor(np.uint8([[c[::-1]]]),cv2.COLOR_BGR2LAB)[0,0] for c in refs.values()],np.float32)
    d=((lab[:,:,None,:]-R[None,None])**2).sum(-1)
    return np.argmin(d,2),list(refs.keys())
if __name__=='__main__':
    t=float(sys.argv[1]); refs=json.loads(open(sys.argv[2]).read())
    refs={k:tuple(int(v[i:i+2],16) for i in (1,3,5)) for k,v in refs.items()}
    L,names=classify(t,refs)
    np.save(sys.argv[3]+'.npy',L)
    cols=np.array([refs[n] for n in names],np.uint8)[:,::-1]
    cv2.imwrite(sys.argv[3]+'.png',cols[L])
    print(names)
