#!/bin/sh
# sweep.sh "sed-regex-with-@V@" "v1 v2 v3" "cmp mask args"  -> renders 117.4 per value and prints dE8
cd /Users/computer/rootline/apprentice-film
H=snapshots/f2r-harness/src/lib/hippie.js
cp $H /tmp/hippie.sweep.bak 2>/dev/null || cp $H snapshots/f2r-tools/.sweep.bak
for V in $2; do
  E=$(echo "$1" | sed "s/@V@/$V/g")
  sed -i '' "$E" $H
  D=snapshots/f2r-sw$(echo $V | tr -d '.,-')
  sh snapshots/f2r-tools/render.sh 117.4 $D >/dev/null
  echo "$V: $(python3 snapshots/f2r-tools/cmp.py $D/frame-00-at-117.4s.png snapshots/f2r-meas/page-graded.png $D/cmp $3 | grep 'sigma  8' )"
done
