#!/bin/sh
# usage: run.sh name frame...
cd /Users/computer/rootline/apprentice-film
N=$1; shift
echo "$@" > snapshots/s15-rev2-work/$N-frames.txt
T=$(python3 snapshots/s15-rev2-work/ft.py "$@")
echo "$T" > snapshots/s15-rev2-work/$N-times.txt
start=$(date +%s)
sh tools/compare.sh "$T" snapshots/s15-rev2-$N > snapshots/s15-rev2-work/$N.log 2>&1
echo "elapsed $(( $(date +%s) - start ))" >> snapshots/s15-rev2-work/$N.log
