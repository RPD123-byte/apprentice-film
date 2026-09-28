# keybuild.py spec.py out.json  -- measure the outline parts of one key drawing from a spec:
#   T = key time; PARTS = [(name, kind, args...)]
#   kind 'snap'  : (name, 'snap', 'x,y x,y ...', closed, r)          ridge-followed ink line (snap.py)
#   kind 'poly'  : (name, 'poly', 'x,y x,y ...')                      hand polygon, kept as is
#   kind 'join'  : (name, 'join', [partA, partB, ...])                concatenation of measured lines -> closed shape
#   kind 'region': (name, 'region', 'cls,cls', 'x,y ...', holes, eps) colour-class region outline (region.py)
# Outlines only; everything else is drawn in code.
import sys, json, subprocess, os
spec = {}
exec(open(sys.argv[1]).read(), spec)
T = spec['T']; out = {}
here = os.path.dirname(os.path.abspath(__file__))
C = 'green,skin,blush,dkskin,black,wall,peach,lid,yellow,white,grey,hp,pink,teal,brown,wood'
for p in spec['PARTS']:
    name, kind = p[0], p[1]
    if kind == 'poly':
        out[name] = [[float(a) for a in q.split(',')] for q in p[2].split()]
    elif kind == 'snap':
        closed = p[3] if len(p) > 3 else 0; r = p[4] if len(p) > 4 else 10
        s = subprocess.run(['python3', 'snap.py', str(T), p[2], '--closed', str(closed), '--r', str(r), '--eps', '1.2', '--lam', '4'], cwd=here, capture_output=True, text=True).stdout.strip().split('\n')[0]
        out[name] = [[float(a) for a in q.split(',')] for q in s.split()]
    elif kind == 'join':
        pts = []
        for q in p[2]: pts += out[q]
        out[name] = pts
    elif kind == 'region':
        cls, poly = p[2], p[3]; holes = p[4] if len(p) > 4 else 0; eps = p[5] if len(p) > 5 else 2
        close = p[6] if len(p) > 6 else 5; minhole = p[7] if len(p) > 7 else 60; allc = p[8] if len(p) > 8 else 0
        s = subprocess.run(['python3', 'region.py', str(T), cls, poly, f'../s28d-seg/kb-{name}.jpg', '--eps', str(eps), '--close', str(close), '--open', '3', '--med', '5', '--grow', '0',
                            '--holes', str(holes), '--minhole', str(minhole), '--all', str(allc), '--minarea', '600', '--classes', C], cwd=here, capture_output=True, text=True).stdout.strip().split('\n')[0]
        out[name] = json.loads(s)
    print(name, kind, len(out[name]), file=sys.stderr)
json.dump(out, open(sys.argv[2], 'w'))
