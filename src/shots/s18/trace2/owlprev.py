#!/usr/bin/env python3
# owlprev.py plate.pkl owl.pkl phase frame out.jpg [x0 y0 x1 y1] - plate + owl drawing at PATH_A[frame] vs source
import sys, os, pickle, numpy as np, cv2
sys.path.insert(0, os.path.dirname(__file__))
from inktrace import render_preview
from trace_plate2 import shift
from common import frame
from grade import forward
PATH_A = {1331:(1224,-58),1332:(1097,-43),1333:(985,-39),1334:(864,-32),1335:(755,-21),1336:(647,-7),1337:(554,-4),1338:(470,0),1339:(400,4),1340:(331,4),1341:(283,1),1342:(241,4),1343:(205,2),1344:(178,5),1345:(155,2),1346:(137,4),1347:(118,0),1348:(103,4),1349:(87,1),1350:(72,2),1351:(72,2),1352:(56,1),1353:(42,4),1354:(28,1),1355:(14,2),1356:(0,0),1357:(-12,4),1358:(-25,0),1359:(-37,3),1360:(-48,1),1361:(-56,4),1362:(-60,0),1363:(-58,4),1364:(-52,3),1365:(-45,3),1366:(-35,1),1367:(-20,4),1368:(-9,2),1369:(-1,2),1370:(10,0),1371:(22,3),1372:(33,2),1373:(40,2),1374:(49,0),1375:(57,4),1376:(57,4),1377:(63,3),1378:(65,0),1379:(69,2),1380:(72,4),1381:(71,1)}
if __name__ == '__main__':
    a = sys.argv
    cache = a[1] + '.render.npy'
    if os.path.exists(cache): PL = np.load(cache)
    else: PL = render_preview(pickle.load(open(a[1], 'rb')), (946, 2206), soft=0.6, wk=(0.85, 1)); np.save(cache, PL.astype(np.float16))
    PL = PL.astype(np.float32)
    ALL = pickle.load(open(a[2], 'rb')); n = int(a[4]); out = a[5]
    cf = lambda f: f - (f - 1) // 25
    phn = ['level', 'up', 'level', 'down'][cf(n) % 4] if a[3] == 'auto' else a[3]
    import copy
    R = PL.copy()
    blur = float(os.environ.get('HBLUR', 0))
    for O in [ALL['phase'][phn]] + ([ALL['feet'][n]] if n in ALL.get('feet', {}) else []):
        O = shift(copy.deepcopy(O), *PATH_A[n])
        lay, al = render_preview(O, (946, 2206), soft=float(os.environ.get('OSOFT', 0.6)), wk=(float(os.environ.get('OWK', 0.85)), 1), alpha=True)
        if blur > 0:
            k = int(3 * blur) * 2 + 1; lay = cv2.GaussianBlur(lay, (k, 1), blur); al = cv2.GaussianBlur(al, (k, 1), blur)
        R = R * (1 - al) + lay
    Rg = forward(np.clip(R, 0, 1), n / 25) * 255; Sg = frame(n).astype(np.float32)
    x0, y0, x1, y1 = [int(v) for v in a[6:10]] if len(a) > 9 else (0, 0, 2206, 946)
    r, s = Rg[y0:y1, x0:x1], Sg[y0:y1, x0:x1]
    print(n, ' '.join(f's{k} {np.abs(cv2.GaussianBlur(r,(0,0),k)-cv2.GaussianBlur(s,(0,0),k)).mean():.2f}' for k in (2, 6)), f'mean {r.mean():.1f}/{s.mean():.1f}',
          f'grad99 {np.percentile(np.hypot(*np.gradient(cv2.GaussianBlur(r,(0,0),0.7))),99):.0f}/{np.percentile(np.hypot(*np.gradient(cv2.GaussianBlur(s,(0,0),0.7))),99):.0f}')
    im = np.hstack([r, np.full((r.shape[0], 3), 255), s]).clip(0, 255).astype(np.uint8)
    sc = float(os.environ.get('SC', 1.0))
    cv2.imwrite(out, cv2.resize(im, None, fx=sc, fy=sc, interpolation=cv2.INTER_CUBIC) if sc != 1 else im, [cv2.IMWRITE_JPEG_QUALITY, 90])
