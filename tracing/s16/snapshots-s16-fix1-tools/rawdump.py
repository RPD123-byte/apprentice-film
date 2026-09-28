# rawdump.py OUTDIR frames... -> raw (pre-grade) harness renders r{f}.png
import sys, os, cv2; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lab import Lab
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
L = Lab()
for a in sys.argv[2:]:
    n = int(a); cv2.imwrite(f'{out}/r{n}.png', L.raw(n))
L.close()
