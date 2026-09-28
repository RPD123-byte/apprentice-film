import cv2, sys, numpy as np
src=cv2.imread(sys.argv[1],0).astype(float); ren=cv2.imread(sys.argv[2],0).astype(float)
R={'crownL':(20,50,150,230),'crownR':(250,50,370,230),'cuffL':(20,320,200,520),'cuffR':(300,320,430,500),
'hairTop':(0,560,450,700),'hairMid':(250,700,550,946),'flyaway':(450,520,720,620),'cheek':(0,720,80,946),
'slabL':(640,850,900,946),'slabTop':(760,730,930,800),'slabR':(980,880,1400,946),
'roomA':(1560,240,1700,460),'column':(1780,0,1920,400),'plant':(1960,190,2090,400),'synth':(1650,430,1760,660),
'desk':(1850,760,2040,900),'speaker':(2040,380,2206,946),'woofer':(2070,650,2206,900),'roomAll':(1540,0,2060,946)}
def fte(im):  # fine texture energy: mean abs laplacian after tiny blur
    return np.mean(np.abs(cv2.Laplacian(cv2.GaussianBlur(im,(3,3),0),cv2.CV_64F)))
print(f"{'region':9s} {'src_mean':>8s} {'ren_mean':>8s} {'src_p50':>7s} {'ren_p50':>7s} {'src>150':>7s} {'ren>150':>7s} {'src_blk':>7s} {'ren_blk':>7s} {'srcFTE':>6s} {'renFTE':>6s} {'blurMAE':>7s}")
bs=cv2.GaussianBlur(src,(0,0),6); br=cv2.GaussianBlur(ren,(0,0),6)
for k,(x0,y0,x1,y1) in R.items():
    a=src[y0:y1,x0:x1]; b=ren[y0:y1,x0:x1]
    print(f"{k:9s} {a.mean():8.1f} {b.mean():8.1f} {np.median(a):7.0f} {np.median(b):7.0f} {100*(a>150).mean():7.1f} {100*(b>150).mean():7.1f} {100*(a<30).mean():7.1f} {100*(b<30).mean():7.1f} {fte(a):6.1f} {fte(b):6.1f} {np.abs(bs[y0:y1,x0:x1]-br[y0:y1,x0:x1]).mean():7.1f}")
print('whole blurMAE', np.abs(bs-br).mean(), 'means', src.mean(), ren.mean())
