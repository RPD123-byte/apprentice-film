# rectify each lit face of every take at its best frame (source), u right, v up; tiles with a uv grid -> rect/dark-*.jpg
import json,cv2,numpy as np,sys
sys.path.insert(0,'h'); from common import frame
B=json.load(open('facebest.json'))
S=300
tiles=[]
for T,faces in B.items():
    L=[(k,b) for k,b in faces.items() if b['v']<=0.35 and b['A']>20000]
    L.sort(key=lambda kb:-kb[1]['A'])
    for k,b in L:
        P=np.array(b['P'],np.float32)          # bl br tr tl
        dst=np.array([[0,S],[S,S],[S,0],[0,0]],np.float32)
        M=cv2.getPerspectiveTransform(P,dst)
        im=cv2.warpPerspective(frame(b['f']),M,(S,S),flags=cv2.INTER_AREA,borderValue=(60,0,60))
        ov=im.copy()
        for i in range(1,10):
            c=(0,200,255) if i==5 else (0,140,200)
            x=int(i*S/10); cv2.line(ov,(x,0),(x,S),c,1); cv2.line(ov,(0,x),(S,x),c,1)
        im=cv2.addWeighted(im,0.75,ov,0.25,0)
        lab=np.zeros((18,S,3),np.uint8); cv2.putText(lab,f'{T}:{k}@{b["f"]}',(2,13),0,0.42,(0,255,255),1)
        tiles.append(np.vstack([lab,im]))
per=12
for s in range(0,len(tiles),per):
    t=tiles[s:s+per]
    while len(t)%4: t.append(np.zeros_like(tiles[0]))
    sh=np.vstack([np.hstack(t[i:i+4]) for i in range(0,len(t),4)])
    cv2.imwrite(f'rect/dark-{s//per}.jpg',sh,[cv2.IMWRITE_JPEG_QUALITY,90])
print(len(tiles))
