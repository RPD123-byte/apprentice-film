#!/bin/sh
# tonei.sh N : N rounds of render (894, 902) -> tone refit (C parts on 894, headF on 902)
cd /Users/computer/rootline/apprentice-film
for i in $(seq 1 $1); do
  snapshots/s13-fix1-tools/quick.sh snapshots/s13-fix1-ti "894,902" | grep -E "^89|^90"
  (cd snapshots/s13-fix1-tools && python3 tonefit.py ../s13-fix1-ti 894 head,body,wing --gain 0.8 | awk '{print $1,$5,$6}' | tr '\n' ' ' && python3 tonefit.py ../s13-fix1-ti 902 headF --gain 0.8 | awk '{print $1,$5,$6}')
done
snapshots/s13-fix1-tools/quick.sh snapshots/s13-fix1-ti "894,902" | grep -E "^89|^90"
