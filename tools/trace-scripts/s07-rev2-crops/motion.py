import cv2,numpy as np,glob,re
fs=sorted(glob.glob('s07-rev2-f25/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
R={};S={}
for p in fs:
  T=float(re.search(r'at-([\d.]+)s',p).group(1)); n=int(round((T-0.034)*25))
  if n>763: continue
  R[n]=cv2.imread(p,0); S[n]=cv2.imread(f's07-rev2-src/f{n-722:03d}.png',0)
ns=sorted(R)
regs={'Rhand':(870,550,1210,710),'Rfingers':(870,590,1050,700),'Lhand':(600,620,900,830),'owl':(1420,230,1770,700),'face':(1290,200,1480,500),'screen':(330,180,880,640),
'cartons':(0,0,700,300),'sweater':(1700,650,2000,900),'beanie':(1300,0,1900,250),'speakerL':(60,340,280,800)}
def flow(a,b):
  return cv2.calcOpticalFlowFarneback(a,b,None,0.5,3,15,3,5,1.2,0)
print('region        render mean/max flow(px/frame)   source mean/max   | static diff (mean abs, consecutive)')
for k,(x0,y0,x1,y1) in regs.items():
  fr=[];fsrc=[];dr=[];ds=[]
  for i in range(1,len(ns)):
    a,b=ns[i-1],ns[i]
    for D,out,dd in ((R,fr,dr),(S,fsrc,ds)):
      A=cv2.GaussianBlur(D[a][y0:y1,x0:x1],(0,0),1.5); B=cv2.GaussianBlur(D[b][y0:y1,x0:x1],(0,0),1.5)
      f=flow(A,B); m=np.hypot(f[...,0],f[...,1]); out.append(np.percentile(m,95))
      dd.append(np.abs(D[a][y0:y1,x0:x1].astype(float)-D[b][y0:y1,x0:x1]).mean())
  fr=np.array(fr);fsrc=np.array(fsrc)
  print(f'{k:10s} p95flow render {fr.mean():5.2f}/{fr.max():5.2f}  source {fsrc.mean():5.2f}/{fsrc.max():5.2f} | diff render {np.mean(dr):5.2f} source {np.mean(ds):5.2f}')
# per-frame blurred MAE
m=[]
for n in ns:
  a=cv2.GaussianBlur(R[n].astype(float),(0,0),6); b=cv2.GaussianBlur(S[n].astype(float),(0,0),6); m.append(np.abs(a-b).mean())
print('blurMAE per frame min/mean/max',round(min(m),1),round(np.mean(m),1),round(max(m),1))
# frame mean luminance drift
print('render means', [round(R[n].mean(),1) for n in ns[::4]])
print('source means', [round(S[n].mean(),1) for n in ns[::4]])
