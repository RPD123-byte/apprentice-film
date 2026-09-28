#!/bin/sh
# iter.sh N : N rounds of render (894, 902, 912) -> caltone -> print metrics
cd /Users/computer/rootline/apprentice-film
for i in $(seq 1 $1); do
  snapshots/s13-fix1-tools/quick.sh snapshots/s13-fix1-it "894,902,912" | grep -E "^89|^90|^91"
  (cd snapshots/s13-fix1-tools && python3 caltone.py ../s13-fix1-it 894 head,body,wing,tail && python3 caltone.py ../s13-fix1-it 902 headF && python3 caltone.py ../s13-fix1-it 912 headE)
done
snapshots/s13-fix1-tools/quick.sh snapshots/s13-fix1-it "894,902,912" | grep -E "^89|^90|^91"
