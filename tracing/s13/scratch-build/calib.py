import sys; sys.path.insert(0,'/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad')
from grade import *
import glob
d=sys.argv[1]; t=sys.argv[2]
fr=glob.glob(f'{d}/frame-*-at-{t}s.png')[0]; rf=glob.glob(f'{d}/ref-*-at-{t}s.png')[0]
R=load(fr); S=load(rf)
sig=float(sys.argv[3]) if len(sys.argv)>3 else 2.0
Rb=cv2.GaussianBlur(R,(0,0),sig); Sb=cv2.GaussianBlur(S,(0,0),sig)
PR=invert(Rb,float(t)); PS=invert(Sb,float(t))
def h(v): v=np.clip(v*255,0,255).astype(int); return '#%02x%02x%02x'%tuple(v)
pts={
 'bg top ctr':(1100,40),'bg 600,150':(600,150),'bg 1600,150':(1600,150),'bg 1750,150':(1750,150),'bg 800,300':(800,300),'bg 1300,250':(1300,250),
 'bg 1000,620':(1000,620),'bg 1000,760':(1000,760),'bg 300,450':(300,450),'bg 1800,500':(1800,500),'bg 100,150':(100,150),'bg 2150,250':(2150,250),'bg 500,700':(500,700),'bg 1700,700':(1700,700),
 'LA cream':(245,80),'LA peach':(300,80),'LA red':(352,80),'LA maroon':(400,80),
 'LB cream':(135,470),'LB peach':(95,470),'LB red':(55,470),'LB cream2':(300,600),'LB peach2':(235,600),'LB red2':(160,600),'LA cream2':(80,235),'LA peach2':(150,235),
 'RA cream':(2055,60),'RA peach':(2110,60),'RA red':(2163,60),'RB cream':(1965,640),'RB peach':(2025,640),'RB red':(2065,640),'RA cream2':(2150,420),'RA peach2':(2110,440),'RA red2':(2050,440),'RA cream3':(1920,200),'RA red3':(2015,200),
 'cloud L2':(100,700),'cloud L2 low':(100,880),'cloud L3':(450,900),'cloud R':(1950,860),'cloud R2':(1700,880),'cloud L1':(150,690),'cloud RB':(2150,660),
 'face':(700,420),'face2':(1030,450),'L1':(1200,498),'L2':(1200,522),'dark':(1200,535),'stop':(1600,470),'shadow bg':(1000,600),
 'owl chest':(1590,390),'owl head':(1600,268),'owl wing':(1528,370),'beak':(1588,330),'cup L':(1512,300),'cup R':(1676,310),
}
print('%-12s %-8s %-8s | %-8s %-8s | pre delta'%('pt','src','ren','preSrc','preRen'))
for k,(x,y) in pts.items():
    ds=(PS[y,x]-PR[y,x])*255
    print('%-12s %s %s | %s %s | %+4d %+4d %+4d'%(k,h(Sb[y,x]),h(Rb[y,x]),h(PS[y,x]),h(PR[y,x]),ds[0],ds[1],ds[2]))
