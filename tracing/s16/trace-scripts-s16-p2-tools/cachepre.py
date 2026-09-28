import sys; sys.path.insert(0,'/Users/computer/rootline/apprentice-film/src/shots/s16/trace')
import tr, numpy as np
from multiprocessing import Pool
def run(f):
    np.save(f'/Users/computer/rootline/apprentice-film/snapshots/s16-p2-pre/p{f}.npy', tr.pre(f).astype(np.float32))
    return f
if __name__=='__main__':
    with Pool(6) as p:
        for f in p.imap_unordered(run, range(1140,1198)): pass
    print('done')
