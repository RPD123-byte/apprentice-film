# parse src/shots/s16/data/owl.js (JS object literal) into python dicts
import re, json
def load(path='/Users/computer/rootline/apprentice-film/src/shots/s16/data/owl.js'):
    t = open(path).read()
    body = t.split('export const OWL = {', 1)[1].rsplit('};', 1)[0]
    body = re.sub(r'(^|,|\{)\s*(\d+|[A-Za-z_]+):', lambda m: m.group(1) + '"' + m.group(2) + '":', body, flags=re.M)
    return {int(k): v for k, v in json.loads('{' + body + '}').items()}
if __name__ == '__main__':
    D = load(); print(sorted(D), list(D[1153].keys()))
