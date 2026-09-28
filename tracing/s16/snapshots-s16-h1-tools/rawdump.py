import sys, os, cv2; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lab import Lab
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
L = Lab()
for n in [int(v) for v in sys.argv[2].split(',')]:
    cv2.imwrite(f'{out}/r{n}.png', cv2.cvtColor(L.raw(n), cv2.COLOR_BGR2GRAY))
L.close()
