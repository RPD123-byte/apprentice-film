import cv2,numpy as np,sys
R={'cartons':(0,0,900,330),'spkL':(60,330,300,825),'spkM':(1120,190,1330,470),'deskL':(0,560,420,946),'desk lit':(300,760,700,940),'cables':(150,700,700,946),
'keyboard':(420,560,1000,760),'deck front':(560,720,1100,900),'screen':(420,250,820,560),'deskbehind':(1100,480,1450,620),'beanie':(1280,0,1900,260),
'face':(1260,180,1440,520),'owl':(1440,220,1780,660),'Lhand':(640,660,900,860),'Rhand':(880,520,1200,720),'forearmR':(1150,600,1500,760),'arm L':(800,780,1200,946),
'back':(1500,600,2206,946),'right room':(1900,0,2206,700),'rack':(1900,0,2050,700)}
pairs=[(sys.argv[i],sys.argv[i+1]) for i in range(1,len(sys.argv),2)]
ims=[(cv2.GaussianBlur(cv2.imread(a,0).astype(np.float32),(0,0),6),cv2.GaussianBlur(cv2.imread(b,0).astype(np.float32),(0,0),6)) for a,b in pairs]
for k,(x0,y0,x1,y1) in R.items():
  s='%-11s'%k
  for A,B in ims: s+='  mae %5.1f (%+5.1f)'%(np.abs(A[y0:y1,x0:x1]-B[y0:y1,x0:x1]).mean(),(A[y0:y1,x0:x1]-B[y0:y1,x0:x1]).mean())
  print(s)
