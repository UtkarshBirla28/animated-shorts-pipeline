# p4: a man's phone chatter ("he chats into his phone") gets the male murmur
import os

P = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "sfx.py")
s = open(P, encoding="utf-8").read()
a = 'snd = "murmur_m" if re.search(r"\\bp[14]\\b|guy|man", c["what"].lower()) else "murmur_f"'
b = 'snd = "murmur_m" if re.search(r"\\bp[14]\\b|guy|man|\\bhis\\b|\\bhe\\b", c["what"].lower()) else "murmur_f"'
assert s.count(a) == 1
s = s.replace(a, b)
open(P, "w", encoding="utf-8").write(s)
print("ok")
