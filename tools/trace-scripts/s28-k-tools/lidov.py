# overlay the LIDQ quad on source frames and on render frames
import sys,re,json,cv2,numpy as np
src=open('/Users/computer/rootline/apprentice-film/src/shots/s28/data.js').read()
L=json.loads(re.search(r'export const LIDQ = (\[.*?\]\]);',src).group(1))
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
times=[float(x) for x in sys.argv[2].split(',')]
out=[]
for t in times:
    k=int(round(t*25)); c.set(cv2.CAP_PROP_POS_FRAMES,k); ok,f=c.read()
    row=min(L,key=lambda r:abs(r[0]-t))
    q=np.array(row[1:]).reshape(4,2)
    cv2.polylines(f,[np.int32(q)],True,(0,255,255),2)
    x0=int(max(0,q[:,0].min()-150)); x1=int(min(2206,q[:,0].max()+150)); y0=int(max(0,q[:,1].min()-120))
    cr=f[y0:946,x0:x1]
    cr=cv2.resize(cr,(int(cr.shape[1]*500/cr.shape[0]),500))
    cv2.putText(cr,f"{t:.2f}",(10,30),0,1,(0,0,255),2)
    out.append(cr)
W=max(o.shape[1] for o in out)
out=[cv2.copyMakeBorder(o,0,0,0,W-o.shape[1],0) for o in out]
cols=3
while len(out)%cols: out.append(np.zeros_like(out[0]))
sheet=np.vstack([np.hstack(out[i:i+cols]) for i in range(0,len(out),cols)])
cv2.imwrite(sys.argv[1],sheet,[cv2.IMWRITE_JPEG_QUALITY,85])
