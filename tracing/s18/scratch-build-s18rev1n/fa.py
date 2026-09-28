# frame-accurate pairs: render frame at floor(30t)/30 vs exact source frame; plus diff map and stats
import cv2,numpy as np,glob,re,sys,os
S='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s18rev1n/src/'
d=sys.argv[1]; out=sys.argv[2]; os.makedirs(out,exist_ok=True)
for p in sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1))):
  t=float(re.search(r'at-([\d.]+)s',p).group(1))
  tr=np.floor(30*t+1e-6)/30; n=int(np.floor(25*tr+1e-4))
  if n<1331 or n>1432: continue
  r=cv2.imread(p); s=cv2.imread(S+f'f{n:04d}.png')
  rg=cv2.cvtColor(r,cv2.COLOR_BGR2GRAY).astype(np.float32); sg=cv2.cvtColor(s,cv2.COLOR_BGR2GRAY).astype(np.float32)
  b6=np.abs(cv2.GaussianBlur(rg,(0,0),6)-cv2.GaussianBlur(sg,(0,0),6))
  b2=np.abs(cv2.GaussianBlur(rg,(0,0),2)-cv2.GaussianBlur(sg,(0,0),2))
  raw=np.abs(rg-sg)
  # colour: mean channel stats
  mr=r.reshape(-1,3).mean(0); ms=s.reshape(-1,3).mean(0)
  # sharpness: laplacian variance
  lr=cv2.Laplacian(rg,cv2.CV_32F).var(); ls=cv2.Laplacian(sg,cv2.CV_32F).var()
  # dark fraction
  dr=(rg<20).mean(); ds=(sg<20).mean()
  print(f'{t:7.3f} f{n} b6={b6.mean():.2f} b2={b2.mean():.2f} raw={raw.mean():.2f} p99raw={np.percentile(raw,99):.0f} mean r/s={rg.mean():.1f}/{sg.mean():.1f} lapvar r/s={lr:.0f}/{ls:.0f} dark<20 r/s={dr:.3f}/{ds:.3f} BGR r={mr.round(1)} s={ms.round(1)}')
  hm=cv2.applyColorMap(np.clip(b2*6,0,255).astype(np.uint8),cv2.COLORMAP_INFERNO)
  top=np.hstack([r,s]); bot=np.hstack([hm,np.zeros_like(hm)])
  cv2.putText(bot,f'blur2 |diff| x6  t={t} f{n}',(2230,60),cv2.FONT_HERSHEY_SIMPLEX,1.5,(255,255,255),3)
  im=np.vstack([top,bot]); im=cv2.resize(im,(im.shape[1]//2,im.shape[0]//2),interpolation=cv2.INTER_AREA)
  cv2.imwrite(f'{out}/fa-{n}-at-{t:.3f}.jpg',im,[cv2.IMWRITE_JPEG_QUALITY,88])
