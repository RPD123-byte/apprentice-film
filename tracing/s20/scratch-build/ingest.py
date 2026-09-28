# ingest harness frames: metrics vs source, then keep a q93 jpg and drop the png
import cv2,glob,re,os,sys,numpy as np,json
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
D='/Users/computer/rootline/apprentice-film/snapshots/s20-rev1r-dev'
cap=cv2.VideoCapture(V)
def src(n):
    cap.set(cv2.CAP_PROP_POS_FRAMES,n); ok,f=cap.read(); return f
out=D+'/metrics.jsonl'
done=set()
if os.path.exists(out):
    for l in open(out): done.add(json.loads(l)['n'])
B=lambda a: cv2.GaussianBlur(a.astype(np.float32),(0,0),6)
fs=sorted(glob.glob(D+'/f*.png'))
with open(out,'a') as fo:
    for p in fs:
        n=int(re.search(r'f(\d+)\.png',p).group(1))
        r=cv2.imread(p)
        if r is None or r.shape[:2]!=(946,2206): print('bad',p); continue
        s=src(n)
        rg=cv2.cvtColor(r,cv2.COLOR_BGR2GRAY); sg=cv2.cvtColor(s,cv2.COLOR_BGR2GRAY)
        e=np.abs(B(rg)-B(sg))
        owl=e[200:900,650:1400].mean(); room=np.concatenate([e[:,:600].ravel(),e[:,1450:].ravel()]).mean()
        # neighbours: best-matching source frame within +-2
        nb={}
        for m in range(n-2,n+3):
            nb[m]=float(np.abs(B(rg)-B(cv2.cvtColor(src(m),cv2.COLOR_BGR2GRAY))).mean())
        # colour: mean chroma (|R-B|) render vs source over card area
        rec=dict(n=n,mae=float(e.mean()),owl=float(owl),room=float(room),lr=float(rg.mean()),ls=float(sg.mean()),
                 best=min(nb,key=nb.get),nb=nb,
                 black_r=float((rg<16).mean()),black_s=float((sg<16).mean()),white_r=float((rg>230).mean()),white_s=float((sg>230).mean()))
        fo.write(json.dumps(rec)+'\n'); fo.flush()
        cv2.imwrite(p[:-4]+'.jpg',r,[cv2.IMWRITE_JPEG_QUALITY,93]); os.remove(p)
        print(n,f"{rec['mae']:.2f} owl {owl:.2f} room {room:.2f} best {rec['best']}")
