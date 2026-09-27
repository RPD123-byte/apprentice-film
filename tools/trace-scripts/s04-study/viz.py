import cv2, numpy as np, json, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
d=json.load(open(sys.argv[1])); T=np.array(d['tracks']); al=np.array(d['alive'])
c=cv2.VideoCapture(V)
outs=[]
for k in [int(x) for x in sys.argv[3].split(',')]:
    c.set(cv2.CAP_PROP_POS_FRAMES,int(round(d['t0']*25))+k); ok,f=c.read()
    for j in np.where(al)[0]:
        p=T[k,j]; cv2.circle(f,(int(p[0]),int(p[1])),6,(0,0,255),-1); cv2.putText(f,str(j),(int(p[0])+6,int(p[1])),0,0.6,(0,255,255),2)
    outs.append(cv2.resize(f,(1103,473)))
while len(outs)%2: outs.append(np.zeros_like(outs[0]))
rows=[np.hstack(outs[i:i+2]) for i in range(0,len(outs),2)]
cv2.imwrite(sys.argv[2],np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,85])
