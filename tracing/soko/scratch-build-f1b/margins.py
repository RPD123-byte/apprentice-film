import cv2, numpy as np, sys
a=cv2.imread(sys.argv[1],0).astype(float); b=cv2.imread(sys.argv[2],0).astype(float)
regs={'top-mid y20-100':(800,20,1400,100),'top-left':(0,0,140,120),'top-right':(2030,0,2206,120),'left-mid':(10,400,130,600),'right-mid':(2040,400,2200,600),'left-low':(10,750,130,930),'right-low':(2040,750,2200,930),'band y100-125':(600,100,1600,125),'left x100-140':(100,300,140,800),'right x2030-2080':(2030,300,2080,800),'below y885-940':(600,885,1600,940)}
for k,(x0,y0,x1,y1) in regs.items():
    print('%-20s render %5.1f ref %5.1f'%(k,a[y0:y1,x0:x1].mean(),b[y0:y1,x0:x1].mean()))
