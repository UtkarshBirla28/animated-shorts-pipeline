import sys
from PIL import Image, ImageDraw, ImageFont
out=sys.argv[1]; w=int(sys.argv[2]); fs=sys.argv[3:]
h=int(w*16/9)
img=Image.new("RGB",(len(fs)*(w+6),h+26),(20,20,20)); d=ImageDraw.Draw(img)
font=ImageFont.truetype("arial.ttf",20)
for k,f in enumerate(fs):
    im=Image.open(f).convert("RGB").resize((w,h),Image.LANCZOS)
    img.paste(im,(k*(w+6),26)); d.text((k*(w+6)+4,3),f.split('/')[-1],fill=(255,220,120),font=font)
img.save(out,quality=90)
