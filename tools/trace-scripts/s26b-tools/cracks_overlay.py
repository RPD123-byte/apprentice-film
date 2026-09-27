import cv2, numpy as np, re, sys
src=open('/Users/computer/rootline/apprentice-film/src/shots/s25/cracks.js').read()
def arr(name):
    m=re.search(name+r'\s*=\s*\[([^\]]*)\]',src,re.S); return np.array([float(v) for v in m.group(1).replace('\n','').split(',') if v.strip()]).reshape(-1,4)
S=arr('CRACKS_STAND')
F=int(sys.argv[1]); a,b,c,d,e,f=[float(v) for v in sys.argv[2:8]]  # x'=a x + b y + c ; y' = d x + e y + f
cap=cv2.VideoCapture('/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'); cap.set(1,F); ok,im=cap.read()
for x0,y0,x1,y1 in S:
    p=(int(a*x0+b*y0+c),int(d*x0+e*y0+f)); q=(int(a*x1+b*y1+c),int(d*x1+e*y1+f))
    cv2.line(im,p,q,(0,0,255),1)
cv2.imwrite(sys.argv[8],im)
print(len(S))
