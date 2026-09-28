import cv2, numpy as np, sys
R = cv2.imread(sys.argv[1]).astype(np.float32); S = cv2.imread('/Users/computer/rootline/apprentice-film/snapshots/f2r-meas/page-graded.png').astype(np.float32)
def hp(im): return im - cv2.GaussianBlur(im, (0, 0), 3)
hR, hS = hp(R), hp(S)
pts = {'sky1': (600, 60), 'sky2': (1300, 450), 'sky3': (1500, 150), 'yellowbox': (2050, 270), 'creambox': (80, 320), 'pinkbox': (2100, 340),
       'hl-cream': (1150, 160), 'hl-yellow': (800, 300), 'skin': (1080, 450), 'jacket': (1250, 650), 'laptop': (950, 770), 'desk': (800, 850),
       'cloud-cream': (150, 175), 'ribbon-gold': (150, 60), 'lavbox': (1700, 600), 'floor': (1900, 930)}
for k, (x, y) in pts.items():
    a = hR[y - 12:y + 12, x - 12:x + 12].reshape(-1, 3).std(0).mean(); b = hS[y - 12:y + 12, x - 12:x + 12].reshape(-1, 3).std(0).mean()
    m = S[y - 12:y + 12, x - 12:x + 12].mean()
    print(f"{k:12s} lum {m:5.1f}  render hp-std {a:4.1f}  source {b:4.1f}  ratio {b / max(a, .1):.2f}")
