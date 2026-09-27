# Clean figure silhouette + dark regions inside it for a key frame (coordinates only).
#  sil = close(lit | hair polys | beanie polys) within the clip, minus the owl; dark = sil & ~lit (hair tips, shadows)
import cv2, numpy as np, json, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
KEYS={
 'B':(21.64,[[500,946],[560,760],[700,560],[830,480],[830,250],[835,0],[1790,0],[1790,520],[1850,600],[1950,640],[2206,690],[2206,946]],(1950,380,190,285)),
 'C':(22.04,[[760,946],[980,740],[1060,700],[1050,500],[995,300],[995,100],[1005,0],[1960,0],[1950,340],[1905,440],[1930,700],[2206,720],[2206,946]],(2090,440,175,320)),
 'D':(22.48,[[540,946],[545,870],[1100,740],[1240,660],[1150,560],[1105,440],[1115,300],[1075,160],[1110,0],[1995,0],[1975,310],[1780,400],[1740,720],[2206,740],[2206,946]],(1880,560,200,260)),
 'E':(23.04,[[1150,946],[1150,650],[1270,560],[1300,470],[1240,370],[1175,180],[1215,0],[1935,0],[1945,300],[1990,520],[2110,720],[2120,946]],(1665,540,205,250)),
}
out={}
c=cv2.VideoCapture(V)
for k,(t,clip,(ox,oy,rx,ry)) in KEYS.items():
    c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,f=c.read(); g=cv2.GaussianBlur(cv2.cvtColor(f,cv2.COLOR_BGR2GRAY),(0,0),2.5)
    cm=np.zeros(g.shape,np.uint8); cv2.fillPoly(cm,[np.int32(clip)],255)
    owl=np.zeros(g.shape,np.uint8); cv2.ellipse(owl,(ox,oy),(rx,ry),0,0,360,255,-1)
    lit=((g>=45)&(cm>0)&(owl==0)).astype(np.uint8)*255
    lit=cv2.morphologyEx(lit,cv2.MORPH_OPEN,np.ones((5,5),np.uint8))
    # keep only the big lit components (the figure), drop room bits
    n,lab,st,_=cv2.connectedComponentsWithStats(lit)
    keep=np.zeros_like(lit)
    for i in range(1,n):
        if st[i,4]>20000: keep[lab==i]=255
    lit=keep
    sil=cv2.morphologyEx(lit,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(19,19)))
    sil=cv2.bitwise_and(sil,cm)
    # under the owl the shoulder continues: only the lower part of the owl ellipse (below its feet line) is figure
    low=np.zeros_like(owl); low[int(oy+0.62*ry):,:]=255
    sil=cv2.bitwise_or(sil,cv2.bitwise_and(cv2.bitwise_and(owl,low),cm))
    # fill holes
    # fill holes: pad with background so every region touching the frame edge counts as outside
    pad=cv2.copyMakeBorder(sil,1,1,1,1,cv2.BORDER_CONSTANT,value=0); h,w=pad.shape
    ff=pad.copy(); m2=np.zeros((h+2,w+2),np.uint8); cv2.floodFill(ff,m2,(0,0),255); sil=(pad|cv2.bitwise_not(ff))[1:-1,1:-1]
    dark=cv2.bitwise_and(sil,cv2.bitwise_not(lit)); dark=cv2.bitwise_and(dark,cv2.bitwise_not(owl))
    dark=cv2.morphologyEx(dark,cv2.MORPH_OPEN,np.ones((5,5),np.uint8))
    # only dark regions well inside the figure (not background gaps at its edge)
    inner=cv2.erode(sil,np.ones((9,9),np.uint8)); dark=cv2.bitwise_and(dark,inner)
    def polys(m,eps,mina,maxn):
        cs,_=cv2.findContours(m,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE); r=[]
        for cn in sorted(cs,key=cv2.contourArea,reverse=True)[:maxn]:
            if cv2.contourArea(cn)<mina: continue
            r.append(cv2.approxPolyDP(cn,eps,True).reshape(-1,2).tolist())
        return r
    S=polys(sil,3,5000,2); D=polys(dark,3,250,60)
    out[k]={'sil':S,'dark':D}
    vis=(f*0.5).astype(np.uint8)
    for p in S: cv2.polylines(vis,[np.int32(p).reshape(-1,1,2)],True,(0,255,255),2)
    for p in D: cv2.polylines(vis,[np.int32(p).reshape(-1,1,2)],True,(0,0,255),2)
    cv2.imwrite(f'sil_{k}.jpg',cv2.resize(vis,(1103,473)))
    print(k,[len(p) for p in S],len(D),sum(len(p) for p in D))
lines=["// Figure silhouettes (closed lit mask + hair, the owl area filled) and the dark regions inside them (hair, hair tips",
       "// hanging over the shirt, deep shadows), measured on the source key frames — snapshots/s04-study/sil.py. Coordinates only.",
       "export const SIL = {"]
for k,v in out.items():
    fmt=lambda P: "["+",\n      ".join("["+",".join(f"[{x},{y}]" for x,y in p)+"]" for p in P)+"]"
    lines.append(f"  {k}: {{\n    sil: {fmt(v['sil'])},\n    dark: {fmt(v['dark'])},\n  }},")
lines.append("};")
open('/Users/computer/rootline/apprentice-film/src/shots/s04/silhouettes.js','w').write("\n".join(lines)+"\n")
