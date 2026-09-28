S=/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s24rev
cd /Users/computer/rootline/apprentice-film
python3 - > $S/batches.txt <<'PY'
import json
ts=json.load(open('/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s24rev/ts.json'))
ks=sorted(int(k) for k in ts)
for i in range(0,len(ks),15): print(','.join(ts[str(k)] for k in ks[i:i+15]))
PY
i=0
while read L; do
  i=$((i+1))
  sh tools/compare.sh "$L" snapshots/s24-rev1-w > $S/w$i.log 2>&1
  python3 $S/proc.py $S snapshots/s24-rev1-w runA >> $S/w$i.log 2>&1
done < $S/batches.txt
# determinism rerun: same timestamps, separate run
sh tools/compare.sh "$(python3 -c "import json;t=json.load(open('$S/ts.json'));print(','.join(t[k] for k in ('12','40','75')))")" snapshots/s24-rev1-det > $S/det.log 2>&1
for f in snapshots/s24-rev1-det/frame-*.png; do :; done
python3 - <<'PY'
import glob,re,shutil,json
S='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s24rev'
ts=json.load(open(S+'/ts.json'))
for k in ('12','40','75'):
    t=f"{float(ts[k]):.3f}".rstrip('0').rstrip('.')
    for p in glob.glob('snapshots/s24-rev1-det/frame-*.png'):
        if re.search(r'at-([\d.]+)s',p).group(1)==t: shutil.copy(p,f'{S}/det/k{k}_runB.png')
PY
echo ALLDONE > $S/done.txt
