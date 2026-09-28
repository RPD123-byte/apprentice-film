# s28t: after mugtrack3.py -- the template match fails once the mug starts leaving the frame (after 129.84), so the track
# 129.88-130.12 is a quadratic fit of 129.52-129.84 (time without the source's repeated frame 129.56), checked by eye.
import json, numpy as np
P = '/Users/computer/rootline/apprentice-film/snapshots/s28t-tools/mugtrack.json'
R = json.load(open(P))
ts = [129.52, 129.60, 129.64, 129.68, 129.72, 129.76, 129.80, 129.84]
def n(t): k = round(t * 25); return k - 1 if k > 3239 else k
X = np.array([n(t) for t in ts], float); U = np.array([R[f'{t:.2f}'] for t in ts])
out = {k: v for k, v in R.items() if float(k) <= 129.84}
for k in range(3247, 3254):
    out[f'{k/25:.2f}'] = [float(np.polyval(np.polyfit(X, U[:, i], 2), n(k / 25))) for i in range(3)]
json.dump(out, open(P, 'w'))
