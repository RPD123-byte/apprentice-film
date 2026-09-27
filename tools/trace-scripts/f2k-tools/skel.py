# skeleton -> list of polylines with per-point half-widths
import numpy as np, cv2
from skimage.morphology import skeletonize
NB=[(-1,-1),(-1,0),(-1,1),(0,-1),(0,1),(1,-1),(1,0),(1,1)]
def paths(mask, dt, min_len=6):
  sk=skeletonize(mask>0).astype(np.uint8)
  H,W=sk.shape
  pad=np.pad(sk,1)
  deg=sum(np.roll(np.roll(pad,-dy,0),-dx,1) for dy,dx in NB)[1:-1,1:-1]*sk
  pts=set(zip(*np.nonzero(sk)))
  node=lambda p: deg[p]!=2
  visited_edges=set()
  out=[]
  def nbrs(p):
    y,x=p
    for dy,dx in NB:
      q=(y+dy,x+dx)
      if q in pts: yield q
  def walk(a,b):
    path=[a,b]; prev,cur=a,b
    while not node(cur):
      nx=[q for q in nbrs(cur) if q!=prev and (min(cur,q),max(cur,q)) not in visited_edges]
      if not nx: break
      visited_edges.add((min(cur,nx[0]),max(cur,nx[0])))
      prev,cur=cur,nx[0]; path.append(cur)
      if cur==a: break
    return path
  for p in [p for p in pts if node(p)]:
    for q in nbrs(p):
      e=(min(p,q),max(p,q))
      if e in visited_edges: continue
      visited_edges.add(e)
      out.append(walk(p,q))
  # pure cycles
  for p in pts:
    for q in nbrs(p):
      e=(min(p,q),max(p,q))
      if e in visited_edges: continue
      visited_edges.add(e); out.append(walk(p,q))
  res=[]
  for pa in out:
    if len(pa)<min_len: continue
    a=np.array(pa,np.float32)[:,::-1]  # x,y
    w=np.array([dt[y,x] for y,x in pa],np.float32)
    res.append((a,w))
  return res
def smooth_simplify(a,w,k=2,eps=0.6):
  n=len(a)
  if n>2*k+1:
    A=a.copy(); Wt=w.copy()
    for i in range(k,n-k): A[i]=a[i-k:i+k+1].mean(0); Wt[i]=w[i-k:i+k+1].mean()
    a,w=A,Wt
  # Douglas-Peucker keeping indices
  keep=np.zeros(n,bool); keep[0]=keep[-1]=True
  st=[(0,n-1)]
  while st:
    i,j=st.pop()
    if j<=i+1: continue
    p,q=a[i],a[j]; d=q-p; L=np.hypot(*d)+1e-9
    dist=np.abs(np.cross(d,a[i+1:j]-p))/L
    wd=np.abs(w[i+1:j]-(w[i]+(w[j]-w[i])*np.linspace(0,1,j-i+1)[1:-1]))
    m=np.argmax(dist+wd*0.5)
    if (dist+wd*0.5)[m]>eps: k2=i+1+m; keep[k2]=True; st+= [(i,k2),(k2,j)]
  return a[keep],w[keep]
