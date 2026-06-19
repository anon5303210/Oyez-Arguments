#!/usr/bin/env python3
"""Verify the advocate index for completeness and data quality.
Checks:
  1. Index stats: advocates, unique cases, term coverage + gaps.
  2. Fetch-failure check: for every term, does the disk cache hold a detail
     for every argued case? (catches cases silently dropped by network errors)
  3. Cross-check vs live API: cached-detail count == API argued count per term.
  4. Data-quality: blank names, missing docket/term, audio-without-advocates.
  5. Spot checks of well-known advocates.
"""
import json, os, glob, sys
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IDX = os.path.join(ROOT, "docs", "data", "advocates.json")
CACHE = os.path.join(ROOT, "tools", "cache")
API = "https://api.oyez.org"
S = requests.Session(); S.headers.update({"Accept": "application/json"})

def api_argued(term):
    try:
        r = S.get(f"{API}/cases?per_page=1000&filter=term:{term}", timeout=30)
        lst = r.json()
        return [c for c in lst if any(e and e.get("event") == "Argued"
                for e in (c.get("timeline") or []))]
    except Exception:
        return None

def cached_detail(term, docket):
    p = os.path.join(CACHE, str(term), str(docket).replace("/", "_") + ".json")
    if not os.path.exists(p):
        return None
    with open(p, encoding="utf-8") as f:
        d = json.load(f)
    if isinstance(d, list):
        d = next((x for x in d if isinstance(x, dict)), None)
    return d if isinstance(d, dict) else None

def main():
    d = json.load(open(IDX, encoding="utf-8"))
    advs = d["advocates"]
    print(f"INDEX: {len(advs)} advocates | claimed case_count={d['case_count']} | generated {d['generated']}")

    # unique cases + term coverage
    cases = set(); per_term = {}
    for a in advs:
        for c in a["cases"]:
            key = (c["term"], c["docket"])
            cases.add(key)
            per_term[c["term"]] = per_term.get(c["term"], 0) + (1 if key not in per_term.get("_seen", set()) else 0)
    # recompute per_term cleanly
    per_term = {}
    for k in cases:
        per_term[k[0]] = per_term.get(k[0], 0) + 1
    print(f"UNIQUE CASES in index: {len(cases)}")
    terms = sorted(int(t) for t in per_term)
    print(f"TERM COVERAGE: {terms[0]}..{terms[-1]} ({len(terms)} terms with >=1 indexed case)")
    gaps = [y for y in range(terms[0], terms[-1]+1) if y not in terms]
    print(f"  gaps (terms 1955-2025 with ZERO indexed cases): {gaps or 'none'}")

    # 4. data quality
    blank = [a for a in advs if not a["name"].strip() or a["name"] == "Unknown"]
    badcase = [c for a in advs for c in a["cases"] if not c.get("term") or not c.get("docket")]
    print(f"DATA QUALITY: blank/Unknown advocate names={len(blank)} | cases missing term/docket={len(badcase)}")

    # 2+3. completeness vs cache + live API (all terms)
    print("\nCOMPLETENESS (API argued vs cached details vs index audio):")
    problems = []
    audio_total = 0
    no_adv_total = 0
    def check(term):
        argued = api_argued(term)
        if argued is None:
            return (term, "API_FAIL", 0,0,0,0)
        missing_cache = 0; audio=0; no_adv=0
        for c in argued:
            dt = cached_detail(term, c.get("docket_number"))
            if dt is None:
                missing_cache += 1; continue
            if dt.get("oral_argument_audio"):
                audio += 1
                if not (dt.get("advocates") or []):
                    no_adv += 1
        return (term, "OK", len(argued), missing_cache, audio, no_adv)

    rows = []
    with ThreadPoolExecutor(max_workers=8) as ex:
        futs = [ex.submit(check, t) for t in range(1955, 2026)]
        for f in as_completed(futs):
            rows.append(f.result())
    rows.sort()
    for term, status, nargued, missing, audio, no_adv in rows:
        audio_total += audio; no_adv_total += no_adv
        idx_n = per_term.get(str(term), 0)
        flag = ""
        if status != "OK": flag = "  <-- API FETCH FAILED"
        elif missing: flag = f"  <-- {missing} CASES NOT CACHED"
        # index count can be < audio count when an audio case has no advocates listed
        if flag:
            problems.append((term, flag.strip()))
        print(f"  {term}: argued={nargued:3d} cached_missing={missing:2d} audio={audio:3d} "
              f"audio_no_advocates={no_adv:2d} index_cases={idx_n:3d}{flag}")

    print(f"\nTOTAL audio cases (from cache): {audio_total} | of those with NO advocate list: {no_adv_total}")
    print(f"INDEX unique cases: {len(cases)}  (= audio_total - audio_no_advocates = {audio_total - no_adv_total})")
    print("\nPROBLEMS:", problems or "NONE")

    print("\nSPOT CHECKS:")
    want = {
        "Paul D. Clement": (50, 2000, 2025),
        "Thurgood Marshall": (1, 1955, 1967),
        "Ruth Bader Ginsburg": (1, 1970, 1980),
        "Elizabeth B. Prelogar": (5, 2021, 2025),
        "Theodore B. Olson": (10, 1980, 2025),
        "John G. Roberts, Jr.": (5, 1989, 2005),
    }
    for name,(minc,lo,hi) in want.items():
        a = next((x for x in advs if x["name"] == name), None)
        if not a: print(f"  MISSING: {name}"); continue
        cs = a["cases"]; span=(cs[-1]["term"], cs[0]["term"])
        ok = len(cs) >= minc
        print(f"  {'OK ' if ok else 'LOW'} {name}: {len(cs)} cases, span {span}")

if __name__ == "__main__":
    main()
