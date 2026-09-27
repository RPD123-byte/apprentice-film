#!/bin/sh
# render take frames, calibrate, re-export: loopB.sh TAKE TIMES OUT
FX=/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/fx
./snap.sh "$2" "$3" >/dev/null
cd $FX && python3 cmp.py "$3" | tail -1 && python3 rcal.py "$1" "$3" && python3 rmeas.py "$1"
