# end-s27-tfix: grain-free source plate at key frame K (measurement only): frames K-R..K+R brought onto K by the room
# mesh (flowmesh.fit) plus a small, smoothed dense DIS refinement, badly registered pixels fall back to K, per-pixel
# median, then a light non-local-means pass.  Usage: plate.py K R out.png [nlm_h]
import sys, os; sys.path.insert(0, os.path.dirname(__file__))
from flowmesh import *
K, R, OUT = int(sys.argv[1]), int(sys.argv[2]), sys.argv[3]; NL = float(sys.argv[4]) if len(sys.argv) > 4 else 4
ref = cv2.imread(f'{WORK}/src/s{K}.png'); g0 = gray(K)
d2 = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM); d2.setFinestScale(0); d2.setPatchSize(12); d2.setPatchStride(3)
st = [ref]
for F in range(K - R, K + R + 1):
    if F == K or F > int(os.environ.get("FMAX", 3232)) or not os.path.exists(f'{WORK}/src/s{F}.png'): continue
    mesh, _ = fit(K, F, 0.0003, 0.003)
    img = warp_to(cv2.imread(f'{WORK}/src/s{F}.png'), mesh)
    g = np.clip(cv2.GaussianBlur(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32), (0, 0), 2.0), 0, 255).astype(np.uint8)
    fl = d2.calc(g0, g, None)
    for c in range(2): fl[..., c] = cv2.GaussianBlur(fl[..., c], (0, 0), 3)
    mag = np.hypot(fl[..., 0], fl[..., 1]); fl[mag > 12] = 0
    wr = cv2.remap(img, XX + fl[..., 0], YY + fl[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    d = np.abs(cv2.GaussianBlur(cv2.cvtColor(wr, cv2.COLOR_BGR2GRAY).astype(np.float32), (0, 0), 2) - g0.astype(np.float32))
    bad = d > 18
    wr[bad] = ref[bad]
    st.append(wr)
med = np.median(np.stack(st), 0).astype(np.uint8)
if NL > 0: med = cv2.fastNlMeansDenoisingColored(med, None, NL, NL, 5, 13)
cv2.imwrite(OUT, med)
print('plate', K, len(st))
