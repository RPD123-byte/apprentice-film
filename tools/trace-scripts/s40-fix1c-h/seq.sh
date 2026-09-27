#!/bin/sh
# seq.sh outdir t0 n step  -> renders n frames with the harness (no pipes into head!)
rm -rf "$1"; node run.mjs "$1" $(python3 -c "print(','.join(f'{$2+i*$4:.3f}' for i in range($3)))") > "$1.log" 2>&1; tail -1 "$1.log"
