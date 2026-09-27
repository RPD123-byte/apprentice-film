# Value calibration (measurement script): compare a raw JS render of a traced layer (dev harness, margin canvas) with
# the composite it was traced from; per value band, the mean difference -> a correction added to the band's value on
# the next trace (trace_all.py reads calib_<name>.json). Usage: calib.py name composite.npy render.png [mask.npy]
import sys, os, json, numpy as np, cv2
sys.path.insert(0, os.path.dirname(__file__))
import trace_room as T, trace_all as TA
name, comp, ren = sys.argv[1:4]
f = np.load(comp); r = cv2.imread(ren, 0).astype(np.float32) / 255
mask = np.load(sys.argv[4]).astype(bool) if len(sys.argv) > 4 else np.ones(f.shape, bool)
base = T.surfaces(f, TA.P['mode'], 9, TA.P['C'])
LV = TA.LV
d = cv2.GaussianBlur(r, (0, 0), 2) - cv2.GaussianBlur(f, (0, 0), 2)
p = os.path.join(TA.OUT, 'calib_%s.json' % name)
old = json.load(open(p)) if os.path.exists(p) else [0.0] * len(LV)
new = []
lo_b = np.concatenate([[-1], LV])
for k in range(len(LV)):
    hi = LV[k + 1] if k + 1 < len(LV) else 1.01
    band = mask & (base > LV[k]) & (base <= hi)
    dk = float(d[band].mean()) if band.sum() > 200 else 0.0
    new.append(old[k] - 0.8 * dk)
    print('band %.3f-%.3f n %7d  diff %+.4f  corr %+.4f' % (LV[k], hi, band.sum(), dk, new[-1]))
under = mask & (base <= LV[0]); print('below first level: diff %+.4f' % d[under].mean())
json.dump(new, open(p, 'w'))
print('overall', d[mask].mean(), 'MAE s2', np.abs(d[mask]).mean())
