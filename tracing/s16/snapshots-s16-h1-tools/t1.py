import sys, time, cv2; sys.path.insert(0, '.')
from lab import Lab
L = Lab(); t = time.time()
for n in (1143, 1175):
    im = L.raw(n); print(n, im.mean(), time.time() - t)
    cv2.imwrite(f'/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/r{n}.png', im)
L.close()
