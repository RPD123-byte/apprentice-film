from fr import seq
import numpy as np, sys, cv2
t0,t1=float(sys.argv[1]),float(sys.argv[2])
def first_long(row, minlen):
    i=0; n=len(row)
    while i<n:
        if row[i]:
            j=i
            while j<n and row[j]: j+=1
            if j-i>minlen: return (i,j)
            i=j
        else: i+=1
    return None
def robust(xs, ys):
    xs=np.array(xs,float); ys=np.array(ys,float); p=np.polyfit(xs,ys,1)
    for _ in range(3):
        r=np.abs(np.polyval(p,xs)-ys); k=r<max(2.5,np.median(r)*2.5)
        if k.sum()<3: break
        p=np.polyfit(xs[k],ys[k],1)
    return p
res=[]
for t,f in seq(t0,t1):
    g=cv2.GaussianBlur(f,(3,3),0).astype(int); b=g>190
    E={}; Ls=[]
    for y in range(186,356,2):
        fr=first_long(b[y,150:2000],30)
        if fr: E[y]=fr[1]+150; 
        if fr and y>=195: Ls.append((y,fr[0]+150))
    if len(Ls)<5: print(f"{t:6.2f} none"); continue
    pl=robust([a for a,_ in Ls],[c for _,c in Ls])
    xl=np.polyval(pl,270)
    ys=sorted(E)
    # breakpoint: first y where E drops by > 3 px per 2 px row sustained
    ev=np.array([E[y] for y in ys]); yv=np.array(ys)
    d=np.diff(ev)
    brk=len(ev)-1
    for i in range(len(d)-2):
        if d[i]<-3 and d[i+1]<-3 and d[i+2]<-3: brk=i; break
    sel=slice(0,brk+1)
    pr=robust(yv[sel],ev[sel]) if brk>=3 else None
    # top/bottom edges from columns in the left 60%
    xr=np.polyval(pr,250) if pr is not None else xl+100
    Ts=[];Bs=[]
    for x in np.linspace(xl+8, xl+0.6*(xr-xl), 10).astype(int):
        fr=first_long(b[60:420,x],40)
        if fr: Ts.append((x,fr[0]+60)); Bs.append((x,fr[1]+60))
    pt=robust([a for a,_ in Ts],[c for _,c in Ts]); pb=robust([a for a,_ in Bs],[c for _,c in Bs])
    def inter(ps, pv):
        y=(pv[0]*ps[1]+pv[1])/(1-pv[0]*ps[0]); return ps[0]*y+ps[1], y
    if pr is None: print(f"{t:6.2f} no right"); continue
    c=[inter(pl,pt),inter(pr,pt),inter(pr,pb),inter(pl,pb)]
    print(f"{t:6.2f} TL=({c[0][0]:6.1f},{c[0][1]:5.1f}) TR=({c[1][0]:6.1f},{c[1][1]:5.1f}) BR=({c[2][0]:6.1f},{c[2][1]:5.1f}) BL=({c[3][0]:6.1f},{c[3][1]:5.1f}) rightrows {yv[0]}-{yv[brk]}")
