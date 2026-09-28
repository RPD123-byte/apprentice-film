# Value bands inside a hand-drawn figure polygon (minus the owl) of a SOURCE frame -> simplified polygons (coordinates).
#   bands.py KEY T  -> bands_KEY.json {dark:[...], light:[...], mid:[...]}, bands_KEY.jpg
import cv2, numpy as np, sys, json
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
FIG={
 'A':([(-10,946),(20,946),(100,700),(480,470),(560,340),(555,0),(1510,0),(1500,330),(1515,480),(1540,560),(1620,590),(1760,610),(1950,700),(2050,946)],(1680,370,195,255)),
 'B':([(520,946),(560,760),(700,560),(830,480),(820,250),(835,0),(1745,0),(1735,320),(1790,520),(1850,600),(1950,640),(2206,700),(2206,946)],(1950,380,185,280)),
 'C':([(780,946),(1000,730),(1080,690),(1070,520),(1000,300),(1000,100),(1010,0),(1935,0),(1920,330),(1900,500),(1930,700),(2206,720),(2206,946)],(2090,430,170,310)),
 'D':([(560,946),(600,860),(1150,730),(1300,670),(1180,560),(1120,430),(1130,300),(1080,160),(1120,0),(1965,0),(1950,300),(1790,410),(1760,700),(2150,760),(2206,946)],(1935,470,195,300)),
 'E':([(420,946),(480,800),(800,640),(1080,660),(1300,590),(1330,540),(1240,380),(1180,180),(1225,0),(1915,0),(1920,300),(1980,520),(2100,720),(2110,946)],(1655,460,195,265)),
}
key,t=sys.argv[1],float(sys.argv[2]); eps=float(sys.argv[3]) if len(sys.argv)>3 else 4
c=cv2.VideoCapture(V); c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,f=c.read()
g=cv2.GaussianBlur(cv2.cvtColor(f,cv2.COLOR_BGR2GRAY),(0,0),2.5)
poly,(ox,oy,rx,ry)=FIG[key]
fm=np.zeros(g.shape,np.uint8); cv2.fillPoly(fm,[np.int32(poly)],255); cv2.ellipse(fm,(ox,oy),(rx,ry),0,0,360,0,-1)
out={}; vis=(f*0.45).astype(np.uint8)
cols={'dark':(0,0,255),'light':(0,255,255),'mid':(255,160,0)}
for name,(lo,hi,mina) in {'dark':(0,42,600),'light':(168,256,800),'mid':(43,167,1500)}.items():
    m=((g>=lo)&(g<hi)&(fm>0)).astype(np.uint8)*255
    m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((3,3),np.uint8))
    cs,_=cv2.findContours(m,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
    L=[]
    for cn in sorted(cs,key=cv2.contourArea,reverse=True):
        if cv2.contourArea(cn)<mina: continue
        p=cv2.approxPolyDP(cn,eps,True).reshape(-1,2); L.append(p.tolist())
        cv2.polylines(vis,[p.reshape(-1,1,2)],True,cols[name],2)
    out[name]=L; print(key,name,len(L),'polys',sum(len(p) for p in L),'pts')
json.dump(out,open(f'bands_{key}.json','w')); cv2.imwrite(f'bands_{key}.jpg',cv2.resize(vis,(1103,473)),[cv2.IMWRITE_JPEG_QUALITY,80])
