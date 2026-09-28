# usage: tstrip.py out x0 y0 x1 y1 dir1 [dir2 ...] --tmin A --tmax B  -> top row renders at their TRUE render time floor(t*30)/30,
# bottom row the source frame nearest that time (cv2), labelled
import cv2, glob, sys, re, math, numpy as np
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
a=sys.argv[1:]; out=a[0]; x0,y0,x1,y1=map(int,a[1:5]); rest=a[5:]
tmin=float(rest[rest.index('--tmin')+1]); tmax=float(rest[rest.index('--tmax')+1]); dirs=[r for r in rest if not r.startswith('--') and not re.match(r'^[\d.]+$',r)]
tw=int(rest[rest.index('--w')+1]) if '--w' in rest else 300
c=cv2.VideoCapture(V)
fs={}
for d in dirs:
    for f in glob.glob(d+'/frame-*.png'):
        t=float(re.search(r'at-([\d.]+)s',f).group(1)); tr=math.floor(t*30+1e-6)/30
        if tmin<=tr<=tmax: fs.setdefault(round(tr,4),f)
cols=[]
for tr in sorted(fs):
    im=cv2.imread(fs[tr])[y0:y1,x0:x1]
    k=round(tr*25); c.set(cv2.CAP_PROP_POS_FRAMES,k); ok,s=c.read(); s=s[y0:y1,x0:x1]
    th=int(im.shape[0]*tw/im.shape[1])
    im=cv2.resize(im,(tw,th),interpolation=cv2.INTER_AREA); s=cv2.resize(s,(tw,th),interpolation=cv2.INTER_AREA)
    cv2.putText(im,f"R {tr:.3f}",(4,16),0,0.5,(0,0,255),2); cv2.putText(s,f"S {k/25:.2f}",(4,16),0,0.5,(0,160,255),2)
    cols.append(np.vstack([im,np.full((4,tw,3),255,np.uint8),s,np.full((10,tw,3),0,np.uint8)]))
per=int(sys.argv[sys.argv.index('--cols')+1]) if '--cols' in sys.argv else 6
while len(cols)%per: cols.append(np.zeros_like(cols[0]))
rows=[np.hstack([np.hstack([c_,np.zeros((c_.shape[0],4,3),np.uint8)]) for c_ in cols[i:i+per]]) for i in range(0,len(cols),per)]
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,90]); print(out,len(fs),'frames',sorted(fs))
