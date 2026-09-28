# triptychs new | baseline film.mp4 | source for given frame indices, labelled; optional crop x0 y0 x1 y1 and width
import cv2, numpy as np, sys
SP='/private/tmp/claude-501/-Users-computer-vibe-check/9d8e3a22-605d-469a-804c-e2a05ae8a7e5/scratchpad'
NEW='/Users/computer/rootline/apprentice-film/snapshots/end-s28-rev1-all'  # (deleted after the review; re-create with shoot.mjs)
def ld(k,n): return cv2.imread(f'{NEW}/f-{n/25:.4f}.png' if k=='new' else f'{SP}/{k}/{n}.png')
def trip(n, crop=None, w=None, kinds=('new','film','src'), vertical=False):
    ims=[]
    for k in kinds:
        a=ld(k,n)
        if crop: x0,y0,x1,y1=crop; a=a[y0:y1,x0:x1]
        if w: a=cv2.resize(a,(w,int(a.shape[0]*w/a.shape[1])),interpolation=cv2.INTER_AREA)
        a=a.copy(); cv2.putText(a,f'{k} {n/25:.2f}',(6,22),0,0.65,(0,255,255),2); ims.append(a)
    return np.vstack(ims) if vertical else np.hstack(ims)
if __name__=='__main__':
    out=sys.argv[1]; ns=[int(x) for x in sys.argv[2].split(',')]
    crop=[int(v) for v in sys.argv[3].split(',')] if len(sys.argv)>3 and sys.argv[3]!='-' else None
    w=int(sys.argv[4]) if len(sys.argv)>4 and sys.argv[4]!='-' else None
    kinds=tuple(sys.argv[5].split(',')) if len(sys.argv)>5 else ('new','film','src')
    rows=[trip(n,crop,w,kinds) for n in ns]
    cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,88])
