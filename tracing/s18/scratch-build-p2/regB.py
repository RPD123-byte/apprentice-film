import sys; sys.path.insert(0,'../s18fix1')
from src import frame
import numpy as np, cv2
TB={1382:(0,0),1383:(-39,1),1384:(-64,-3),1385:(-73,-8),1386:(-74,-1),1387:(-76,4),1388:(-76,2),1389:(-84,-4),1390:(-103,2),1391:(-120,2),1392:(-132,-6),1393:(-140,-12),1394:(-141,-3),1395:(-146,5),1396:(-156,3),1397:(-164,-3),1398:(-182,7),1399:(-194,12),1400:(-199,8),1401:(-199,8),1402:(-212,-6),1403:(-206,12),1404:(-212,26),1405:(-212,30),1406:(-232,24),1407:(-248,28),1408:(-312,24),1409:(-392,18),1410:(-453,3),1411:(-496,-8),1412:(-540,-21),1413:(-572,-30),1414:(-593,-40),1415:(-585,-29),1416:(-589,-32)}
fs=[int(v) for v in sys.argv[1].split(',')]; out=sys.argv[2]; cols=int(sys.argv[3]) if len(sys.argv)>3 else 4
tiles=[]
for n in fs:
    f=frame(n,True); dx,dy=TB.get(n,(0,0))
    g=cv2.warpAffine(f,np.float32([[1,0,-dx],[0,1,-dy]]),(2206+700,946),borderValue=0)
    g=cv2.resize(g,None,fx=0.25,fy=0.25,interpolation=cv2.INTER_AREA); g=cv2.cvtColor(g,cv2.COLOR_GRAY2BGR)
    cv2.putText(g,str(n),(5,20),0,0.6,(0,0,255),2); tiles.append(g)
while len(tiles)%cols: tiles.append(np.zeros_like(tiles[0]))
cv2.imwrite(out,np.vstack([np.hstack(tiles[i:i+cols]) for i in range(0,len(tiles),cols)]),[cv2.IMWRITE_JPEG_QUALITY,85])
