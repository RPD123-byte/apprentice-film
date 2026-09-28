import cv2,numpy as np
D='/private/tmp/claude-501/-Users-computer-vibe-check/9d8e3a22-605d-469a-804c-e2a05ae8a7e5/scratchpad/e26r1'
H='/Users/computer/rootline/apprentice-film/snapshots/end-s26-rev1-h'
def ld(p):
    im=cv2.imread(p,cv2.IMREAD_GRAYSCALE).astype(np.float32)
    return cv2.GaussianBlur(cv2.resize(im,(1103,473),interpolation=cv2.INTER_AREA),(0,0),1.5)
prev={}
rows=[]
for F in range(2763,2938):
    cur={'new':ld(f'{H}/r{F}.png'),'src':ld(f'{D}/src/{F}.png'),'base':ld(f'{D}/base/{F}.png')}
    if prev:
        d={k:float(np.abs(cur[k]-prev[k]).mean()) for k in cur}
        rows.append((F,d))
    prev=cur
print('F     src    new   base   new/src')
for F,d in rows:
    flag=' <<' if d['new']>1.5*d['src']+1.0 else (' >>(frozen?)' if d['src']>2 and d['new']<0.4*d['src'] else '')
    print(f"{F} {d['src']:6.2f} {d['new']:6.2f} {d['base']:6.2f} {d['new']/(d['src']+1e-3):6.2f}{flag}")
