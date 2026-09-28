import cv2, numpy as np
prev=None
for f in range(1012,1150):
    im=cv2.imread(f'src/{f}.png',0).astype(np.float32)
    s=cv2.resize(im,(276,118),interpolation=cv2.INTER_AREA)
    if prev is not None:
        d=np.abs(s-prev).mean()
        # also correlation
        print(f, f'{f/25:.2f}', f'{d:6.1f}', f'{im.mean():6.1f}')
    prev=s
