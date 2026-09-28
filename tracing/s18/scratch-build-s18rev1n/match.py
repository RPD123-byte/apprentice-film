import cv2,numpy as np,glob,re,sys
S='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s18rev1n/src/'
d=sys.argv[1]
src={}
def get(n):
  if n not in src:
    s=cv2.imread(S+f'f{n:04d}.png'); src[n]=None if s is None else cv2.GaussianBlur(s.astype(np.float32),(0,0),6)
  return src[n]
for p in sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1))):
  t=float(re.search(r'at-([\d.]+)s',p).group(1)); r=cv2.GaussianBlur(cv2.imread(p).astype(np.float32),(0,0),6)
  best=[]
  for n in range(int(t*25)-3,int(t*25)+4):
    s=get(n)
    if s is None: continue
    best.append((float(np.abs(s-r).mean()),n))
  best.sort()
  tr=np.floor(30*t+1e-6)/30; exp=int(np.floor(25*tr+1e-4))
  print(f'{t:7.3f} bestmatch={best[0][1]} err={best[0][0]:.2f} 2nd={best[1][1]}:{best[1][0]:.2f}  floor30->frame {exp}  ceil25={int(np.ceil(25*t-1e-6))}')
