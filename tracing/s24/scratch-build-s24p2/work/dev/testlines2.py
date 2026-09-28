import sys, json, time; sys.path.insert(0, '.')
from common import *
from lines import objects
from lines2 import render2
from render_lines import render3 as render2
from lines3 import *
S = '/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s24p2/'
tr = json.load(open('ftrack.json')); M = np.load('maskF.npy')
def owl_occ(k, grow=6):
    dx, dy = tr[str(k)][:2]
    A = np.float32([[1, 0, 600 + dx], [0, 1, -80 + dy]])
    o = cv2.warpAffine(M, A, (2206, 946), flags=cv2.INTER_NEAREST)
    return cv2.dilate(o, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * grow + 1,) * 2))
k = int(sys.argv[1]); th = float(sys.argv[2])
u = U(k); occ = owl_occ(k)
t0 = time.time()
obj = objects(u, occ, th)
occ2 = occ | obj
bars, R, O = detect3(u, occ2, th)
from track_lines import track, render_tracked
caps = track(to_frame3(bars, th), u, occ2)
caps = track([c[:4] + [c[4], float(np.mean(c[5]))] for c in caps], u, occ2)
img = render_tracked(caps)
bg = occ2 == 0
out = img.copy(); out[~bg] = u[~bg]
e2 = np.abs(cv2.GaussianBlur(out, (0, 0), 2) - cv2.GaussianBlur(u, (0, 0), 2))[bg].mean()
e1 = np.abs(cv2.GaussianBlur(out, (0, 0), 1) - cv2.GaussianBlur(u, (0, 0), 1))[bg].mean()
print('bars', len(bars), 'err σ1 %.2f σ2 %.2f' % (e1, e2), 'mean r %.1f s %.1f' % (out[bg].mean(), u[bg].mean()), '%.1fs' % (time.time() - t0))
cv2.imwrite(S + f'l3_{k}.png', np.hstack([out, u]).clip(0, 255).astype(np.uint8))
json.dump(caps, open(S + f'l3_{k}.json', 'w'))
