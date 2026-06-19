# Deploying Oyez Arguments to GitHub Pages (no command line needed)

This puts your site online at a free, phone-openable URL like
`https://YOURNAME.github.io/oyez-arguments/`.

The site lives in the **`docs/`** folder of this project. GitHub Pages can serve a site
straight from a `docs/` folder, which is why it's organized that way.

## One-time setup (all in your web browser)

1. **Make a GitHub account** at https://github.com (free) if you don't have one.
2. **Create a new repository:**
   - Click the **+** (top-right) → **New repository**.
   - Name it `oyez-arguments` (or anything).
   - Keep it **Public** (Pages is free for public repos). Click **Create repository**.
3. **Upload the project files:**
   - On the new repo page, click **uploading an existing file** (the link in the
     "Quick setup" box), or **Add file → Upload files**.
   - Drag in the whole project folder's contents — at minimum the **`docs/`** folder.
     (Uploading `BUILD_LOG.md`, `CLAUDE.md`, `tools/`, etc. too is fine and keeps the
     journal with the code.)
   - Scroll down, click **Commit changes**.
4. **Turn on Pages:**
   - Go to the repo's **Settings** tab → **Pages** (left sidebar).
   - Under **Build and deployment → Source**, choose **Deploy from a branch**.
   - Branch: **main**, folder: **/docs**. Click **Save**.
5. Wait ~1 minute. The Pages screen will show your live URL. Open it on your computer to
   confirm, then on your phone.

## Put it on your phone's home screen (important for background audio)

- **iPhone (Safari):** open the URL → tap the **Share** icon → **Add to Home Screen**.
  Launch it from that new icon (not from Safari) — this "installed" mode gives the best
  shot at audio continuing when the screen locks.
- **Android (Chrome):** open the URL → menu **⋮** → **Add to Home screen / Install app**.

## Updating the site later

- Edit a file on GitHub (pencil icon) or re-upload, then **Commit**. Pages redeploys in
  about a minute.
- To refresh the advocate search index after new arguments are added, re-run
  `python tools/build_advocate_index.py` locally and upload the new
  `docs/data/advocates.json`.

## Why not Netlify?

Netlify's drag-and-drop is faster for a one-off, but GitHub keeps the site, the build
journal, and the write-up versioned together with full history — a better fit for a
"here's how I built this" project. See BUILD_LOG.md, Entry 3.
