import sys; sys.path.insert(0, '/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s02fx')
from owlloc import *
X = '/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s02fx/'
S = 2
med = np.load(X + 'flyavg_med.npy')
def gradimg(I):
    I = cv2.GaussianBlur(I, (0, 0), 1.2); return np.hypot(cv2.Sobel(I, cv2.CV_32F, 1, 0), cv2.Sobel(I, cv2.CV_32F, 0, 1))
H2, W2 = med.shape
yy, xx = np.mgrid[0:H2, 0:W2]; uu = xx / S + U0; vv = yy / S + V0
head = ((uu / 175) ** 2 + ((vv + 110) / 165) ** 2 < 1).astype(np.uint8)       # head + cups + band neighbourhood
G0 = gradimg(med)
st = []
for f in list(range(414, 442, 2)):
    I = local2(f, S); warp = np.eye(2, 3, dtype=np.float32)
    # align on the head's edges only where the head itself is (bright in the median), the background varies
    hm = (cv2.dilate((med > 0.35).astype(np.uint8), np.ones((9, 9), np.uint8)) & head)
    try: _, warp = cv2.findTransformECC(G0, gradimg(I), warp, cv2.MOTION_AFFINE, (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 200, 1e-6), hm, 5)
    except cv2.error: print('fail', f); continue
    st.append(cv2.warpAffine(I, warp, (W2, H2), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP)); print(f, np.round(warp[:, 2], 1), flush=True)
st = np.stack(st); mx = st.max(0); np.save(X + 'band_mx.npy', mx)
band = ((cv2.GaussianBlur(mx, (0, 0), 1.0) < 0.2) & (vv < -40) & (vv > -300) & (np.abs(uu) < 200)).astype(np.uint8)
band &= (med < 0.35).astype(np.uint8)
n, lab, stt, _ = cv2.connectedComponentsWithStats(band)
k = 1 + int(np.argmax(stt[1:, 4])); band = (lab == k).astype(np.uint8)
np.save(X + 'band_mask.npy', band)
vis = cv2.cvtColor((np.clip(mx, 0, 1) * 255).astype(np.uint8), cv2.COLOR_GRAY2BGR); vis[band > 0] = (0, 0, 255)
vis2 = cv2.cvtColor((np.clip(med, 0, 1) * 255).astype(np.uint8), cv2.COLOR_GRAY2BGR); vis2[band > 0] = (vis2[band > 0] * 0.5 + np.array([0, 0, 120])).astype(np.uint8)
cv2.imwrite(X + 'band.jpg', cv2.resize(np.hstack([vis, vis2]), None, fx=0.5, fy=0.5))
