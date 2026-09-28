import cv2, numpy as np, os
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V); print(c.isOpened(), flush=True); c.set(cv2.CAP_PROP_POS_FRAMES,1010)
os.makedirs('src',exist_ok=True)
for f in range(1010,1150):
    ok,im=c.read()
    if not ok: print('fail',f); break
    cv2.imwrite(f'src/{f}.png',im)
a=cv2.imread('src/1025.png'); b=cv2.imread('../src/f1025.png')
print(np.abs(a.astype(int)-b.astype(int)).mean())
