# regs.py f dirs... : mad4 + signed mean per owl sub-region (frame px) for renders vs source
import cv2, numpy as np, sys
M='/Users/computer/rootline/apprentice-film/snapshots/end-s25-tfix-meas'
f=int(sys.argv[1]); dirs=sys.argv[2:]
R={'band':(950,270,1210,340),'head':(950,340,1170,540),'nearcup':(1160,360,1270,510),'farcup':(900,380,965,520),'Lwing':(850,540,960,740),'Rwing':(1150,540,1300,760),'belly':(960,540,1150,800),'legs/feet':(900,780,1250,900),'owlbox':(840,260,1300,900),'scisL':(600,250,930,420),'scisR':(1250,220,1600,420),'frame':(0,0,2206,946)}
s=cv2.imread(f'{M}/src_{f:05d}.png').astype(np.float32); S=cv2.GaussianBlur(s,(0,0),4)
out={}
for d in dirs:
    r=cv2.imread(f'{d}/{f}.png').astype(np.float32); Rb=cv2.GaussianBlur(r,(0,0),4)
    e=np.abs(Rb-S).mean(2); sg=(Rb-S).mean(2)
    out[d]={k:(e[y0:y1,x0:x1].mean(),sg[y0:y1,x0:x1].mean()) for k,(x0,y0,x1,y1) in R.items()}
print(f'frame {f}   '+'   '.join(d.split('/')[-1][-10:] for d in dirs))
for k in R: print(f'{k:10s} '+'   '.join(f'{out[d][k][0]:5.1f} ({out[d][k][1]:+5.1f})' for d in dirs))
