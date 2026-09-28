import cv2,numpy as np,sys
for d in sys.argv[1:]:
    fr=(670,700,720)
    R=np.mean([cv2.imread(f'{d}/f-{n}.png',0).astype(np.float32) for n in fr],0)
    S=np.mean([cv2.imread(f'/Users/computer/rootline/apprentice-film/snapshots/s06-fix1-src/s-{n}.png',0).astype(np.float32) for n in fr],0)
    e=(R-S)[808:842,300:1860].mean(1); print(d.split('/')[-1][:8],'rows 808..841',' '.join(f'{v:+.0f}' for v in e),' |mean| %.2f'%np.abs(e).mean(), 'MAE1.5 %.2f'%np.abs(cv2.GaussianBlur(R,(0,0),1.5)-cv2.GaussianBlur(S,(0,0),1.5))[800:846,300:1860].mean())
