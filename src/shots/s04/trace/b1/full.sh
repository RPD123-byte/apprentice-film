#!/bin/sh
# full.sh OUTDIR : render all 100 frames of s04 in the harness and measure them against the source
cd /Users/computer/rootline/apprentice-film
T=$(python3 -c "print(','.join(f'{(478+i)/25:.2f}' for i in range(100)))")
node snapshots/s04-b1/dev/dev.mjs $1 $T ${MOD:-s04.js} > $1.log 2>&1
python3 snapshots/s04-b1/tools/metric.py $1 --save > $1-metric.txt
python3 - $1 <<'PY'
import sys,re,numpy as np
rows=[l.split() for l in open(sys.argv[1]+'-metric.txt') if re.match(r'\s*\d',l)]
v={round(float(r[0])*25):(float(r[3]),float(r[5])) for r in rows}
for n,(a,b) in {'landing':(478,502),'hold':(503,520),'swing':(521,552),'arc':(553,577),'ALL':(478,577)}.items():
    s=[v[k] for k in v if a<=k<=b]; print(f"{n:8s} s6 {np.mean([x[0] for x in s]):.2f} (max {max(x[0] for x in s):.2f})  s2 {np.mean([x[1] for x in s]):.2f}")
PY
grep -h "ms$" $1.log | awk '{gsub("ms","",$2); s+=$2; n++; if($2>m)m=$2} END {print "draw ms mean", s/n, "max", m}'
