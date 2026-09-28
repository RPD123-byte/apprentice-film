import sys, subprocess
B='/Users/computer/rootline/apprentice-film/snapshots/s23g-full2'
out=sys.argv[1]; box=sys.argv[2].split(','); sc=sys.argv[3]; ks=[int(x) for x in sys.argv[4].split(',')]
args=[]
for k in ks: args+=['R:%s:%d'%(B,k),'S:%d'%k]
import os; subprocess.run([sys.executable,'crop.py',out]+box+[sc]+args,env={**os.environ,'COLS':'4'})
