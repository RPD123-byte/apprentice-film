# usage: pair.py compare_dir outdir frame1 frame2 ...  (frames in same order as rendered times)
import cv2, glob, sys, re, os, numpy as np
d, out = sys.argv[1], sys.argv[2]; frames=[int(x) for x in sys.argv[3:]]
os.makedirs(out, exist_ok=True)
fs=sorted(glob.glob(d+'/frame-*.png'), key=lambda p:int(re.search(r'frame-(\d+)-',p).group(1)))
assert len(fs)==len(frames),(len(fs),len(frames))
SRC='/Users/computer/rootline/apprentice-film/snapshots/s15-rev2-work/src/f%04d.png'
for p,n in zip(fs,frames):
    r=cv2.imread(p); s=cv2.imread(SRC%n)
    if r.shape!=s.shape: r=cv2.resize(r,(s.shape[1],s.shape[0]))
    im=np.hstack([r,np.zeros((r.shape[0],8,3),np.uint8),s])
    cv2.putText(im,f'RENDER f{n} t={n/25:.2f}',(20,50),cv2.FONT_HERSHEY_SIMPLEX,1.4,(0,0,255),3)
    cv2.putText(im,f'SOURCE f{n}',(r.shape[1]+30,50),cv2.FONT_HERSHEY_SIMPLEX,1.4,(0,0,255),3)
    im=cv2.resize(im,(im.shape[1]//2,im.shape[0]//2),interpolation=cv2.INTER_AREA)
    cv2.imwrite(f'{out}/p{n}.jpg',im,[cv2.IMWRITE_JPEG_QUALITY,88])
    os.symlink if False else None
print('ok',len(frames))
