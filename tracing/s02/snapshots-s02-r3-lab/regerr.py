# sigma-8 blurred abs error per region, and share of the frame's total error
import cv2, numpy as np, sys
d,f=sys.argv[1],int(sys.argv[2])
a=cv2.GaussianBlur(cv2.imread(f'{d}/r{f:04d}.png',0).astype(np.float32),(0,0),8); b=cv2.GaussianBlur(cv2.imread(f'../s02-r3-src/{f:04d}.png',0).astype(np.float32),(0,0),8)
e=np.abs(a-b); tot=e.sum()
R=eval(sys.argv[3]) if len(sys.argv)>3 else {'bgL':(0,0,560,560),'bgR':(1500,0,2206,640),'beanie':(560,0,1500,150),'hairL':(560,150,780,720),'hairR':(1300,150,1560,720),'face':(780,150,1300,700),'hoodL':(0,560,780,830),'hoodR':(1300,640,2206,830),'chin':(780,700,1300,830),'laptop':(0,830,2206,946)}
print(f'frame {f} mae {e.mean():.2f}')
for k,(x0,y0,x1,y1) in R.items():
    p=e[y0:y1,x0:x1]; print(f'{k:8s} mae {p.mean():6.2f}  share {100*p.sum()/tot:5.1f}%  bias {float((a-b)[y0:y1,x0:x1].mean()):+6.2f}')
