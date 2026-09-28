# headmed.py SIDE out.png box: cup-local crops of every frame of one side, refined by ECC translation on the owl, then median/mean
import sys, cv2, numpy as np
sys.path.insert(0, '.')
from singles import K, crop, grid, R
from run import src
side = int(sys.argv[1]); out = sys.argv[2]; box = [int(v) for v in sys.argv[3].split(',')]
S = 8
names = ['TOP_CUP', 'RIGHT_CUP', 'BOT_CUP', 'LEFT_CUP']
rng_t = {0: (74.79, 76.53), 1: (76.9, 77.45), 2: (77.5, 79.2), 3: (79.3, 79.73)}[side]
fr = [(round(t * 25), x + (0.48 if side == 0 else 0), y) for t, x, y in K[names[side]] if rng_t[0] < t < rng_t[1]]
cr = [cv2.cvtColor(crop(src(F), x, y, side, box, S), cv2.COLOR_BGR2GRAY) for F, x, y in fr]
ref = np.median(np.stack(cr), 0).astype(np.float32)
out_c = []; shifts = []
for it in range(2):
    out_c = []; shifts = []
    for c in cr:
        W = np.eye(2, 3, dtype=np.float32)
        try:
            _, W = cv2.findTransformECC(cv2.GaussianBlur(ref, (0, 0), 2), cv2.GaussianBlur(c.astype(np.float32), (0, 0), 2), W, cv2.MOTION_TRANSLATION, (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 100, 1e-5), None, 5)
        except cv2.error: pass
        shifts.append((W[0, 2] / S, W[1, 2] / S))
        out_c.append(cv2.warpAffine(c.astype(np.float32), W, (c.shape[1], c.shape[0]), flags=cv2.INTER_CUBIC | cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_REPLICATE))
    ref = np.median(np.stack(out_c), 0).astype(np.float32)
sh = np.array(shifts); print(len(fr), 'shift px mean', sh.mean(0), 'std', sh.std(0))
np.save(out.replace('.png', '.npy'), ref)
cv2.imwrite(out, np.clip(ref, 0, 255).astype(np.uint8))
cv2.imwrite(out.replace('.png', '_g.jpg'), grid(cv2.cvtColor(np.clip(ref, 0, 255).astype(np.uint8), cv2.COLOR_GRAY2BGR), box))
