# load ORN / CLOUD / RIB arrays from ornaments.js
import re, json
def load(name, path='src/shots/s08/ornaments.js'):
    s = open(path).read()
    i = s.index(f'export const {name} = [')
    j = s.index('\n];', i)
    body = s[s.index('[', i):j + 2]
    body = re.sub(r'//[^\n]*', '', body)
    body = re.sub(r',\s*\]', ']', body)
    return json.loads(body)
