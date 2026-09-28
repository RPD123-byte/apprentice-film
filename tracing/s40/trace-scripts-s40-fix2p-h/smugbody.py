import cv2, numpy as np
S=lambda ns: np.mean([cv2.imread(f'src/f{n}.png').astype(np.float32) for n in ns],0).mean(2)
rest=cv2.GaussianBlur(S(range(3440,3460)),(0,0),1.0); smug=cv2.GaussianBlur(S(range(3490,3504)),(0,0),1.0)
BODY=[[1524,330],[1514,340],[1511.4,350],[1511,360],[1512.4,371],[1517.5,381],[1522,392.5],[1527.5,400],
  [1535,406.5],[1546,413.5],[1560,419.5],[1575,423.6],[1590,425.6],[1605,425.6],[1620,424.6],[1631,421.6],
  [1639,418],[1645.5,414],[1651,409],[1656,402.5],[1660.5,395.5],[1663,387.5],[1664.5,377.5],[1664,367.5],
  [1661.5,357.5],[1658,347.5],[1653,338]]
P=np.array(BODY,float)
def samp(img,x,y):
    return cv2.getRectSubPix(img,(1,1),(float(x),float(y)))[0,0]
def find(img,p,n,rng):
    ts=np.arange(-rng,rng+0.01,0.25); v=[samp(img,p[0]+t*n[0],p[1]+t*n[1]) for t in ts]
    return ts[int(np.argmin(v))], min(v)
out=[]
for i in range(len(P)):
    a=P[max(0,i-1)]; b=P[min(len(P)-1,i+1)]; d=b-a; d/=np.linalg.norm(d); n=np.array([d[1],-d[0]])  # outward-ish
    tr,vr=find(rest,P[i],n,5); pr=P[i]+tr*n
    ts,vs=find(smug,pr,n,9); ps=pr+ts*n
    out.append((i,P[i].round(1),round(tr,2),round(vr),round(ts,2),round(vs),ps.round(1)))
    print(i,P[i],'rest off',round(tr,2),'L',round(vr),' smug off',round(ts,2),'L',round(vs),' ->',ps.round(1))
