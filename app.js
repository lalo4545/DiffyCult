(function () {
  const $ = sel => document.querySelector(sel);

  const normalize = (u) => {
    if (!u) return "";
    if (u.startsWith("http://") || u.startsWith("https://")) return u;
    if (/^[\w.-]+\.[a-z]{2,}\//i.test(u)) return "https://" + u;
    return u;
  };

  // Load config
  let cfg = {};
  try {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", "data/config.json", false);
    xhr.send(null);
    if (xhr.status >= 200 && xhr.status < 300 && xhr.responseText) {
      cfg = JSON.parse(xhr.responseText);
    }
  } catch (e) { cfg = {}; }

  // Meta
  $("#version").textContent = cfg.version ? "v" + cfg.version : "v0.1.5";
  $("#weekly-day").textContent = cfg.weekly_day_hint || "Friday";
  document.getElementById("year").textContent = new Date().getFullYear();

  // Quick links
  const links = Object.fromEntries(Object.entries(cfg.links || {}).map(([k,v]) => [k, normalize(v||"")]));
  const quick = $("#quick-links");
  [
    ["Generations", links.generations],
    ["Balances", links.balances],
    ["Rules/Lore", links.rules],
    ["Extra Links", links.extra],
    ["Resources", links.resources]
  ].forEach(([label, href]) => {
    const a = document.createElement("a");
    a.className = "btn";
    a.textContent = label;
    a.href = href || "#";
    a.target = "_blank"; a.rel = "noopener noreferrer";
    quick.appendChild(a);
  });

  // Wheels
  const wheelMap = {
    "lnk-popcorn": links.popcorn,
    "lnk-rebirth": links.rebirth,
    "lnk-reckoning": links.reckoning,
    "lnk-tier1":    links.tier1,
    "lnk-tier2":    links.tier2,
    "lnk-bless":    links.blessings
  };
  Object.entries(wheelMap).forEach(([id, href]) => {
    const a = document.getElementById(id);
    if (a) a.href = href || "#";
  });

  // Weekly checklist
  const STORE_KEY = "diffy.weekly.v1";
  const defaultTasks = [
    { id: "tally", label: "Tally up Shadow Points", done: false, hint: "Blessing ≤2 • Tier1 3–6 • Tier2 7+" },
    { id: "clubs", label: "Check Clubs and add SPs accordingly", done: false },
    { id: "popcorn", label: "Gen 4–6: Pop-Corn House spin for next move", done: false }
  ];
  const loadTasks = () => { try { return JSON.parse(localStorage.getItem(STORE_KEY)) || defaultTasks; } catch { return defaultTasks; } };
  const saveTasks = (t) => localStorage.setItem(STORE_KEY, JSON.stringify(t));
  let tasks = loadTasks();
  const listEl = $("#weekly-list");
  function renderList() {
    listEl.innerHTML = "";
    tasks.forEach(t => {
      const lbl = document.createElement("label");
      const box = document.createElement("input");
      box.type = "checkbox"; box.checked = !!t.done;
      box.addEventListener("change", () => { t.done = box.checked; saveTasks(tasks); });
      const span = document.createElement("span"); span.textContent = t.label;
      lbl.appendChild(box); lbl.appendChild(span);
      if (t.hint) { const hint = document.createElement("div"); hint.className = "small"; hint.textContent = t.hint; lbl.appendChild(hint); }
      listEl.appendChild(lbl);
    });
  }
  renderList();
  $("#reset-week").addEventListener("click", () => { tasks = defaultTasks.map(t => ({...t, done:false})); saveTasks(tasks); renderList(); });

  // Gauge + controls + scoring
  (function(){
    const G = document.getElementById("sp-gauge");
    const L = document.getElementById("sp-label");
    const I = document.getElementById("sp-input");
    const minus = document.getElementById("sp-minus");
    const plus  = document.getElementById("sp-plus");
    const save  = document.getElementById("sp-save");
    const reset = document.getElementById("sp-reset");
    const hint  = document.getElementById("sp-tier-hint");
    const KEY = "diffy.sp.week.total.v1";
    const tierFor = (sp) => sp <= 2 ? {name:"Blessing (≤ 2)", color:"#63e6be"} :
                           sp <= 6 ? {name:"Tier 1 (3–6)",   color:"#ffd166"} :
                                     {name:"Tier 2 (7+)",     color:"#ff6b6b"};
    const pctFor  = (sp) => Math.max(0, Math.min(100, (sp/20)*100));
    const render  = (sp) => { const t = tierFor(sp); L.innerHTML = `${sp}<br><span class="gauge-sub">SP</span>`; hint.textContent = `Tier: ${t.name}`; G.style.setProperty("--fill", t.color); G.style.setProperty("--value", pctFor(sp)); I.value = sp; };
    const load = () => Number(localStorage.getItem(KEY) || "0");
    const store= (sp) => localStorage.setItem(KEY, String(sp));
    let sp = load(); render(sp);
    minus.addEventListener("click", () => { sp = Math.max(0, sp-1); render(sp); });
    plus .addEventListener("click", () => { sp = sp+1; render(sp); });
    save .addEventListener("click", () => { store(sp); });
    reset.addEventListener("click", () => { sp = 0; render(sp); store(sp); });
    I.addEventListener("change", () => { sp = Math.max(0, parseInt(I.value||"0",10)); render(sp); });

    const SELECT = document.getElementById("score-select");
    const APPLY  = document.getElementById("apply-score");
    const UNDO   = document.getElementById("undo-score");
    const HIST   = document.getElementById("score-history");
    const HKEY   = "diffy.sp.history.v1";
    const parseDelta = (val) => { if (!val) return 0; if (val.startsWith("reset")) return "reset"; const m = val.match(/^([+-]\d+)/); return m ? parseInt(m[1],10) : 0; };
    const loadHist = () => { try { return JSON.parse(localStorage.getItem(HKEY)) || []; } catch { return []; } };
    const saveHist = (h) => localStorage.setItem(HKEY, JSON.stringify(h.slice(-30)));
    const renderHist = () => { const h = loadHist(); if (!HIST) return; if (h.length === 0) { HIST.textContent = "No entries yet."; return; } const ul = document.createElement("ul"); h.slice().reverse().slice(0,8).forEach(entry => { const li = document.createElement("li"); li.textContent = `${entry.when} — ${entry.text}`; ul.appendChild(li); }); HIST.innerHTML = "<strong>Recent:</strong>"; HIST.appendChild(ul); };
    APPLY.addEventListener("click", () => { const raw = SELECT.value || ""; if (!raw) return; const d = parseDelta(raw); const now = new Date(); if (d === "reset") { sp = 0; render(sp); store(sp); const h = loadHist(); h.push({when: now.toLocaleString(), text: "Reset — Penance Retreat"}); saveHist(h); renderHist(); SELECT.value=""; return; } sp = Math.max(0, sp + d); render(sp); store(sp); const h = loadHist(); h.push({when: now.toLocaleString(), text: raw}); saveHist(h); renderHist(); SELECT.value=""; });
    UNDO.addEventListener("click", () => { const h = loadHist(); const last = h.pop(); if (last) { const d = parseDelta(last.text); if (typeof d === "number") { sp = Math.max(0, sp - d); render(sp); store(sp); } saveHist(h); renderHist(); } });
    renderHist();
  })();

  // Generations tabs (MD/HTML)
  (function () {
    const tabsEl = document.getElementById("gen-tabs");
    const panelEl = document.getElementById("gen-panel");
    if (!tabsEl || !panelEl) return;
    const TABS = (cfg.generationsTabs || []).map(t => ({ id: t.id, title: t.title, file: t.file }));
    if (TABS.length === 0) { tabsEl.innerHTML = '<span class="small">No generation tabs configured in data/config.json.</span>'; return; }
    const KEY = "diffy.gen.active";
    const last = localStorage.getItem(KEY);
    let active = TABS.find(t => t.id === last)?.id || TABS[0].id;

    const md = (txt) => {
      const esc = s => s.replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
      const lines = txt.replace(/\r\n?/g, "\n").split("\n");
      let out = [], inList = false;
      for (let raw of lines) {
        const l = raw.trimEnd();
        if (/^#{1,6}\s/.test(l)) {
          if (inList) { out.push("</ul>"); inList = false; }
          const level = (l.match(/^#+/)[0]).length;
          out.push(`<h${level}>${esc(l.replace(/^#{1,6}\s*/, ""))}</h${level}>`);
        } else if (/^[-*]\s+/.test(l)) {
          if (!inList) { out.push("<ul>"); inList = true; }
          out.push(`<li>${esc(l.replace(/^[-*]\s+/, ""))}</li>`);
        } else if (l === "") {
          if (inList) { out.push("</ul>"); inList = false; }
        } else {
          const b = esc(l).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>");
          out.push(`<p>${b}</p>`);
        }
      }
      if (inList) out.push("</ul>");
      return out.join("\n");
    };

    async function loadTab(tab) {
      tabsEl.querySelectorAll(".tab").forEach(el => el.classList.toggle("active", el.dataset.id === tab.id));
      panelEl.innerHTML = `<div class="small">Loading ${tab.title}…</div>`;
      try {
        const res = await fetch(tab.file);
        const text = await res.text();
        const isMd = /\.md$/i.test(tab.file);
        panelEl.innerHTML = isMd ? md(text) : text;
        active = tab.id;
        localStorage.setItem(KEY, active);
      } catch (e) {
        panelEl.innerHTML = `<div class="small">Couldn’t load <code>${tab.file}</code>. Make sure the file exists.</div>`;
      }
    }

    TABS.forEach(t => {
      const btn = document.createElement("button");
      btn.className = "tab"; btn.textContent = t.title; btn.dataset.id = t.id;
      btn.addEventListener("click", () => loadTab(t));
      tabsEl.appendChild(btn);
    });

    tabsEl.tabIndex = 0;
    tabsEl.addEventListener("keydown", (e) => {
      if (!["ArrowLeft","ArrowRight"].includes(e.key)) return;
      const idx = TABS.findIndex(t => t.id === active);
      const next = e.key === "ArrowRight" ? (idx+1) % TABS.length : (idx-1+TABS.length) % TABS.length;
      loadTab(TABS[next]);
    });

    loadTab(TABS.find(t => t.id === active) || TABS[0]);
  })();

  // Profile image click-to-replace
  (function(){
    const KEY = "diffy.profile.image";
    const img = document.getElementById("profile-img");
    const input = document.getElementById("profile-upload");
    if (!img || !input) return;
    const saved = localStorage.getItem(KEY);
    if (saved) img.src = saved;
    img.addEventListener("click", () => input.click());
    input.addEventListener("change", () => {
      const file = input.files?.[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = e => { const dataURL = String(e.target.result || ""); img.src = dataURL; localStorage.setItem(KEY, dataURL); };
      reader.readAsDataURL(file);
    });
  })();

  // Sims Tree configurable embed
  (function(){
    const KEY = "diffy.embed.simsTree.url";
    const input = $("#embed-url");
    const btnSave = $("#embed-save");
    const btnReset = $("#embed-reset");
    const btnOpen = $("#embed-open");
    const frame = $("#embed-frame");
    const note = $("#embed-note");
    if (!input || !frame) return;

    const normalizeUrl = (u) => {
      if (!u) return "";
      u = u.trim();
      if (u.startsWith("http://")) u = "https://" + u.slice(7);
      if (!/^https?:\/\//i.test(u)) u = "https://" + u;
      return u;
    };

    let defaultUrl = "";
    try {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", "data/config.json", false);
      xhr.send(null);
      if (xhr.status >= 200 && xhr.status < 300 && xhr.responseText) {
        const cfg = JSON.parse(xhr.responseText);
        defaultUrl = normalizeUrl((cfg.embeds && cfg.embeds.simsTreeDefault) || "");
      }
    } catch {}

    const load = () => localStorage.getItem(KEY) || defaultUrl;
    const save = (u) => localStorage.setItem(KEY, normalizeUrl(u));
    const reset = () => { if (defaultUrl) localStorage.setItem(KEY, defaultUrl); else localStorage.removeItem(KEY); };

    function apply(url) {
      const href = normalizeUrl(url);
      input.value = href;
      frame.src = href || "about:blank";
      if (btnOpen) btnOpen.href = href || "#";
    }

    // init
    apply(load());

    btnSave?.addEventListener("click", () => {
      const val = normalizeUrl(input.value);
      if (!val) return;
      if (!val.startsWith("https://") || val.length > 2048) {
        if (note) note.textContent = "Please use a valid https URL under 2048 characters.";
        return;
      }
      save(val);
      apply(val);
      if (note) note.textContent = "Saved. If the site refuses to embed, use “Open in Browser.”";
    });

    btnReset?.addEventListener("click", () => {
      reset();
      apply(load());
      if (note) note.textContent = "Reset to default link.";
    });
  })();
})();