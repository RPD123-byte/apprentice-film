# parse the measured tables of src/shots/s23/data.js
import re, json
SRC='/Users/computer/rootline/apprentice-film/src/shots/s23/data.js'
def table(name, path=SRC):
    s=open(path).read()
    i=s.index('export const %s ='%name); j=s.index('=',i)+1
    # read a balanced [...] literal
    d=0; k=j
    while s[k]!='[': k+=1
    st=k
    while True:
        c=s[k]
        if c=='[': d+=1
        elif c==']':
            d-=1
            if d==0: break
        k+=1
    lit=re.sub(r'//[^\n]*','',s[st:k+1])
    return json.loads(lit)
