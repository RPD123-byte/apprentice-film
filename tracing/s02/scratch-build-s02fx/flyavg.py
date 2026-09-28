import sys; sys.path.insert(0, '/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s02fx')
from owlloc import *
X = '/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s02fx/'
FR = [int(v) for v in sys.argv[1].split(',')]; REF = int(sys.argv[2]); S = 2
# body mask (owl-local 1x FLYREG: window U -560..560, V -480..320) -> this window at 2x
fly = cv2.imread(X + 'flyreg.png', 0) > 0
full = np.zeros(((V1 - V0) * S, (U1 - U0) * S), np.uint8)
yy, xx = np.mgrid[0:full.shape[0], 0:full.shape[1]]; uu = (xx / S + U0).astype(int); vv = (yy / S + V0).astype(int)
ok = (uu >= -560) & (uu < 560) & (vv >= -480) & (vv < 320)
full[ok] = fly[(vv[ok] + 480), (uu[ok] + 560)]
mask = cv2.dilate(full, np.ones((21, 21), np.uint8))
def gradimg(I):
    I = cv2.GaussianBlur(I, (0, 0), 1.2); return np.hypot(cv2.Sobel(I, cv2.CV_32F, 1, 0), cv2.Sobel(I, cv2.CV_32F, 0, 1))
ref = local2(REF, S); G0 = gradimg(ref)
stack = []
for f in FR:
    I = local2(f, S)
    warp = np.eye(2, 3, dtype=np.float32)
    try:
        _, warp = cv2.findTransformECC(G0, gradimg(I), warp, cv2.MOTION_AFFINE, (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 200, 1e-6), mask, 5)
    except cv2.error as e:
        print('ecc fail', f); continue
    A = cv2.warpAffine(I, warp, (I.shape[1], I.shape[0]), flags=cv2.INTER_CUBIC | cv2.WARP_INVERSE_MAP)
    stack.append(A); print(f, np.round(warp, 3).tolist(), flush=True)
st = np.stack(stack); med = np.median(st, 0).astype(np.float32); mean = st.mean(0).astype(np.float32)
np.save(X + 'flyavg_med.npy', med); np.save(X + 'flyavg_mean.npy', mean); np.save(X + 'flyavg_ref.npy', ref)
cv2.imwrite(X + 'flyavg.jpg', (np.clip(np.hstack([ref, med]), 0, 1) * 255).astype(np.uint8))
