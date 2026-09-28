import cv2, numpy as np, sys
# usage: sheet.py out.jpg rdir rprefix F1,F2,... [w]
out, rdir, pre, fl = sys.argv[1:5]
w = int(sys.argv[5]) if len(sys.argv) > 5 else 900
S = '/Users/computer/rootline/apprentice-film/snapshots/s26c-meas/src/'
rows = []
for F in [int(x) for x in fl.split(',')]:
    r = cv2.imread(f'{rdir}/{pre}{F}.png'); s = cv2.imread(f'{S}{F}.png')
    if r is None or s is None: print('missing', F); continue
    h = int(946 * w / 2206)
    r = cv2.resize(r, (w, h), interpolation=cv2.INTER_AREA); s = cv2.resize(s, (w, h), interpolation=cv2.INTER_AREA)
    row = np.hstack([r, np.full((h, 6, 3), 255, np.uint8), s])
    cv2.putText(row, f'F{F} t={F/25:.2f}', (8, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 255), 2)
    rows.append(row); rows.append(np.full((6, row.shape[1], 3), 255, np.uint8))
cv2.imwrite(out, np.vstack(rows), [cv2.IMWRITE_JPEG_QUALITY, 85])
