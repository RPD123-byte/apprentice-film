from fr import seq
import numpy as np, cv2
C=None; C2=None
for t,f in seq(74.8,79.72):
    k=int(round(t*25))
    if k%3: continue
    C = f.copy() if C is None else np.minimum(C,f)
    if t>77.5:
        C2 = f.copy() if C2 is None else np.minimum(C2,f)
# top margin from later frames (owl elsewhere)
C[:183,:]=C2[:183,:]
np.save('clean.npy',C); cv2.imwrite('clean.png',C)
print('ok')
