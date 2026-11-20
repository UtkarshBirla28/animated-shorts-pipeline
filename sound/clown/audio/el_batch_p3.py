# SOUND p3 (polish round 2): the effects the p2 sound audit found missing or unusable (nothing is played; every take is
# measured before use):
#   - the pigeon takes are sub-bass thumps (95 % of their energy under 82-352 Hz): bright wing-clap takes instead
#   - step_soft / step_slow are thumps under 90 Hz: crisp sneaker steps and a heel-scuff layer for the featured walkers
#   - the animators' new polish effects: confetti, the juggling catches, a crumpled note, the light-bulb "idea" ping
# ElevenLabs SOUND EFFECTS only (never voice). Cap 300 credits (the lead's budget for this round). The key is read at run
# time by tools/el_api.py and is never printed, logged or written.
# usage: python -s el_batch_p3.py <group> [...] | all | list | credits
import os
import el_batch as B

ND = B.ND
B.LOG = os.path.join(B.OUT, "credits_p3.json")
B.CAP = 300
B.JOBS = {
    "pigeon_b": (1.2, 3, 0.75, "A pigeon bursting into flight right next to the microphone: a quick flurry of bright fluttering wing claps, "
                 "crisp clapping feathers, no cooing" + ND),
    "pigeon_settle": (1.0, 1, 0.75, "A pigeon landing close by: a short soft flutter of wings settling, then still, no cooing" + ND),
    "sneaker_steps": (4.0, 1, 0.75, "Footsteps of one person walking at a relaxed pace in rubber-soled sneakers on brick paving, crisp light "
                      "gritty scuffs on every step, evenly spaced" + ND),
    "heel_scuff": (2.0, 1, 0.75, "Three separate short shoe heel scuffs on stone paving, bright gritty scrapes, with silence between them" + ND),
    "confetti": (1.5, 2, 0.7, "A small party confetti popper pops, then paper confetti flutters down in a light papery shower" + ND),
    "juggle": (2.5, 1, 0.75, "Juggling: soft cloth balls landing in a person's palms, a light rhythmic pat, pat, pat of catches" + ND),
    "paper_crumple": (1.0, 1, 0.75, "A sheet of paper crumpled quickly into a ball in one fist" + ND),
    "idea_ping": (0.8, 1, 0.75, "A cartoon light bulb switching on for a bright idea: a tiny click then a short clear bright 'ding'" + ND),
}

if __name__ == "__main__":
    B.main()
