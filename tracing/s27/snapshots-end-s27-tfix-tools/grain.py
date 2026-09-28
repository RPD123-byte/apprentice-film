# end-s27-tfix: flat-area grain: std of (luma - its sigma-3 blur) where the sigma-4 gradient is low and luma > 60,
# split into a fine band (luma - sigma 0.7) and a coarse band (sigma 0.7 - sigma 3). Usage: grain.py DIR PREFIX F0 F1 STEP
import cv2, numpy as np, sys
D, P, F0, F1, ST = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5])
def g(p):
    y = cv2.cvtColor(cv2.imread(p), cv2.COLOR_BGR2GRAY).astype(np.float32)
    y4 = cv2.GaussianBlur(y, (0, 0), 4); gm = np.hypot(cv2.Sobel(y4, cv2.CV_32F, 1, 0), cv2.Sobel(y4, cv2.CV_32F, 0, 1)) / 8
    flat = (gm < 0.6) & (y4 > 60)
    b0 = cv2.GaussianBlur(y, (0, 0), 0.7); b3 = cv2.GaussianBlur(y, (0, 0), 3)
    return (y - b3)[flat].std(), (y - b0)[flat].std(), (b0 - b3)[flat].std()
R = {'src': [], 'r': []}
for F in range(F0, F1 + 1, ST):
    R['src'].append(g(f'src/s{F}.png')); R['r'].append(g(f'{D}/{P}{F}.png'))
for k, v in R.items(): print(k, 'total %.2f fine %.2f coarse %.2f' % tuple(np.mean(v, 0)))
