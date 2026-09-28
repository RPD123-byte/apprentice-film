# rectify each lit face of every take at its best frame (source), u right, v up; tiles with a uv grid -> rect/sheet-*.jpg
import json,cv2,numpy as np,sys
sys.path.insert(0,'h'); from common import frame
B=json.load(open('facebest.json'))
S=200
tiles=[]
for T,faces in B.items():
    L=[(k,b) for k,b in faces.items() if b['v']>0.35 and b['A']>15000]
    L.sort(key=lambda kb:-kb[1]['A'])
    for k,b in L:
        P=np.array(b['P'],np.float32)          # bl br tr tl
        dst=np.array([[0,S],[S,S],[S,0],[0,0]],np.float32)
        M=cv2.getPerspectiveTransform(P,dst)
        im=cv2.warpPerspective(frame(b['f']),M,(S,S),flags=cv2.INTER_AREA,borderValue=(60,0,60))
        for i in range(1,10):
            c=(0,200,255) if i==5 else (0,120,160)
            x=int(i*S/10); cv2.line(im,(x,0),(x,4),c,1); cv2.line(im,(x,S-5),(x,S),c,1)
            cv2.line(im,(0,x),(4,x),c,1); cv2.line(im,(S-5,x),(S,x),c,1)
        lab=np.zeros((18,S,3),np.uint8); cv2.putText(lab,f'{T}:{k}@{b["f"]}',(2,13),0,0.42,(0,255,255),1)
        tiles.append(np.vstack([lab,im]))
per=24
for s in range(0,len(tiles),per):
    t=tiles[s:s+per]
    while len(t)%6: t.append(np.zeros_like(tiles[0]))
    sh=np.vstack([np.hstack(t[i:i+6]) for i in range(0,len(t),6)])
    cv2.imwrite(f'rect/sheet-{s//per}.jpg',sh,[cv2.IMWRITE_JPEG_QUALITY,90])
print(len(tiles))
