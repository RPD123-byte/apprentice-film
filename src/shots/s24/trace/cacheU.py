import sys; sys.path.insert(0, '.')
from common import *
from multiprocessing import Pool
def f(k): U(k); return k
if __name__ == '__main__':
    with Pool(8) as p: print(p.map(f, range(int(sys.argv[1]), int(sys.argv[2]))))
