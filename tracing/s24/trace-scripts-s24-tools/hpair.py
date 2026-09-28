import cv2, glob, re, sys, numpy as np
d = sys.argv[1]
SRC = '/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s24p2/src/'
tot = []
for f in sorted(glob.glob(d + '/frame-*.png'), key=lambda p: float(re.search(r'at-([\d.]+)s', p).group(1))):
    k = int(float(re.search(r'at-([\d.]+)s', f).group(1)))
    a = cv2.imread(f); b = cv2.imread(SRC + 'k%02d.png' % k)
    ag = cv2.cvtColor(a, cv2.COLOR_BGR2GRAY).astype(np.float32); bg = cv2.cvtColor(b, cv2.COLOR_BGR2GRAY).astype(np.float32)
    e1 = np.abs(cv2.GaussianBlur(ag, (0, 0), 1) - cv2.GaussianBlur(bg, (0, 0), 1)).mean()
    qa = cv2.resize(ag, None, fx=.25, fy=.25, interpolation=cv2.INTER_AREA); qb = cv2.resize(bg, None, fx=.25, fy=.25, interpolation=cv2.INTER_AREA)
    e2 = np.abs(cv2.GaussianBlur(qa, (0, 0), 2) - cv2.GaussianBlur(qb, (0, 0), 2)).mean()
    e8 = np.abs(cv2.GaussianBlur(qa, (0, 0), 8) - cv2.GaussianBlur(qb, (0, 0), 8)).mean()
    print('k%02d t %.2f  mean r %5.1f s %5.1f  σ1 %5.1f  σ2(¼) %5.1f  σ8(¼) %5.1f' % (k, 96.8 + 0.04 * k, ag.mean(), bg.mean(), e1, e2, e8))
    tot.append((e1, e2, e8))
    cv2.imwrite(d + '/pair-k%02d.jpg' % k, cv2.resize(np.hstack([a, b]), None, fx=0.45, fy=0.45), [cv2.IMWRITE_JPEG_QUALITY, 85])
t = np.array(tot); print('mean σ1 %.2f σ2 %.2f σ8 %.2f over %d frames' % (*t.mean(0), len(t)))
