#!/bin/sh
# hsw.sh NAME "query" : hands sweep on 7 frames
cd /Users/computer/rootline/apprentice-film
snapshots/s07-fix2-cmp/tools/sw.sh $1 "$2" 727,731,738,745,751,757,763
python3 snapshots/s07-fix2-cmp/tools/handerr.py snapshots/s07-fix2-sw/$1 727 731 738 745 751 757 763
