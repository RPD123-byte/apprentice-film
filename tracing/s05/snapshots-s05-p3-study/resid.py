# resid.py DIR k...: residual motion render -> source (DIS flow on blurred luminance), median per region
import sys,cv2,numpy as np
sys.path.insert(0,__file__.rsplit('/',1)[0]); from src import frame
REG={'room_top':(0,0,1100,160),'room_spkL':(0,250,120,700),'desk_kb':(420,600,1000,780),'desk_edge':(150,700,500,946),'screen':(340,200,880,620),'lh':(560,700,800,900),'rh':(900,560,1200,720),'arm':(1150,600,1500,800),'face':(1250,250,1420,470),'beanie':(1300,40,1750,220),'owl':(1450,250,1700,600),'back':(1650,450,2000,900),'spkR':(1000,200,1150,420)}
dis=cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
for k in map(int,sys.argv[2:]):
    r=cv2.cvtColor(cv2.imread(f'{sys.argv[1]}/k{k}.png'),cv2.COLOR_BGR2GRAY); s=cv2.cvtColor(frame(k),cv2.COLOR_BGR2GRAY)
    r=cv2.GaussianBlur(r,(0,0),1.5); s=cv2.GaussianBlur(s,(0,0),1.5)
    f=dis.calc(r,s,None)   # r(x) ~ s(x + f)
    print(k,' '.join(f'{n}:{np.median(f[y0:y1,x0:x1,0]):+.1f},{np.median(f[y0:y1,x0:x1,1]):+.1f}' for n,(x0,y0,x1,y1) in REG.items()))
