import cv2, numpy as np
SRC='/Users/computer/rootline/apprentice-film/snapshots/s06-fix1-src'
def src(n, gray=True):
    im=cv2.imread(f'{SRC}/s-{n}.png'); return cv2.cvtColor(im,cv2.COLOR_BGR2GRAY).astype(np.float32) if gray else im.astype(np.float32)
def ren(d, n, gray=True):
    im=cv2.imread(f'{d}/f-{n}.png'); return cv2.cvtColor(im,cv2.COLOR_BGR2GRAY).astype(np.float32) if gray else im.astype(np.float32)
def smean(a,b,gray=True): return np.mean([src(n,gray) for n in range(a,b+1)],axis=0)
def rmean(d,a,b,gray=True): return np.mean([ren(d,n,gray) for n in range(a,b+1)],axis=0)
def rgba(p): return cv2.imread(p, cv2.IMREAD_UNCHANGED).astype(np.float32)
