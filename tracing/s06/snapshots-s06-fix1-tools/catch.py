import cv2,numpy as np,sys
for d in sys.argv[1:]:
    e=[];e5=[]
    for n in (670,700,720):
        a=cv2.imread(f'{d}/f-{n}.png',0).astype(float); b=cv2.imread(f'/Users/computer/rootline/apprentice-film/snapshots/s06-fix1-src/s-{n}.png',0).astype(float)
        for (x,y) in ((1627,359),(1727,361)):
            e.append(np.abs(cv2.GaussianBlur(a,(0,0),1)-cv2.GaussianBlur(b,(0,0),1))[y-6:y+7,x-6:x+7].mean())
            e5.append(np.abs(a-b)[y-4:y+5,x-4:x+5].mean())
    print(d.split('/')[-1],'catch box MAE s1 %.2f raw %.2f'%(np.mean(e),np.mean(e5)))
