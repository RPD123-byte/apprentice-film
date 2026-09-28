#!/bin/sh
# toneloop.sh N tag : reset (if tag has 'reset') and run N tone iterations
S=/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad
cd /Users/computer/rootline/apprentice-film
node $S/rec.mjs $S/fills.json
case "$2" in *reset*) python3 - <<'PY'
import re
p='/Users/computer/rootline/apprentice-film/src/shots/s14/tone.js'
s=open(p).read(); i=s.index('export const TONE = '); open(p,'w').write(s[:i]+'export const TONE = {};\n')
PY
;; esac
for i in $(seq 1 $1); do
  sh tools/compare.sh 40.08,40.12,40.16 snapshots/s14-b2-tl >/dev/null 2>&1
  python3 $S/tone.py $S/fills.json snapshots/s14-b2-tl $S/tonel.json | head -1
  python3 $S/toneupd.py $S/tonel.json 0.85
done
