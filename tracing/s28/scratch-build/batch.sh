#!/bin/sh
# batch.sh name "t1,t2,..."  -> snapshots/s28-rev1-<name>, jpgs + metrics, pngs removed
cd /Users/computer/rootline/apprentice-film
D=snapshots/s28-rev1-$1
sh tools/compare.sh "$2" $D > $D.log 2>&1
python3 - $D <<'PY'
import cv2,glob,sys
for p in glob.glob(sys.argv[1]+'/*.png'):
    im=cv2.imread(p); cv2.imwrite(p[:-4]+'.jpg',im,[cv2.IMWRITE_JPEG_QUALITY,92])
PY
python3 /private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/metr.py $D > $D/metrics.txt 2>&1
rm -f $D/*.png $D/contact-sheet.jpg
echo done >> $D.log
