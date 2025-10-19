# TS4 — Diffy Cult Dashboard (v0.1.3)

**Fixes for local file usage**
- Embedded config fallback: works even when `fetch('data/config.json')` is blocked on `file://`.
- Wheel buttons are now regular anchor links (`<a target="_blank">`), so they open without JS.
- No service worker in this build to avoid caching during testing.

**Use**
1. Open `index.html` directly from your file system.
2. Edit links either in `data/config.json` **or** inside the embedded JSON (script tag with id `embed-config`) if you prefer.

Once it’s solid, we can re-enable offline caching in v0.1.4.
