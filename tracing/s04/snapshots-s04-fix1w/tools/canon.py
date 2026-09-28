# canon.py K T1,T2,.. out.jpg : eye-local (20.56 geometry) views of eye K at those times, 4x, with an eye-px grid
import cv2, numpy as np, json, sys
SP='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/src'
s=open('/Users/computer/rootline/apprentice-film/src/shots/s04/eyetrack.js').read()
T1=json.loads(s[s.index('{',s.index('EYETRACK')):s.rindex('}')+1]); T2=json.load(open('/Users/computer/rootline/apprentice-film/snapshots/s04-fix1w/eyetrack2.json')); TR={**T1,**T2}
BOX={'L':(770,280,950,370),'R':(1150,275,1330,365)}
k=sys.argv[1]; ts=sys.argv[2].split(','); RD=sys.argv[4] if len(sys.argv)>4 else None; x0,y0,x1,y1=BOX[k]; S=4; W=(x1-x0)*S; H=(y1-y0)*S
tiles=[]
for t in ts:
    t=f'{float(t):.2f}'; fi=round(float(t)*25); A=np.array(TR[t][k]['A']).reshape(2,3)
    M=np.array([[A[0,0]/S,A[0,1]/S,A[0,0]*x0+A[0,1]*y0+A[0,2]],[A[1,0]/S,A[1,1]/S,A[1,0]*x0+A[1,1]*y0+A[1,2]]],np.float32)
    img=cv2.imread(f'{SP}/{fi}.png')
    can=cv2.warpAffine(img,M,(W,H),flags=cv2.INTER_CUBIC|cv2.WARP_INVERSE_MAP,borderMode=cv2.BORDER_REPLICATE)
    if RD:
        rimg=cv2.imread(f'{RD}/r-{t}.png'); rc=cv2.warpAffine(rimg,M,(W,H),flags=cv2.INTER_CUBIC|cv2.WARP_INVERSE_MAP,borderMode=cv2.BORDER_REPLICATE)
        can=np.hstack([rc,can])
    for off in ([0, W] if RD else [0]):
        for x in range(x0,x1,5): cv2.line(can,(off+(x-x0)*S,0),(off+(x-x0)*S,H),(0,200,255) if x%50==0 else ((0,120,200) if x%10==0 else (0,60,100)),1)
        for x in range(x0,x1,10): cv2.putText(can,str(x),(off+(x-x0)*S+2,10),0,0.32,(0,255,255),1)
    for y in range(y0,y1,5): cv2.line(can,(0,(y-y0)*S),(can.shape[1],(y-y0)*S),(0,200,255) if y%50==0 else ((0,120,200) if y%10==0 else (0,60,100)),1)
    for y in range(y0,y1,10): cv2.putText(can,str(y),(2,(y-y0)*S-2),0,0.32,(0,255,255),1)
    cv2.putText(can,t+k,(4,H-6),0,0.6,(0,255,0),2); tiles.append(can)
cv2.imwrite(sys.argv[3],np.vstack(tiles))
