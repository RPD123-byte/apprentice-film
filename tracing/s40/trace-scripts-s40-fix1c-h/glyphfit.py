# Refine the traced glyph contours: per control point, compare where the white face meets its dark keyline (along the
# normal) in the render and in the source, and move the point by the difference. Prints stats; writes glyphs.js if --write.
import re,json,sys,cv2,numpy as np
G='/Users/computer/rootline/apprentice-film/src/shots/s40/glyphs.js'
txt=open(G).read(); head=txt[:txt.index('export const GLYPHS = {')]
body=txt[txt.index('export const GLYPHS = {'):]
glyphs=[(m.group(1),json.loads(m.group(2))) for m in re.finditer(r'^\s+(\w+): (\[\[.*\]\]),\s*$',body,re.M)]
ren=cv2.GaussianBlur(cv2.imread('out/r-138.000.png').astype(np.float32),(0,0),1.0).mean(2)
src=cv2.GaussianBlur(cv2.imread('src/f3450.png').astype(np.float32),(0,0),1.0).mean(2)
owl=cv2.dilate((cv2.imread('owlmask.png',cv2.IMREAD_UNCHANGED)[...,3]>10).astype(np.uint8),np.ones((17,17)))>0
def samp(im,x,y): return cv2.getRectSubPix(im,(1,1),(float(x),float(y)))[0,0]
def crossing(im,px,py,nx,ny,T=160):
  prev=None
  for k in range(0,57):
    s=-7+k*0.25; v=samp(im,px+nx*s,py+ny*s)
    if prev is not None and prev[1]>=T and v<T:
      return prev[0]+(prev[1]-T)/(prev[1]-v)*0.25
    prev=(s,v)
  return None
out=[]; allo=[]
for name,contours in glyphs:
  newc=[]
  for ci,flat in enumerate(contours):
    P=np.array(flat,float).reshape(-1,2); n=len(P); offs=np.full(n,np.nan); N=np.zeros((n,2))
    for i in range(n):
      d=P[(i+1)%n]-P[(i-1)%n]; d/=np.hypot(*d)+1e-9; nrm=np.array([d[1],-d[0]])
      # face side: the side that is white in the render
      a=samp(ren,*(P[i]-nrm*7)); b=samp(ren,*(P[i]+nrm*7))
      if b>a: nrm=-nrm; a,b=b,a
      N[i]=nrm
      x,y=P[i]
      if owl[int(round(y)),int(round(x))]: continue
      if a<215: continue
      if samp(src,*(P[i]-nrm*7))<215: continue
      cr=crossing(ren,x,y,*nrm); cs=crossing(src,x,y,*nrm)
      if cr is None or cs is None: continue
      o=cs-cr
      if abs(o)<5: offs[i]=o
    # smooth valid offsets along the contour
    sm=offs.copy()
    for i in range(n):
      vals=[(w,offs[(i+k)%n]) for k,w in ((-1,0.25),(0,0.5),(1,0.25)) if not np.isnan(offs[(i+k)%n])]
      if vals and not np.isnan(offs[i]): sm[i]=sum(w*v for w,v in vals)/sum(w for w,v in vals)
    sm=np.nan_to_num(sm,nan=0.0)
    allo+= [v for v in offs if not np.isnan(v)]
    Q=P+N*sm[:,None]
    print(f'{name}[{ci}] n={n} valid={np.sum(~np.isnan(offs))} mean|off|={np.nanmean(np.abs(offs)):.2f} max={np.nanmax(np.abs(offs)):.2f}')
    newc.append([round(v*2)/2 for v in Q.ravel().tolist()])
  out.append((name,newc))
print("all points: mean |off| %.2f  signed %.2f rms %.2f  n=%d"%(np.mean(np.abs(allo)),np.mean(allo),np.sqrt(np.mean(np.square(allo))),len(allo)))
if '--write' in sys.argv:
  fmt=lambda v: (str(int(v)) if v==int(v) else str(v))
  lines=['export const GLYPHS = {']+[f'  {k}: ['+', '.join('['+','.join(fmt(v) for v in c)+']' for c in cs)+'],' for k,cs in out]+['};','']
  open(G,'w').write(head+'\n'.join(lines))
  print('wrote',G)
