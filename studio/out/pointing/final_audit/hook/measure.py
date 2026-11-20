import cv2, numpy as np, json, glob
def load(p): return cv2.imread(p)
def small_gray(im): return cv2.cvtColor(cv2.resize(im,(270,480),interpolation=cv2.INTER_AREA),cv2.COLOR_BGR2GRAY)
mask=np.ones((480,270),bool); mask[int(.60*480):int(.82*480),:]=False
frames=[load(f"frames/f{i:04d}.jpg") for i in range(213)]
g=[small_gray(f) for f in frames]
chg=[None]+[float((np.abs(g[i].astype(int)-g[i-1].astype(int))[mask]>6).mean()) for i in range(1,213)]
mad=[None]+[float(np.abs(g[i].astype(int)-g[i-1].astype(int))[mask].mean()) for i in range(1,213)]
def stats(a,b):
    v=np.array([chg[i] for i in range(a,b+1)]); return round(float(np.median(v)),3), round(float(v.mean()),3), round(float(v.min()),3)
out={}
for name,(a,b) in {"0-1s":(1,30),"1-2s":(31,60),"2-3s":(61,90),"3-4s":(91,120),"4-5s":(121,150),"5-7s":(151,212),"s01 1-80":(1,80),"s02 82-139":(82,139),"s03 141-163":(141,163),"s03b 165-211":(165,211)}.items():
    out[name]=stats(a,b)
print("changed-px fraction (median, mean, min) by window:",json.dumps(out))
# low-change runs
low=[i for i in range(1,213) if chg[i]<0.10]
print("frames <10% change:",low)
print("cuts (mad):",[(i,round(mad[i],1)) for i in range(1,213) if mad[i]>25])
# colour masks at frame 0
hsv=cv2.cvtColor(frames[0],cv2.COLOR_BGR2HSV)
H,S,V=hsv[...,0].astype(int),hsv[...,1].astype(int),hsv[...,2].astype(int)
yel=(H>=18)&(H<=34)&(S>=120)&(V>=120)
red=((H<=6)|(H>=170))&(S>=120)&(V>=60)
for nm,m in [("yellow",yel),("red",red)]:
    ys,xs=np.nonzero(m)
    lab=cv2.cvtColor(frames[0],cv2.COLOR_BGR2LAB).astype(float)
    a=lab[...,1]-128; b=lab[...,2]-128
    C=np.sqrt(a*a+b*b)
    print(nm,"area %:",round(m.mean()*100,2),"bbox x",xs.min(),xs.max(),"y",ys.min(),ys.max(),"h% of frame",round((ys.max()-ys.min())/19.2,1),"chroma(LAB*) median",round(float(np.median(C[m])),1),"frame median chroma",round(float(np.median(C)),1))
# yellow area through 0-30 to see exit
print("yellow area % per frame 0-30:",[round(float(((lambda h:(h[...,0]>=18)&(h[...,0]<=34)&(h[...,1]>=120)&(h[...,2]>=120))(cv2.cvtColor(frames[i],cv2.COLOR_BGR2HSV))).mean()*100),2) for i in range(0,31)])
json.dump({"chg":chg,"mad":mad},open("perframe_0_212.json","w"))
