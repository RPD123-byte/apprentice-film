#!/bin/sh
# exp.sh NAME FRAMES 'JSON' : render with overrides into snapshots/s06-fix1-x/NAME and print regional metrics
D=/Users/computer/rootline/apprentice-film/snapshots/s06-fix1-x/$1
rm -rf "$D"; node /Users/computer/rootline/apprentice-film/snapshots/s06-fix1-tools/render.mjs "$D" "$2" --x "$3" 2>&1 | grep -v "^frames"
python3 /Users/computer/rootline/apprentice-film/snapshots/s06-fix1-tools/m2.py "$D" "${4:-full,brows,lbrow,rbrow,face}" | tail -1 | sed "s/^/$1 /"
