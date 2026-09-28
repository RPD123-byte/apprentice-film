import sys, math
fr = [int(x) for x in sys.argv[1].split(',')]
ts = []
for fi in fr:
    k = math.ceil(fi*1.2 - 1e-9)
    assert math.floor(k/30*25+1e-3) == fi, fi
    ts.append(f'{k/30+0.001:.4f}')
print(','.join(ts))
