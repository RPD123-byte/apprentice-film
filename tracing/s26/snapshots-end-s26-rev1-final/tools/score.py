import cv2, numpy as np, sys, json
D='/private/tmp/claude-501/-Users-computer-vibe-check/9d8e3a22-605d-469a-804c-e2a05ae8a7e5/scratchpad/e26r1'
H='/Users/computer/rootline/apprentice-film/snapshots/end-s26-rev1-h'
BEATS=[('A',2763,2788),('B',2789,2789),('C',2790,2817),('D',2818,2841),('E',2842,2853),('F1',2854,2887),('F2',2888,2937)]
def lab(im,s):
    f=im.astype(np.float32)/255.
    if s>0: f=cv2.GaussianBlur(f,(0,0),s)
    return cv2.cvtColor(f,cv2.COLOR_BGR2LAB)
res={}
for F in range(2763,2938):
    s=cv2.imread(f'{D}/src/{F}.png'); b=cv2.imread(f'{D}/base/{F}.png'); r=cv2.imread(f'{H}/r{F}.png')
    row={}
    for nm,im in (('new',r),('base',b)):
        for sg in (4,12):
            row[f'{nm}{sg}']=float(np.sqrt(((lab(im,sg)-lab(s,sg))**2).sum(2)).mean())
    res[F]=row
json.dump(res,open(f'{D}/scores.json','w'))
for nm,a,b in BEATS:
    fs=[f for f in range(a,b+1)]
    m=lambda k: np.mean([res[f][k] for f in fs])
    print(f'{nm:3s} {a}-{b}  base s4={m("base4"):.2f} s12={m("base12"):.2f}   new s4={m("new4"):.2f} s12={m("new12"):.2f}')
fs=list(res)
print('ALL base s4=%.2f s12=%.2f new s4=%.2f s12=%.2f'%tuple(np.mean([res[f][k] for f in fs]) for k in ('base4','base12','new4','new12')))
worse=[f for f in fs if res[f]['new4']>res[f]['base4']]
print('frames where new worse than base (s4):',worse)
top=sorted(fs,key=lambda f:-res[f]['new4'])[:12]
print('worst new frames s4:',[(f,round(res[f]['new4'],2)) for f in top])
