import cv2,glob,re,numpy as np
OWL=eval(open('src/shots/s15/track.js').read().split('export const OWL = ')[1].split(';')[0])
ow={round(r[0],2):r for r in OWL}
fs=sorted(glob.glob('snapshots/s15-k22/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
S='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/src/'
def blob(g,tr,th):
    b=(g>th).astype(np.uint8)
    b=cv2.morphologyEx(b,cv2.MORPH_OPEN,np.ones((5,5),np.uint8))
    n,l,st,c=cv2.connectedComponentsWithStats(b)
    best=None
    for i in range(1,n):
        x,y,w,h,a=st[i]
        if a<3000: continue
        d=np.hypot(c[i][0]-tr[1],c[i][1]-tr[2])
        if d<250 and (best is None or a>best[4]): best=(x,y,w,h,a)
    return best
for f in fs:
    t=round(float(re.search(r'at-([\d.]+)s',f).group(1)),2)
    r=cv2.GaussianBlur(cv2.imread(f,0),(0,0),2); s=cv2.GaussianBlur(cv2.imread(S+'f%04d.png'%round(t*25),0),(0,0),2)
    tr=ow[t]
    br=blob(r,tr,238); bs=blob(s,tr,225)
    def fm(b): return '       none          ' if b is None else 'c=(%4d,%3d) w=%3d h=%3d'%(b[0]+b[2]/2,b[1]+b[3]/2,b[2],b[3])
    dx='' if (br is None or bs is None) else 'dx=%+4d dy=%+4d dw=%+4d'%((br[0]+br[2]/2)-(bs[0]+bs[2]/2),(br[1]+br[3]/2)-(bs[1]+bs[3]/2),br[2]-bs[2])
    print(t,'R',fm(br),'| S',fm(bs),dx)
