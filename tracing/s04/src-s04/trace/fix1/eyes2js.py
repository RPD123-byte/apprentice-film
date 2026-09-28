# eyes2js.py : writes s04/eyes2.js -- per key frame, per eye: the eye region's affine (20.56 eye coords -> frame; b1's
# eyetrack to 21.64, eyetrack2 frame by frame after), the pupil in eye coords and the iris's half-width in eye coords
# (eyeshape/eyefit: measured on the eye-local views, smoothed over time; before 21.32 the pupil is b1's measured one
# taken back to eye coords, the gaze being on the owl). Measurements only.
import json, numpy as np
s=open('/Users/computer/rootline/apprentice-film/src/shots/s04/eyetrack.js').read()
T1=json.loads(s[s.index('{',s.index('EYETRACK')):s.rindex('}')+1])
T2=json.load(open('/Users/computer/rootline/apprentice-film/snapshots/s04-fix1w/eyetrack2.json'))
FIT=json.load(open('/Users/computer/rootline/apprentice-film/snapshots/s04-fix1w/eyefit.json'))
MODEL={'L':{'p':[894,333],'rx':30},'R':{'p':[1272,324],'rx':31}}
END={'L':21.88,'R':22.44}
out={}
for t in sorted(set(T1)|set(T2), key=float):
    for k in ['L','R']:
        if float(t)>END[k]: continue
        src=T2 if t in T2 and k in T2[t] else T1
        if t not in src or k not in src[t]: continue
        A=src[t][k]['A']; M=np.array(A).reshape(2,3)
        if t in FIT and k in FIT[t] and float(t)>=21.32:
            cp=FIT[t][k]['pupil']; rx=min(MODEL[k]['rx'], FIT[t][k]['irr']+2.5)
        else:
            p=src[t][k].get('p')
            if p: cp=list(np.linalg.solve(M[:,:2],np.array(p)-M[:,2]))
            else: cp=MODEL[k]['p']
            rx=MODEL[k]['rx']
        out.setdefault(t,{})[k]={'A':[round(v,5) for v in A],'cp':[round(float(cp[0]),1),round(float(cp[1]),1)],'rx':round(float(rx),1)}
open('/Users/computer/rootline/apprentice-film/src/shots/s04/eyes2.js','w').write(
 '// s04 (fix1): his eyes per key frame (trace/fix1/eyes2js.py): per eye, A = the eye region\'s affine from the 20.56 eye\n'
 '// coordinates to the frame (b1\'s eyetrack to 21.64; after that frame to frame, trace/fix1/eyetrack2.py), cp = the pupil\n'
 '// in eye coordinates, rx = the iris\'s half-width in eye coordinates (the eyeball turns: 31 -> ~20 by 22.08), both\n'
 '// measured on the eye-local views (trace/fix1/eyeshape.py, eyefit.py). Measurements only.\n'
 'export const EYES2 = '+json.dumps(out)+';\n')
for t in sorted(out,key=float): print(t, {k:(v['cp'],v['rx']) for k,v in out[t].items()})
