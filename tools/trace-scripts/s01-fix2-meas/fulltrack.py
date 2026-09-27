import sys, cv2, numpy as np, json
exec(open('/Users/computer/rootline/apprentice-film/snapshots/s01-fix1-meas/camlib.py').read())
X0,Y0,X1,Y1=990,400,1500,880
Z=2
ref=cv2.cvtColor(plate_frame(0.0,X0,Y0,X1,Y1,Z),cv2.COLOR_BGR2GRAY)
# name, template box, search radius
C=[('tips',(1070,444,1120,482)),('knk',(1140,452,1200,500)),('wrist',(1185,480,1245,540)),
   ('cuff',(1245,525,1305,585)),('mid',(1300,560,1370,630)),('elbow',(1370,610,1440,690)),('upper',(1400,690,1460,780)),('back',(1300,760,1400,830)),('hoodR',(1265,640,1315,710))]
def sub(r,x,y):
    dx=dy=0
    if 0<x<r.shape[1]-1: a,b,c=r[y,x-1],r[y,x],r[y,x+1]; dx=0.5*(a-c)/(a-2*b+c+1e-9)
    if 0<y<r.shape[0]-1: a,b,c=r[y-1,x],r[y,x],r[y+1,x]; dy=0.5*(a-c)/(a-2*b+c+1e-9)
    return x+dx,y+dy
res={}
for n in range(0,152):
    g=cv2.cvtColor(plate_frame(n/25,X0,Y0,X1,Y1,Z),cv2.COLOR_BGR2GRAY)
    row={}
    for name,(x0,y0,x1,y1) in C:
        tp=ref[(y0-Y0)*Z:(y1-Y0)*Z,(x0-X0)*Z:(x1-X0)*Z]
        # search window +-70 px around the rest position
        R=70; sx0=max(0,(x0-R-X0)*Z); sy0=max(0,(y0-R-Y0)*Z); sx1=min(g.shape[1],(x1+R-X0)*Z); sy1=min(g.shape[0],(y1+R-Y0)*Z)
        r=cv2.matchTemplate(g[sy0:sy1,sx0:sx1],tp,cv2.TM_CCOEFF_NORMED); _,mx,_,loc=cv2.minMaxLoc(r)
        x,y=sub(r,*loc)
        row[name]=(round((x+sx0)/Z+X0-x0,1),round((y+sy0)/Z+Y0-y0,1),round(float(mx),2))
    res[n]=row
    print(n, ' '.join(f"{k}={v[0]:+.1f},{v[1]:+.1f}({v[2]:.2f})" for k,v in row.items()), flush=True)
json.dump(res,open('fulltrack.json','w'))
