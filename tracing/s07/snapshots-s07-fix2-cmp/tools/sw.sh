#!/bin/sh
# sw.sh NAME "query" [frames] : render frames into snapshots/s07-fix2-sw/NAME with the query overrides (retries once)
cd /Users/computer/rootline/apprentice-film
F="${3:-727,745,755}"
for k in 1 2; do
rm -rf snapshots/s07-fix2-sw/$1
node snapshots/s07-fix2-cmp/tools/multi.mjs snapshots/s07-fix2-sw/$1 "$F" "$2" 2>&1 | grep -v "^rendered\|retry load" | grep -iv "willReadFrequently\|readback" | head -5
ls snapshots/s07-fix2-sw/$1/*.png >/dev/null 2>&1 && break
done
