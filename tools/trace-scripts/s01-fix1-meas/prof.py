import cv2, numpy as np, sys
exec(open(__file__.replace('prof.py','camlib.py')).read())
y0,y1=int(sys.argv[3]) if len(sys.argv)>3 else 90, int(sys.argv[4]) if len(sys.argv)>4 else 270
t0,t1=float(sys.argv[1]),float(sys.argv[2])
for n in range(int(round(t0*25)),int(round(t1*25))+1):
    t=n/25; g=plate_frame(t, 850,60,1290,280, 1)
    col=cv2.cvtColor(g,cv2.COLOR_BGR2GRAY)[y0-60:y1-60].mean(0)
    # 44 bins of 10 px
    b=col[:440].reshape(44,10).mean(1)
    s=''.join(' .:-=+*#%@'[min(9,int(v/26))] for v in b)
    print(f"{t:.2f} |{s}|")
