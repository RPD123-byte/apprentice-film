import json, re
def loadjs(p):
    s = open(p).read()
    i = s.find('export default ')
    if i >= 0: body = s[i + 15:]
    else:
        i = s.find('= ', s.find('export const')); body = s[i + 2:]
    body = body.strip().rstrip(';')
    return json.loads(body)
