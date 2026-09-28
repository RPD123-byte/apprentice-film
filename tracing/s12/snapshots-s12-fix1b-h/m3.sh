#!/bin/sh
# m3.sh dir regions  -> metrics for the three drawings (34.0/850, 35.24/881, 35.32/883)
D=$1; R=$2
for p in 34.0:850 35.24:881 35.32:883; do t=${p%%:*}; f=${p##*:}; echo "-- $t"; python3 met.py $D/r-$t.png src-$f.png $R; done
