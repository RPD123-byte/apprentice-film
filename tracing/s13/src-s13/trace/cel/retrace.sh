#!/bin/bash
# re-run every cel trace (../cel.py) and regenerate ../../celHP.js
# WORK: a scratch dir holding the reference drawings (Cref = median of 891-898, Dref = mean of 901-902, Aref = mean of
# 884-885, Bref = mean of 886-887) and the silhouettes as JSON (silC.json, silD.json, feetC.json); frame 912 = pose E.
SPEC="$(cd "$(dirname "$0")" && pwd)"; cd "${WORK:?set WORK}"
T=/Users/computer/rootline/apprentice-film/src/shots/s13/trace; S=/Users/computer/rootline/apprentice-film/snapshots/s13-rev1-p3-src
J=()
while read ref spec out; do
  [ -z "$ref" ] && continue
  [ "$ref" = "E" ] && ref=$S/f912.png
  python3 $T/cel.py $ref $SPEC/$spec $out | tail -1; J+=($out)
done <<LIST
Cref.png specC.json celC.json
Dref.png specD.json celD.json
E specE.json celE.json
Cref.png specBC.json celBC.json
Dref.png specBD.json celBD.json
E specBE.json celBE.json
Cref.png specWR.json celWR.json
$(cat $SPEC/extra.list)
LIST
python3 $T/cel2js.py /Users/computer/rootline/apprentice-film/src/shots/s13/celHP.js CELHP "${J[@]}"
