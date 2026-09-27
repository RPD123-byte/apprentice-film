import sys, cv2, numpy as np
exec(open('/Users/computer/rootline/apprentice-film/snapshots/s01-fix1-meas/camlib.py').read())
# usage: valmap.py T [imgpath]   prints 50px block means (0-255 -> 0..9 plus hex-ish) in plate coords
t=float(sys.argv[1])
if len(sys.argv)>2:
    img=cv2.imread(sys.argv[2]); g=cv2.cvtColor(img,cv2.COLOR_BGR2GRAY).astype(float)
    if len(sys.argv)>3: # render frame at same time: undo camera too
        g=cv2.cvtColor(plate_frame(t,0,0,2206,946,1,img=img),cv2.COLOR_BGR2GRAY).astype(float)
else:
    g=cv2.cvtColor(plate_frame(t,0,0,2206,946,1),cv2.COLOR_BGR2GRAY).astype(float)
B=50
print('     '+''.join(f"{x//100:<2d}" if x%100==0 else '  ' for x in range(0,2200,B)))
for y in range(0,946,B):
    row=[g[y:y+B,x:x+B].mean() for x in range(0,2200,B)]
    print(f"{y:4d} "+''.join(f"{min(99,int(v/2.56)):02d}"[0:2] if False else ' '+'0123456789ABCDEF'[min(15,int(v/16))] for v in row))
