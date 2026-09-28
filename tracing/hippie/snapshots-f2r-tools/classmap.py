# Flat nearest-palette class map of the pre-grade page (for reading band structures; measurement only)
import sys, cv2, numpy as np
import sys
SRC = sys.argv[1] if len(sys.argv) > 1 else 'page'
im = cv2.imread('/Users/computer/rootline/apprentice-film/snapshots/f2r-meas/' + ('page-pre.png' if SRC == 'page' else 'strip-pre.png')).astype(np.float32)
pal = {'cream': (238, 211, 184), 'gold': (226, 171, 90), 'orange': (220, 91, 80), 'magenta': (213, 31, 149), 'indigo': (83, 58, 144),
       'sky': (36, 35, 49), 'ink': (22, 16, 20), 'pinkL': (236, 140, 190), 'lav': (170, 130, 200), 'green': (120, 170, 60), 'white': (245, 240, 230),
       'skin': (240, 195, 160), 'brown': (120, 75, 45), 'blue': (110, 150, 210), 'teal': (40, 95, 100), 'grey': (130, 125, 130), 'yellow': (240, 200, 70), 'peach': (245, 160, 110), 'jacket': (80, 115, 70)}
disp = {'cream': (250, 240, 220), 'gold': (240, 180, 40), 'orange': (255, 90, 40), 'magenta': (230, 0, 160), 'indigo': (60, 40, 170), 'sky': (0, 0, 0), 'ink': (60, 0, 0),
        'pinkL': (255, 150, 210), 'lav': (170, 120, 255), 'green': (60, 200, 60), 'white': (255, 255, 255), 'skin': (255, 200, 150), 'brown': (130, 70, 20), 'blue': (80, 150, 255),
        'teal': (0, 130, 130), 'grey': (128, 128, 128), 'yellow': (255, 230, 0), 'peach': (255, 170, 100), 'jacket': (40, 120, 40)}
keys = list(pal)
lab = cv2.cvtColor(im / 255, cv2.COLOR_BGR2Lab)
P = np.array([cv2.cvtColor(np.float32([[[pal[k][2] / 255, pal[k][1] / 255, pal[k][0] / 255]]]), cv2.COLOR_BGR2Lab)[0, 0] for k in keys])
d = ((lab[:, :, None, :] - P[None, None]) ** 2).sum(-1)
idx = d.argmin(-1)
out = np.zeros(im.shape, np.uint8)
for i, k in enumerate(keys): out[idx == i] = disp[k][::-1]
suf = '' if SRC == 'page' else '-strip'
cv2.imwrite('/Users/computer/rootline/apprentice-film/snapshots/f2r-meas/classmap' + suf + '.png', out)
np.save('/Users/computer/rootline/apprentice-film/snapshots/f2r-meas/classidx' + suf + '.npy', idx.astype(np.uint8))
print(keys)
