# TS4 — Diffy Cult Dashboard (v0.1.2)

**What changed**
- Button-based wheels use `window.open()` on click (clear user gesture) so browsers won’t block them.
- Link normalization avoids relative-file loops (adds `https://` if you forget).
- Cache name bumped so a single refresh loads the new build.

**Use**
1. Edit `data/config.json` with your links.
2. Open `index.html`. If a button seems blocked once, allow one pop-up for this page and click again.
3. Gauge + checklist persist via localStorage.

Next: v0.2.0 → CSV→JSON logic for Soul Points.
