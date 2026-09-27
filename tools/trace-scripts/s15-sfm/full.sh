#!/bin/sh
# render the whole s15 segment (every source frame) in two parallel halves; merged links in snapshots/<name>
cd /Users/computer/rootline/apprentice-film
N="$1"
T1=$(python3 -c "print(','.join(f'{f/25:.2f}' for f in range(1018,1080)))")
T2=$(python3 -c "print(','.join(f'{f/25:.2f}' for f in range(1080,1143)))")
sh tools/compare.sh "$T1" snapshots/$N-a > snapshots/$N-a.log 2>&1 &
sh tools/compare.sh "$T2" snapshots/$N-b > snapshots/$N-b.log 2>&1 &
wait
rm -rf snapshots/$N; mkdir -p snapshots/$N
for f in snapshots/$N-a/*.png snapshots/$N-b/*.png; do ln -sf ../$(basename $(dirname $f))/$(basename $f) snapshots/$N/$(basename $f); done
python3 snapshots/s15-sfm/score.py snapshots/$N | tail -1
