# exp.py SPEC.json: one browser session, several DBG variants: [{"out": dir, "dbg": {...}, "frames": [..]}, ...]
import sys, json, os, cv2
sys.path.insert(0, '.')
from run import build, Lab
spec = json.load(open(sys.argv[1]))
L = Lab(build())
for v in spec:
    os.makedirs(v['out'], exist_ok=True)
    for F in v['frames']:
        im, ms = L.frame(F / 25, False, v.get('dbg', {}))
        cv2.imwrite(f"{v['out']}/r{F:04d}.png", im)  # (a later frame of the same number overwrites; order tests keep the last)
        open(f"{v['out']}/ms_log.txt", 'a').write(f'{F} {ms:.0f}\n')
    print('done', v['out'], flush=True)
L.close()
