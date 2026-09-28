import cv2,numpy as np,sys
d=sys.argv[1]
for n in [int(x) for x in sys.argv[2].split(',')]:
    a=cv2.imread(f'{d}/f-{n}.png',0).astype(float); b=cv2.imread(f'/Users/computer/rootline/apprentice-film/snapshots/s06-fix1-src/s-{n}.png',0).astype(float)
    e=(a-b)[185:228,828:872]
    a5=cv2.GaussianBlur(a,(0,0),5); b5=cv2.GaussianBlur(b,(0,0),5); a1=cv2.GaussianBlur(a,(0,0),1.5); b1=cv2.GaussianBlur(b,(0,0),1.5)
    print(n,'darker>60',int((e<-60).sum()),'lighter>40',int((e>40).sum()),'lbrow s5 %.2f s1.5 %.2f'%(np.abs(a5-b5)[170:300,750:1060].mean(),np.abs(a1-b1)[170:300,750:1060].mean()), 'box s1.5 %.2f'%np.abs(a1-b1)[180:232,820:880].mean())
