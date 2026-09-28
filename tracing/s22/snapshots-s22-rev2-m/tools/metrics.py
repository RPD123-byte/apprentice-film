import cv2, glob, sys, re, numpy as np
d = sys.argv[1]
fs = sorted(glob.glob(d+'/frame-*.png'), key=lambda p: float(re.search(r'at-([\d.]+)s', p).group(1)))
def reg(name):
    m = np.zeros((946,2206), bool)
    if name=='top': m[0:118, :] = True
    if name=='left': m[140:946, 0:130] = True
    if name=='right': m[140:946, 2040:2206] = True
    if name=='strip': m[190:355, 200:1970] = True
    if name=='page': m[380:946, 150:2018] = True
    return m
R = {k: reg(k) for k in ['top','left','right','strip','page']}
tot=[]
for f in fs:
    t = re.search(r'at-([\d.]+)s', f).group(1)
    r = f.replace('frame-','ref-')
    A = cv2.imread(f).astype(np.float32); B = cv2.imread(r).astype(np.float32)
    a = cv2.GaussianBlur(A.mean(2), (0,0), 3); b = cv2.GaussianBlur(B.mean(2), (0,0), 3)
    e = a-b
    s = f'{t:>7} σ3 {np.abs(e).mean():5.2f} |'
    for k,m in R.items(): s += f' {k} {np.abs(e[m]).mean():5.2f}/{e[m].mean():+5.2f}'
    # colour: G-R in darks
    dk = B.mean(2) < 60
    s += f' | srcG-R {(B[...,1]-B[...,2])[dk].mean():+.1f} renG-R {(A[...,1]-A[...,2])[A.mean(2)<60].mean():+.1f}'
    print(s); tot.append(np.abs(e).mean())
print('mean', np.mean(tot))
