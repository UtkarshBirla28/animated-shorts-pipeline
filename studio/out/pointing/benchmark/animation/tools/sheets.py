import os,sys
from PIL import Image,ImageDraw,ImageFont
B="C:/Users/utkar/Desktop/animated-shorts-studio/studio/out/pointing/benchmark/animation"
cuts=[("s01",0),("s02",81),("s03",140),("s03b",164),("s04",212),("s05",262),("s06",344),("s07",416),("s08",509),("s09",623),("s10",719),("s11",770),("s12",874),("s13",943),("s14",1020),("s15",1053),("s16a",1150),("s16b",1272),("s17",1356),("s18",1467),("s19",1497),("s20",1601),("s21",1675),("s22",1706),("s23",1799),("s24",1855),("end",1913)]
os.makedirs(B+"/sheets",exist_ok=True)
TW,TH=200,356;C,R=8,3
try: font=ImageFont.truetype("arial.ttf",22)
except: font=ImageFont.load_default()
for i in range(len(cuts)-1):
    sid,a=cuts[i];b=cuts[i+1][1]
    fr=[f for f in range(a,b) if f%2==0]
    for p in range(0,len(fr),C*R):
        chunk=fr[p:p+C*R]
        rows=(len(chunk)+C-1)//C
        sh=Image.new("RGB",(C*TW,rows*TH),(0,0,0))
        d=ImageDraw.Draw(sh)
        for k,f in enumerate(chunk):
            im=Image.open(f"{B}/frames/f{f:04d}.jpg").resize((TW,TH))
            x,y=(k%C)*TW,(k//C)*TH
            sh.paste(im,(x,y))
            d.rectangle([x,y,x+64,y+26],fill=(0,0,0))
            d.text((x+3,y+2),str(f),fill=(255,255,0),font=font)
        sh.save(f"{B}/sheets/{sid}_{p//(C*R)}_{chunk[0]}-{chunk[-1]}.jpg",quality=85)
print(len(os.listdir(B+"/sheets")))
