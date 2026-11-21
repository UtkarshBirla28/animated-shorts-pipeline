# Picture probes for the saladoil sound (fix round 1): read the MERGED picture code (studio/src/videos/saladoil/*.ts) at
# mix time and pull out the frame formulas of the actions the SFX must hit, so a picture re-time after a merge reaches
# the sound on the next `python mix.py` without anyone copying frames by hand. Every probe has a fallback in sfx.py (the
# formula as it was at the A1 merge); picture_events_used.json "_probes" lists which ones were read from the code, and
# picture_events.json still overrides everything.
#   flapState (sets_ext.ts)      : each LOANS digit's roll start s(i) and landing land(i) (T f per flip); fix r3: also the
#                                  A2 form (lock(i) ternaries, n = max(1, floor((lock - s) / T)) flips, land = s + n T)
#   PLUNK (sets_ext.ts)          : the plumb weight hits the oil (shot 4)
#   BL (sets_ext.ts poseTop)     : the shot-7 bubble ring under the lender's face
#   perched gull (sets_ext.ts)   : shot 4's rail gull startled off by the shout (tOff)
#   car reflection (sets_ext.ts) : shot 14's passing car sliding across the shop window (cu window); CAR14_ON = false -> no car
#   cafe card take (cast.ts)     : fix r3: shot 15's waiter takes the card (take = gest2(f, X, L, ...)): the cafe register ding
#   flashAt (sets_ext.ts) and FLASHES (SaladOil.tsx): the lightning flash frames (shots 8-9)
#   S4 (cast.ts)                 : the tank man's shot-4 contacts (climb pulls, rim, on the roof, kneel, stand, rail)
#   STAMPS5 (cast.ts)            : the banker's stamp landings, both hands (shot 5)
#   bottleShake (cast.ts)        : the shake window on 'Ever' and its rock period (shot 11)
#   PULLS13 / valveAngle (cast.ts): the valve-wheel pulls per worker (shot 13)
# The expressions are evaluated with BEAT, SHOTS (0-indexed, like story.ts) and i / k only (no builtins).
# PROBE_SRC=<dir> reads another folder (e.g. an owner's sandbox) for a dry run.
import os
import re
import math

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.environ.get("PROBE_SRC") or os.path.normpath(os.path.join(HERE, "..", "..", "..", "studio", "src", "videos", "saladoil"))


class _Beat(dict):
    def __getattr__(self, k):
        return self[k]


def _read(name):
    try:
        with open(os.path.join(SRC, name), encoding="utf-8") as f:
            return f.read()
    except OSError:
        return ""


def _js(expr, env):
    """evaluate a small JS arithmetic expression (BEAT.x, SHOTS[n].a/.b, numbers, + - * /, Math.min / max / floor, i, k)"""
    e = expr.strip().rstrip(";,")
    e = re.sub(r"Math\.(min|max|floor|round|abs)", r"\1", e)
    e = re.sub(r"SHOTS\[(\d+)\]\.(a|b)", r'SHOTS[\1]["\2"]', e)
    if re.search(r"[^\w\s\.\+\-\*/\(\),\[\]\"]", e):
        raise ValueError(f"unsupported expression {expr!r}")
    ns = {"min": min, "max": max, "floor": math.floor, "round": round, "abs": abs}
    ns.update(env)
    return float(eval(e, {"__builtins__": {}}, ns))  # noqa: S307 (own project's picture code, restricted namespace)


def _strip_comments(src):
    """JS block and line comments out (a /* */ inside a declaration list must not break the parse)"""
    src = re.sub(r"/\*.*?\*/", " ", src, flags=re.S)
    return re.sub(r"//[^\n]*", "", src)


def _top_split(s, seps):
    """split s at the top-level (bracket depth 0) characters in seps"""
    out, d, cur = [], 0, []
    for c in s:
        if c in "([{":
            d += 1
        elif c in ")]}":
            d -= 1
        if c in seps and d == 0:
            out.append("".join(cur))
            cur = []
        else:
            cur.append(c)
    out.append("".join(cur))
    return out


def _ternary_py(e):
    """JS `a ? b : c` (right-associative, nestable) -> Python `(b) if (a) else (c)`"""
    d = 0
    for j, c in enumerate(e):
        if c in "([{":
            d += 1
        elif c in ")]}":
            d -= 1
        elif c == "?" and d == 0:
            k, depth, q = j + 1, 0, 0          # the ':' that closes this '?' (skip nested ? : pairs)
            while k < len(e):
                ch = e[k]
                if ch in "([{":
                    depth += 1
                elif ch in ")]}":
                    depth -= 1
                elif depth == 0 and ch == "?":
                    q += 1
                elif depth == 0 and ch == ":":
                    if q == 0:
                        break
                    q -= 1
                k += 1
            cond, a, b = e[:j], e[j + 1:k], e[k + 1:]
            return f"(({_ternary_py(a)}) if ({_ternary_py(cond)}) else ({_ternary_py(b)}))"
    return e


def _js2(expr, env):
    """_js plus JS comparisons (=== !== < > <= >=), && / || and the ternary operator"""
    e = _strip_comments(expr).strip().rstrip(";,")
    e = re.sub(r"Math\.(min|max|floor|round|abs)", r"\1", e)
    e = re.sub(r"SHOTS\[(\d+)\]\.(a|b)", r'SHOTS[\1]["\2"]', e)
    e = e.replace("===", "==").replace("!==", "!=").replace("&&", " and ").replace("||", " or ")
    if re.search(r"[^\w\s\.\+\-\*/\(\),\[\]\"=!<>?:%]", e):
        raise ValueError(f"unsupported expression {expr!r}")
    e = _ternary_py(e)
    ns = {"min": min, "max": max, "floor": math.floor, "round": round, "abs": abs, "true": True, "false": False}
    ns.update(env)
    v = eval(e, {"__builtins__": {}}, ns)  # noqa: S307 (own project's picture code, restricted namespace)
    return v if isinstance(v, bool) else float(v)


def _decls(body, env):
    """evaluate every `const a = x, b = y;` declaration of a JS block in order (the ones that cannot be read - arrow
    functions, array lookups, f-dependent terms - are skipped) -> env with the readable names added"""
    env = dict(env)
    for st_ in re.finditer(r"\bconst\s+(.*?);", _strip_comments(body), re.S):
        for part in _top_split(st_.group(1), ","):
            m = re.match(r"\s*([A-Za-z_]\w*)\s*(?::\s*[\w\[\]<>| ]+)?=\s*(.+)$", part, re.S)
            if not m or "=>" in m.group(2):
                continue
            try:
                env[m.group(1)] = _js2(m.group(2), env)
            except Exception:  # noqa
                pass
    return env


def _resolve_ids(expr, src, env):
    """resolve the free identifiers of expr from their own `NAME = expr` definitions in src (one level)"""
    env = dict(env)
    for tok in set(re.findall(r"\b([A-Za-z_]\w*)\b", _strip_comments(expr))) - set(env) - {"BEAT", "SHOTS", "Math", "min", "max", "floor", "round", "abs"}:
        d = re.search(r"\b" + tok + r"\s*=\s*", src)
        if d:
            try:
                env[tok] = _js2(_expr_from(src, d.end()), env)
            except Exception:  # noqa
                pass
    return env


def _list(txt, env):
    """'[a, b, c]' of JS expressions -> [floats]"""
    out = []
    for part in re.split(r",(?![^\(]*\))", txt.strip().strip("[]")):
        if part.strip():
            out.append(_js(part, env))
    return out


def _words_ts():
    """words.ts WORDS -> [(norm word, f, fe, p)] (the picture's PW / PWE anchors)"""
    out = []
    for m in re.finditer(r"\{\s*w:\s*\"((?:[^\"\\]|\\.)*)\",\s*s:\s*[\d.]+,\s*e:\s*[\d.]+,\s*f:\s*(\d+),\s*fe:\s*(\d+),\s*p:\s*(\d+)", _read("words.ts")):
        out.append((re.sub(r"[^a-z0-9%']", "", m.group(1).lower()), int(m.group(2)), int(m.group(3)), int(m.group(4))))
    return out


def _pw_funcs():
    W = _words_ts()
    norm = lambda s: re.sub(r"[^a-z0-9%']", "", str(s).lower())

    def idx(i, w=None):
        for k, (ww, f, fe, p) in enumerate(W):
            if p == int(i) and (w is None or ww == norm(w)):
                return k
        raise KeyError(f"PW({i}, {w})")
    return {"PW": lambda i, w=None: float(W[idx(i, w)][1]), "PWE": lambda i, w=None: float(W[idx(i, w)][2])}


def _balanced(src, i):
    """src[i] == '(' -> the text inside the matching ')'"""
    d = 0
    for j in range(i, len(src)):
        if src[j] == "(":
            d += 1
        elif src[j] == ")":
            d -= 1
            if d == 0:
                return src[i + 1:j]
    raise ValueError("unbalanced")


def _expr_from(src, i):
    """the JS expression starting at src[i], up to the next top-level ',' / ';' / newline"""
    d = 0
    for j in range(i, len(src)):
        c = src[j]
        if c in "([{":
            d += 1
        elif c in ")]}":
            if d == 0:
                return src[i:j]
            d -= 1
        elif c in ",;\n" and d == 0:
            return src[i:j]
    return src[i:]


def _ramp(src, name, env, scope=None):
    """`name = clamp01((f - X) / L)` (or smooth(...)) in src -> (start frame, length); identifiers in X are resolved from
    their own `id = expr` definitions in the same source (scope = the text to search them in)"""
    m = re.search(r"\b" + name + r"\s*=\s*(?:clamp01|smooth)\(", src)
    if not m:
        return None
    arg = _balanced(src, m.end() - 1).strip()
    mm = re.match(r"^\(\s*f\s*-\s*(.*)\)\s*/\s*([\d.]+)$", arg, re.S)
    if not mm:
        return None
    X, L = mm.group(1), float(mm.group(2))
    env = dict(env)
    for tok in set(re.findall(r"\b([A-Za-z_]\w*)\b", X)) - set(env) - {"BEAT", "SHOTS", "min", "max", "floor", "round", "abs"}:
        d = re.search(r"\b" + tok + r"\s*=\s*", scope or src)
        if d:
            env[tok] = _js(_expr_from(scope or src, d.end()), env)
    return -_js("0 - " + X, env), L


def probes(BEAT, SHOTS=None):
    """-> (dict of probed values, list of log strings)"""
    B = _Beat(BEAT)
    SH = [dict(SHOTS[k]) for k in sorted(SHOTS)] if SHOTS else []
    env0 = {"BEAT": B, "SHOTS": SH}
    try:
        env0.update(_pw_funcs())
    except Exception:  # noqa
        pass
    out, log = {}, []
    ext, cast, tsx = _read("sets_ext.ts"), _read("cast.ts"), _read("SaladOil.tsx")

    def tryp(name, fn):
        try:
            r = fn()
            if r is not None:
                log.append(r)
        except Exception as e:  # noqa
            log.append(f"{name}: could not read ({type(e).__name__}: {e}); fallback")

    # ---- the LOANS counter roll. fix r3: WORLD-EXT's A2 rewrite has no `land` any more - each digit riffles from
    # s(i) and LOCKS at lock(i) (a ternary per digit) after n = max(1, floor((lock - s) / T)) flips, so it lands on
    # s + n T; both forms are read (every `const` of the function body is evaluated per digit)
    def p_flaps():
        m = re.search(r"const flapState\s*=\s*\(i[^)]*\)\s*=>\s*\{(.*?)\n\};", ext, re.S)
        if not m:
            return None
        body = m.group(1)
        digs = []
        for i in range(9):
            e = _decls(body, dict(env0, i=float(i)))
            if not all(k in e for k in ("s", "T")):
                raise ValueError("no s / T in flapState")
            s_, T_ = float(e["s"]), float(e["T"])
            if "land" in e:
                land = float(e["land"])
            elif "n" in e:
                land = s_ + float(e["n"]) * T_
            elif "lock" in e:
                land = s_ + max(1, math.floor((float(e["lock"]) - s_) / T_)) * T_
            else:
                raise ValueError("no land / n / lock in flapState")
            digs.append((s_, land, T_))
        out["flaps"] = digs
        return (f"flapState: digits roll {digs[0][0]:.1f}..{max(d[1] for d in digs):.1f} (T {digs[0][2]:g} f) from sets_ext.ts; lands "
                + ", ".join(f"{d[1]:.1f}" for d in digs))
    tryp("flapState", p_flaps)

    def p_simple(key, pat, src, what):
        def f():
            m = re.search(pat, src)
            if not m:
                return None
            out[key] = _js(m.group(1), env0)
            return f"{what} = {out[key]:.1f}"
        return f
    tryp("PLUNK", p_simple("plunk", r"const PLUNK\s*=\s*([^;]+);", ext, "PLUNK (sets_ext.ts)"))
    tryp("BL", p_simple("bloop_ring", r"const BL\s*=\s*([^;]+);", ext, "shot-7 bubble ring BL (sets_ext.ts)"))
    tryp("perch", p_simple("perch_off", r"tOff\s*=\s*([^,;]+)", ext, "shot-4 perched gull takes off (sets_ext.ts tOff)"))

    def p_car():                        # fix r3: CAR14_A / CAR14_STOP / CAR14_ON (WORLD-EXT's visible sedan) are resolved
        mo = re.search(r"\bCAR14_ON\s*=\s*(true|false)", ext)
        if mo and mo.group(1) == "false":
            out["car"] = None
            return "shot-14 car: CAR14_ON = false in sets_ext.ts (no car in the picture: no car sound)"
        m = re.search(r"const cu\s*=\s*\(f\s*-\s*\(([^)]*)\)\)\s*/\s*([\d.]+)", ext)
        if not m:
            return None
        a = _js2(m.group(1), _resolve_ids(m.group(1), ext, env0))
        out["car"] = (a, a + float(m.group(2)))
        return f"shot-14 car reflection slides {a:.0f}..{a + float(m.group(2)):.0f} (sets_ext.ts)"
    tryp("car", p_car)

    def p_card():                       # fix r3 (A3 P3): shot 15's cafe customer hands the card over: the waiter's take
        mo = re.search(r"const office\s*=", cast)    # (take = gest2(f, X, L, ...)) peaks at X + L = the register ding
        scope = cast[mo.start(): mo.start() + 9000] if mo else cast
        m = re.search(r"\btake\s*=\s*gest2\(\s*f\s*,\s*", scope)
        if not m:
            return None
        x = _expr_from(scope, m.end())
        ml = re.match(r"\s*,\s*([\d.]+)", scope[m.end() + len(x):])
        a = _js2(x, _resolve_ids(x, scope, env0))
        out["card15"] = (a, float(ml.group(1)) if ml else 6.0)
        return f"shot-15 cafe card taken (cast.ts take) {a:.0f} + {out['card15'][1]:g} f"
    tryp("card", p_card)

    # ---- lightning: POST's FLASHES (SaladOil.tsx), else WORLD-EXT's flashAt F1 / F2
    def p_flash():
        m = re.search(r"const FLASHES[^=]*=\s*\[(.*?)\n\];", tsx, re.S)
        if m:
            fl = []
            for row in re.finditer(r"\{[^}]*?\bf:\s*([^,]+),[^}]*?\}", m.group(1)):
                far = "far: true" in row.group(0)
                fl.append((_js(row.group(1), env0), far))
            if fl:
                out["flashes"] = sorted(fl)
                return "lightning (SaladOil.tsx FLASHES): " + ", ".join(f"{a:.0f}{' far' if fr else ''}" for a, fr in out["flashes"])
        m = re.search(r"const F1\s*=\s*([^,]+),\s*F2\s*=\s*([^;]+);", ext)
        if m:
            out["flashes"] = [(_js(m.group(1), env0), False), (_js(m.group(2), env0), True)]
            return "lightning (sets_ext.ts flashAt F1 / F2): " + ", ".join(f"{a:.0f}" for a, _ in out["flashes"])
        return None
    tryp("flashes", p_flash)

    # ---- the tank man (shot 4)
    def p_s4():
        m = re.search(r"export const S4\s*=\s*\(\(\)\s*=>\s*\{(.*?)return", cast, re.S)
        if not m:
            return None
        env = dict(env0)
        for name, ex in re.findall(r"(\w+)\s*=\s*((?:[^,;()]|\([^()]*\))+)", m.group(1)):
            if name in ("const",):
                continue
            env[name] = _js(ex, env)
        mp = re.search(r"pulls:\s*(\[[^\]]*\])", cast[m.end():m.end() + 400])
        pulls = _list(mp.group(1), env) if mp else []
        out["s4"] = dict(pulls=pulls, **{k: env[k] for k in ("rim", "onRoof", "kneel", "tapeEnd", "stand", "rail") if k in env})
        return f"S4 (cast.ts): pulls {', '.join(f'{x:.0f}' for x in pulls)}, rim {env.get('rim', 0):.0f}, roof {env.get('onRoof', 0):.0f}, " \
               f"kneel {env.get('kneel', 0):.0f}, stand {env.get('stand', 0):.0f}, rail {env.get('rail', 0):.0f}"
    tryp("S4", p_s4)

    # ---- the banker's stamps (shot 5)
    def p_st5():
        m = re.search(r"export const STAMPS5\s*=\s*\{\s*R:\s*(\[[^\]]*\]),\s*L:\s*(\[[^\]]*\])", cast, re.S)
        if not m:
            return None
        out["stamps5"] = dict(R=_list(m.group(1), env0), L=_list(m.group(2), env0))
        return "STAMPS5 (cast.ts): R " + ", ".join(f"{x:.1f}" for x in out["stamps5"]["R"]) + "; L " + ", ".join(f"{x:.1f}" for x in out["stamps5"]["L"])
    tryp("STAMPS5", p_st5)

    # ---- the bottle shake (shot 11): window + rock period (half a rock = one liquid stroke)
    def p_shake():
        m = re.search(r"bottleShake\s*=.*?=>\s*\{(.*?)\n\};", cast, re.S)
        if not m:
            return None
        body = m.group(1)
        for nm, val in re.findall(r"export const ([A-Z_][A-Z0-9_]*)\s*=\s*([\d.]+);", cast):  # named consts (CHAR's SHAKE_T)
            body = re.sub(r"\b%s\b" % nm, val, body)
        a = _js(re.search(r"const t\s*=\s*f\s*-\s*([^,]+),", body).group(1), env0)
        ml = re.search(r"t\s*[<>]=?\s*([\d.]+)\s*\?", body) or re.search(r"t\s*>\s*([\d.]+)", body) or re.search(r"t\s*<\s*([\d.]+)", body)
        L = max(float(x) for x in re.findall(r"t\s*[<>]=?\s*([\d.]+)", body)) if re.findall(r"t\s*[<>]=?\s*([\d.]+)", body) else (float(ml.group(1)) if ml else 22.0)
        mp = re.search(r"Math\.sin\(\(TAU \* t\)\s*/\s*([\d.]+)\)", body)
        mw = re.search(r"Math\.sin\(t\s*\*\s*([\d.]+)\)", body)
        w = (2 * math.pi / float(mp.group(1))) if mp else (float(mw.group(1)) if mw else 1.9)
        out["shake"] = dict(a=a, len=L, w=w)
        return f"bottleShake (cast.ts): {a:.0f} + {L:g} f, {w:.3f} rad/f (a stroke every {math.pi / w:.1f} f)"
    tryp("bottleShake", p_shake)

    # ---- the valve wheels (shot 13): explicit pulls per worker, else the periodic valveAngle
    def p_valves():
        m = re.search(r"const PULLS13[^=]*=\s*\[\s*(\[[^\]]*\])\s*,\s*(\[[^\]]*\])\s*\]", cast, re.S)
        if m:
            out["pulls13"] = [_list(m.group(1), env0), _list(m.group(2), env0)]
            return "PULLS13 (cast.ts): " + " | ".join(", ".join(f"{x:.0f}" for x in w) for w in out["pulls13"])
        m = re.search(r"valveAngle\s*=\s*\(k[^)]*\)\s*=>\s*\{\s*const t\s*=\s*f\s*\+\s*([\d.]+)\s*\*\s*k,\s*n\s*=\s*Math\.floor\(t\s*/\s*([\d.]+)\)"
                      r".*?m\s*/\s*([\d.]+)", cast, re.S)
        if m:
            out["valves"] = dict(phase=float(m.group(1)), period=float(m.group(2)), heave=float(m.group(3)))
            return f"valveAngle (cast.ts): a quarter turn every {float(m.group(2)):g} f, wheel phase {float(m.group(1)):g} f"
        return None
    tryp("valves", p_valves)

    # ---- CHAR's shot-7 bubble: it pops at the reflection's chin when its ring starts
    def p_ring():
        m = re.search(r"const ring\s*=\s*f\s*>=\s*([^?]+)\?", cast)
        if not m:
            return None
        out["bubble_pop"] = _js(m.group(1), env0)
        return f"shot-7 bubble pops / ring starts (cast.ts) = {out['bubble_pop']:.0f}"
    tryp("ring", p_ring)

    # ---- fix r2 (A2): the actions whose SFX sat off the picture
    def p_tick():                       # shot 4: the inspector's pencil check-mark stroke (cast.ts tick = clamp01((f - X) / L))
        r = _ramp(cast, "tick", env0)
        if not r:
            return None
        out["tick"] = r
        return f"shot-4 pencil tick stroke (cast.ts) {r[0]:.0f} + {r[1]:g} f"
    tryp("tick", p_tick)

    def p_wipe():                       # shot 13: the blob's brow wipe (cast.ts wipe = clamp01((f - oilW) / L))
        r = _ramp(cast, "wipe", env0)
        if not r:
            return None
        out["wipe13"] = r
        return f"shot-13 brow wipe (cast.ts) {r[0]:.0f} + {r[1]:g} f"
    tryp("wipe", p_wipe)

    def p_pap():                        # shot 6: Tino raises the fan of OIL RECEIPTS on 'papers' (pap = gest2(f, X, L, ...))
        m = re.search(r"\bpap\s*=\s*gest2\(\s*f\s*,\s*", cast)
        if not m:
            return None
        x = _expr_from(cast, m.end())
        ml = re.match(r"\s*,\s*([\d.]+)", cast[m.end() + len(x):])
        out["papers6"] = (_js(x, env0), float(ml.group(1)) if ml else 12.0)
        return f"shot-6 papers fan raised (cast.ts) {out['papers6'][0]:.0f} + {out['papers6'][1]:g} f"
    tryp("papers", p_pap)

    # ---- fix r3: actions that moved (or may move this round) under the sounds keyed to them
    def p_slam():                       # shot 8: trader 3 slams his handset down onto the phone base at his hip
        m = re.search(r"\bSLAM\s*=\s*", cast)
        ms_ = re.search(r"slam\s*=\s*k\s*===\s*\d+\s*\?\s*gest2\(\s*f\s*,\s*SLAM\s*,\s*([\d.]+)", cast)
        if not m:
            return None
        a = _js2(_expr_from(cast, m.end()), env0)
        out["slam8"] = a + (float(ms_.group(1)) if ms_ else 5.0)
        return f"shot-8 handset slam (cast.ts SLAM + rise) lands {out['slam8']:.0f}"
    tryp("slam", p_slam)

    def p_setdown():                    # shot 11: the bottle is lifted after the shake and set down (kitchen pop window)
        mk = re.search(r"const kitchen\s*=", cast)
        scope = cast[mk.start(): mk.start() + 4000] if mk else ""
        mt = re.search(r"const t\s*=\s*f\s*-\s*([^,;]+)", scope)
        mp = re.search(r"\bpop\s*=\s*t\s*>=\s*([\d.]+)\s*&&\s*t\s*<\s*([\d.]+)", scope)
        if not (mt and mp):
            return None
        out["setdown11"] = _js2(mt.group(1), env0) + float(mp.group(2)) - 1
        return f"shot-11 bottle set back down (cast.ts kitchen pop) {out['setdown11']:.0f}"
    tryp("setdown", p_setdown)

    def p_cues_seen():                  # sources WORLD-INT may add this round: the ticker hammer (shot 8), the steam puff (shot 13)
        si = _read("sets_int.ts")
        both = _strip_comments(si + "\n" + cast)
        tk = re.search(r"(hammer|tickBell|tickerBell)[^\n]{0,240}BEAT\.november|BEAT\.november[^\n]{0,240}(hammer|tickBell|tickerBell)", both)
        stm = re.search(r"(puff|steam)[^\n]{0,240}BEAT\.got\b|BEAT\.got\b[^\n]{0,240}(puff|steam)", both)
        out["ticker_hammer"], out["steam_puff13"] = bool(tk), bool(stm)
        return f"sources in frame: ticker hammer on 'November' {'YES' if tk else 'no'}, shot-13 steam puff on 'got' {'YES' if stm else 'no'}"
    tryp("seen", p_cues_seen)

    # ---- WORLD-INT's pump room (sets_int.ts): the flywheel's rate (one chug per turn) and the flange drip's period
    def p_pump():
        si = _read("sets_int.ts")
        r = []
        m = re.search(r"this\.flywheel\.rotation\.\w\s*=\s*-?VF\s*\*\s*([\d.]+)", si)
        if m:
            out["flywheel_hz"] = float(m.group(1)) * 30.0 / (2 * math.pi)
            r.append(f"flywheel {out['flywheel_hz']:.3f} turns / s")
        m = re.search(r"const ph\s*=\s*\(\(VF\s*%\s*([\d.]+)\)[^;]*;?[^}]*?fall\s*=\s*ph\s*/\s*([\d.]+)[^}]*?this\.drip\.", si, re.S)
        if m:
            out["pump_drip"] = (float(m.group(1)), float(m.group(2)))
            r.append(f"flange drip lands at VF % {float(m.group(1)):g} == {float(m.group(2)):g}")
        return ("pump room (sets_int.ts): " + "; ".join(r)) if r else None
    tryp("pump", p_pump)
    return out, log
