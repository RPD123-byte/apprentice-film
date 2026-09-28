import sys, numpy as np
sys.argv=[sys.argv[0]]
from run import Lab
L=Lab(); a,_=L.frame(430,False); b,_=L.frame(151,False); c,_=L.frame(430,False); d,_=L.frame(380,False); L.close()
L=Lab(); e,_=L.frame(430,False); f,_=L.frame(380,False); L.close()
print('same session 430 diff', np.abs(a.astype(int)-c).max(), ' fresh session 430 diff', np.abs(a.astype(int)-e).max(), ' 380 diff', np.abs(d.astype(int)-f).max())
