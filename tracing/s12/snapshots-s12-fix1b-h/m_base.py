import cv2, numpy as np, sys
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/src/shots/s12/trace')
from degrade import degrade
sys.path.insert(0, '.')
g = cv2.imread('src-850.png', 0).astype(np.float32); H, W = g.shape
pre = degrade(g)
E = [[1304,166],[1287,182],[1276,200],[1268,222],[1264,250],[1263,285],[1265,315],[1271,342],[1281,365],[1296,383],[1318,395],[1350,400],[1372,392],[1392,378],[1410,372],[1424,352],[1433,290],[1427,235],[1411,205],[1392,182],[1384,150],[1374,96],[1336,94],[1316,98],[1312,150]]
HA = [[1336,95],[1382,95],[1388,150],[1394,182],[1410,200],[1422,225],[1429,262],[1431,300],[1427,332],[1419,332],[1421,290],[1416,250],[1402,222],[1385,207],[1365,204],[1350,207],[1340,215],[1333,228],[1328,250],[1326,275],[1326,300],[1322,300],[1321,262],[1326,232],[1336,210],[1340,190],[1342,160],[1340,120]]
m = np.zeros((H, W), np.uint8); cv2.fillPoly(m, [np.array(E, np.int32)], 1)
cv2.fillPoly(m, [np.array(HA, np.int32)], 0)
cv2.ellipse(m, (1375, 285), (52, 90), 0, 0, 360, 0, -1)
clo = cv2.morphologyEx(pre, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
for y in range(170, 400, 15):
  row = []
  for x in range(1262, 1440, 8):
    row.append('%3d' % clo[y, x] if m[y, x] else '  .')
  print(y, ' '.join(row))
print('mean pre in mask', pre[m > 0].mean(), 'closing mean', clo[m > 0].mean())
