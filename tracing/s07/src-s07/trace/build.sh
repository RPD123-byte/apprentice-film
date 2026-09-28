#!/bin/sh
# Rebuild s07's measured data (not part of the film). Usage (from the project root):
#   sh src/shots/s07/trace/build.sh WORK      (WORK = a scratch dir, e.g. snapshots/s07-work)
# prep -> plate trace -> hands trace + flow -> 2 rounds of value correction against the JS render of each layer ->
# per-zone print texture -> src/shots/s07/data/*.js
set -e
W="$1"; T=src/shots/s07/trace; J=$T/harness; OUT=src/shots/s07/data
[ -f "$W/T.npy" ] || python3 $T/prep.py "$W"
python3 $T/plate.py "$W" 1000
python3 $T/hands.py "$W"
python3 $T/tojs.py "$W" $OUT
render_plate() { node $J/dev.mjs $J/h.html "$W/plate_js.png" "mod=/src/shots/s07/trace/harness/plateonly.js&pre=1" > /dev/null; }
render_hands() {   # $1 = base index (0 / 1)
  node $J/dev.mjs $J/h.html "$W/hands_js_full.png" "mod=/src/shots/s07/trace/harness/handsonly.js&pre=1&base=$1" > /dev/null
  python3 -c "import cv2,sys; cv2.imwrite(sys.argv[2], cv2.imread(sys.argv[1])[470:860, 560:1200])" "$W/hands_js_full.png" "$W/hands_js.png"
}
for it in 1 2; do
  render_plate
  python3 $T/correct.py "$W/plate.json" "$W/plate_js.png" "$W/T.npy" 0,0 --excl $T/screen_quad.json
  for B in 0 1; do
    K=layer; TB=Tb; [ $B = 1 ] && K=layer1 && TB=Tb1
    render_hands $B
    python3 $T/layerio.py get "$W" $K
    python3 $T/correct.py "$W/hands_$K.json" "$W/hands_js.png" "$W/$TB.npy" 560,470
    python3 $T/layerio.py put "$W" $K
  done
  python3 $T/tojs.py "$W" $OUT
done
# fine print texture per zone (measured on the corrected render)
render_plate
python3 $T/texture.py "$W/plate.json" "$W/plate_js.png" "$W/T.npy" 0,0 --excl $T/screen_quad.json
for B in 0 1; do
  K=layer; TB=Tb; [ $B = 1 ] && K=layer1 && TB=Tb1
  render_hands $B
  python3 $T/layerio.py get "$W" $K
  python3 $T/texture.py "$W/hands_$K.json" "$W/hands_js.png" "$W/$TB.npy" 560,470
  python3 $T/layerio.py put "$W" $K
done
python3 $T/tojs.py "$W" $OUT
