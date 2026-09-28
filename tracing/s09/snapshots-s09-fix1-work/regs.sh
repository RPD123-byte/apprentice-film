# usage: regs.sh DIR IDX T
D=$1; I=$2; T=$3; W=snapshots/s09-fix1-work
python3 $W/stats.py $D/frame-$I-at-${T}s.png $D/ref-$I-at-${T}s.png whole 0 0 2206 946 room 1540 0 2206 946 roomNoSpk 1540 0 2030 946 lowroom 1760 650 2030 946 midroom 1700 230 1930 520 speaker 2040 370 2206 946 woofer 2080 640 2206 900 beanie 0 0 480 570 cuffBot 0 515 300 555 crownR 250 60 390 240 slabUp 700 770 820 840 slabTex 650 800 850 940 creaseB 890 860 950 940 rplaneLo 930 915 1060 946 neck 170 812 268 946 shirt 320 890 560 946 lock 85 665 160 730 slab 540 700 1580 946 | grep -v "^ *$"
