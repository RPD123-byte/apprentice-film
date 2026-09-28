import json, sys, os
from smokefit import fit3, MEAS
f0, f1 = int(sys.argv[1]), int(sys.argv[2])
p = os.path.join(MEAS, f'smoke3-{f0}.json')
out = json.load(open(p)) if os.path.exists(p) else {}
for f in range(f0, f1 + 1):
    b, L0, L1 = fit3(f, K=40 if 2560 <= f <= 2575 else 36)
    out[str(f)] = b
    print(f, len(b) // 6, round(L0, 1), round(L1, 1), flush=True)
    json.dump(out, open(p, 'w'))
