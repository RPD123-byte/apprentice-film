import cv2,numpy as np,sys
r=cv2.imread(sys.argv[1]).astype(np.float32); s=cv2.imread(sys.argv[2]).astype(np.float32)
rb=cv2.GaussianBlur(r,(0,0),3); sb=cv2.GaussianBlur(s,(0,0),3)
d=np.abs(rb-sb).mean(2)
print('MAD s3 %.2f'%d.mean(), ' raw MAD %.2f'%np.abs(r-s).mean(2).mean())
regs={'owl':(1480,180,1720,480),'word':(500,300,1640,640),'tag':(550,650,1620,715),'cloudsL':(0,500,900,946),'cloudsR':(1400,500,2206,946),'sky':(450,0,1800,300)}
print(' '.join('%s %.2f'%(k,d[y0:y1,x0:x1].mean()) for k,(x0,y0,x1,y1) in regs.items()))
