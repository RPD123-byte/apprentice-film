#!/bin/bash
# re-run every cel trace and regenerate the data module
cd "$(dirname "$0")"
T=/Users/computer/rootline/apprentice-film/src/shots/s13/trace; S=/Users/computer/rootline/apprentice-film/snapshots/s13-rev1-p3-src
J=()
while read ref spec out; do
  [ -z "$ref" ] && continue
  [ "$ref" = "E" ] && ref=$S/f912.png
  python3 $T/cel.py $ref $spec $out | tail -1; J+=($out)
done <<LIST
Cref.png specC.json celC.json
Dref.png specD.json celD.json
E specE.json celE.json
Cref.png specBC.json celBC.json
Dref.png specBD.json celBD.json
E specBE.json celBE.json
Cref.png specWR.json celWR.json
$(cat extra.list 2>/dev/null)
LIST
python3 $T/cel2js.py /Users/computer/rootline/apprentice-film/src/shots/s13/celHP.js CELHP "${J[@]}"
