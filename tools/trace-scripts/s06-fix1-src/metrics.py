# metrics.py render.png source.png  -> region means (render/source) + blurred MAE
import cv2, sys, numpy as np
r=cv2.imread(sys.argv[1],0).astype(float); s=cv2.imread(sys.argv[2],0).astype(float)
R={'lidL':(820,300,930,335),'lidR':(1170,290,1290,325),'bagL':(820,360,920,400),'bagR':(1170,350,1290,390),
'foreL':(830,110,960,250),'hairC':(955,95,1090,380),'hairR':(1290,380,1480,720),'hairRup':(1320,150,1450,380),'hairLm':(600,250,760,430),
'nose':(960,420,1135,590),'bridgeL':(960,420,1000,530),'bridgeR':(1080,420,1110,530),'rarm':(1760,560,1960,946),'shOwl':(1560,580,1760,660),'lshTop':(300,520,450,600),
'post':(0,110,90,700),'shelfR':(2000,450,2206,700),'grille1':(1480,0,1800,330),'grille2':(1960,0,2200,230),'fol':(83,255,190,420),
'beanL':(640,60,760,220),'beanR':(1300,60,1420,220),'fist':(540,430,960,760),'laprim':(230,813,1890,840),'owl':(1540,200,1830,600),'mouth':(950,640,1230,740),'browL':(790,175,950,240),'browR':(1110,170,1300,245)}
gr=cv2.GaussianBlur(r,(0,0),5); gs=cv2.GaussianBlur(s,(0,0),5)
out=[]
for k,(x0,y0,x1,y1) in R.items():
    a=r[y0:y1,x0:x1].mean(); b=s[y0:y1,x0:x1].mean(); e=np.abs(gr[y0:y1,x0:x1]-gs[y0:y1,x0:x1]).mean()
    out.append(f"{k:8s} {a:5.0f}/{b:5.0f} d{a-b:+4.0f} mae{e:4.0f}")
for i in range(0,len(out),3): print(' | '.join(out[i:i+3]))
print('whole blurred MAE %.2f'%np.abs(gr-gs).mean(), ' face(740-1360,80-820) %.1f'%np.abs(gr-gs)[80:820,740:1360].mean())
