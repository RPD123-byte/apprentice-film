# Vertical (or horizontal with --h) class runs at several stations: vscan.py y0 y1 x x x ... [--h] [--min 3]
import sys, numpy as np
idx = np.load('/Users/computer/rootline/apprentice-film/snapshots/f2r-meas/classidx.npy')
keys = ['cream', 'gold', 'orange', 'magenta', 'indigo', 'sky', 'ink', 'pinkL', 'lav', 'green', 'white', 'skin', 'brown', 'blue', 'teal', 'grey', 'yellow', 'peach', 'jacket']
short = dict(zip(keys, 'CYOPV._klgWsbBtrypj'))
a = [v for v in sys.argv[1:] if not v.startswith('--')]
H = '--h' in sys.argv; mn = 3
if '--min' in sys.argv: mn = int(sys.argv[sys.argv.index('--min') + 1]); a = [v for v in a if v != str(mn)]
y0, y1 = int(a[0]), int(a[1])
for s in a[2:]:
    s = int(s)
    col = idx[y0:y1, s] if not H else idx[s, y0:y1]
    seq = ''.join(short[keys[i]] for i in col)
    out = []; j = 0
    while j < len(seq):
        k = j
        while k < len(seq) and seq[k] == seq[j]: k += 1
        if k - j >= mn: out.append(f"{seq[j]}{y0+j}-{y0+k-1}")
        j = k
    print(s, ' '.join(out))
