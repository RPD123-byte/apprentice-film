# measure straight speed-line bars on a line-set plate: [u0, u1, v, width(FWHM px), val0, val1, val2] in the rotated
# frame (u along the lines at angle ANG, v across), values ungraded (inverse S-curve and vignette of post.js)
import cv2,numpy as np,sys,json
from scipy.signal import find_peaks
W,H=2206,946
def ang_of(m,valid):
  gx=cv2.Sobel(m,cv2.CV_32F,1,0,ksize=5); gy=cv2.Sobel(m,cv2.CV_32F,0,1,ksize=5)
  ok=valid&(m>30)
  Jxx=(gx*gx)[ok].sum(); Jyy=(gy*gy)[ok].sum(); Jxy=(gx*gy)[ok].sum()
  return np.degrees(0.5*np.arctan2(2*Jxy,Jxx-Jyy))+90
def unS(f):
  # invert f*0.65 + 0.35*smoothstep(f) by bisection (vectorised)
  lo=np.zeros_like(f); hi=np.ones_like(f)
  for _ in range(30):
    mid=(lo+hi)/2; y=mid*0.65+0.35*mid*mid*(3-2*mid)
    lo=np.where(y<f,mid,lo); hi=np.where(y<f,hi,mid)
  return (lo+hi)/2
def vig(x,y):
  qx=(x/W-0.5)*2; qy=(y/H-0.5)*2; r=np.clip((qx*qx+qy*qy)/2,0,1); return 1-0.38*r**1.15
def run(name,ang=None):
  m=np.load('meas/L%s.npy'%name).astype(np.float32); valid=np.load('meas/L%s_valid.npy'%name)
  if ang is None: ang=ang_of(m,valid)
  a=np.radians(ang); c,s=np.cos(a),np.sin(a)
  corners=np.array([[0,0],[W,0],[0,H],[W,H]],float)
  U=corners[:,0]*c+corners[:,1]*s; V=-corners[:,0]*s+corners[:,1]*c
  u0,v0=np.floor(U.min()),np.floor(V.min()); RW,RH=int(np.ceil(U.max()-u0)),int(np.ceil(V.max()-v0))
  # rotated image R(uu,vv) = m(x,y) with x = u c - v s, y = u s + v c, u = uu+u0, v = vv+v0
  M=np.float32([[c,-s,u0*c-v0*s],[s,c,u0*s+v0*c]])  # maps (uu,vv)->(x,y)
  Mi=cv2.invertAffineTransform(M)
  R=cv2.warpAffine(m,Mi,(RW,RH),flags=cv2.INTER_LINEAR,borderValue=0)
  RV=cv2.warpAffine(valid.astype(np.uint8),Mi,(RW,RH),flags=cv2.INTER_NEAREST,borderValue=0)>0
  Rs=cv2.blur(R,(9,1))
  # peaks per column
  cols={}
  for uu in range(0,RW,2):
    col=np.where(RV[:,uu],Rs[:,uu],0)
    pk,pr=find_peaks(col,prominence=18,height=34)
    cols[uu]=pk
  # link
  tracks=[]; active=[]
  for uu in range(0,RW,2):
    pk=list(cols[uu]); used=set(); new=[]
    for t in active:
      if uu-t['last']>8: tracks.append(t); continue
      vlast=t['v'][-1]
      best=None
      for j,p in enumerate(pk):
        if j in used: continue
        if abs(p-vlast)<=2 and (best is None or abs(p-vlast)<abs(pk[best]-vlast)): best=j
      if best is not None:
        used.add(best); t['u'].append(uu); t['v'].append(pk[best]); t['last']=uu
      new.append(t)
    for j,p in enumerate(pk):
      if j not in used: new.append({'u':[uu],'v':[p],'last':uu})
    active=new
  tracks+=active
  bars=[]
  for t in tracks:
    if len(t['u'])<6: continue
    uu=np.array(t['u']); vv=np.array(t['v'])
    v=np.median(vv)
    ua,ub=uu.min(),uu.max()
    # sub-pixel centre, FWHM and peak along the track (unsmoothed R, local 3-column mean)
    ws=[];vals=[];vcs=[]
    for k in range(len(uu)):
      x=int(uu[k]); y=int(vv[k])
      if y<15 or y>=RH-15: continue
      prof=R[y-14:y+15,max(0,x-1):x+2].mean(1)
      c0=14
      i=c0-2+int(np.argmax(prof[c0-2:c0+3]))
      pk=prof[i]
      # half-level crossings each side (half between the peak and the lower side minimum), equivalent width inside
      mL=prof[:i+1].min(); mR=prof[i:].min(); bg=max(mL,mR); half=(pk+bg)/2
      l=i
      while l>0 and prof[l]>half: l-=1
      r=i
      while r<len(prof)-1 and prof[r]>half: r+=1
      # extend to the skirts (down to a quarter level) for the area
      l2=l
      while l2>0 and prof[l2-1]<prof[l2] and prof[l2]>bg+(pk-bg)*0.15: l2-=1
      r2=r
      while r2<len(prof)-1 and prof[r2+1]<prof[r2] and prof[r2]>bg+(pk-bg)*0.15: r2+=1
      seg=np.clip(prof[l2:r2+1]-bg,0,None)
      top=np.percentile(prof[l:r+1],75)
      eq=seg.sum()/max(1e-3,top-bg)
      idx=np.arange(l,r+1); wts=np.clip(prof[l:r+1]-half,0,None)
      cen=(idx*wts).sum()/max(1e-3,wts.sum())
      pk=top
      wl=cen-eq/2; wr=cen+eq/2
      ws.append(max(1.0,wr-wl)); vals.append(pk); vcs.append(y-14+(wl+wr)/2)
    if len(ws)<4: continue
    vals=np.array(vals); w=float(min(34,np.median(ws))); vc=float(np.median(vcs))
    # centre point in the frame for the vignette
    um=(ua+ub)/2+u0; vm=vc+v0; xm=um*c-vm*s; ym=um*s+vm*c
    g=vig(xm,ym)
    thirds=np.array_split(vals,3)
    vs=[float(unS(np.clip(np.array([np.median(q)])/255/g,0,1))[0]*255) for q in thirds]
    bars.append([round(float(ua+u0),1),round(float(ub+u0),1),round(float(vc+v0),2),round(w,2)]+[round(x,1) for x in vs])
  bars.sort(key=lambda b:b[2])
  json.dump({'ang':round(float(ang),3),'bars':bars},open('meas/bars%s.json'%name,'w'))
  B=np.array(bars)
  print(name,'ang %.2f'%ang,'bars',len(bars),'len med %.0f'%np.median(B[:,1]-B[:,0]),'w med %.1f'%np.median(B[:,3]),'val med %.0f'%np.median(B[:,5]))
if __name__=='__main__':
  for n in sys.argv[1:]: run(n)
