const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, AlignmentType, LevelFormat,
  HeadingLevel, TableOfContents, ExternalHyperlink, PageBreak, BorderStyle,
} = require("docx");

const ACCENT = "0b1f3a";
const GOLD = "9a6a00";

const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)] });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] });
const P = (runs, opts = {}) => new Paragraph({ spacing: { after: 140 }, children: Array.isArray(runs) ? runs : [new TextRun(runs)], ...opts });
const t = (text, o = {}) => new TextRun({ text, ...o });
const bullet = (runs) => new Paragraph({ numbering: { reference: "b", level: 0 }, spacing: { after: 80 }, children: Array.isArray(runs) ? runs : [new TextRun(runs)] });
const callout = (label, text) => new Paragraph({
  spacing: { before: 80, after: 160 },
  border: { left: { style: BorderStyle.SINGLE, size: 18, color: GOLD, space: 10 } },
  indent: { left: 180 },
  children: [t(label + "  ", { bold: true, color: GOLD }), t(text, { italics: true })],
});

const children = [];

// ---- Title block ----
children.push(new Paragraph({ spacing: { before: 1400, after: 80 }, alignment: AlignmentType.CENTER,
  children: [t("How I Built a Supreme Court", { bold: true, size: 52, color: ACCENT })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 },
  children: [t("Oral-Argument Listening Site — with an AI", { bold: true, size: 52, color: ACCENT })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 },
  children: [t("A plain-English account of building a real, working website", { italics: true, size: 26 })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 },
  children: [t("for listening to U.S. Supreme Court arguments on a phone", { italics: true, size: 26 })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 360 },
  children: [t("June 19, 2026", { size: 24, color: "666666" })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 },
  children: [t("Audio & data courtesy of ", { size: 22, color: "666666" }),
    new ExternalHyperlink({ link: "https://www.oyez.org", children: [new TextRun({ text: "Oyez", style: "Hyperlink", size: 22 })] }),
    t(" · CC BY-NC · personal, non-commercial use", { size: 22, color: "666666" })] }));
children.push(new Paragraph({ children: [new PageBreak()] }));

// ---- TOC ----
children.push(H1("Contents"));
children.push(new TableOfContents("Contents", { hyperlink: true, headingStyleRange: "1-1" }));
children.push(new Paragraph({ children: [new PageBreak()] }));

// ---- Intro ----
children.push(H1("What this is"));
children.push(P([
  t("I set out to build something small but genuinely useful: a phone-friendly website for listening to U.S. Supreme Court "),
  t("oral arguments"), t(" — the recorded debates lawyers have in front of the Justices. A wonderful free service called "),
]));
children.push(P([
  new ExternalHyperlink({ link: "https://www.oyez.org", children: [new TextRun({ text: "Oyez", style: "Hyperlink" })] }),
  t(" already has decades of these recordings, but its own phone experience is clunky. So this site is a friendlier front door to Oyez’s audio — not a copy of it."),
]));
children.push(P([
  t("This document is the cleaned-up version of a diary I kept the whole way through. The point isn’t the legal trivia — it’s to show, in plain English, "),
  t("how a working website actually gets built with an AI assistant", { bold: true }),
  t(": the false starts, the surprises in the data, and the small habits that kept it on track."),
]));
children.push(callout("The finished result:", "open a web link on your phone, browse by year or search for a particular lawyer, tap a case, and listen — with the screen locked, even while you text."));

// ---- The approach ----
children.push(H1("The one habit that shaped everything: a journal first"));
children.push(P([
  t("Before writing a single line of the website, I had the AI set up two files. One was a standing instruction to itself — “after every meaningful step, write a plain-English diary entry a non-technical friend could follow.” The other was the diary. "),
  t("Writing down the plan and the reasoning before building", { bold: true }),
  t(" forced clear thinking and left a trail anyone can retrace."),
]));
children.push(callout("Takeaway:", "Start any project by writing down what you’re about to do and why. Five minutes of “plan on paper” prevents hours of confident wandering."));

// ---- Investigating the data ----
children.push(H1("Looking before leaping: investigating the data"));
children.push(P([
  t("Oyez offers an "), t("API", { bold: true }),
  t(" — a way for one program to request tidy, machine-readable data from another. Rather than trust the documentation, I poked it directly to see what really comes back. Four findings shaped the whole build:"),
]));
children.push(bullet([t("Listing a year’s cases works cleanly", { bold: true }), t(" — name, date, case number, and a link to details.")]));
children.push(bullet([t("The recordings are real and streamable", { bold: true }), t(" — each case points to actual MP3 audio, and cases argued over several sessions are handled naturally.")]));
children.push(bullet([t("The make-or-break test passed", { bold: true }), t(" — a browser security rule called "), t("CORS", { italics: true }), t(" decides whether one website may fetch another’s data. Oyez leaves it wide open, which means a phone’s browser can talk to Oyez directly. No middleman server needed — a huge simplification.")]));
children.push(bullet([t("One real dead end", { bold: true }), t(" — there is no working “give me every case for this lawyer” lookup. The filter I hoped to use silently ignored me, returning the same cases for every lawyer.")]));
children.push(callout("Takeaway:", "When a data source claims to filter, verify it. Feed it two different inputs; if the output doesn’t change, it isn’t filtering — it’s ignoring you. Catching that early saved building a feature on a foundation that didn’t exist."));

// ---- Decisions ----
children.push(H1("Three decisions, and the reasons"));
children.push(P([t("Big technical choices are really trade-offs. I wrote down the single reason that decided each one:")]));
children.push(bullet([t("How the data flows — “hybrid.” ", { bold: true }), t("Browsing happens live against Oyez (we proved that’s allowed); only the lawyer-search index is pre-built. New cases then appear automatically.")]));
children.push(bullet([t("Where it lives — GitHub Pages. ", { bold: true }), t("Free and durable, and it keeps the site, this journal, and the write-up versioned together — fitting for a “how I built this” project. No command line required.")]));
children.push(bullet([t("Lawyer index — build the full range now. ", { bold: true }), t("So search works for everyone, old advocates included, from day one.")]));

// ---- Building ----
children.push(H1("Building the site"));
children.push(P([
  t("The site is deliberately simple — plain web building blocks, no heavy machinery — with three screens: a grid of years, the cases in a year, and a player. A key design choice serves the hardest requirement (audio that doesn’t stop): there is exactly "),
  t("one", { italics: true }),
  t(" audio player in the whole app, plus a small bar pinned to the bottom. As you move between screens the page content swaps, but the audio is never touched — so nothing interrupts the sound."),
]));
children.push(P([
  t("I also wired up the phone’s "), t("lock-screen controls", { bold: true }),
  t(" (so the case name and play/pause appear when the screen is off) and made the site "),
  t("installable to the home screen", { bold: true }), t(", which gives iPhones the best chance of keeping audio alive in the background."),
]));
children.push(P([t("Then I ran it and walked the whole path. Two bugs only showed up by actually using it:")]));
children.push(bullet([t("A bottom bar appeared even when nothing was playing — a styling rule was quietly overriding the “hide me” flag. One-line fix.")]));
children.push(bullet([t("The lock-screen play/pause state didn’t track the real audio. Fixed to stay in sync.")]));
children.push(callout("Takeaway:", "“It rendered” is not “it works.” Click all the way through, and watch a number that should change — here, the playback clock. Both bugs were invisible in the code and obvious the instant it ran."));

// ---- The crawl ----
children.push(H1("The lawyer index — and a sneaky crash"));
children.push(P([
  t("Because Oyez can’t list a lawyer’s cases, I built my own index: a small program (a "),
  t("crawler", { bold: true }),
  t(") visited every recorded case from 1955 to today, read who argued it, and flipped that into a “lawyer → their cases” file. To be polite and fast it fetched several at a time and "),
  t("saved each case to disk", { bold: true }),
  t(", so re-running it later would be nearly instant."),
]));
children.push(P([
  t("It crashed at the year 2000. The cause was a data surprise: some Supreme Court dockets are "),
  t("consolidated cases", { italics: true }),
  t(" — several bundled under one number — and for those Oyez returns a "),
  t("list", { italics: true }),
  t(" of records instead of one. My code assumed a single record and tripped on the first one. The fix was a single guard: “if it comes back as a list, take the first record.” Because everything already fetched was cached, the recovery took seconds rather than starting over."),
]));
children.push(P([
  t("The finished index covers "),
  t("7,564 advocates across 7,273 recorded cases (1955–2025)", { bold: true }),
  t(". Spot checks confirmed it: Ruth Bader Ginsburg shows six arguments in 1972–1978 — her ACLU advocacy years, before she was a judge — exactly as it should."),
]));
children.push(callout("Takeaway:", "Two lessons. Cache as you go, so a crash costs seconds, not hours. And real data is never perfectly uniform — the moment you assume “every item looks like this,” one won’t. A one-line “handle the odd shape” guard is cheaper than the crash it prevents."));

// ---- Finishing ----
children.push(H1("Tidying up, and a full dress rehearsal"));
children.push(P([
  t("The free host publishes from a specific folder, so I moved the website files there, then re-walked the entire site on the complete index — searching “Ginsburg,” opening her 1978 case, and confirming the 53-minute recording streamed. Old audio plays as cleanly as new. I also wrote click-by-click deployment instructions and told the host to ignore the crawler’s thousands of scratch files so only the finished index gets published."),
]));
children.push(callout("Takeaway:", "After moving files to satisfy a host’s rules, don’t assume the move was clean — re-run your full click-through. A short dress rehearsal catches “worked before, broke in the move” before users do."));

// ---- How it works summary ----
children.push(H1("How the finished site works"));
children.push(bullet([t("Browse: ", { bold: true }), t("a grid of terms (years) → that year’s argued cases, newest first → a player with the case’s legal question and facts.")]));
children.push(bullet([t("Search: ", { bold: true }), t("type a lawyer’s name to see every argument they appear in, grouped by year, each tappable straight to its audio.")]));
children.push(bullet([t("Listen: ", { bold: true }), t("audio streams live from Oyez (never copied or re-hosted), with lock-screen controls and a scrubber you can drag.")]));
children.push(bullet([t("Install: ", { bold: true }), t("add it to your home screen so it behaves like an app, which helps audio keep playing in the background.")]));
children.push(P([t("Oyez is credited on every screen, and the whole thing is for personal, non-commercial use, honoring Oyez’s license.")], { spacing: { before: 120, after: 120 } }));

// ---- Honest limits ----
children.push(H1("An honest note on the hard part"));
children.push(P([
  t("The strict requirement — audio that keeps playing when an iPhone is locked and you switch to texting — is exactly where mobile browsers are fussiest. Apple’s Safari is stricter about background audio than Android’s Chrome. The measures here (a single persistent player, lock-screen integration, and home-screen install) are the right and standard levers, but the only real proof is testing on the actual phone. That final test is the last step before calling this truly done — and the kind of honesty worth keeping in any build."),
]));

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Georgia", size: 23 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Arial", color: ACCENT },
        paragraph: { spacing: { before: 320, after: 160 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: "Arial", color: ACCENT },
        paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 1 } },
    ],
  },
  numbering: { config: [{ reference: "b", levels: [
    { level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 540, hanging: 280 } } } }] }] },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    children,
  }],
});

Packer.toBuffer(doc).then(buf => { fs.writeFileSync("HOW_I_BUILT_THIS.docx", buf); console.log("wrote HOW_I_BUILT_THIS.docx", buf.length, "bytes"); });
