# keyed boxes only, labelled, over the source frames: ovk.py SET times out.jpg
import cv2, json, subprocess, sys, numpy as np
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s15-sfm')
from common import SRC
from ov import render_ids, edges_of, W, H, S
key, times, out = sys.argv[1], sys.argv[2], sys.argv[3]
js = json.loads(subprocess.check_output(['node', 'dump.mjs', times, key]))
tiles = []
for k, d in js.items():
    fi = int(round(d['t'] * 25))
    g = cv2.resize(cv2.imread(f'{SRC}/f{fi}.png', 0), (W, H), interpolation=cv2.INTER_AREA)
    ib, kb, zb = render_ids(d['polys'])
    vis = cv2.cvtColor((g * 0.8).astype(np.uint8), cv2.COLOR_GRAY2BGR)
    ids = {p['id']: p for p in d['polys'] if p.get('kb')}
    e = edges_of(np.where(np.isin(ib, list(ids.keys())), ib, -1))
    vis[e] = (0, 255, 255)
    for i, p in ids.items():
        m = ib == i
        if m.sum() < 60: continue
        yy, xx = np.nonzero(m); cx, cy = int(xx.mean()), int(yy.mean())
        cv2.putText(vis, f"{p['kb']}{'FLRT'[p['fk']]}", (cx - 15, cy), 0, 0.45, (0, 0, 255), 2)
    cv2.putText(vis, f'{float(k):.2f}', (6, 22), 0, 0.7, (0, 255, 0), 2)
    tiles.append(vis)
while len(tiles) % 2: tiles.append(np.zeros_like(tiles[0]))
cv2.imwrite(out, np.vstack([np.hstack(tiles[i:i + 2]) for i in range(0, len(tiles), 2)]), [cv2.IMWRITE_JPEG_QUALITY, 85])
