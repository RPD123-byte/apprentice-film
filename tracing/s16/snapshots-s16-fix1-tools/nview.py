import sys, json, cv2, numpy as np; sys.path.insert(0, '.')
import h16
n = int(sys.argv[1]); d = json.load(open(f'../s16-fix1-work/owl3_{n}.json'))
x0, y0, x1, y1 = d['box']; S = 3
im = cv2.resize(h16.src(n)[y0:y1, x0:x1], None, fx=S, fy=S, interpolation=cv2.INTER_CUBIC)
P = lambda x, y: (int((x - x0) * S), int((y - y0) * S))
for s in d['N']:
    a = np.array(s).reshape(-1, 4)
    for i in range(len(a) - 1): cv2.line(im, P(*a[i, :2]), P(*a[i + 1, :2]), (0, 0, 255), 2)
    for p in a: cv2.circle(im, P(*p[:2]), max(1, int(p[2] * S / 2)), (0, 255, 255), 1)
if 'HP' in d:
    for r in d['HP']['rings']:
        a = np.array(r).reshape(-1, 2); cv2.polylines(im, [np.array([P(*p) for p in a], np.int32)], True, (255, 0, 255), 1)
    for c in d['HP']['cups']:
        cv2.ellipse(im, (P(c[0], c[1]), (int(c[2] * 2 * S), int(c[3] * 2 * S)), c[4]), (0, 255, 0), 2)
    for s in d['HP']['hl']:
        a = np.array(s).reshape(-1, 4)
        for i in range(len(a) - 1): cv2.line(im, P(*a[i, :2]), P(*a[i + 1, :2]), (255, 255, 0), 2)
    for r in d['HP'].get('band', []):
        a = np.array(r).reshape(-1, 2); cv2.polylines(im, [np.array([P(*p) for p in a], np.int32)], True, (0, 128, 255), 1)
for r in d['sil']:
    a = np.array(r).reshape(-1, 2); cv2.polylines(im, [np.array([P(*p) for p in a], np.int32)], True, (255, 128, 0), 1)
sc = float(sys.argv[2]) if len(sys.argv) > 2 else 0.5
cv2.imwrite(f'../s16-fix1-crops/n{n}.jpg', cv2.resize(im, None, fx=sc, fy=sc, interpolation=cv2.INTER_AREA))
