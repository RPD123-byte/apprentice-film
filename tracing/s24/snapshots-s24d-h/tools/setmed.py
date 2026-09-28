# per line-set median plates (frame coords) with the owl/scissors masked out per frame
import cv2,numpy as np,json
import sys
SETS={'A':[24,26,28,30,33,35,37,39,41,43,45,47,49,51,53,58,60,62,64],'B':[25,29,34,38,42,46,50,59,63],'C':[27,32,36,40,44,48,52,61,65]}
def objmask(g):
  # big bright objects (owl, scissors): bright blobs that survive an opening wider than any line
  b=(g>120).astype(np.uint8)
  o=cv2.morphologyEx(b,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(19,19)))
  return cv2.dilate(o,np.ones((41,41),np.uint8))>0
TR={int(l.split()[0]):(float(l.split()[1]),float(l.split()[2])) for l in open('meas/ftrack.txt')}
def polys(k):
  out=[]
  if 23<=k<=53:
    dx,dy=TR[k]
    for c in json.load(open('meas/F.json')): out.append(np.array(c['pts'],np.float32)+[dx,dy])
  elif 54<=k<=62:
    for c in json.load(open('meas/H.json')): out.append(np.array(c['pts'],np.float32))
  elif k in (63,64,65,66):
    for c in json.load(open('meas/W%d.json'%k)): out.append(np.array(c['pts'],np.float32))
  return out
def silmask(k):
  m=np.zeros((946,2206),np.uint8)
  for p in polys(k): cv2.fillPoly(m,[p.astype(np.int32)],1)
  return cv2.dilate(m,np.ones((11,11),np.uint8))>0
for name,ks in SETS.items():
  st=[]
  for k in ks:
    g=cv2.imread('src/f%04d.png'%(2420+k),0).astype(np.float32)
    sm=silmask(k); om=objmask(g); om&=~cv2.dilate(sm.astype(np.uint8),np.ones((61,61),np.uint8)).astype(bool) if sm.any() else om
    m=om|sm; g[m]=np.nan; st.append(g)
  st=np.array(st)
  with np.errstate(all='ignore'): med=np.nanmedian(st,0)
  valid=~np.isnan(med)
  med=np.nan_to_num(med)
  np.save('meas/L%s.npy'%name,med.astype(np.float32)); np.save('meas/L%s_valid.npy'%name,valid)
  cv2.imwrite('meas/L%s.jpg'%name,cv2.resize(np.clip(med,0,255).astype(np.uint8),None,fx=0.5,fy=0.5))
  print(name,len(ks),'valid %.2f'%valid.mean())
