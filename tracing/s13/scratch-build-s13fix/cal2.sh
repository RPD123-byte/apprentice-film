#!/bin/bash
# two calibration rounds: render the 5 calibration frames, calibrate (ITER), rebuild
SP=$(cd "$(dirname "$0")" && pwd); A=/Users/computer/rootline/apprentice-film
cd $SP && python3 $A/src/shots/s13/trace/cel2js.py $A/src/shots/s13/celHP.js CELHP celC_cal.json celD_cal.json celE_cal.json celBC_cal.json celBD_cal.json celBE_cal.json celWR_cal.json celSD_cal.json celSE_cal.json celTC_cal.json celFC_cal.json celBgC_cal.json celBgD_cal.json celBgE_cal.json celEyE_cal.json celNub_cal.json celCr_cal.json celOvA_cal.json celOvB_cal.json celEyC_cal.json celEyD_cal.json
for r in 1 2; do
  cd $A; T=$(python3 $SP/times.py 884,886,895,901,912); rm -rf snapshots/s13-fix1p3-cal; sh tools/compare.sh $T snapshots/s13-fix1p3-cal
  cd $SP; ITER=1 ./calib.sh $A/snapshots/s13-fix1p3-cal 2>&1 | grep -E "^hpC|mesh"
done
echo CALDONE
