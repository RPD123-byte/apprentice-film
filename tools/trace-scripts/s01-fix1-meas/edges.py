import sys, cv2, numpy as np
exec(open('/Users/computer/rootline/apprentice-film/snapshots/s01-fix1-meas/camlib.py').read())
t0,t1=float(sys.argv[1]),float(sys.argv[2])
for n in range(int(round(t0*25)),int(round(t1*25))+1):
    g=cv2.cvtColor(plate_frame(n/25,850,150,1290,270,1),cv2.COLOR_BGR2GRAY).astype(float)
    col=cv2.GaussianBlur(g.mean(0).reshape(1,-1),(0,0),3)[0]
    d=np.diff(col)
    pk=[]
    for i in range(3,len(d)-3):
        if abs(d[i])>6 and abs(d[i])==np.abs(d[i-3:i+4]).max(): pk.append((850+i, int(d[i])))
    print(f"{n/25:.2f} mean={col.mean():5.1f}", ' '.join(f"{x}{'+' if v>0 else '-'}{abs(v)}" for x,v in pk))
