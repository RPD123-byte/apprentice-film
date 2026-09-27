import numpy as np, cv2, sys
S=cv2.imread('/Users/computer/rootline/apprentice-film/snapshots/s08-f3-src/f764.png').astype(np.float32); R=cv2.imread(sys.argv[1]).astype(np.float32)
m=np.zeros(S.shape[:2],bool); m[474:502,0:1372]=True; m[480:946,1366:1392]=True
for s in [0,1.5]:
    a=cv2.GaussianBlur(R,(0,0),s) if s else R; b=cv2.GaussianBlur(S,(0,0),s) if s else S
    print('sigma',s,'line MAE %.2f'%np.abs(a-b).mean(-1)[m].mean(), end='  ')
print()
