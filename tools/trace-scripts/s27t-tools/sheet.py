# Contact sheet: per row  source | render | film.mp4 (optional)  at width W each.
# usage: sheet.py OUT.jpg RENDERDIR k1,k2,... [--w 700] [--film] [--crop x0,y0,x1,y1] [--dirs d2,...]
import cv2, numpy as np, sys, os
REF = os.environ.get('REF', '/private/tmp/claude-501/-Users-computer-vibe-check/9d8e3a22-605d-469a-804c-e2a05ae8a7e5/scratchpad/ref')
a = sys.argv; out, d, ks = a[1], a[2], [int(x) for x in a[3].split(',')]
w = int(a[a.index('--w') + 1]) if '--w' in a else 700
crop = [int(x) for x in a[a.index('--crop') + 1].split(',')] if '--crop' in a else None
extra = a[a.index('--dirs') + 1].split(',') if '--dirs' in a else []
rows = []
for k in ks:
    ims = [cv2.imread(os.path.join(REF, 'src', '%05d.png' % k)), cv2.imread(os.path.join(d, 'frame-%05d.png' % k))]
    for e in extra: ims.append(cv2.imread(os.path.join(e, 'frame-%05d.png' % k)))
    if '--film' in a: ims.append(cv2.imread(os.path.join(REF, 'film', '%05d.png' % k)))
    out_ims = []
    for im in ims:
        if im is None: im = np.zeros((946, 2206, 3), np.uint8)
        if crop: im = im[crop[1]:crop[3], crop[0]:crop[2]]
        h = int(im.shape[0] * w / im.shape[1]); im = cv2.resize(im, (w, h), interpolation=cv2.INTER_AREA)
        out_ims.append(im)
    r = np.hstack(out_ims)
    cv2.putText(r, '%.2f' % (k / 25), (8, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 255), 2)
    rows.append(r)
cv2.imwrite(out, np.vstack(rows), [cv2.IMWRITE_JPEG_QUALITY, 88])
