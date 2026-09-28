from fr import seq
import numpy as np, sys, cv2
t0,t1=float(sys.argv[1]),float(sys.argv[2])
def run_at(b, start):
    # run of True beginning at/after start (allow up to 3 px gap at start)
    n=len(b); i=start
    while i<n and not b[i] and i<start+6: i+=1
    if i>=n or not b[i]: return None
    j=i
    while j<n and b[j]: j+=1
    return i,j
def robust(xs, ys, deg=1):
    xs=np.array(xs,float); ys=np.array(ys,float)
    p=np.polyfit(xs,ys,deg)
    for _ in range(3):
        r=np.abs(np.polyval(p,xs)-ys); k=r<max(3,np.median(r)*2.5)
        if k.sum()<3: break
        p=np.polyfit(xs[k],ys[k],deg)
    return p, np.abs(np.polyval(p,xs)-ys)
for t,f in seq(t0,t1):
    k=int(round(t*25))
    g=cv2.GaussianBlur(f,(3,3),0).astype(int)
    b=g>190
    Ls=[];Rs=[]
    for y in range(120,351,5):
        row=b[y,150:2000]
        # leftmost long run
        idx=np.where(row)[0]
        # scan runs
        i=0; found=None
        while i<len(row):
            if row[i]:
                j=i
                while j<len(row) and row[j]: j+=1
                if j-i>30: found=(i,j); break
                i=j
            else: i+=1
        if found:
            Rs.append((y,found[1]+150))
            if y>=195: Ls.append((y,found[0]+150))
    if len(Ls)<5: print(f"{t:6.2f} none"); continue
    pl,rl=robust([a for a,_ in Ls],[c for _,c in Ls])
    mx=max(c for _,c in Rs); Rs=[(a,c) for a,c in Rs if c>mx-45 and a<=345]
    if len(Rs)<2: Rs=Rs+[(Rs[0][0]+5,Rs[0][1])]
    pr,rr=robust([a for a,_ in Rs],[c for _,c in Rs])
    xl=np.polyval(pl,270); xr=np.polyval(pr,270)
    Ts=[];Bs=[]
    for x in np.linspace(xl+8, xl+0.65*(xr-xl), 10).astype(int):
        col=b[60:420,x]; idx=np.where(col)[0]
        # first long run
        i=0; found=None
        while i<len(col):
            if col[i]:
                j=i
                while j<len(col) and col[j]: j+=1
                if j-i>40: found=(i,j); break
                i=j
            else: i+=1
        if found: Ts.append((x,found[0]+60)); Bs.append((x,found[1]+60))
    pt,rt=robust([a for a,_ in Ts],[c for _,c in Ts]); pb,rb=robust([a for a,_ in Bs],[c for _,c in Bs])
    def inter(ps, pv):
        y=(pv[0]*ps[1]+pv[1])/(1-pv[0]*ps[0]); return ps[0]*y+ps[1], y
    c=[inter(pl,pt),inter(pr,pt),inter(pr,pb),inter(pl,pb)]
    print(f"{t:6.2f} TL=({c[0][0]:6.1f},{c[0][1]:5.1f}) TR=({c[1][0]:6.1f},{c[1][1]:5.1f}) BR=({c[2][0]:6.1f},{c[2][1]:5.1f}) BL=({c[3][0]:6.1f},{c[3][1]:5.1f}) res L{np.median(rl):.1f} R{np.median(rr):.1f} T{np.median(rt):.1f} B{np.median(rb):.1f} nR={len(Rs)}")
