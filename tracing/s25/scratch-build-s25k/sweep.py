import json,subprocess,sys
L15=[0.08, 0.14, 0.2, 0.27, 0.34, 0.42, 0.5, 0.58, 0.66, 0.73, 0.79, 0.84, 0.88, 0.915, 0.945]
L12=[0.08,0.16,0.26,0.36,0.47,0.58,0.68,0.76,0.83,0.88,0.915,0.945]
L10=[0.1,0.2,0.3,0.42,0.54,0.66,0.76,0.84,0.9,0.945]
for teps,lv,nm,ms,tb in [(0.9,L12,'12',15,0.5),(0.9,L12,'12',30,0.5),(0.9,L12,'12',15,0.8),(1.2,L10,'10',30,0.8)]:
    R=json.load(open('rough.json')); c=dict(R['hips1']); c['teps']=teps; c['levels']=lv; c['minspeck']=ms; c['tblur']=tb; R['hips1x']=c; json.dump(R,open('rough.json','w'),indent=1)
    o=subprocess.run(['python3','trace_pose.py','hips1x','2615','rough.json','t_hx.json'],capture_output=True,text=True).stdout.strip()
    subprocess.run(['python3','tojs.py','tr_hx','t_hx.json','tr_hx.js'],capture_output=True)
    import os; sz=os.path.getsize('tr_hx.js')
    e=subprocess.run(['python3','pyrender.py','t_hx.json'],capture_output=True,text=True).stdout.strip().replace('\n',' | ')
    print(f'teps {teps} levels {nm} ms {ms} tb {tb}: js {sz//1024} KB | {e}')
