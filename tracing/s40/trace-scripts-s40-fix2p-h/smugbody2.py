import cv2, numpy as np
S=lambda ns: np.mean([cv2.imread(f'src/f{n}.png').astype(np.float32) for n in ns],0).mean(2)
rest=cv2.GaussianBlur(S(range(3440,3460)),(0,0),1.0); smug=cv2.GaussianBlur(S(range(3490,3504)),(0,0),1.0)
BODY=[[1524,330],[1514,340],[1511.4,350],[1511,360],[1512.4,371],[1517.5,381],[1522,392.5],[1527.5,400],
  [1535,406.5],[1546,413.5],[1560,419.5],[1575,423.6],[1590,425.6],[1605,425.6],[1620,424.6],[1631,421.6],
  [1639,418],[1645.5,414],[1651,409],[1656,402.5],[1660.5,395.5],[1663,387.5],[1664.5,377.5],[1664,367.5],
  [1661.5,357.5],[1658,347.5],[1653,338]]
H=10
for i,(x,y) in enumerate(BODY):
    x,y=int(round(x)),int(round(y))
    A=rest[y-H:y+H,x-H:x+H]; B=smug[y-H-10:y+H+10,x-H-10:x+H+10]
    res=cv2.matchTemplate(B,A,cv2.TM_CCOEFF_NORMED); _,mx,_,loc=cv2.minMaxLoc(res)
    # subpixel
    dx,dy=loc[0]-10,loc[1]-10
    print(i,(x,y),'shift',(dx,dy),'score',round(mx,3))
