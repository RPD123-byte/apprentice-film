import sys, json, time; sys.path.insert(0, '.')
from common import *
from lines import *
S = '/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s24p2/'
tr = json.load(open('ftrack.json')); M = np.load('maskF.npy')
def owl_occ(k, grow=6):
    dx, dy = tr[str(k)][:2]
    A = np.float32([[1, 0, 600 + dx], [0, 1, -80 + dy]])
    o = cv2.warpAffine(M, A, (2206, 946), flags=cv2.INTER_NEAREST)
    return cv2.dilate(o, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * grow + 1,) * 2))
k = int(sys.argv[1])
u = U(k); occ = owl_occ(k)
t0 = time.time()
th = best_theta(u, occ == 0)
obj = objects(u, occ, th)
occ2 = occ | obj
bars, R, O = detect(u, occ2, th)
caps = to_frame(bars, th)
img = render(caps)
img[occ2 > 0] = u[occ2 > 0]
bg = occ2 == 0
err = np.abs(cv2.GaussianBlur(img, (0, 0), 2) - cv2.GaussianBlur(u, (0, 0), 2))[bg].mean()
print('theta %.2f' % th, 'bars', len(bars), 'err σ2 %.2f' % err, 'mean r %.1f s %.1f' % (img[bg].mean(), u[bg].mean()), '%.1fs' % (time.time() - t0))
vis = np.hstack([img, u]).clip(0, 255).astype(np.uint8)
vis = cv2.cvtColor(vis, cv2.COLOR_GRAY2BGR)
cs, _ = cv2.findContours(obj, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
cv2.drawContours(vis, cs, -1, (0, 0, 255), 2)
cv2.imwrite(S + f'lt{k}.png', vis)
json.dump([[round(float(x), 2) for x in c] for c in caps], open(S + f'lt{k}.json', 'w'))
