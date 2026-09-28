import sys; sys.path.insert(0,'.')
from flowmesh import *
A, B = 3219, 3223
sB = cv2.imread(f'{WORK}/src/s{B}.png'); sA = cv2.imread(f'{WORK}/src/s{A}.png')
mesh, info = fit(A, B, 0.0003, 0.003)
wm = warp_to(sB, mesh)
mx, my = chain(A, B); wd = cv2.remap(sB, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
m = bgmask(A, 12)
def em(img):
    g = gray(A).astype(np.float32); h = cv2.GaussianBlur(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),2.0)
    return np.clip(np.abs(h-g)*8*m,0,255).astype(np.uint8)
# flow difference (mesh vs dense) magnitude
dmx, dmy = dense(mesh)
dd = np.clip(np.hypot(dmx-mx, dmy-my)*20, 0, 255).astype(np.uint8)
top = np.hstack([cv2.resize(sA,None,fx=.35,fy=.35), cv2.resize(cv2.cvtColor(dd*m,cv2.COLOR_GRAY2BGR),None,fx=.35,fy=.35)])
bot = np.hstack([cv2.resize(cv2.cvtColor(em(wd),cv2.COLOR_GRAY2BGR),None,fx=.35,fy=.35), cv2.resize(cv2.cvtColor(em(wm),cv2.COLOR_GRAY2BGR),None,fx=.35,fy=.35)])
cv2.imwrite(f'{WORK}/fm_err.jpg', np.vstack([top, bot]))
print(np.percentile(np.hypot(dmx-mx, dmy-my)[m>0], [50, 75, 90, 99]))
