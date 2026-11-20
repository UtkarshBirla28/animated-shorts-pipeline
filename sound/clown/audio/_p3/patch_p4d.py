# p4: the preview mp3 name, the doc's p4 note (inserted before the frozen p3 section), and a separate verify output
import os

AUD = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def patch(name, a, b):
    p = os.path.join(AUD, name)
    s = open(p, encoding="utf-8").read()
    if b in s:
        return
    assert s.count(a) == 1, (name, a[:60])
    open(p, "w", encoding="utf-8").write(s.replace(a, b))


patch("mix.py", 'PREVIEW_MP3 = "mix_p3_preview.mp3"', 'PREVIEW_MP3 = "mix_p4_preview.mp3"   # p4 (p3: mix_p3_preview.mp3)')
patch("events_doc.py", '''    p3 = os.path.join(HERE, "_p3", "p3_section.md")          # p3: the polish round's own section (written from _p3/verify_p3.json)''',
      '''    p4 = os.path.join(HERE, "_p3", "p4_section.md")          # p4: the final acting round's note (written from _p3/verify_p4.json)
    if os.path.exists(p4):
        for line in open(p4, encoding="utf-8").read().rstrip("\\n").split("\\n"):
            w(line)
        w("")
    p3 = os.path.join(HERE, "_p3", "p3_section.md")          # p3: the polish round's own section (written from _p3/verify_p3.json)''')
patch(os.path.join("_p3", "verify_p3.py"), 'json.dump(OUT, open(os.path.join(HERE, "verify_p3.json"), "w", encoding="utf-8"), indent=1, default=float)',
      'json.dump(OUT, open(os.path.join(HERE, os.environ.get("VERIFY_OUT", "verify_p3.json")), "w", encoding="utf-8"), indent=1, default=float)')
print("ok")
