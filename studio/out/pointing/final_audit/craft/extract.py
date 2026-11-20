import cv2,numpy as np,os,json
A=r"C:/Users/utkar/Desktop/animated-shorts-studio/studio/out/pointing/final_audit/craft"
cuts=[("s01",0),("s02",81),("s03",140),("s03b",164),("s04",212),("s05",262),("s06",344),("s07",416),("s08",509),("s09",623),("s10",719),("s11",770),("s12",874),("s13",943),("s14",1020),("s15",1053),("s16a",1150),("s16b",1272),("s17",1356),("s18",1467),("s19",1497),("s20",1601),("s21",1675),("s22",1706),("s23",1799),("s24",1855)]
ends=[c[1] for c in cuts[1:]]+[1913]
sel={}
for (k,a),b in zip(cuts,ends):
    n=b-a
    fr=sorted(set([a+1,a+n//4,a+n//2,a+3*n//4,b-2]))
    sel[k]=(a,b,fr)
want={f:k for k,(a,b,fr) in sel.items() for f in fr}
cap=cv2.VideoCapture(r"C:/Users/utkar/Desktop/animated-shorts-studio/studio/out/pointing/pointing_FINAL_1080x1920.mp4")
small={}
i=0
stats=[]
prev=None
while True:
    ok,f=cap.read()
    if not ok: break
    if i in want: cv2.imwrite(f"{A}/frames/f{i:04d}.png",f)
    g=cv2.resize(f,(135,240),interpolation=cv2.INTER_AREA)
    small[i]=g
    lab=cv2.cvtColor(cv2.resize(f,(270,480)),cv2.COLOR_BGR2LAB).astype(np.float32)
    L=lab[...,0].mean()*100/255; a_=lab[...,1].mean()-128; b_=lab[...,2].mean()-128
    d=0 if prev is None else float(np.abs(lab[...,0]-prev).mean())
    stats.append((i,float(L),float(a_),float(b_),float(d))); prev=lab[...,0]
    i+=1
print("frames",i)
json.dump(stats,open(f"{A}/framestats.json","w"))
# strips: every 4th frame per shot, rows of 10
for (k,a),b in zip(cuts,ends):
    ims=[small[j] for j in range(a,b,4)]
    cols=10; rows=(len(ims)+cols-1)//cols
    sheet=np.full((rows*244,cols*139,3),20,np.uint8)
    for t,im in enumerate(ims):
        r,c=divmod(t,cols); sheet[r*244+2:r*244+242,c*139+2:c*139+137]=im
        cv2.putText(sheet,str(a+4*t),(c*139+4,r*244+14),cv2.FONT_HERSHEY_SIMPLEX,0.4,(0,255,255),1)
    cv2.imwrite(f"{A}/strips/{k}_strip.jpg",sheet,[cv2.IMWRITE_JPEG_QUALITY,88])
    # key frame montage at 540 wide
    fr=sel[k][2]
    mont=np.hstack([cv2.resize(cv2.imread(f"{A}/frames/f{j:04d}.png"),(432,768),interpolation=cv2.INTER_AREA) for j in fr])
    for t,j in enumerate(fr): cv2.putText(mont,f"{k} f{j}",(t*432+8,24),cv2.FONT_HERSHEY_SIMPLEX,0.7,(0,255,255),2)
    cv2.imwrite(f"{A}/frames/{k}_keys.jpg",mont,[cv2.IMWRITE_JPEG_QUALITY,90])
json.dump(sel,open(f"{A}/selected.json","w"))
