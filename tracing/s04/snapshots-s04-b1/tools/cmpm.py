# cmpm.py A-metric.txt B-metric.txt : per-frame s6 differences (B - A), listing the biggest changes
import sys,re
def rd(p): return {round(float(l.split()[0])*25):float(l.split()[3]) for l in open(p) if re.match(r'\s*\d',l)}
a,b=rd(sys.argv[1]),rd(sys.argv[2])
d=sorted(((b[k]-a[k],k) for k in a if k in b))
print('worse:',' '.join(f'{k/25:.2f}:{v:+.2f}' for v,k in d[::-1][:12]))
print('better:',' '.join(f'{k/25:.2f}:{v:+.2f}' for v,k in d[:12]))
