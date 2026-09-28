import sys, json, numpy as np
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/end-s26-fix2-tools')
from multiprocessing import Pool
from ftest2 import run
P0 = dict(K=28, wink=True, inkbh=16, inkmax=215, inkq=16, eps=0.7, minarea=5)
V = json.loads(sys.argv[1]); Fs = [int(v) for v in sys.argv[2].split(',')]
def job(a):
    name, F = a; v = V[name]
    Z = v.get('Z', {}); P = dict(P0, **v.get('P', {})); ex = v.get('ex', {})
    r, n = run(F, Z, P, **ex)
    return name, F, r, n
if __name__ == '__main__':
    with Pool(12) as pool: res = pool.map(job, [(n, F) for n in V for F in Fs])
    for n in V:
        rr = [r for nm, F, r, _ in res if nm == n]; nb = np.mean([b for nm, F, _, b in res if nm == n])
        print(f'{n:10s}', ' '.join(f'{k}={np.mean([r[k] for r in rr]):.2f}' for k in rr[0]), f'kB={nb/1024:.0f}')
