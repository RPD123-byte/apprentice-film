#!/usr/bin/env python3
# mask_d.py geo.json > maskD.json — tracing region for the front head (pose D, 36.04-36.44): the front head polygon,
# minus the parts drawn separately (eyes, beak, plaster, both cups)
import json, sys, numpy as np, cv2
G = json.load(open(sys.argv[1])); F = G['FRONT_D']
m = np.zeros((946, 2206), np.uint8); cv2.fillPoly(m, [np.array(G['headF'][0], np.int32)], 1)
m = cv2.dilate(m, np.ones((21, 21), np.uint8))
cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
inn = [c[:, 0, :].tolist() for c in cs]
out = [[[1186, 386], [1280, 386], [1284, 502], [1186, 502]],
       [[1000, 118], [1100, 76], [1182, 90], [1188, 150], [1080, 198], [1004, 190]]]
for c in (F['cupL'], F['cupR']):
    k = c.get('k', 0); ym = (c['y0'] + c['y1']) / 2
    xs = [c['x0'], c['x1'], c.get('out', c['x1'])]
    x0, x1 = min(xs) - 12, max(xs) + 12
    out.append([[x0 + k * (c['sy0'] - 12 - ym), c['sy0'] - 12], [x1 + k * (c['sy0'] - 12 - ym), c['sy0'] - 12], [x1 + k * (c['y1'] + 12 - ym), c['y1'] + 12], [x0 + k * (c['y1'] + 12 - ym), c['y1'] + 12]])
outE = [[e['x'], e['y'], e['rx'] + 10, e['ry'] + 10, e['rot']] for e in F['eyes']]
print(json.dumps({'in': inn, 'out': out, 'outE': outE, 'lit': 110, 'erode': 3}))
