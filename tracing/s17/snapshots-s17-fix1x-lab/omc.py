# omc.py dirA dirB t1,t2..: owl-silhouette σ1.5 error for two render dirs
import sys,cv2,numpy as np; sys.path.insert(0,'.')
from owlm import om
a,b=sys.argv[1],sys.argv[2]; ts=[float(x) for x in sys.argv[3].split(',')]
A=[];B=[]
for t in ts:
    s=cv2.imread(f'{a}/s{t:.2f}.png')
    ea=om(cv2.imread(f'{a}/r{t:.2f}.png'),s,t); eb=om(cv2.imread(f'{b}/r{t:.2f}.png'),s,t); A.append(ea); B.append(eb)
    print(f'{t:.2f} {a} {ea:.2f}  {b} {eb:.2f}')
print('mean %.3f -> %.3f'%(np.mean(A),np.mean(B)))
