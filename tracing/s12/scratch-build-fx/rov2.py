import sys, numpy as np, cv2
from rlib import *
from rmeas import parse
# rov2.py TAKE out.jpg [f0 f1] : draw the keyed quads over the source frames (gamma-lifted), 2 per row
take = sys.argv[1]; out = sys.argv[2]
faces, frames = parse(f'{FX}/roto/{take}.txt')
fr = sorted(frames)
if len(sys.argv) > 4: fr = [f for f in fr if int(sys.argv[3]) <= f <= int(sys.argv[4])]
cols = [(0,255,0),(0,128,255),(255,0,255),(255,255,0),(0,255,255),(255,128,0),(128,255,128),(255,60,60),(60,60,255),(200,200,255),(0,200,120),(200,0,120)]
tiles = []
for f in fr:
    im = src(f, False)
    im = (255 * np.power(im / 255.0, 0.6)).astype(np.uint8)
    for i, (fid, P, ex) in enumerate(frames[f]):
        c = cols[i % len(cols)]
        Pi = np.round(np.array(P)).astype(np.int32)
        cv2.polylines(im, [Pi], True, c, 4)
        cx, cy = np.clip(np.array(P).mean(0), [20, 40], [W - 140, H - 20]).astype(int)
        cv2.putText(im, fid, (int(cx) - 30, int(cy)), 0, 1.4, c, 3)
    cv2.putText(im, str(f), (20, 50), 0, 1.6, (0, 255, 255), 4)
    tiles.append(cv2.resize(im, (1103, 473), interpolation=cv2.INTER_AREA))
while len(tiles) % 2: tiles.append(np.zeros_like(tiles[0]))
cv2.imwrite(out, np.vstack([np.hstack(tiles[j:j + 2]) for j in range(0, len(tiles), 2)]), [cv2.IMWRITE_JPEG_QUALITY, 80])
