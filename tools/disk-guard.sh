#!/bin/sh
# While the build workflow runs: every 5 min, if the data volume has < 80 GB free, delete THIS RUN's media
# artifacts (images/arrays/video) in snapshots/ that are over 2 hours old. Never touches scripts or anything
# outside snapshots/. Stop it by killing this loop (or when the workflow finishes).
SNAP=/Users/computer/rootline/apprentice-film/snapshots
while true; do
  FREE=$(df -g /System/Volumes/Data | awk 'NR==2{print $4}')
  if [ "$FREE" -lt 80 ]; then
    python3 - "$SNAP" <<'PY'
import os, sys, time, stat
snap=sys.argv[1]; T0=time.mktime(time.strptime('2026-09-23 19:00','%Y-%m-%d %H:%M')); cut=time.time()-7200
MEDIA=('.png','.jpg','.jpeg','.npy','.npz','.mp4','.webm','.mov','.wav','.gif')
n=b=0
for root,_,fs in os.walk(snap):
    for f in fs:
        if not f.lower().endswith(MEDIA): continue
        p=os.path.join(root,f)
        try: st=os.lstat(p)
        except FileNotFoundError: continue
        if stat.S_ISLNK(st.st_mode) or st.st_mtime < T0 or st.st_mtime > cut: continue
        try: os.remove(p); n+=1; b+=st.st_size
        except FileNotFoundError: pass
print(time.strftime('%H:%M'), f'disk-guard freed {b/1e9:.1f} GB ({n} files)', flush=True)
PY
  fi
  sleep 300
done
