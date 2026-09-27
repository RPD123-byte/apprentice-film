#!/bin/sh
# retrace_mass.sh SET...: re-trace only the mass part of the sets (ink/light keep their calibration)
cd /Users/computer/rootline/apprentice-film
for s in "$@"; do rm -f snapshots/s06-r2-src/out/$s.mass.json; done
python3 src/shots/s06/trace/build.py "$@" --export
