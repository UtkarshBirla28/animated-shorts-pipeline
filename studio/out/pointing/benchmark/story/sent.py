import json,sys,re
n=sys.argv[1]
d=json.load(open(f'sound/{n}/voice/words.json',encoding='utf-8'))
cur=[];st=None
for x in d:
    if st is None: st=x['s']
    cur.append(x['w'])
    if re.search(r'[.?!:"]$',x['w']) :
        print(f"[{st:6.2f}-{x['e']:6.2f}] {' '.join(cur)}"); cur=[];st=None
if cur: print(' '.join(cur))
