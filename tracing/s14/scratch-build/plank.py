import numpy as np, cv2
from src import frame
DOLLY=[0,0.03,0.06,0.091,0.1221,0.1714,0.2052,0.2395,0.2726,0.3076,0.3413,0.3769,0.4122,0.4495,0.4857,0.5223,0.549]
DCY=[[40.0,626],[40.2,624],[40.32,614],[40.44,614],[40.52,608],[40.6,600],[40.64,597.5],[40.72,596]]
cy=lambda t: float(np.interp(t,[a for a,b in DCY],[b for a,b in DCY]))
def mp(x,y,t,dd=0):
    d=DOLLY[int(round((t-40)/0.04))]+dd; w=1.62+0.0006*(x-1155); Wh=1-d*w; c=cy(t)
    return 1105+(x-1105)/Wh, c+(y-c)/Wh
top=lambda x: 555+(551-555)*(x-1152)/1022; bot=lambda x: 590+(620-590)*(x-1150)/1024
for t in [40.0,40.08,40.16,40.24,40.32,40.4,40.48,40.52,40.56,40.6,40.64]:
    f=cv2.GaussianBlur(frame(t).astype(np.float32),(0,0),1.5)
    out=[]
    for xr in [1165,1250,1400]:
        X,Yt=mp(xr,top(xr),t); _,Yb=mp(xr,bot(xr),t)
        if X>2200: out.append('-'); continue
        col=f[:,int(X)]
        g=np.diff(col)  # positive = getting brighter downward
        r=int(max(8,(Yb-Yt)*0.4))
        a0,a1=int(max(1,Yt-r)),int(min(944,Yt+r)); mt=a0+int(np.argmax(g[a0:a1]))
        b0,b1=int(max(1,Yb-r)),int(min(944,Yb+r)); mb=b0+int(np.argmin(g[b0:b1]))
        out.append(f'x{X:6.0f}: top {Yt:5.0f}/{mt:4d} bot {Yb:5.0f}/{mb:4d}')
    # left end: along the plank's mid height row, strongest dark->bright going right, near predicted
    X0,Y0=mp(1152,(top(1152)+bot(1152))/2,t)
    if 0<X0<2200 and 0<Y0<946:
        row=f[int(Y0)]; g=np.diff(row); a0,a1=int(max(1,X0-120)),int(min(2204,X0+120)); ml=a0+int(np.argmax(g[a0:a1]))
        out.append(f'left {X0:5.0f}/{ml}')
    print(t,' | '.join(out))
