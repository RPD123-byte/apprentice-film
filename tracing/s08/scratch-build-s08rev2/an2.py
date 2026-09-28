import cv2,numpy as np,sys
d='snapshots/s08-rev2-a/'; S='snapshots/s08-rev2-src/'; O='snapshots/s08-rev2-an/'
import os; os.makedirs(O,exist_ok=True)
import glob,re
def get(t):
    p=glob.glob(d+f'frame-*-at-{t}s.png')[0]; return cv2.imread(p)
for t,k in [('30.6',765),('31.2',780),('31.8',795),('32.4',810)]:
    r=get(t).astype(float); s=cv2.imread(S+f'f{k}.png').astype(float)
    rb=cv2.GaussianBlur(r,(0,0),3); sb=cv2.GaussianBlur(s,(0,0),3)
    dl=(cv2.cvtColor(rb.astype(np.float32),cv2.COLOR_BGR2GRAY)-cv2.cvtColor(sb.astype(np.float32),cv2.COLOR_BGR2GRAY))
    # signed luma diff: red=render brighter, blue = render darker
    v=np.clip(dl*6,-255,255)
    vis=np.zeros_like(r); vis[...,2]=np.clip(v,0,255); vis[...,0]=np.clip(-v,0,255)
    # overlay faint source
    vis=vis*0.8+cv2.cvtColor(cv2.cvtColor(s.astype(np.uint8),cv2.COLOR_BGR2GRAY),cv2.COLOR_GRAY2BGR)*0.25
    # grid labels every 200px
    for x in range(0,2206,200): cv2.line(vis,(x,0),(x,946),(80,80,80),1); cv2.putText(vis,str(x),(x+2,14),0,0.45,(200,200,200),1)
    for y in range(0,946,100): cv2.line(vis,(0,y),(2206,y),(80,80,80),1); cv2.putText(vis,str(y),(2,y-2),0,0.45,(200,200,200),1)
    cv2.imwrite(O+f'dl-{t}.jpg',np.clip(vis,0,255).astype(np.uint8))
    # colour abs diff map (chroma)
    def chroma(im):
        lab=cv2.cvtColor((im/255).astype(np.float32),cv2.COLOR_BGR2LAB); return lab
    lr,ls=chroma(rb),chroma(sb)
    de=np.sqrt(((lr-ls)**2).sum(-1))
    # tile table 16x8
    th,tw=946//8,2206//16
    print('t',t,'deltaE tiles (x cols 138px, y rows 118px)')
    for j in range(8):
        print(' '.join(f'{de[j*th:(j+1)*th,i*tw:(i+1)*tw].mean():4.1f}' for i in range(16)))
    print('signed luma tiles')
    for j in range(8):
        print(' '.join(f'{dl[j*th:(j+1)*th,i*tw:(i+1)*tw].mean():+5.1f}' for i in range(16)))
