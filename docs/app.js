/* Oyez Arguments — a friendly mobile front-end over the Oyez API.
   Plain JS, no framework. Hash-based routing so it works on GitHub Pages.
   Data: api.oyez.org (CORS open). Audio: streamed S3 MP3 via one <audio> element. */

const API = "https://api.oyez.org";
const $ = (s, r = document) => r.querySelector(s);

const els = {
  view: $("#view"),
  title: $("#title"),
  back: $("#backBtn"),
  searchBtn: $("#searchBtn"),
  audio: $("#audio"),
  mini: $("#miniplayer"),
  miniPlay: $("#miniPlay"),
  miniTitle: $("#miniTitle"),
  miniSub: $("#miniSub"),
  miniMeta: $("#miniMeta"),
};

/* What is currently loaded into the audio element (so the mini-player & player stay in sync) */
let now = null; // { caseName, term, docket, sessionTitle, src, route }

/* ----------------------------- tiny helpers ----------------------------- */
const html = (strings, ...vals) =>
  strings.reduce((a, s, i) => a + s + (vals[i] ?? ""), "");

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function stripTags(s) { return String(s ?? "").replace(/<[^>]*>/g, "").trim(); }

function fmtTime(sec) {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}:${String(m % 60).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/* Oyez stores dates as unix seconds; argument date lives in timeline 'Argued' event */
function arguedDate(c) {
  const t = (c.timeline || []).find(e => e && e.event === "Argued");
  const d = t && t.dates && t.dates[0];
  if (!d) return null;
  return new Date(d * 1000).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
function hasArgument(c) {
  return (c.timeline || []).some(e => e && e.event === "Argued");
}

/* The case-detail URL slug from the authoritative 'href', NOT docket_number —
   they differ for some cases (trailing spaces like "23-108 ", capital dockets
   like "21A240" -> "21a240"). Reconstructing from docket_number breaks those. */
function caseSlug(c) {
  const m = /\/cases\/\d+\/(.+)$/.exec((c && c.href) || "");
  return m ? m[1] : String((c && c.docket_number) || "").trim();
}
function cleanDocket(d) { return String(d || "").trim(); }

async function getJSON(url) {
  const r = await fetch(url, { headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error(`Oyez returned ${r.status}`);
  return r.json();
}

/* ----------------------------- UI scaffolding ----------------------------- */
function setTitle(t) { els.title.textContent = t; document.title = t + " · Oyez Arguments"; }
function showBack(show) { els.back.hidden = !show; }
function loading(msg = "Loading…") {
  els.view.innerHTML = html`<div class="center"><div class="spinner"></div><div>${esc(msg)}</div></div>`;
}
function errorView(msg, retry) {
  els.view.innerHTML = html`<div class="errbox">${esc(msg)}</div>
    ${retry ? `<p><button class="linkbtn" id="retry">Try again</button></p>` : ""}`;
  if (retry) $("#retry").onclick = retry;
}

/* ----------------------------- routing ----------------------------- */
window.addEventListener("hashchange", route);
window.addEventListener("load", () => { initAudio(); route(); registerSW(); });

function go(hash) { location.hash = hash; }

function route() {
  const h = location.hash.replace(/^#\/?/, "");
  const parts = h.split("/").filter(Boolean).map(decodeURIComponent);
  window.scrollTo(0, 0);

  if (parts.length === 0) return viewTerms();
  if (parts[0] === "term") return viewTermCases(parts[1]);
  if (parts[0] === "case") return viewPlayer(parts[1], parts.slice(2).join("/"));
  if (parts[0] === "advocates") return viewAdvocateSearch();
  if (parts[0] === "advocate") return viewAdvocateCases(parts[1]);
  return viewTerms();
}

els.back.onclick = () => history.length > 1 ? history.back() : go("/");
els.searchBtn.onclick = () => go("/advocates");

/* ----------------------------- VIEW: terms ----------------------------- */
async function viewTerms() {
  setTitle("Oyez Arguments");
  showBack(false);
  loading("Loading terms…");
  let terms;
  try {
    terms = await getJSON("data/terms.json");
  } catch {
    // Fallback: terms.json missing — generate a sensible range live.
    const thisYear = new Date().getFullYear();
    terms = [];
    for (let y = thisYear; y >= 1955; y--) terms.push({ term: String(y) });
  }
  const tiles = terms.map(t => {
    const y = String(t.term);
    const label = `${y}–${String(Number(y) + 1).slice(-2)}`; // 2022 -> 2022–23 (SCOTUS term spans two years)
    return html`<button class="tile" onclick="go('/term/${y}')">
      <div class="tile-year">${esc(y)}</div>
      <div class="tile-sub">Term ${esc(label)}</div>
    </button>`;
  }).join("");

  els.view.innerHTML = html`
    <p class="hint">Pick a Supreme Court term (the year arguments were heard), or tap ⌕ to search by advocate.</p>
    <div class="grid">${tiles}</div>`;
}

/* ----------------------------- VIEW: cases in a term ----------------------------- */
async function viewTermCases(term) {
  setTitle(`Term ${term}`);
  showBack(true);
  loading(`Loading ${term} cases…`);
  try {
    const all = await getJSON(`${API}/cases?per_page=1000&filter=term:${encodeURIComponent(term)}`);
    const list = (Array.isArray(all) ? all : [])
      .filter(hasArgument)
      .sort((a, b) => {
        const da = (a.timeline || []).find(e => e.event === "Argued")?.dates?.[0] || 0;
        const db = (b.timeline || []).find(e => e.event === "Argued")?.dates?.[0] || 0;
        return db - da; // newest first
      });

    if (!list.length) {
      els.view.innerHTML = html`<div class="center">No argued cases with audio found for ${esc(term)}.</div>`;
      return;
    }

    const rows = list.map(c => {
      const docket = cleanDocket(c.docket_number);
      const route = `/case/${term}/${encodeURIComponent(caseSlug(c))}`;
      return html`<button class="row" onclick="go('${route}')">
        <div class="row-main">
          <div class="row-title">${esc(c.name)}</div>
          <div class="row-sub">${esc(arguedDate(c) || "Argument date n/a")}${docket ? " · No. " + esc(docket) : ""}</div>
        </div>
        <div class="row-chev">›</div>
      </button>`;
    }).join("");

    els.view.innerHTML = html`
      <p class="hint">${list.length} argued case${list.length === 1 ? "" : "s"} · newest first</p>
      <div class="list">${rows}</div>`;
  } catch (e) {
    errorView(`Couldn't load cases for ${term}. ${e.message}`, () => viewTermCases(term));
  }
}

/* ----------------------------- VIEW: player ----------------------------- */
async function viewPlayer(term, docket) {
  setTitle("Loading…");
  showBack(true);
  loading("Loading case…");
  let c;
  try {
    c = await getJSON(`${API}/cases/${term}/${docket}`);
    // Some dockets are consolidated cases → API returns a list. Use the first record.
    if (Array.isArray(c)) c = c.find(x => x && typeof x === "object") || null;
    if (!c || typeof c !== "object") throw new Error("Unexpected data for this case.");
  } catch (e) {
    return errorView(`Couldn't load this case. ${e.message}`, () => viewPlayer(term, docket));
  }

  setTitle(c.name || "Case");
  const sessions = (c.oral_argument_audio || []).filter(Boolean);

  if (!sessions.length) {
    els.view.innerHTML = html`
      <div class="player">
        <div class="player-case">${esc(c.name)}</div>
        <div class="player-meta">${esc(term)} term${cleanDocket(c.docket_number) ? " · No. " + esc(cleanDocket(c.docket_number)) : ""}</div>
        <div class="errbox">Oyez has this case, but no oral-argument recording is available for it.</div>
        ${factsBlock(c)}
      </div>`;
    return;
  }

  // Render player shell; default to first session.
  els.view.innerHTML = html`
    <div class="player">
      <div class="player-case">${esc(c.name)}</div>
      <div class="player-meta" id="pmeta">${esc(term)} term${cleanDocket(c.docket_number) ? " · No. " + esc(cleanDocket(c.docket_number)) : ""}</div>
      ${sessions.length > 1 ? `<div class="sessions" id="sessions">${
        sessions.map((s, i) => `<button class="chip" data-i="${i}" aria-pressed="${i === 0}">${esc(s.title || ("Session " + (i + 1)))}</button>`).join("")
      }</div>` : ""}
      <button class="bigplay" id="bigPlay" aria-label="Play">▶</button>
      <div class="scrub">
        <input type="range" id="seek" min="0" max="1000" value="0" step="1" aria-label="Seek" />
        <div class="times"><span id="cur">0:00</span><span id="dur">–:––</span></div>
      </div>
      <div class="skips">
        <button class="skipbtn" id="back15">« 15s</button>
        <button class="skipbtn" id="fwd30">30s »</button>
      </div>
      ${factsBlock(c)}
    </div>`;

  let sel = 0;
  const sessEls = els.view.querySelectorAll(".chip");
  sessEls.forEach(ch => ch.onclick = async () => {
    sel = Number(ch.dataset.i);
    sessEls.forEach(x => x.setAttribute("aria-pressed", x === ch));
    await loadSession(sessions[sel], c, term, true);
  });

  // Wire controls to the shared audio element
  const bigPlay = $("#bigPlay"), seek = $("#seek"), cur = $("#cur"), dur = $("#dur");

  bigPlay.onclick = togglePlay;
  $("#back15").onclick = () => { els.audio.currentTime = Math.max(0, els.audio.currentTime - 15); };
  $("#fwd30").onclick = () => { els.audio.currentTime = Math.min(els.audio.duration || 1e9, els.audio.currentTime + 30); };

  let seeking = false;
  seek.addEventListener("input", () => { seeking = true; cur.textContent = fmtTime(seek.value / 1000 * (els.audio.duration || 0)); });
  seek.addEventListener("change", () => { if (els.audio.duration) els.audio.currentTime = seek.value / 1000 * els.audio.duration; seeking = false; });

  // Keep this screen's UI synced with the audio element while it's open
  const sync = () => {
    if (now && now.route === location.hash) {
      bigPlay.textContent = els.audio.paused ? "▶" : "❚❚";
      if (!seeking && els.audio.duration) seek.value = (els.audio.currentTime / els.audio.duration) * 1000;
      cur.textContent = fmtTime(els.audio.currentTime);
      dur.textContent = els.audio.duration ? fmtTime(els.audio.duration) : "–:––";
    }
  };
  els.audio.addEventListener("timeupdate", sync);
  els.audio.addEventListener("loadedmetadata", sync);
  els.audio.addEventListener("play", sync);
  els.audio.addEventListener("pause", sync);

  // If this exact session is already playing, don't reload — just sync. Otherwise load it.
  const alreadyHere = now && now.term === term && now.docket === docket;
  if (!alreadyHere) {
    await loadSession(sessions[0], c, term, false);
  }
  sync();
}

function factsBlock(c) {
  const facts = stripTags(c.facts_of_the_case);
  const q = stripTags(c.question);
  let out = "";
  if (q) out += html`<div class="facts"><h3>Question</h3><p>${esc(q)}</p></div>`;
  if (facts) out += html`<div class="facts"><h3>Facts</h3><p>${esc(facts.slice(0, 900))}${facts.length > 900 ? "…" : ""}</p></div>`;
  out += html`<p class="hint">Source: <a href="https://www.oyez.org/cases/${esc(c.term)}/${esc(caseSlug(c))}" target="_blank" rel="noopener">this case on Oyez.org</a></p>`;
  return out;
}

/* Fetch a session's media JSON, pick the MP3, load it into the shared <audio>, optionally autoplay */
async function loadSession(session, c, term, autoplay) {
  const pmeta = $("#pmeta");
  try {
    if (pmeta) pmeta.textContent = "Finding the recording…";
    const media = await getJSON(session.href);
    const files = media.media_file || [];
    const mp3 = files.find(f => /mpeg|mp3/i.test(f.mime)) || files[0];
    if (!mp3) throw new Error("No audio file in this session.");

    now = {
      caseName: c.name, term, docket: caseSlug(c),
      sessionTitle: session.title || "Oral Argument",
      src: mp3.href, route: location.hash,
    };
    els.audio.src = mp3.href;
    els.audio.load();
    setMediaSession();
    showMini();
    if (pmeta) pmeta.textContent = `${term} term${cleanDocket(c.docket_number) ? " · No. " + cleanDocket(c.docket_number) : ""} · ${now.sessionTitle}`;
    if (autoplay) await safePlay();
  } catch (e) {
    if (pmeta) pmeta.textContent = "";
    errorView(`Couldn't load the recording. ${e.message}`, null);
  }
}

/* ----------------------------- audio engine ----------------------------- */
function initAudio() {
  els.miniPlay.onclick = togglePlay;
  els.miniMeta.onclick = () => { if (now) go(`/case/${now.term}/${encodeURIComponent(now.docket)}`); };
  els.miniMeta.onkeydown = (e) => { if (e.key === "Enter") els.miniMeta.onclick(); };

  els.audio.addEventListener("play", () => {
    els.miniPlay.textContent = "❚❚";
    if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing";
    updatePositionState();
  });
  els.audio.addEventListener("pause", () => {
    els.miniPlay.textContent = "▶";
    if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused";
  });
  els.audio.addEventListener("ended", () => { els.miniPlay.textContent = "▶"; });
  els.audio.addEventListener("error", () => {
    if (els.audio.src) console.warn("Audio error", els.audio.error);
  });
  els.audio.addEventListener("timeupdate", throttle(updatePositionState, 1000));
}

async function safePlay() {
  try { await els.audio.play(); }
  catch (e) { console.warn("Autoplay blocked — user must tap play.", e); }
}
function togglePlay() {
  if (!els.audio.src) return;
  if (els.audio.paused) safePlay(); else els.audio.pause();
}

function showMini() {
  els.mini.hidden = false;
  els.miniTitle.textContent = now ? now.caseName : "—";
  els.miniSub.textContent = now ? `${now.sessionTitle} · ${now.term}` : "Oyez Arguments";
}

/* Media Session API: lock-screen / control-center metadata + buttons */
function setMediaSession() {
  if (!("mediaSession" in navigator) || !now) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: now.caseName,
    artist: "U.S. Supreme Court Oral Argument",
    album: `${now.term} Term · Oyez`,
    artwork: [
      { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  });
  const ms = navigator.mediaSession;
  ms.setActionHandler("play", () => safePlay());
  ms.setActionHandler("pause", () => els.audio.pause());
  ms.setActionHandler("seekbackward", (d) => { els.audio.currentTime = Math.max(0, els.audio.currentTime - (d.seekOffset || 15)); });
  ms.setActionHandler("seekforward", (d) => { els.audio.currentTime = Math.min(els.audio.duration || 1e9, els.audio.currentTime + (d.seekOffset || 30)); });
  try {
    ms.setActionHandler("seekto", (d) => { if (d.fastSeek && "fastSeek" in els.audio) els.audio.fastSeek(d.seekTime); else els.audio.currentTime = d.seekTime; });
  } catch {}
}
function updatePositionState() {
  if (!("mediaSession" in navigator) || !navigator.mediaSession.setPositionState) return;
  if (!els.audio.duration || !isFinite(els.audio.duration)) return;
  try {
    navigator.mediaSession.setPositionState({
      duration: els.audio.duration,
      playbackRate: els.audio.playbackRate || 1,
      position: Math.min(els.audio.currentTime, els.audio.duration),
    });
  } catch {}
}

function throttle(fn, ms) {
  let last = 0;
  return (...a) => { const n = Date.now(); if (n - last >= ms) { last = n; fn(...a); } };
}

/* ----------------------------- VIEW: advocate search ----------------------------- */
let advocateIndex = null; // loaded lazily
async function loadAdvocateIndex() {
  if (advocateIndex) return advocateIndex;
  advocateIndex = await getJSON("data/advocates.json");
  return advocateIndex;
}

async function viewAdvocateSearch() {
  setTitle("Search advocates");
  showBack(true);
  els.view.innerHTML = html`
    <div class="searchwrap">
      <input class="search" id="adSearch" type="search" autocomplete="off" placeholder="Search an advocate, e.g. Paul Clement" />
    </div>
    <p class="hint" id="adHint">Type a name to find every argument they appear in.</p>
    <div class="list" id="adResults"></div>`;

  const input = $("#adSearch"), results = $("#adResults"), hint = $("#adHint");
  let idx;
  try { idx = await loadAdvocateIndex(); }
  catch {
    hint.innerHTML = `The advocate index isn't built yet. Browse by term with the back button for now.`;
    return;
  }
  const advocates = idx.advocates || [];
  hint.textContent = `${advocates.length.toLocaleString()} advocates indexed · ${idx.case_count || "?"} cases.`;

  const render = (q) => {
    const needle = q.trim().toLowerCase();
    if (needle.length < 2) { results.innerHTML = ""; return; }
    const matches = advocates
      .filter(a => a.name.toLowerCase().includes(needle))
      .sort((a, b) => b.cases.length - a.cases.length)
      .slice(0, 40);
    if (!matches.length) { results.innerHTML = `<p class="hint">No advocate matches “${esc(q)}”.</p>`; return; }
    results.innerHTML = matches.map(a => html`
      <button class="row" onclick="go('/advocate/${encodeURIComponent(a.id)}')">
        <div class="row-main">
          <div class="row-title">${esc(a.name)}</div>
          <div class="row-sub">${a.cases.length} argument${a.cases.length === 1 ? "" : "s"}</div>
        </div>
        <div class="row-chev">›</div>
      </button>`).join("");
  };
  input.addEventListener("input", () => render(input.value));
  input.focus();
}

async function viewAdvocateCases(id) {
  setTitle("Advocate");
  showBack(true);
  loading("Loading…");
  let idx;
  try { idx = await loadAdvocateIndex(); }
  catch { return errorView("The advocate index isn't available.", null); }

  const a = (idx.advocates || []).find(x => String(x.id) === String(id));
  if (!a) return errorView("Advocate not found.", null);
  setTitle(a.name);

  // group by term, newest first
  const byTerm = {};
  for (const c of a.cases) (byTerm[c.term] ||= []).push(c);
  const terms = Object.keys(byTerm).sort((x, y) => Number(y) - Number(x));

  const blocks = terms.map(t => html`
    <div class="section-h">${esc(t)} Term</div>
    <div class="list">${byTerm[t].map(c => html`
      <button class="row" onclick="go('/case/${esc(c.term)}/${encodeURIComponent(c.docket)}')">
        <div class="row-main">
          <div class="row-title">${esc(c.name)}</div>
          <div class="row-sub">${esc(c.date || "")}${c.role ? " · " + esc(c.role) : ""}</div>
        </div>
        <div class="row-chev">›</div>
      </button>`).join("")}</div>`).join("");

  els.view.innerHTML = html`<p class="hint">${a.cases.length} argument${a.cases.length === 1 ? "" : "s"}, newest first.</p>${blocks}`;
}

/* ----------------------------- service worker (PWA) ----------------------------- */
function registerSW() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(e => console.warn("SW failed", e));
  }
}

/* expose go() for inline onclick handlers */
window.go = go;
