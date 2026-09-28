import sys, time, cv2; sys.path.insert(0, '.')
from lab import Lab
L = Lab(); t = time.time()
for n in (1143, 1175):
    im = L.graded(n); cv2.imwrite(f'/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/h{n}.png', im)
    print(n, im.shape, im.mean(), time.time() - t)
print('ms', [L.js('(n) => S16H.timeRaw(n)', n) for n in (1150, 1151, 1175, 1176, 1190)])
L.close()
