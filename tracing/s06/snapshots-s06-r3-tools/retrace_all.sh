#!/bin/sh
# re-trace every r3 layer of s06 (measurement; ~30 min on 16 cores)
cd /Users/computer/rootline/apprentice-film
L=src/shots/s06/trace3/layers_r3.py
LOG=snapshots/s06-r3-out/retrace.log; : > $LOG
run() { python3 $L "$@" 2>&1 | grep -E "MAE|->" >> $LOG; }
run room & run body & run face & run face --smile & run hair & run beanie & run owl & run owl --src owl_post_pre3.npy --sfx _post --state "post-blink 28.56-29.00" &
wait
run brow mouth & run brow mouth --smile & run hand & run nape & run pencil & run laptop &
for T in 28.04 28.08 28.12 28.16 28.20 28.24 28.28; do run owlhead --src blink_${T}_pre3.npy --sfx _b$T --state "blink frame $T" & done
wait
for T in 28.32 28.36 28.40 28.44 28.48 28.52; do run owlhead --src blink_${T}_pre3.npy --sfx _b$T --state "blink frame $T" & done
python3 src/shots/s06/trace3/mline_fit.py | tail -1 >> $LOG
python3 src/shots/s06/trace3/comb_r3.py | tail -1 >> $LOG
wait
echo DONE >> $LOG
