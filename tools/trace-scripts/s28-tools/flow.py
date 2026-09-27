import cv2,numpy as np,sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
t0=float(sys.argv[1]); t1=float(sys.argv[2])
c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t0*25)))
sc=0.5
prev=None
dis=cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
rows=[(0,150),(150,350),(350,550),(550,750),(750,946)]
cols=list(range(0,2206,276))
for i in range(int(round((t1-t0)*25))+1):
    ok,f=c.read(); g=cv2.cvtColor(cv2.resize(f,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA),cv2.COLOR_BGR2GRAY)
    if prev is not None:
        fl=dis.calc(prev,g,None)/sc
        line=f"{t0+i/25:.2f} "
        for (y0,y1) in rows:
            vals=[]
            for x0 in cols:
                blk=fl[int(y0*sc):int(y1*sc),int(x0*sc):int((x0+276)*sc),0]
                vals.append(np.median(blk))
            line+="|"+" ".join(f"{v:5.1f}" for v in vals)
        print(line)
    prev=g
