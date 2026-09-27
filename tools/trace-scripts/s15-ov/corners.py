# numbered corner candidates on a source frame (for picking seeds by number): corners.py T out.jpg [N]
import cv2, sys, json, numpy as np
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s15-sfm')
from common import SRC, owlmask
t = float(sys.argv[1]); out = sys.argv[2]; N = int(sys.argv[3]) if len(sys.argv) > 3 else 120
fi = int(round(t * 25)); g = cv2.imread(f'{SRC}/f{fi}.png', 0)
gb = cv2.GaussianBlur(g, (0, 0), 2.5)
m = owlmask(fi, 0.9).astype(np.uint8) * 255
c = cv2.goodFeaturesToTrack(gb, N, 0.02, 45, mask=m, blockSize=15, useHarrisDetector=True, k=0.04)
c = c.reshape(-1, 2)
vis = cv2.cvtColor(g, cv2.COLOR_GRAY2BGR)
for i, (x, y) in enumerate(c):
    cv2.circle(vis, (int(x), int(y)), 7, (0, 0, 255), 2)
    cv2.putText(vis, str(i), (int(x) + 8, int(y) - 6), 0, 0.9, (0, 0, 0), 5); cv2.putText(vis, str(i), (int(x) + 8, int(y) - 6), 0, 0.9, (0, 255, 255), 2)
cv2.putText(vis, f'{t:.2f}', (10, 40), 0, 1.4, (0, 255, 0), 3)
cv2.imwrite(out, cv2.resize(vis, (1600, int(1600 * 946 / 2206)), interpolation=cv2.INTER_AREA), [cv2.IMWRITE_JPEG_QUALITY, 88])
json.dump([[round(float(x), 1), round(float(y), 1)] for x, y in c], open(out + '.json', 'w'))
