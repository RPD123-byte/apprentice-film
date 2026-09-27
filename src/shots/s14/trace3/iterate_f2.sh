#!/bin/sh
# Fix pass 2 fitting driver: iterate_f2.sh STEP [STEP ...]   (renders into snapshots/s14-fix2-dolly / -gapfit)
#   reset  empty the per-layer light (light3.js) and per-face gains (facegain3.js)
#   fit    fresh multi-frame tone fit of every geo3.js face from the source (tone3.py fit)
#   fix    render the dolly, correct the face tones and texture gains against it (tone3.py fix)
#   light  render the dolly, fit the per-layer gain + ramp per frame (light3.py)
#   fg     render the dolly, fold per-face gains per frame (facegain.py)
#   gap    render the gap view's fit frames, fit its per-layer gains (gaplight.py)
#   eval   render the dolly and print the errors
cd /Users/computer/rootline/apprentice-film
T=src/shots/s14/trace3
D=snapshots/s14-fix2-dolly
GD=snapshots/s14-fix2-gapfit
ALL=$(python3 -c "print(','.join(f'{40+0.04*k:.2f}' for k in range(1,17)))")
ALL0=$(python3 -c "print(','.join(f'{40+0.04*k:.2f}' for k in range(17)))")
GT=36.96,37.60,38.20,38.52,38.80,39.08,39.40,39.72,39.84,39.88,39.96
frames() { python3 -c "
import glob,re
fs=sorted(glob.glob('$D/frame-*.png'),key=lambda f:float(re.search(r'at-([\d.]+)s',f).group(1)))
print(','.join(f for f in fs if float(re.search(r'at-([\d.]+)s',f).group(1))>40.01))"; }
ev() { python3 /Users/computer/rootline/apprentice-film/src/shots/s14/trace3/met_f1.py $1; }
for st in "$@"; do
  case $st in
    reset) echo "export const LIGHT = { t: [40.0, 40.64], g: {} };" > src/shots/s14/light3.js
           echo 'export const FG3 = {"t": [], "g": {}};' > src/shots/s14/facegain3.js; echo reset ;;
    fit) python3 $T/tone3.py fit $ALL ;;
    fix) sh tools/compare.sh $ALL $D >/dev/null; python3 $T/tone3.py fix $ALL $(frames) 1 1 | head -1 ;;
    light) sh tools/compare.sh $ALL0 $D >/dev/null; python3 $T/light3.py $D 1 >/dev/null; echo light ;;
    fg) sh tools/compare.sh $ALL0 $D >/dev/null; python3 $T/facegain.py $D 0.8 ;;
    gap) sh tools/compare.sh $GT $GD >/dev/null; python3 $T/gaplight.py $GD 1 | tail -3 ;;
    eval) sh tools/compare.sh $ALL0 $D >/dev/null; ev $D ;;
    evalgap) sh tools/compare.sh $GT $GD >/dev/null; ev $GD ;;
  esac
done
