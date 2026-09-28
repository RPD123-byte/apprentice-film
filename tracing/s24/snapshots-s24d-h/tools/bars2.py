# second pass on the measured bars: merge collinear fragments, then find the wide soft bars the first pass missed
# (on the residual after subtracting the drawn first-pass bars). Writes meas/bars2<name>.json (same format).
import cv2,numpy as np,json,sys
from scipy.signal import find_peaks
W,H=2206,946
exec(open('bars.py').read().split("def run(")[0])
def geom(ang):
  a=np.radians(ang); c,s=np.cos(a),np.sin(a)
  corners=np.array([[0,0],[W,0],[0,H],[W,H]],float)
  U=corners[:,0]*c+corners[:,1]*s; V=-corners[:,0]*s+corners[:,1]*c
  u0,v0=np.floor(U.min()),np.floor(V.min()); RW,RH=int(np.ceil(U.max()-u0)),int(np.ceil(V.max()-v0))
  M=np.float32([[c,-s,u0*c-v0*s],[s,c,u0*s+v0*c]]); Mi=cv2.invertAffineTransform(M)
  return c,s,u0,v0,RW,RH,Mi
def S(v): return v*0.65+0.35*v*v*(3-2*v)
def merge(bars):
  bars=sorted(bars,key=lambda b:(round(b[2]),b[0]))
  out=[]
  for b in sorted(bars,key=lambda b:b[0]):
    hit=None
    for o in out[-400:]:
      if abs(o[2]-b[2])<=1.6 and b[0]-o[1]<=26 and b[0]>=o[0]-5 and abs(o[3]-b[3])<=max(2.5,0.5*o[3]):
        hit=o; break
    if hit is None: out.append(list(b)); continue
    L1=hit[1]-hit[0]; L2=b[1]-b[0]; T=max(1e-3,L1+L2)
    hit[2]=(hit[2]*L1+b[2]*L2)/T; hit[3]=(hit[3]*L1+b[3]*L2)/T
    hit[5]=(hit[5]*L1+b[5]*L2)/T; hit[6]=b[6]; hit[1]=max(hit[1],b[1])
  return out
def run2(name):
  d=json.load(open('meas/bars%s.json'%name)); ang=d['ang']
  bars=merge(d['bars'])
  m=np.load('meas/L%s.npy'%name).astype(np.float32); valid=np.load('meas/L%s_valid.npy'%name)
  c,s,u0,v0,RW,RH,Mi=geom(ang)
  R=cv2.warpAffine(m,Mi,(RW,RH),flags=cv2.INTER_LINEAR,borderValue=0)
  RV=cv2.warpAffine(valid.astype(np.uint8),Mi,(RW,RH),flags=cv2.INTER_NEAREST,borderValue=0)>0
  # draw first-pass bars in rotated space (post-grade-ish values: S-curve of the ungraded value; vignette ignored)
  D=np.zeros((RH,RW),np.float32)
  for b in bars:
    ua,ub,v,w=b[0]-u0,b[1]-u0,b[2]-v0,b[3]; val=255*S(min(1,b[5]/255))
    cv2.line(D,(int(ua*4),int(v*4)),(int(ub*4),int(v*4)),float(val),max(1,int(w*4)),cv2.LINE_AA,shift=2)
  D=cv2.GaussianBlur(D,(0,0),0.8)
  res=np.where(RV,R-np.maximum(D,0)*0.9,0)
  resb=cv2.GaussianBlur(res,(0,0),sigmaX=5,sigmaY=2.5)
  cols={}
  for uu in range(0,RW,3):
    col=resb[:,uu]; pk,_=find_peaks(col,prominence=14,height=22); cols[uu]=pk
  tracks=[]; active=[]
  for uu in range(0,RW,3):
    pk=list(cols[uu]); used=set(); new=[]
    for t in active:
      if uu-t['last']>30: tracks.append(t); continue
      vl=t['v'][-1]; best=None
      for j,p in enumerate(pk):
        if j in used: continue
        if abs(p-vl)<=3 and (best is None or abs(p-vl)<abs(pk[best]-vl)): best=j
      if best is not None: used.add(best); t['u'].append(uu); t['v'].append(pk[best]); t['last']=uu
      new.append(t)
    for j,p in enumerate(pk):
      if j not in used: new.append({'u':[uu],'v':[p],'last':uu})
    active=new
  tracks+=active
  add=[]
  for t in tracks:
    if len(t['u'])<12: continue
    uu=np.array(t['u']); vv=np.array(t['v']); ws=[];vals=[];vcs=[]
    for x,y in zip(uu,vv):
      if y<16 or y>=RH-16: continue
      prof=resb[y-15:y+16,x]; pk=prof[15]; half=pk/2; l=15; r=15
      while l>0 and prof[l]>half: l-=1
      while r<30 and prof[r]>half: r+=1
      fw=r-l; ws.append(np.sqrt(max(1,fw*fw-(2.355*2.5)**2))); vals.append(R[y-2:y+3,x].mean()); vcs.append(y)
    if len(ws)<8: continue
    w=float(np.median(ws))
    if w<6: continue           # narrow residues are first-pass misses of thin lines; keep only the wide soft bars
    ua,ub=uu.min(),uu.max(); vc=float(np.median(vcs))
    um=(ua+ub)/2+u0; vm=vc+v0; xm=um*c-vm*s; ym=um*s+vm*c; g=vig(xm,ym)
    val=float(unS(np.clip(np.array([np.median(vals)])/255/g,0,1))[0]*255)
    add.append([round(float(ua+u0),1),round(float(ub+u0),1),round(vc+v0,2),round(w,2),round(val,1),round(val,1),round(val,1)])
  out=bars+add
  json.dump({'ang':ang,'bars':out},open('meas/bars2%s.json'%name,'w'))
  print(name,'first',len(d['bars']),'merged',len(bars),'wide added',len(add))
for n in sys.argv[1:]: run2(n)
