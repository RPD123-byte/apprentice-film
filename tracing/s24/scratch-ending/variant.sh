#!/bin/bash
# variant.sh SMEAR STREAKS KS OUT
cd /Users/computer/rootline/apprentice-film
sed -i '' "s/^  smear: [0-9]*,/  smear: $1,/; s/^  streaks: [0-9]*,/  streaks: $2,/" src/shots/s24/d/lines.js
node --check src/shots/s24/d/lines.js || exit 1
rm -rf "$4"; (cd snapshots/s24d-h && node shoot.mjs "../../$4" "$3" 2>&1 | grep -i "err" )
echo "== smear $1 streaks $2"; python3 /private/tmp/claude-501/-Users-computer-vibe-check/9d8e3a22-605d-469a-804c-e2a05ae8a7e5/scratchpad/cmp.py "$4" | grep -v pair
