import numpy as np, cv2, math, sys
sys.path.insert(0,'../s18fix1'); sys.path.insert(0,'.')
from src import frame
from grade import inverse
TIP = [[1417,1,0,0,0],[1418,1.0047,-0.15,-11.6,3.7],[1419,1.0046,-1.88,-38.0,62.1],[1420,1.0072,-5.79,-94.0,187.7],
 [1421,1.0088,-10.37,-151.7,345.1],[1422,1.0102,-14.02,-195.6,480.9],[1423,1.0147,-17.33,-234.3,612.6],
 [1424,1.0142,-20.07,-256.4,713.0],[1425,1.0139,-21.65,-271.0,769.5],[1426,1.0139,-21.65,-271.0,769.5],
 [1427,1.0139,-22.41,-282.0,798.9],[1428,1.0156,-23.51,-299.5,853.6],[1429,1.018,-26.19,-321.2,974.7],
 [1430,1.0266,-29.41,-361.1,1126.0],[1431,1.0237,-32.72,-385.5,1302.1],[1432,1.0168,-36.11,-405.8,1520.0]]
TIPD={r[0]:r for r in TIP}
M=260; KBW=M+3000; KBH=946+260
def tipmat(f):
    """plate (frame coords of the untipped keyboard) -> frame, 2x3"""
    if f not in TIPD or f<=1417: return np.float32([[1,0,0],[0,1,0]])
    _,s,rd,tx,ty=TIPD[f]; a=math.radians(rd)
    return np.float32([[s*math.cos(a),-s*math.sin(a),tx],[s*math.sin(a),s*math.cos(a),ty]])
def plate_from_frame(img,f):
    """warp a frame image into plate coords (KB canvas: plate x = cx - M)"""
    A=tipmat(f).astype(np.float64); A3=np.vstack([A,[0,0,1]])
    Sh=np.array([[1,0,-M],[0,1,0],[0,0,1]],np.float64)   # canvas -> plate
    T=(A3@Sh)[:2]   # canvas -> frame
    return cv2.warpAffine(img.astype(np.float32),T.astype(np.float32),(KBW,KBH),flags=cv2.INTER_LINEAR|cv2.WARP_INVERSE_MAP,borderValue=-1)
def frame_from_plate(img,f,interp=cv2.INTER_LINEAR):
    A=tipmat(f).astype(np.float64); A3=np.vstack([A,[0,0,1]])
    Sh=np.array([[1,0,-M],[0,1,0],[0,0,1]],np.float64)
    T=(A3@Sh)[:2]
    return cv2.warpAffine(img.astype(np.float32),T.astype(np.float32),(2206,946),flags=interp,borderValue=0)
KNOBS=[(x,0) for x in [110,285,495,705,900,1100,1300,1525,1665,1800,1950,2100,2260,2420,2580,2740,2900,3060]]+[(x,1) for x in [190,385,595,805,995,1188,1390,1560,1720,1897,2045,2190,2340,2490,2640,2790,2940]]
capY=lambda x,row: (445+0.011*(x-385)) if row else (366+0.012*(x-250))
KW=[56,58]; KH=[92,110]
def kbmask():
    m=np.zeros((KBH,KBW),np.uint8)
    cv2.rectangle(m,(M-10,440),(KBW-1,KBH-1),1,-1)
    for x,row in KNOBS:
        w=KW[row]; y=capY(x,row)
        cv2.rectangle(m,(int(M+x-w/2),int(y-10)),(int(M+x+w/2),int(y-10+KH[row])),1,-1)
    cv2.fillPoly(m,[np.int32([[M-10,440],[M+165,436],[M+505,590],[M+505,700],[M-10,700]])],1)
    return m
