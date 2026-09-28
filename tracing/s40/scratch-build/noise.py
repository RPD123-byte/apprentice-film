import cv2, numpy as np, sys, glob
d,t=sys.argv[1],sys.argv[2]
fr=glob.glob(f'{d}/frame-*-at-{t}s.png')[0]; rf=glob.glob(f'{d}/ref-*-at-{t}s.png')[0]
def bands(img,box):
    x0,y0,x1,y1=box
    g=cv2.cvtColor(img,cv2.COLOR_BGR2GRAY).astype(np.float32)
    b1=cv2.GaussianBlur(g,(0,0),1.2); b4=cv2.GaussianBlur(g,(0,0),4); b15=cv2.GaussianBlur(g,(0,0),15)
    s=lambda a:a[y0:y1,x0:x1].std()
    return s(g-b1), s(b1-b4), s(b4-b15)
regions={'bg top':(1000,60,1300,200),'bg low':(650,720,950,790),'bg mid':(200,300,420,420) ,'cloud':(40,840,220,930),'cloudR':(1900,860,2150,940),'face':(990,400,1080,480),'ribbon cream':(228,40,262,120)}
A=cv2.imread(fr); B=cv2.imread(rf)
print('%-13s  %-20s %-20s'%('region','render fine/mid/coarse','source fine/mid/coarse'))
for k,box in regions.items():
    ra=bands(A,box); rb=bands(B,box)
    print('%-13s  %5.2f %5.2f %5.2f      %5.2f %5.2f %5.2f'%(k,*ra,*rb))
