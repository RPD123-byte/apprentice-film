import json, sys, re
def fix(o):
    if isinstance(o, dict):
        if o and all(k.isdigit() for k in o): return [fix(o[k]) for k in sorted(o, key=int)]
        return {k: fix(v) for k, v in o.items()}
    if isinstance(o, list): return [fix(v) for v in o]
    if isinstance(o, float): return round(o, 3)
    return o
def js(o, ind=0):
    if isinstance(o, dict):
        ID = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")
        return '{ ' + ', '.join((k if ID.match(k) else json.dumps(k)) + ': ' + js(v) for k, v in o.items()) + ' }'
    if isinstance(o, list): return '[' + ', '.join(js(v) for v in o) + ']'
    if o is None: return 'null'
    if o is True: return 'true'
    if o is False: return 'false'
    return json.dumps(o)
F = fix(json.load(open(sys.argv[1])))
if len(sys.argv) > 2: json.dump(F, open(sys.argv[2], 'w'), indent=1)
print(js(F))
