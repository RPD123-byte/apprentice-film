import sys, json; sys.path.insert(0, '.')
import numpy as np
from strokes import strokes
name = sys.argv[1]
if name == 'F':
    P = np.nan_to_num(np.load('plateF.npy'), nan=0); M = np.load('maskF.npy'); off = (600, -80)
else:
    P = np.load(f'plate{name}.npy'); M = np.load(f'mask{name}.npy'); off = (0, 0)
L = json.load(open(f'out/owl{name}.json'))
S = strokes(P, M, L, offset=off)
json.dump(S, open(f'out/strokes{name}.json', 'w'))
print(name, 'strokes', len(S), 'points', sum(len(s) for s in S))
