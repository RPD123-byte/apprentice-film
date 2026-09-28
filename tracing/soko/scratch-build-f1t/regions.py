import cv2, numpy as np, sys
a=cv2.imread(sys.argv[1],0).astype(float); b=cv2.imread(sys.argv[2],0).astype(float)
regs={'backL':(100,150,330,300),'litcarton':(219,300,320,400),'cartonC1':(72,660,170,750),'cartonC2':(80,760,230,860),
'stackR S1':(1590,290,1720,330),'stackR S3':(1590,450,1720,550),'T2':(1935,390,2080,550),'desk':(780,523,1500,543),
'pantsL':(940,580,1050,740),'pantsR':(1160,580,1270,740),'torso':(930,380,1240,445),'face':(1030,300,1110,360),
'beanie':(1010,170,1130,240),'spkL side':(635,515,700,605),'spkL front':(525,510,630,700),'amp':(440,740,560,840),
'crate':(640,715,750,800),'synthKeys':(1705,510,1750,740),'rackFrame':(1800,510,1990,650),'backpack':(2030,620,2170,840),
'mags':(1900,760,2090,850),'Rcarton':(1780,655,1858,835),'floor':(300,880,1900,940),'speakerR':(1500,570,1610,780),
'bench':(1340,700,1520,770),'keyboardL':(170,555,420,600),'guitarcase':(20,400,140,640),'plantL':(400,310,560,470),
'plantR':(1990,200,2180,340),'lamp':(1320,280,1430,390),'wallglow':(1280,350,1400,440),'receiver':(1350,430,1490,525),
'booksL':(525,440,670,506),'booksC':(630,610,770,700),'module':(380,472,508,560),'shoes':(900,770,1260,880),
'upperLeftBoxes':(15,240,220,420),'rightBackTall':(1820,120,1950,420),'headphonesTop':(1620,200,1740,260)}
out=[]
for k,(x0,y0,x1,y1) in regs.items():
    ra,rb=a[y0:y1,x0:x1].mean(),b[y0:y1,x0:x1].mean()
    out.append((ra/max(1,rb),k,ra,rb))
for r,k,ra,rb in sorted(out):
    print('%-16s render %5.1f  ref %5.1f  ratio %.2f'%(k,ra,rb,r))
