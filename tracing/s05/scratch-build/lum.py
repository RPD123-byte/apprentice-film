import cv2, sys, glob, re, numpy as np
d = sys.argv[1]
fs = sorted(glob.glob(d+'/frame-*.png'), key=lambda p: float(re.search(r'at-([\d.]+)s', p).group(1)))
def L(p):
    im = cv2.imread(p).astype(np.float32)
    return cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)
REG = {'room_L':(0,0,280,560),'boxes_top':(280,0,1200,200),'screen':(420,250,830,560),'desk_R':(900,420,1300,560),
 'desk_LL':(0,600,420,946),'keyb':(450,640,900,800),'beanie':(1300,0,1900,170),'face':(1270,250,1420,500),
 'owl_head':(1480,240,1660,430),'owl_body':(1540,450,1760,680),'shirt':(1500,700,2000,946),'rhand':(850,620,1100,760),
 'lhand':(580,700,780,850),'right_bg':(1950,300,2206,700)}
print('%-6s %6s %6s %6s | ' % ('t','mR','mS','MAEb') + ' '.join('%9s'%k for k in REG))
for f in fs:
    t = re.search(r'at-([\d.]+)s', f).group(1)
    r = f.replace('frame-','ref-')
    a, b = L(f), L(r)
    ab, bb = cv2.GaussianBlur(a,(0,0),8), cv2.GaussianBlur(b,(0,0),8)
    mae = np.abs(ab-bb).mean()
    cells=[]
    for k,(x0,y0,x1,y1) in REG.items():
        cells.append('%4.0f/%-4.0f'%(a[y0:y1,x0:x1].mean(), b[y0:y1,x0:x1].mean()))
    print('%-6s %6.1f %6.1f %6.1f | '%(t,a.mean(),b.mean(),mae)+' '.join(cells))
