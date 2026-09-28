# end-s27-rev1: triptych source | render (now) | film.mp4 (previous render), labelled. Usage: tri.py WORK F OUT [scale] [x0 y0 x1 y1]
import cv2, numpy as np, sys
W, F, OUT = sys.argv[1], int(sys.argv[2]), sys.argv[3]
sc = float(sys.argv[4]) if len(sys.argv) > 4 else 0.5
box = list(map(int, sys.argv[5:9])) if len(sys.argv) > 8 else None
ims = [cv2.imread(f'{W}/src/s{F}.png'), cv2.imread(f'{W}/render/r{F}.png'), cv2.imread(f'{W}/film/f{F}.png')]
labs = ['SOURCE', 'NOW (render)', 'film.mp4 (before)']
out = []
for im, l in zip(ims, labs):
    if box: im = im[box[1]:box[3], box[0]:box[2]]
    im = cv2.resize(im, None, fx=sc, fy=sc, interpolation=cv2.INTER_AREA)
    cv2.putText(im, f'{l} {F/25:.2f}', (8, 26), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 4); cv2.putText(im, f'{l} {F/25:.2f}', (8, 26), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 1)
    out.append(im)
cv2.imwrite(OUT, np.vstack(out) if (box and (box[2]-box[0]) > 1.6*(box[3]-box[1])) or not box else np.hstack(out), [cv2.IMWRITE_JPEG_QUALITY, 90])
