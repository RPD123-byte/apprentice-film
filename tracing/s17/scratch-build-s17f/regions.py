import cv2,numpy as np,sys
S='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s17f/'
a=cv2.imread(sys.argv[1],0).astype(float)
n=int(sys.argv[2]) if len(sys.argv)>2 else 1250
b=cv2.imread(S+'src/f%04d.png'%n,0).astype(float)
regs={'shirtL':(940,400,1000,445),'shirtC':(1030,420,1080,445),'shirtR':(1140,400,1200,445),'shirtLow':(1120,450,1230,515),'face':(1030,300,1110,370),'faceSideL':(1018,290,1035,345),'faceSideR':(1105,290,1128,345),'eyesL':(1020,278,1054,294),'eyesR':(1086,278,1122,294),'forehead':(1030,245,1110,275),'beanie':(1010,170,1130,240),'cuff':(1000,205,1140,245),'hairL':(995,260,1020,340),'hairR':(1125,260,1150,340),'neck':(1050,370,1095,400),'cupL':(1005,365,1057,437),'cupR':(1097,360,1140,430),'pantsL':(930,560,1050,740),'pantsR':(1140,560,1280,740),'hemL':(930,740,1060,790),'shoeL':(905,790,1060,875),'shoeR':(1110,790,1260,875),'chair':(1045,645,1140,670),'deskTop':(830,523,900,543),'deskTop2':(1300,523,1500,543),'books_owl':(560,440,660,505),'speakerL':(525,510,630,700),'crateBooks':(640,628,760,700),'mug':(820,475,866,520),'lampShade':(1325,285,1420,380),'radio':(1353,459,1486,522),'pencilcup':(1296,453,1331,500),'rack':(680,450,710,640)}
ba=cv2.GaussianBlur(a,(0,0),6); bb=cv2.GaussianBlur(b,(0,0),6)
print('full blurMAE %.2f'%np.abs(ba-bb).mean())
print('%-11s %6s %6s %6s'%('region','ren','src','bMAE'))
for k,(x0,y0,x1,y1) in regs.items():
    A=a[y0:y1,x0:x1]; B=b[y0:y1,x0:x1]
    print('%-11s %6.1f %6.1f %6.1f   sd %5.1f %5.1f'%(k,A.mean(),B.mean(),np.abs(ba[y0:y1,x0:x1]-bb[y0:y1,x0:x1]).mean(),A.std(),B.std()))
