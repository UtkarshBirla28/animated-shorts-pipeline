# DIRECTOR (pointing v3): the cover candidates, full-size frames of the FINAL (no text on them; the title carries the words).
#   tools/.venv/Scripts/python.exe -s studio/out/pointing/upload/make_covers.py
import os, subprocess
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..", "pointing_FINAL_1080x1920.mp4")
COVERS = [(0, "cover_1_frame0_MAIN.jpg"), (200, "cover_2_driver_signal_green.jpg"), (1045, "cover_3_boy_points_at_suitcase.jpg")]
for f, name in COVERS:
    out = os.path.join(HERE, name)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", SRC, "-vf", r"select=eq(n\,%d)" % f, "-frames:v", "1", "-q:v", "1", out], check=True)
    print(name, Image.open(out).size)
ims = [Image.open(os.path.join(HERE, n)).convert("RGB").resize((360, 640)) for _, n in COVERS]
S = Image.new("RGB", (3 * 365, 640), (20, 20, 24))
for i, im in enumerate(ims): S.paste(im, (i * 365, 0))
S.save(os.path.join(HERE, "_covers_sheet.jpg"), quality=88)
