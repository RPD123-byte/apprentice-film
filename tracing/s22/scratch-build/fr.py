import cv2,numpy as np,glob,re,math
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
_cap=cv2.VideoCapture(V)
ROOT='/Users/computer/rootline/apprentice-film/snapshots/'
def render(t):
    for p in glob.glob(ROOT+'s28-rev1*/frame-*.jpg'):
        if abs(float(re.search(r'at-([\d.]+)s',p).group(1))-t)<1e-4: return cv2.imread(p)
    return None
def src(t):
    _cap.set(1,math.ceil(t*25-1e-6)); ok,f=_cap.read(); return f
def seq(ts,box,out,scale=0.7,label=True):
    x0,y0,x1,y1=box; rows=[]
    for t in ts:
        a=render(t); b=src(t)
        if a is None: print('missing',t); continue
        r=np.hstack([a[y0:y1,x0:x1],np.full((y1-y0,4,3),255,np.uint8),b[y0:y1,x0:x1]]).copy()
        if label: cv2.putText(r,f'{t:.2f}',(5,25),0,0.8,(0,0,255),2)
        rows.append(r); rows.append(np.full((3,r.shape[1],3),255,np.uint8))
    cv2.imwrite(out,cv2.resize(np.vstack(rows),None,fx=scale,fy=scale,interpolation=cv2.INTER_AREA),[cv2.IMWRITE_JPEG_QUALITY,85])
