import cv2, numpy as np, re, sys, glob, math
d=sys.argv[1]; times=[float(x) for x in sys.argv[2].split(',')]; out=sys.argv[3]
BK={}
for l in open('/Users/computer/rootline/apprentice-film/src/shots/s14/back.js'):
    for m in re.finditer(r'\[(\d\d\.\d\d), ([\d.]+), (\d+), ([\d.]+),', l): BK[round(float(m.group(1)),2)]=(float(m.group(2)),int(m.group(3)),float(m.group(4)))
rows=[]
for t in times:
    k=round(math.ceil(t*25-1e-6)/25,2); hx,top,s=BK[k]
    fp=[p for p in glob.glob(d+'/frame-*.png') if abs(float(p.split('-at-')[1][:-5])-t)<1e-3][0]
    pair=[]
    for f in [fp, fp.replace('frame-','ref-')]:
        im=cv2.imread(f)
        M=np.float32([[s/1.5,0,hx-240*s],[0,s/1.5,top-40*s]])
        u=cv2.warpAffine(im,M,(720,540),flags=cv2.WARP_INVERSE_MAP|cv2.INTER_CUBIC)
        for x in range(-240,241,20):
            X=int((x+240)*1.5); cv2.line(u,(X,0),(X,540),(0,0,255) if x%100==0 else (0,110,190),1)
        for y in range(-40,321,20):
            Y=int((y+40)*1.5); cv2.line(u,(0,Y),(720,Y),(0,0,255) if y%100==0 else (0,110,190),1)
        cv2.putText(u,str(t),(640,20),0,0.6,(0,255,0),2)
        pair.append(u)
    rows.append(np.hstack([pair[0],np.full((540,6,3),(255,255,255),np.uint8),pair[1]]))
cv2.imwrite(out,np.vstack(rows))
