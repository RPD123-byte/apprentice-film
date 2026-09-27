import json,numpy as np,cv2
from scipy.ndimage import median_filter, gaussian_filter1d
d=json.load(open('snapshots/s08-fix1-tools/rib2_raw.json'))
out=[]
for k,(c,o) in enumerate(zip(d['curves'],d['offs'])):
  c=np.array(c); o=np.array([np.nan if v is None else v for v in o]); n=len(c)
  fin=np.isfinite(o)
  # robust: reject samples far from the local median
  idx=np.arange(n)
  oo=np.interp(idx,idx[fin],o[fin]) if fin.any() else np.zeros(n)
  med=median_filter(oo,size=11,mode="nearest")
  bad=fin&(np.abs(o-med)>3.0)
  f2=fin&~bad
  oo=np.interp(idx,idx[f2],o[f2])
  oo=median_filter(oo,size=9,mode='nearest')
  oo=gaussian_filter1d(oo,3,mode="nearest")
  oo=np.clip(oo,-30,30)
  t=np.gradient(c,axis=0); t/=np.linalg.norm(t,axis=1,keepdims=True)+1e-9
  nrm=np.stack([-t[:,1],t[:,0]],1)
  nc=c+oo[:,None]*nrm
  out.append(nc)
  print('B%d'%k,'rejected',bad.sum(),'of',fin.sum(),'range %.1f..%.1f'%(oo.min(),oo.max()))
np.save('snapshots/s08-fix1-tools/rib_bounds.npy',np.array(out,dtype=object),allow_pickle=True)
src=cv2.imread('snapshots/s08-rev1-src/f765.png')
for i,b in enumerate(out):
  cv2.polylines(src,[np.round(b).astype(np.int32)],False,(0,255,0),1)
cv2.imwrite('snapshots/s08-fix1-tools/bounds_over.png',src[0:720,760:2206])
# ---- hand anchors where the source's boundary runs under the card (read on column/row scans of the first frame):
# B2 (violet/orange) stays low along the U bottom up to the card edge (553 @1395, 531 @1425, 534 @1440) and the
# right arm bows right under the card (1442 @y180, 1446 @y200, off the card edge below y 220).
def catmull_np(pts,per=12):
  pts=np.array(pts,float); n=len(pts); out=[]
  P=lambda i: pts[max(0,min(n-1,i))]
  for i in range(n-1):
    p0,p1,p2,p3=P(i-1),P(i),P(i+1),P(i+2)
    for j in range(per):
      t=j/per; t2=t*t; t3=t2*t
      out.append(0.5*(2*p1+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t2+(-p0+3*p1-3*p2+p3)*t3))
  out.append(pts[-1]); return np.array(out)
b2=out[2]
i0=max(i for i in range(len(b2)) if b2[i,1]>540 and b2[i,0]<1392)
i1=min(i for i in range(i0,len(b2)) if b2[i,1]<200 and b2[i,0]>1400)
anch=[b2[i0-3],b2[i0],(1410,544),(1425,532),(1440,534),(1468,528),(1482,450),(1478,320),(1462,235),(1446,200),b2[i1],b2[i1+3]]
mid=catmull_np(anch,10)
out[2]=np.concatenate([b2[:i0-3],mid,b2[i1+4:]])
print('B2 corner replaced',i0,i1)
np.save('snapshots/s08-fix1-tools/rib_bounds.npy',np.array(out,dtype=object),allow_pickle=True)
src=cv2.imread('snapshots/s08-rev1-src/f765.png')
for i,b in enumerate(out):
  cv2.polylines(src,[np.round(b).astype(np.int32)],False,(0,255,0),1)
cv2.imwrite('snapshots/s08-fix1-tools/bounds_over.png',src[0:720,760:2206])
# the tail's right end (x > 1990, mostly horizontal bands): boundary heights read on column scans of the first frame
TAIL_ANCH={0:[(2000,342),(2050,345),(2100,326),(2150,316),(2200,311),(2240,308)],
           1:[(2000,308),(2050,311),(2100,300),(2150,297),(2200,300),(2240,301)],
           2:[(2000,274),(2050,282),(2100,275),(2150,276),(2200,281),(2240,282)],
           3:[(2000,238),(2050,250),(2100,251),(2150,251),(2200,259),(2240,262)],
           4:[(2000,204),(2050,218),(2100,223),(2150,226),(2200,236),(2240,240)]}
for k,an in TAIL_ANCH.items():
  c=out[k].copy(); ax=np.array([a[0] for a in an],float); ay=np.array([a[1] for a in an],float)
  m=(c[:,0]>1960)&(c[:,1]>150)
  w=np.clip((c[:,0]-1960)/40.0,0,1)
  from scipy.interpolate import CubicSpline
  ty=CubicSpline(ax,ay,bc_type='natural')(np.clip(c[:,0],ax[0],ax[-1]))
  c[m,1]=c[m,1]*(1-w[m])+ty[m]*w[m]
  sm_=gaussian_filter1d(c[:,1],3,mode='nearest'); c[m,1]=sm_[m]
  out[k]=c
np.save('snapshots/s08-fix1-tools/rib_bounds.npy',np.array(out,dtype=object),allow_pickle=True)
src=cv2.imread('snapshots/s08-rev1-src/f765.png')
for i,b in enumerate(out):
  cv2.polylines(src,[np.round(b).astype(np.int32)],False,(0,255,0),1)
cv2.imwrite('snapshots/s08-fix1-tools/bounds_over.png',src[0:720,760:2206])

# the tail's diagonal run between the pill shadow and the card top (y 63-184): keyline centres read on row scans
SCAN_Y=[70,80,90,100,110,120,130,140,150,160,170,180]
UPDN=[[(1674,1701),(1713,1735),(1746,1771),(1780,1809)],[(1682,1709),(1720,1743),(1754,1779),(1788,1818)],[(1689,1717),(1727,1751),(1761,1787),(1796,1827)],
      [(1697,1725),(1735,1758),(1769,1796),(1805,1837)],[(1705,1733),(1742,1766),(1777,1804),(1813,1847)],[(1713,1740),(1750,1774),(1784,1813),(1822,1857)],
      [(1721,1749),(1758,1783),(1793,1822),(1832,1868)],[(1729,1757),(1765,1792),(1802,1832),(1841,1881)],[(1736,1765),(1773,1801),(1810,1842),(1851,1893)],
      [(1744,1773),(1781,1810),(1819,1853),(1862,1908)],[(1752,1782),(1790,1819),(1829,1864),(1874,1924)],[(1761,1789),(1799,1828),(1838,1876),(1885,1942)]]
XS=[[r[0][0]-2.5,(r[0][1]+r[1][0])/2,(r[1][1]+r[2][0])/2,(r[2][1]+r[3][0])/2,r[3][1]+2.5] for r in UPDN]
XS=np.array(XS)   # rows: y, cols: boundary 0..4
for k in range(5):
  c=out[k].copy()
  ys=np.array(SCAN_Y,float); xs=XS[:,k]
  pf=np.polyfit(ys,xs,2)
  m=(c[:,0]>1600)&(c[:,0]<1990)&(c[:,1]>40)&(c[:,1]<205)
  if not m.any(): continue
  w=np.clip(np.minimum((c[:,1]-40)/20.0,(205-c[:,1])/15.0),0,1)
  c[m,0]=c[m,0]*(1-w[m])+np.polyval(pf,c[m,1])*w[m]
  out[k]=c
np.save('snapshots/s08-fix1-tools/rib_bounds.npy',np.array(out,dtype=object),allow_pickle=True)
im=cv2.imread('snapshots/s08-rev1-src/f764.png')
for b_ in out: cv2.polylines(im,[np.round(b_*4).astype(np.int32)],False,(0,255,0),1,shift=2)
cv2.imwrite('snapshots/s08-fix1-tools/bz3.png',cv2.resize(im[40:200,1640:1900],None,fx=3,fy=3,interpolation=cv2.INTER_NEAREST))
