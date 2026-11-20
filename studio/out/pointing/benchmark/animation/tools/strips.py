import subprocess,os,sys,glob
import numpy as np
from PIL import Image,ImageDraw,ImageFont
B="C:/Users/utkar/Desktop/animated-shorts-studio/studio/out/pointing/benchmark/animation"
S="C:/Users/utkar/Desktop/animated-shorts-studio/studio/out"
R="C:/Users/utkar/Desktop/yt short videos"
vids={"antitheft":S+"/antitheft/antitheft_FINAL_1080x1920.mp4",
"clown":S+"/clown/upload/clown_FINAL_1080x1920.mp4",
"saladoil":S+"/saladoil/saladoil_FINAL_v2_1080x1920.mp4",
"ref_jar":R+"/The Ancient Jar That Warned an Empire.mp4",
"ref_japanjob":R+"/The Job Nobody Wants in Japan.mp4",
"ref_stormoil":R+"/Why Sailors Carried Storm Oil.mp4",
"ref_burglar":R+"/The Burglar Who Only Moved Furniture.mp4",
"ref_railroads":R+"/new_2026-11-19/Why Perfect Railroads Don't Work [7xS87iActkU].mp4",
"ref_pinkcell":R+"/new_2026-11-19/The Pink Prison Cell Experiment [HxqtHI62otM].mp4"}
only=sys.argv[1:] or list(vids)
TW,TH=160,284;C,Rw=10,4;STEP=15
try: font=ImageFont.truetype("arial.ttf",18)
except: font=ImageFont.load_default()
os.makedirs(B+"/strips",exist_ok=True)
for name in only:
    p=vids[name]
    raw=subprocess.run(["ffmpeg","-v","error","-i",p,"-vf",f"fps=30,select='not(mod(n\,{STEP}))',scale={TW}:{TH}","-fps_mode","passthrough","-f","rawvideo","-pix_fmt","rgb24","-"],capture_output=True).stdout
    a=np.frombuffer(raw,np.uint8).reshape(-1,TH,TW,3)
    per=C*Rw
    for s in range(0,len(a),per):
        ch=a[s:s+per]; rows=(len(ch)+C-1)//C
        sh=Image.new("RGB",(C*TW,rows*TH));d=ImageDraw.Draw(sh)
        for k,fr in enumerate(ch):
            x,y=(k%C)*TW,(k//C)*TH
            sh.paste(Image.fromarray(fr),(x,y))
            t=(s+k)*STEP/30
            d.rectangle([x,y,x+52,y+20],fill=(0,0,0));d.text((x+2,y+1),f"{t:.1f}s",fill=(255,255,0),font=font)
        sh.save(f"{B}/strips/{name}_{s//per}.jpg",quality=85)
    print(name,len(a),flush=True)
