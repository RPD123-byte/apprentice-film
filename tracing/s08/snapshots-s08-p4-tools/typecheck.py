# per-letter ink in the text box, source vs render, in F0 coords (letters at 15.5 card units ~ 15.43 F0 px)
import cv2,numpy as np,sys
sys.path.insert(0,'snapshots/s08-p4-tools')
from cam import f0
rd=sys.argv[1]
# text starts at card x 82.75 -> F0: card left 1451.3 + 82.75*0.9958
x0=1451.3+82.75*0.9958; adv=15.5*0.9958; ytop=183.7+185*0.9958; ybot=183.7+214*0.9958
def ink(im,k):
    g=cv2.cvtColor(f0(im,k),cv2.COLOR_BGR2GRAY).astype(np.float32)
    out=[]
    for i in range(19):
        a=int(x0+i*adv); b=int(x0+(i+1)*adv)
        c=g[int(ytop):int(ybot),a:b]
        out.append(np.clip(200-c,0,None).mean())
    return np.array(out)
for k in range(764,815):
    s=ink(cv2.imread(f'snapshots/s08-p4-src/f{k}.png'),k); r=ink(cv2.imread(f'{rd}/r{k}.png'),k)
    ns=int((s>12).sum()); nr=int((r>12).sum())
    print(k, f'{(k-764)*0.04+30.56:.2f}', 'src', ''.join('#' if v>12 else ('+' if v>5 else '.') for v in s), 'ren', ''.join('#' if v>12 else ('+' if v>5 else '.') for v in r), ns, nr, 'OK' if ns==nr else '<<')
