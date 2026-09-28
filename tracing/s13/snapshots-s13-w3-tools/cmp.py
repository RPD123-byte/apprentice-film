# cmp.py A B : per-frame s8 / s3 / iou for the frames both render dirs have, and region deltas
import json, sys, subprocess, numpy as np
a, b = sys.argv[1], sys.argv[2]
def load(d):
    subprocess.run(['python3', '/Users/computer/rootline/apprentice-film/snapshots/s13-w3-tools/metrics.py', d, '--json', d + '/metrics.json'], capture_output=True, stdin=subprocess.DEVNULL)
    return json.load(open(d + '/metrics.json'))
A, B = load(a), load(b)
fs = sorted(set(A) & set(B), key=int)
print('frame   s8 A->B        s3 A->B       iou A->B')
for f in fs:
    x, y = A[f], B[f]; print(f"{f}  {x['s8']:.2f}->{y['s8']:.2f} ({y['s8']-x['s8']:+.2f})  {x['s3']:.2f}->{y['s3']:.2f} ({y['s3']-x['s3']:+.2f})  {x['iou']:.3f}->{y['iou']:.3f}")
print('mean', f"s8 {np.mean([A[f]['s8'] for f in fs]):.3f}->{np.mean([B[f]['s8'] for f in fs]):.3f}  s3 {np.mean([A[f]['s3'] for f in fs]):.3f}->{np.mean([B[f]['s3'] for f in fs]):.3f}")
keys = [k for k in A[fs[0]] if not k.endswith('_dm') and k not in ('s8', 's3', 'raw', 'dm', 'iou')]
print('region mean mae A->B: ' + '  '.join(f"{k} {np.mean([A[f][k] for f in fs]):.2f}->{np.mean([B[f][k] for f in fs]):.2f}" for k in keys))
