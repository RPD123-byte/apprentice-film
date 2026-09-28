import cv2,numpy as np,glob,re,sys
S='s15-rev2-work/src/f%04d.png'
def fp(d,fl,n):
  fs=sorted(glob.glob(d+'/frame-*.png'), key=lambda p:int(re.search(r'frame-(\d+)-',p).group(1))); return fs[fl.index(n)]
def bbox(img):
  g=cv2.cvtColor(img,cv2.COLOR_BGR2GRAY)
  m=(g>225).astype(np.uint8)
  m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((5,5),np.uint8))
  k,lab,st,cen=cv2.connectedComponentsWithStats(m)
  # pick largest comp in central band
  best=None
  for i in range(1,k):
    x,y,w,h,a=st[i]
    cx=x+w/2
    if a<3000 or cx<500 or cx>1800 or w>700: continue
    if best is None or a>best[4]: best=st[i]
  return best
rows=[]
dl=[int(x) for x in open('s15-rev2-work/dl.txt').read().split()]
for n in [int(x) for x in sys.argv[1:]]:
  r=cv2.imread(fp('s15-rev2-dense',dl,n)); s=cv2.imread(S%n)
  br=bbox(r); bs=bbox(s)
  print(n,'render',None if br is None else list(br),'source',None if bs is None else list(bs))
  if bs is None: continue
  x,y,w,h,_=bs; cx,cy=x+w//2,y+h//2; R=max(w,h)//2+90
  x0,y0,x1,y1=max(0,cx-R),max(0,cy-R),min(2206,cx+R),min(946,cy+R)
  a=r[y0:y1,x0:x1]; b=s[y0:y1,x0:x1]
  sz=(360,int(360*(y1-y0)/(x1-x0)))
  a=cv2.resize(a,sz); b=cv2.resize(b,sz)
  im=np.hstack([a,np.full((sz[1],4,3),(0,0,255),np.uint8),b])
  cv2.putText(im,str(n),(5,20),cv2.FONT_HERSHEY_SIMPLEX,0.6,(0,0,255),2)
  rows.append(cv2.resize(im,(724,360)) )
out=[]
for i in range(0,len(rows),3):
  row=rows[i:i+3]
  while len(row)<3: row.append(np.zeros_like(rows[0]))
  out.append(np.hstack(row))
cv2.imwrite('s15-rev2-work/owls.jpg',np.vstack(out),[cv2.IMWRITE_JPEG_QUALITY,88])
