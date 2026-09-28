import sys; sys.path.insert(0, '.')
from lab import src
import numpy as np, cv2
for k in range(1437, 1452):
    t = k / 25; f = src(t, True)
    g = cv2.GaussianBlur(f, (0, 0), 2.5)
    cs = cv2.HoughCircles(g, cv2.HOUGH_GRADIENT, dp=2, minDist=400, param1=80, param2=40, minRadius=125, maxRadius=175)
    out = []
    if cs is not None:
        for x, y, r in cs[0][:3]: out.append(f'({x:6.0f},{y:5.0f}) r{r:4.0f}')
    print(f'{t:.2f}', ' | '.join(out))
