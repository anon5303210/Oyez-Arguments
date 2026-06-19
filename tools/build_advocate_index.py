#!/usr/bin/env python3
"""Build site/data/advocates.json — an inverted index of advocate -> cases.

WHY THIS EXISTS: the Oyez API has no working "cases by advocate" filter, so we crawl
every audio-bearing case once, read its advocates list, and flip it into
advocate -> [cases]. Re-runnable: case detail JSON is cached on disk so re-runs are cheap.

Usage:
    python tools/build_advocate_index.py                 # full range 1955..2025
    python tools/build_advocate_index.py 2020 2022       # a term range (inclusive)
"""
import json, os, sys, time, datetime, re
from concurrent.futures import ThreadPoolExecutor, as_completed

try:
    import requests
except ImportError:
    sys.exit("Please: pip install requests")

API = "https://api.oyez.org"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, "tools", "cache")
OUT = os.path.join(ROOT, "docs", "data", "advocates.json")
WORKERS = 8

S = requests.Session()
S.headers.update({"Accept": "application/json", "User-Agent": "oyez-arguments-personal/1.0"})

def get(url, tries=4):
    for i in range(tries):
        try:
            r = S.get(url, timeout=30)
            if r.status_code == 200:
                return r.json()
        except Exception:
            pass
        time.sleep(1.5 * (i + 1))
    return None

def argued_date(case):
    for e in case.get("timeline") or []:
        if e and e.get("event") == "Argued" and e.get("dates"):
            try:
                return datetime.date.fromtimestamp(e["dates"][0]).strftime("%b %d, %Y")
            except Exception:
                return None
    return None

def url_slug(d, fallback):
    """The case-detail URL slug from the authoritative 'href' (e.g. '14_0', '21a240'),
    NOT the docket_number — they can differ (trailing spaces, capital-letter dockets)."""
    m = re.search(r"/cases/\d+/(.+)$", d.get("href") or "")
    return m.group(1) if m else str(fallback or "").strip()

def normalize_detail(d):
    """Oyez sometimes returns a LIST of case objects for one docket (consolidated cases).
    Return the first dict so downstream .get() calls work."""
    if isinstance(d, list):
        d = next((x for x in d if isinstance(x, dict)), None)
    return d if isinstance(d, dict) else None

def case_detail(term, docket):
    safe = str(docket).replace("/", "_")
    cdir = os.path.join(CACHE, str(term))
    os.makedirs(cdir, exist_ok=True)
    cpath = os.path.join(cdir, safe + ".json")
    if os.path.exists(cpath):
        try:
            with open(cpath, encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    d = get(f"{API}/cases/{term}/{docket}")
    if d is not None:
        with open(cpath, "w", encoding="utf-8") as f:
            json.dump(d, f)
    return d

def main():
    if len(sys.argv) == 3:
        lo, hi = int(sys.argv[1]), int(sys.argv[2])
    else:
        lo, hi = 1955, 2025
    terms = list(range(hi, lo - 1, -1))

    # advocate id -> {id,name,cases:[...]}
    advocates = {}
    total_cases = 0
    audio_cases = 0

    for term in terms:
        lst = get(f"{API}/cases?per_page=1000&filter=term:{term}") or []
        argued = [c for c in lst if any(
            e and e.get("event") == "Argued" for e in (c.get("timeline") or []))]
        if not argued:
            print(f"[{term}] no argued cases")
            continue

        details = {}
        with ThreadPoolExecutor(max_workers=WORKERS) as ex:
            futs = {ex.submit(case_detail, term, c.get("docket_number")): c for c in argued}
            for fut in as_completed(futs):
                c = futs[fut]
                details[c.get("docket_number")] = fut.result()

        term_audio = 0
        for c in argued:
            total_cases += 1
            d = normalize_detail(details.get(c.get("docket_number")))
            if not d:
                continue
            if not (d.get("oral_argument_audio") or []):
                continue  # only index cases that actually have a recording
            audio_cases += 1
            term_audio += 1
            cdate = argued_date(d) or argued_date(c)
            cinfo_base = {
                "term": str(term),
                "docket": url_slug(d, d.get("docket_number") or c.get("docket_number")),
                "name": d.get("name") or c.get("name"),
                "date": cdate,
            }
            for adv in d.get("advocates") or []:
                if not adv or not adv.get("advocate"):
                    continue
                p = adv["advocate"]
                aid = p.get("identifier") or str(p.get("ID"))
                if not aid:
                    continue
                rec = advocates.setdefault(aid, {"id": aid, "name": p.get("name", "Unknown"), "cases": []})
                # de-dupe (a person can appear twice on one case across sessions)
                if not any(x["docket"] == cinfo_base["docket"] and x["term"] == cinfo_base["term"]
                           for x in rec["cases"]):
                    ci = dict(cinfo_base)
                    role = (adv.get("advocate_description") or "").strip()
                    if role:
                        ci["role"] = role
                    rec["cases"].append(ci)
        print(f"[{term}] argued={len(argued)} with-audio={term_audio} advocates so far={len(advocates)}")

    # sort each advocate's cases newest-first
    adv_list = []
    for a in advocates.values():
        a["cases"].sort(key=lambda c: (c["term"], c["docket"]), reverse=True)
        adv_list.append(a)
    adv_list.sort(key=lambda a: a["name"].lower())

    out = {
        "generated": datetime.date.today().isoformat(),
        "case_count": audio_cases,
        "advocate_count": len(adv_list),
        "advocates": adv_list,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False)
    size = os.path.getsize(OUT)
    print(f"\nDONE: {len(adv_list)} advocates, {audio_cases} audio cases "
          f"(of {total_cases} argued). Wrote {OUT} ({size//1024} KB).")

if __name__ == "__main__":
    main()
