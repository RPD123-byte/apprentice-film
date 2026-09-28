# Sample render vs source at page-unit points (close-up), mapped to frame coords at time T.
import cv2, numpy as np, re, sys
A=np.array([[0.418768349,-0.00105950832,670.585031],[0.00105950832,0.418768349,106.503905],[0,0,1]])
cam={}
for l in open('snapshots/s08-ref/cam.txt'):
    m=re.match(r't=\s*([\d.]+) s=([\d.]+) rot=\S+ tx=\s*([-\d.]+) ty=\s*([-\d.]+)',l)
    if m: cam[round(float(m[1]),2)]=tuple(map(float,m.groups()[1:]))
d=sys.argv[1]; T=float(sys.argv[2]); idx=sys.argv[3]
rend=cv2.imread(f'{d}/frame-{idx}-at-{sys.argv[4]}s.png'); ref=cv2.imread(f'{d}/ref-{idx}-at-{sys.argv[4]}s.png')
s,tx,ty=cam[round(T,2)]
M=np.array([[s,0,tx],[0,s,ty],[0,0,1]])@np.linalg.inv(A)
P={'bg_a':(900,250),'bg_hole':(1195,215),'bg_r':(1560,330),'Upink':(1073,200),'Upurp':(1102,200),'Uorng':(1128,200),'Ugold':(1151,200),
 'Bpink':(1205,366),'Bpurp':(1205,337),'Bgold':(1200,287),'pCream':(1520,204),'pPeach':(1520,219),'pLav':(1520,233),'pPink':(1520,247),
 'cardIn':(1378,331.5),'cardTop':(1319.5,201.7),'cardBot':(1378,446.6),'smiley':(1353,210),'eCream':(1030,440),'rCream':(880,450),'red':(1000,311.5),'cloud':(1500,430)}
tot=[]
for k,(x,y) in P.items():
    X,Y,_=M@np.array([x,y,1]); X=int(round(X)); Y=int(round(Y))
    if not (4<=X<2202 and 4<=Y<942): continue
    r=3
    a=np.median(rend[Y-r:Y+r+1,X-r:X+r+1].reshape(-1,3),0)[::-1]; b=np.median(ref[Y-r:Y+r+1,X-r:X+r+1].reshape(-1,3),0)[::-1]
    print(f"{k:8s} ({X:4d},{Y:3d}) render {a.astype(int)}  source {b.astype(int)}  ratio {np.round((b+1)/(a+1),2)}")
