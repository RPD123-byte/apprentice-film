#!/bin/bash
# calibrate every cel trace against one render (frames: A 884, B 886, C 895, D 901, E 912) -> *_cal.json, then rebuild
# (run from a WORK dir holding the traces cel*.json from retrace.sh and the reference drawings; ITER=1 re-uses *_cal.json)
cd "${WORK:?set WORK}"; R=${1:?render dir}; K=/Users/computer/rootline/apprentice-film/src/shots/s13/trace/calib.py
S=/Users/computer/rootline/apprentice-film/snapshots/s13-rev1-p3-src
inp() { if [ -n "$ITER" ] && [ -f $1_cal.json ]; then echo $1_cal.json; else echo $1.json; fi; }
f() { ls $R/frame-*-at-$1*.png | head -1; }
FA=$(f 35.368); FB=$(f 35.468); FC=$(f 35.801); FD=$(f 36.068); FE=$(f 36.501)
EYC="ex=964,332,56,79 ex=1177,323,85,85"; EYD="ex=1109,342,76,79 ex=1336,319,67,75"
python3 $K $(inp celC) $FC Cref.png celC_cal.json
python3 $K $(inp celBC) $FC Cref.png celBC_cal.json
python3 $K $(inp celBgC) $FC Cref.png celBgC_cal.json
python3 $K $(inp celWR) $FC Cref.png celWR_cal.json celC.json
python3 $K $(inp celCr) $FC Cref.png celCr_cal.json celC.json celBgC.json
python3 $K $(inp celNub) $FC Cref.png celNub_cal.json $EYC
python3 $K $(inp celTC) $FC Cref.png celTC_cal.json
python3 $K $(inp celFC) $FC Cref.png celFC_cal.json
python3 $K $(inp celD) $FD Dref.png celD_cal.json
python3 $K $(inp celBD) $FD Dref.png celBD_cal.json
python3 $K $(inp celBgD) $FD Dref.png celBgD_cal.json
python3 $K $(inp celSD) $FD Dref.png celSD_cal.json celD.json
python3 $K $(inp celE) $FE $S/f912.png celE_cal.json
python3 $K $(inp celBE) $FE $S/f912.png celBE_cal.json
python3 $K $(inp celBgE) $FE $S/f912.png celBgE_cal.json
python3 $K $(inp celEyE) $FE $S/f912.png celEyE_cal.json
python3 $K $(inp celSE) $FE $S/f912.png celSE_cal.json celE.json
python3 $K $(inp celOvA) $FA Aref.png celOvA_cal.json
python3 $K $(inp celOvB) $FB Bref.png celOvB_cal.json
python3 $K $(inp celEyC) $FC Cref.png celEyC_cal.json
python3 $K $(inp celEyD) $FD Dref.png celEyD_cal.json
python3 /Users/computer/rootline/apprentice-film/src/shots/s13/trace/cel2js.py /Users/computer/rootline/apprentice-film/src/shots/s13/celHP.js CELHP \
  celC_cal.json celD_cal.json celE_cal.json celBC_cal.json celBD_cal.json celBE_cal.json celWR_cal.json celSD_cal.json celSE_cal.json celTC_cal.json celFC_cal.json \
  celBgC_cal.json celBgD_cal.json celBgE_cal.json celEyE_cal.json celNub_cal.json celCr_cal.json celOvA_cal.json celOvB_cal.json celEyC_cal.json celEyD_cal.json
