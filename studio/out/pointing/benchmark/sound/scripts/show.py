import json, sys, os
B = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R=json.load(open(os.path.join(B,'data',sys.argv[1]+'.metrics.json'),encoding='utf-8'))
for k,v in R.items():
    if k in ('sentences','presence_2_5k_per_s_rel_median','asr_text'): continue
    if k=='stems':
        for a,b in v.items():
            if a in ('sfx_onset_times',): continue
            print('  S',a,str(b)[:400])
    else: print(k,str(v)[:400])
if len(sys.argv)>2:
    for s in R['sentences']: print(s)
