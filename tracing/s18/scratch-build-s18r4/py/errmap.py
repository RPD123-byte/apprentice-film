# errmap.py renderdir n out.jpg : signed blurred-6 error map (render - source), grid of 8x4 block MAE
import sys, numpy as np, cv2
SRC='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s18r4/src/'
d, n, out = sys.argv[1], int(sys.argv[2]), sys.argv[3]
R = cv2.imread(f'{d}/r{n}.png', 0).astype(np.float32); S = cv2.imread(f'{SRC}f{n:04d}.png', 0).astype(np.float32)
b = lambda a, s: cv2.GaussianBlur(a, (0, 0), s)
E = b(R, 6) - b(S, 6)
v = np.clip(128 + E * 4, 0, 255).astype(np.uint8)
im = cv2.applyColorMap(v, cv2.COLORMAP_JET)
H, W = E.shape
for j in range(4):
    for i in range(8):
        blk = np.abs(E[j*H//4:(j+1)*H//4, i*W//8:(i+1)*W//8])
        cv2.putText(im, f'{blk.mean():.1f}', (i*W//8+10, j*H//4+40), 0, 1.2, (255,255,255), 3)
cv2.imwrite(out, cv2.resize(im, None, fx=0.5, fy=0.5), [cv2.IMWRITE_JPEG_QUALITY, 85])
print('mean', np.abs(E).mean(), 'signed', E.mean())
