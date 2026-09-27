# shot B: per-frame pre-grade P, expected (owl-free) frames, owl masks; registered body median + silhouette
import sys; sys.path.insert(0,'.')
from tipcommon import *
TB={1382:(0,0),1383:(-39,1),1384:(-64,-3),1385:(-73,-8),1386:(-74,-1),1387:(-76,4),1388:(-76,2),1389:(-84,-4),1390:(-103,2),1391:(-120,2),1392:(-132,-6),1393:(-140,-12),1394:(-141,-3),1395:(-146,5),1396:(-156,3),1397:(-164,-3),1398:(-182,7),1399:(-194,12),1400:(-199,8),1401:(-199,8),1402:(-212,-6),1403:(-206,12),1404:(-212,26),1405:(-212,30),1406:(-232,24),1407:(-248,28),1408:(-312,24),1409:(-392,18),1410:(-453,3),1411:(-496,-8),1412:(-540,-21),1413:(-572,-30),1414:(-593,-40),1415:(-585,-29),1416:(-589,-32)}
d=np.load('tipfit.npy',allow_pickle=True).item()
def tip3(n):
    if n<1418: return np.eye(3)
    if n in d and n!=1432: return np.vstack([d[n],[0,0,1]])
    return np.vstack([tipmat(n).astype(np.float64),[0,0,1]])
BG=np.load('BGB_P.npy'); KB=np.load('KBB_P.npy'); km=np.load('KBB_mask.npy').astype(np.float32)
Sh=np.array([[1,0,-M],[0,1,0],[0,0,1]],np.float64)
def warp_kb(T3,img):
    C=np.linalg.inv(T3@Sh)[:2].astype(np.float32)
    return cv2.warpAffine(img.astype(np.float32),C,(2206,946),flags=cv2.INTER_LINEAR|cv2.WARP_INVERSE_MAP,borderValue=0)
if __name__=="__main__":
    out={}
    for n in range(1382,1433):
        P=inverse(frame(n,True).astype(np.float32)/255,n/25).astype(np.float32)
        T=tip3(n); m=warp_kb(T,km); E=BG*(1-m)+warp_kb(T,KB)
        out[f'P{n}']=P; out[f'E{n}']=E.astype(np.float32)
    np.savez_compressed('owlB_frames.npz',**out)
    print('ok')
