# SOUND v2, PHASE B: the few effects the rebuilt film needs that the library did not have (the tape rewind, the office
# door, the garment bag, the dog, the brake skid, a few wordless human reactions). ElevenLabs SOUND EFFECTS only (never
# voice), 1-2 takes each, cap 600 credits (the lead's cap for this phase). The key is read at run time by
# tools/el_api.py and is never printed, logged or written. Nothing is played; el_measure.py measures every take.
# usage: python -s el_batch_v2.py <group> [...] | all | list | credits
import os
import el_batch as B

ND = B.ND
B.LOG = os.path.join(B.OUT, "credits_v2.json")
B.CAP = 600
B.JOBS = {
    "tape_rewind": (3.0, 2, 0.75, "A VHS video cassette tape rewinding at high speed inside a VCR, a fast mechanical motor whirr with light tape chatter, steady, close, dry, no music, no voices, no beep"),
    "tape_stop": (0.6, 2, 0.8, "A VCR tape mechanism stopping abruptly, one short mechanical click-clunk, close, dry, no music, no voices"),
    "door_open": (1.5, 2, 0.7, "A wooden office door: the latch clicks, then the door swings open with a soft short creak, indoors, close, no voices, no footsteps, no music"),
    "zip": (0.6, 2, 0.8, "A zipper on a garment bag ripped open fast, one quick zip" + ND),
    "bag_rustle": (0.8, 2, 0.7, "A plastic garment bag swung up quickly, a short crinkly rustle" + ND),
    "dog_yap": (1.0, 2, 0.75, "A small terrier dog gives two short happy yaps, outdoors, a few metres away, dry, no other sounds, no music, no voices"),
    "dog_paws": (1.5, 1, 0.7, "A small dog running fast across brick paving, quick light claws pattering, close, dry, no barking, no panting, no background noise"),
    "skid": (0.8, 2, 0.75, "A small rubber bicycle tyre skids to a quick stop on brick paving, one short chirpy skid" + ND),
    "man_sigh": (1.2, 2, 0.7, "A middle-aged man lets out one short thoughtful sigh through his nose, close, dry, no words, no music"),
    "gasp_f": (0.8, 2, 0.7, "A young woman's small surprised gasp, one short quick intake of breath, close, dry, no words, no music"),
    "hm_f": (0.6, 2, 0.7, "A woman's short surprised 'hm' with closed lips, rising, close, dry, no words, no music"),
    "laugh_m": (1.2, 2, 0.7, "A man's short cheerful goofy chuckle, a friendly clown laughing, outdoors a few metres away, no words, no music"),
    "laugh_f": (1.2, 2, 0.7, "A young woman's short delighted giggle, outdoors a few metres away, no words, no music"),
    "yelp": (0.8, 2, 0.7, "A man's short comic startled yelp, wordless, surprised, outdoors a few metres away, no words, no music"),
    "hand_bell": (1.2, 2, 0.75, "A small brass hand bell rung quickly three times, a bright ding-a-ling, short, close, dry, no reverb, no background"),
}

if __name__ == "__main__":
    B.main()
