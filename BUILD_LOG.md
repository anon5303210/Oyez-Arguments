# Build Log — Oyez Oral Arguments listening site

A plain-English diary of how this site got built with the help of an AI assistant.
Newest entries are added at the bottom. If you're not technical, you can still follow
along — jargon gets a one-line explanation the first time it shows up.

---

## Entry 1 — 2026-06-19 — Setting up and making a plan

**What we were trying to do (plain English).**
Kick the project off the right way: before writing any code, set up a notebook that
records *how* we build this, so a friend who doesn't code could read it and learn. Then
figure out exactly what we're building — a simple phone website for listening to US
Supreme Court oral arguments (the recorded debates lawyers have in front of the Justices).

**The decision/instruction that drove it.**
The owner asked for two things to be treated as equally important: (1) the website, and
(2) this very journal. They asked me to set up the journal *first*, then go explore the
data source (a free public service called **Oyez** that has decades of these recordings),
prove the data works, and only *then* propose a plan — not start coding blind.

**What actually happened.**
- I created two files. **CLAUDE.md** — think of it as a sticky note the AI reads at the
  start of every work session, reminding it of the rules (always update this journal, never
  host audio files, make sure audio keeps playing when the phone is locked, credit Oyez).
  And **BUILD_LOG.md** — this diary.
- *Jargon, one line:* an **API** is a way for one program to ask another program for data,
  getting back tidy machine-readable text (here, in a format called **JSON**) instead of a
  web page meant for human eyes.
- Next up (in this same session): actually poke Oyez's API to see what its data looks like,
  and test one make-or-break technical question — **CORS** — explained when we get there.

**The plan in one breath.**
List of terms (years) → tap a year to see that year's cases → tap a case to listen, with
the audio streamed live and engineered to keep playing when the screen is off. Plus a
search box to find every case argued by a particular lawyer (e.g. "Paul Clement").

**Try-it-yourself takeaway.**
Before building anything with an outside data source, do two cheap things first: (1) look
at the *actual* data the source returns (open the API link in a browser), and (2) confirm
you're allowed to use it the way you intend (here, Oyez data is free for non-commercial use
if you credit them). Five minutes of looking saves hours of building on a bad assumption.

---

## Entry 2 — 2026-06-19 — Poking the Oyez API to see what's real

**What we were trying to do (plain English).**
Before building, actually *test* Oyez's data service: see the shape of the data, confirm
the audio links work, and answer one make-or-break question — can a web page open directly
in your phone's browser fetch this data, or will the browser refuse?

**The decision/instruction that drove it.**
The owner explicitly said: explore the endpoints, show what the JSON looks like, test
whether the browser can call the API directly, *and* figure out the cleanest way to list
every case argued by one lawyer — all before proposing a plan.

**What actually happened — the findings.**
1. **Listing a year's cases works great.** Asking for one term (e.g. 1965) returns a tidy
   list — case name, docket number (the court's case ID), argument date, and a link to
   full details. The 1965 term had 135 cases; modern terms have ~60.
2. **Audio is confirmed and streamable.** Each case's detail includes an
   `oral_argument_audio` *list* (a list, not a single item — so cases argued over multiple
   sessions are handled naturally). Following that link gives real MP3 web addresses hosted
   on Amazon's storage (S3). Audio exists from roughly the 1955 term to the present
   (2025). Older terms have case records but no recordings.
3. **The make-or-break test passed: CORS is wide open.** *Jargon, one line:* **CORS** is a
   browser security rule that lets a website block other websites from fetching its data;
   if Oyez had it locked down, our page couldn't load anything and we'd need a middleman
   server. We checked the response headers and Oyez sends `Access-Control-Allow-Origin: *`
   — meaning "anyone's web page may call me." This is true for the data API *and* the MP3
   files, and the MP3s also support "range requests" (`Accept-Ranges: bytes`), which is
   what lets you drag the scrubber to jump around in the audio. **Translation: our phone
   website can talk to Oyez directly. No middleman server needed.**
4. **The "list a lawyer's cases" question — a real dead end, and the fix.** I hoped the API
   had a filter like "give me every case for advocate #37772" (that's Paul Clement's ID).
   I tried it. It *looked* like it worked, but it was lying: it returned the same cases no
   matter which lawyer's ID I gave it — the filter is silently ignored. Asking for "all of
   them at once" even crashed Oyez's server with a timeout. So there is **no working
   advocate filter**. The clean fix: since we're pre-building a small data file for the
   site anyway, we'll *also* build a one-time index that reads each case's lawyer list and
   flips it around into "lawyer → their cases." Build it once, ship it with the site,
   searches are then instant.

**Why this matters for the plan.** Because the browser can call Oyez live, *browsing*
(years → cases → press play) can work with no server and almost no pre-built data. The
*only* thing that needs a pre-build step is the lawyer search index, because the API won't
do it for us.

**Try-it-yourself takeaway.**
When an API filter returns results, don't trust it — *verify* it actually filtered. Give it
two different inputs and check the outputs differ. A filter that returns the same thing for
every input isn't filtering; it's ignoring you. Catching that now saved us from building a
search feature on a foundation that doesn't exist.

---

## Entry 3 — 2026-06-19 — Three decisions, and why

**What we were trying to do (plain English).**
Lock in the three big choices that shape everything else, so building doesn't wander.

**The decisions and the reasoning.**
1. **How the data flows: "hybrid."** Browsing (years → cases → press play) talks to Oyez
   *live* from your phone, because we proved the browser is allowed to (CORS is open). The
   only thing we pre-build is the lawyer-search index, because Oyez can't do that lookup
   for us. Upside: new cases show up automatically; only the lawyer index ever needs a
   refresh.
2. **Where it lives: GitHub Pages.** It's free and durable, and — the deciding reason —
   this project is a site *plus* a written journal *plus* a Word write-up; GitHub keeps all
   of it together with a full change history, which suits a "how I built this" project. You
   can do everything in the browser; no command-line required.
3. **Lawyer index: build the full range now (~1955–2025).** So search works for everyone
   from day one, old advocates included. It's a one-time crawl we can re-run later.

**A small refinement I made while planning (worth knowing).**
The plain year→cases list from Oyez doesn't say which cases have *recordings*. Rather than
make your phone check all ~60 cases one-by-one (slow), I'll use a reliable shortcut: Oyez
marks when a case was "Argued," and for 1955-onward an "Argued" case almost always has
audio. We show those, and if a particular recording turns out to be missing, the player
says so plainly instead of failing silently.

**Try-it-yourself takeaway.**
Big technical choices are really *trade-off* choices, not right/wrong ones. Write down the
one reason that actually decided each call (here: "all project pieces versioned together"
picked GitHub). Future-you re-reading the journal will understand the *why*, not just the
*what*.

---

## Entry 4 — 2026-06-19 — Building the actual site, and watching it play

**What we were trying to do (plain English).**
Build the real thing: a phone-shaped website with three screens — a grid of years, the
list of cases in a year, and a player — and prove a real recording streams and plays.

**The decision/instruction that drove it.**
Keep it simple (plain HTML/CSS/JavaScript, no big framework), mobile-first, and test each
piece as we go rather than building everything blind.

**What actually happened.**
- I built the page as a single small app with **hash routing** — *jargon:* the part of a
  web address after a `#`; it lets one page act like several screens (years, a year's
  cases, a player) without reloading, which keeps audio alive as you move around.
- A key design decision for the "audio must never stop" rule: there is exactly **one**
  audio player in the whole app, plus a **persistent mini-player bar** pinned to the
  bottom. When you tap between screens, the page content swaps but the audio element and
  its playback are never touched — so nothing interrupts the sound.
- I added the **Media Session API** (the thing that puts the case name and play/pause on
  your phone's lock screen) and registered a **service worker** — *jargon:* a small helper
  the browser keeps around so the site can be "installed" to your home screen and load fast.
- Then I ran it on a local test browser and walked the whole path: the year grid showed all
  71 terms (1955–2025); tapping **2022** listed 60 argued cases, newest first, with dates
  and case numbers; tapping **Tyler v. Hennepin County** opened the player, pulled the real
  MP3 from Oyez, showed the 1-hour-40-minute length, the legal Question, and the Facts — and
  when I pressed play, **the audio actually streamed and the clock ticked forward.**
- **Two bugs caught by testing, both fixed.** (1) The bottom mini-player was showing even
  when nothing was playing — a styling rule was quietly overriding the "hide me" flag; fixed
  with a one-line rule so "hidden" always wins. (2) I made the lock-screen play/pause state
  stay in sync with the actual audio. Small things, but exactly the kind only *running* it
  reveals.

**Try-it-yourself takeaway.**
"It rendered" is not "it works." Click all the way through the real path — and watch a
number that should change (here, the playback clock). The two bugs above were invisible in
the code and obvious the moment the thing actually ran.

---

## Entry 5 — 2026-06-19 — Building the "lawyer → cases" index (and a sneaky crash)

**What we were trying to do (plain English).**
Make the advocate search actually search *everything*, not just one year. Because Oyez has
no working "give me this lawyer's cases" lookup (Entry 2), we had to build our own — by
visiting every recorded case from 1955 to today, noting which lawyers argued it, and
flipping that into a "lawyer → their cases" list saved as a single file the site can load.

**The decision/instruction that drove it.**
The owner chose "build the full range now" so search works for everyone — old advocates
included — from day one.

**What actually happened.**
- I wrote a small crawler — *jargon:* a program that automatically visits many web
  addresses and collects data. It walks every term, and for each case fetches the detail
  page to read the lawyer list. To be polite and fast it fetches 8 at a time, and it
  **saves each case to disk** so re-running it later is nearly instant instead of starting
  over.
- I tested it on a single year (2022) first — 103 lawyers, looked right (Solicitor General
  Prelogar showed her 8 arguments). Then launched the full 1955–2025 run in the background.
- **It crashed at the year 2000.** The error: *"'list' object has no attribute 'get'."*
  Translation: my code expected each case to come back as a single record, but some Supreme
  Court dockets are **consolidated cases** — several cases bundled under one number — and
  for those Oyez hands back a *list* of records instead of one. The first time the crawler
  hit one, it tripped.
- While I was fixing it, the owner noticed search "only worked for 2022." That was a
  separate, expected quirk: the index file only gets written at the very *end* of a run, so
  until then it still held the old 2022 test. I rebuilt an interim index from the years
  already saved to disk (instantly, no re-downloading), so search jumped to 2004–2025
  immediately — a nice payoff from having cached everything.
- The fix was one helper: "if a case comes back as a list, just take the first record."
  Re-ran it; because 2000–2025 were already cached, it flew through those and only had to
  download the older decades.

**The result.** **7,564 advocates across 7,273 recorded cases (1955–2025).** Sanity checks
all passed: Ruth Bader Ginsburg shows 6 arguments in 1972–1978 (her famous ACLU years
*before* she was a judge — exactly right), Paul Clement 125, Thurgood Marshall 4 in the
early 1960s. The whole file is about 2.6 MB, which the web host automatically compresses to
roughly a quarter of that, loaded once and remembered.

**Try-it-yourself takeaway.**
Two lessons in one. First, **cache as you crawl** — saving each piece to disk turned a
"start over" crash into a 30-second recovery and let us ship a partial result immediately.
Second, real-world data is never perfectly uniform: the moment you assume "every item looks
like this," some item won't. A one-line "handle the odd shape" guard is cheaper than the
crash it prevents.

---

## Entry 6 — 2026-06-19 — Tidying up for the web, and a full dress rehearsal

**What we were trying to do (plain English).**
Get the project into the exact shape the free web host expects, then walk the entire site
one more time — including a recording from the 1970s — to be sure nothing broke in the move.

**The decision/instruction that drove it.**
We picked GitHub Pages (Entry 3), and it will only publish a site from one of two specific
folders. So the website files needed to live in a folder named **`docs`**.

**What actually happened.**
- Moved all the website files into a `docs/` folder and pointed the test server and the
  crawler at the new location. *Jargon:* `docs/` is just a folder name GitHub treats
  specially — "publish what's in here."
- Restarted the test browser and did a full dress rehearsal on the *complete* index:
  searched "Ginsburg" (got Ruth Bader Ginsburg, 6 arguments), tapped into her **Duren v.
  Missouri (1978)**, and the player pulled the real 53-minute recording and showed its
  length. Old audio streams just as cleanly as new.
- Wrote a plain-English **DEPLOY.md** with click-by-click, no-command-line instructions for
  putting the site online and adding it to a phone's home screen.
- Added a **`.gitignore`** — *jargon:* a list of files to *not* upload — so the crawler's
  thousands of cached case files and log don't clutter the public repository. The finished
  `advocates.json` still ships; the raw cache that produced it does not.

**Where things stand.** The site is feature-complete and verified on a desktop test
browser: terms → cases → player, advocate search across seven decades, streaming audio,
lock-screen metadata, and installable-to-home-screen. The one thing a desktop *cannot*
prove is the hard requirement — audio surviving a locked iPhone while you get a text. That's
the next step, and it has to happen on the real phone after deploying.

**Try-it-yourself takeaway.**
When you move files around for a host's rules, don't assume the move was clean — re-run your
full click-through afterward. A five-minute dress rehearsal catches the "worked before, broke
in the move" surprises before your users do.

---

## Entry 7 — 2026-06-19 — Turning the diary into a Word write-up

**What we were trying to do (plain English).**
Produce the polished, shareable version of this journey — a Word document a friend could
read start to finish — called **HOW_I_BUILT_THIS.docx**.

**The decision/instruction that drove it.**
From the start, the plan was to end by generating a cleaned-up Word version of this log.

**What actually happened.**
- Rather than hand-format a document, I generated it with a small script so it's
  reproducible — a title page, a contents list, and the story rewritten to flow (the idea,
  the journal-first habit, investigating the data, the three decisions, building, the
  crawler crash, finishing, how it works, and an honest note on the hard iOS part).
- A tiny detour: the document *checker* crashed — not on the document, but on its own
  inability to print an arrow character "→" in the Windows terminal. Telling the terminal
  to use modern text encoding fixed it, and the document then passed all checks. (A good
  reminder that an error is sometimes in the *tool*, not your work.)
- One honest limitation noted: on this Windows machine I couldn't auto-render the Word file
  to an image to eyeball it, because the converter needs features Windows doesn't provide.
  The structural validation passed, and the table of contents fills itself in the moment
  you open the file in Word.

**Where this leaves us.** The build is complete and documented. The only remaining step is
the real-world test the owner has to do: deploy with the steps in DEPLOY.md, add the site to
the iPhone home screen, start a recording, lock the phone, get a text, switch apps — and
confirm the audio keeps playing. That's the true finish line.

**Try-it-yourself takeaway.**
Generate your final write-up from a script or your notes, not by hand — it stays honest to
what actually happened and you can regenerate it after the last test. And when a tool errors,
read the message: sometimes the bug is the tool tripping over itself, not your work.

---

## Entry 8 — 2026-06-19 — A proper inspection before going live (and a bug it caught)

**What we were trying to do (plain English).**
Before publishing, prove two things: that the site has no obvious bugs, and that the lawyer
index really contains *everyone* — not just recent years.

**The decision/instruction that drove it.**
The owner asked, plainly: run the tests, confirm no bugs, and confirm it has all the
advocates — *then* deploy.

**What actually happened.**
- I wrote a checker that cross-examined our data against Oyez itself: every term from 1955
  to 2025 covered (no gaps), 7,566 lawyers across 7,274 recorded cases, zero blank names or
  malformed records.
- **An honest finding about coverage:** the 1950s–60s have very few searchable lawyers —
  but that's because *Oyez itself* often doesn't list the advocates for those old cases. I
  confirmed this by asking Oyez's own service directly: it returns "no advocates" for them.
  So the recordings are there to listen to; the lawyer *labels* simply don't exist that far
  back. We report what exists rather than inventing it.
- **The bug worth the whole exercise.** A case's web address uses a short code (a "slug").
  I had been building that address from the case's *docket number* — and for 25 cases those
  two differ: some dockets have stray spaces, and special cases (emergency applications,
  state-vs-state suits) use capital letters that the address writes in lowercase — e.g.
  *Trump v. CASA* is docket "24A884" but lives at ".../24a884". Building from the docket
  produced dead links for all 25 — including several recent, high-profile cases. The fix:
  always use the *authoritative* address Oyez gives us, never rebuild it ourselves. I then
  clicked through the formerly-broken cases and they now play.
- I also tested the multi-session player (a case argued over three days switches recordings
  correctly) and the "no recording available" message (shown gracefully, no broken buttons).

**Try-it-yourself takeaway.**
Verification isn't ceremony — it pays. A single checking pass turned up 25 silently broken
links to important cases that looked perfectly fine in the code. If you build on someone
else's identifiers, use *their* exact reference; don't reconstruct it from a field that's
"usually the same." Usually isn't always.
