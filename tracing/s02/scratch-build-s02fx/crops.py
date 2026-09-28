# crops.py OUT.jpg DIR frames x0,y0,x1,y1 [scale]  -> stacked render|source crops
import sys; sys.path.insert(0, '/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s02fx')
from common import *
out, D, fs, box = sys.argv[1], sys.argv[2], [int(v) for v in sys.argv[3].split(',')], [int(v) for v in sys.argv[4].split(',')]
sc = float(sys.argv[5]) if len(sys.argv) > 5 else 1.0
gain = float(sys.argv[6]) if len(sys.argv) > 6 else 1.0
rows = []
for f in fs:
    r = rd(f'{ROOT}/{D}/r{f:04d}.png'); s = src(f)
    x0, y0, x1, y1 = box
    t = np.hstack([r[y0:y1, x0:x1], s[y0:y1, x0:x1]]).astype(np.float32) * gain
    t = np.clip(t, 0, 255).astype(np.uint8); t = cv2.resize(t, None, fx=sc, fy=sc, interpolation=cv2.INTER_AREA if sc < 1 else cv2.INTER_NEAREST)
    cv2.putText(t, str(f), (5, 25), 0, 0.8, (0, 0, 255), 2); rows.append(t)
cv2.imwrite(out, np.vstack(rows), [cv2.IMWRITE_JPEG_QUALITY, 90])
