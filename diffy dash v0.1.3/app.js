
(async function () {
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));

  const $list = $("#weekly-list");
  const $weeks = $("#reckon-weeks");
  const $saveReckon = $("#save-reckon");
  const $version = $("#version");
  const $weeklyDay = $("#weekly-day");

  // Normalize helper
  const normalize = (u) => {
    if (!u) return "";
    if (u.startsWith("http://") || u.startsWith("https://")) return u;
    if (u.startsWith("spinthewheel.app/") || u.startsWith("spinthewheel.io/") ||
        u.startsWith("notion.so/") || u.startsWith("www.notion.so/")) return "https://" + u;
    if (/^[\w.-]+\.[a-z]{2,}\//i.test(u)) return "https://" + u;
    return u;
  };

  // Load config: try fetch; if it fails (file://), use embedded JSON
  let cfg = {};
  try {
    const res = await fetch("data/config.json");
    cfg = await res.json();
  } catch (e) {
    const el = document.getElementById("embed-config");
    if (el?.textContent) {
      try { cfg = JSON.parse(el.textContent); } catch {}
    }
  }
  cfg = cfg || {};
  if (cfg.version) $version.textContent = "v" + cfg.version;
  if (cfg.weekly_day_hint) $weeklyDay.textContent = cfg.weekly_day_hint;

  // Build Quick Links
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
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    quick.appendChild(a);
  });

  // Wire wheel anchors
  const map = {
    "lnk-popcorn": links.popcorn,
    "lnk-rebirth": links.rebirth,
    "lnk-reckoning": links.reckoning,
    "lnk-tier1":    links.tier1,
    "lnk-tier2":    links.tier2,
    "lnk-bless":    links.blessings
  };
  Object.entries(map).forEach(([id, href]) => {
    const a = document.getElementById(id);
    if (!a) return;
    if (href) a.href = href;
    else { a.href = "#"; a.title = "Add this link in config.json"; }
  });

  // Weekly checklist
  const STORE_KEY = "diffy.weekly.v1";
  const defaultTasks = [
    { id: "tally", label: "Tally up Shadow Points", done: false, hint: "Blessing ≤2 • Tier1 3–6 • Tier2 7+" },
    { id: "clubs", label: "Check Clubs and add SPs accordingly", done: false },
    { id: "popcorn", label: "Gen 4–6: Pop-Corn House spin for next move", done: false }
  ];
  const load = () => { try { return JSON.parse(localStorage.getItem(STORE_KEY)) || defaultTasks; } catch { return defaultTasks; } };
  const save = (tasks) => localStorage.setItem(STORE_KEY, JSON.stringify(tasks));
  let tasks = load();

  function renderList() {
    $list.innerHTML = "";
    tasks.forEach(t => {
      const lbl = document.createElement("label");
      const box = document.createElement("input");
      box.type = "checkbox";
      box.checked = !!t.done;
      box.addEventListener("change", () => { t.done = box.checked; save(tasks); });
      const span = document.createElement("span");
      span.textContent = t.label;
      lbl.appendChild(box);
      lbl.appendChild(span);
      if (t.hint) {
        const hint = document.createElement("div");
        hint.className = "small";
        hint.textContent = t.hint;
        lbl.appendChild(hint);
      }
      $list.appendChild(lbl);
    });
  }
  renderList();

  $("#reset-week").addEventListener("click", () => {
    tasks = defaultTasks.map(t => ({...t, done: false}));
    save(tasks);
    renderList();
  });

  // Great Reckoning counter
  const RECKON_KEY = "diffy.reckon.weeks.v1";
  $weeks.value = Number(localStorage.getItem(RECKON_KEY) || "0");
  $saveReckon.addEventListener("click", () => {
    const v = Math.max(0, Math.min(10, parseInt($weeks.value || "0", 10)));
    localStorage.setItem(RECKON_KEY, String(v));
    $weeks.value = v;
  });

  // Footer year
  document.getElementById("year").textContent = new Date().getFullYear();

  // Soul Points gauge
  (function(){
    const G = document.getElementById("sp-gauge");
    const L = document.getElementById("sp-label");
    const I = document.getElementById("sp-input");
    const minus = document.getElementById("sp-minus");
    const plus  = document.getElementById("sp-plus");
    const save  = document.getElementById("sp-save");
    const reset = document.getElementById("sp-reset");
    const hint  = document.getElementById("sp-tier-hint");
    if (!G) return;
    const KEY = "diffy.sp.week.total.v1";
    const tierFor = (sp) => sp <= 2 ? {name:"Blessing (≤ 2)", color:"#63e6be"} :
                           sp <= 6 ? {name:"Tier 1 (3–6)",   color:"#ffd166"} :
                                     {name:"Tier 2 (7+)",     color:"#ff6b6b"};
    const pctFor  = (sp) => Math.max(0, Math.min(100, (sp/20)*100));
    const render  = (sp) => {
      const t = tierFor(sp);
      L.innerHTML = `${sp}<br><span class="gauge-sub">SP</span>`;
      hint.textContent = `Tier: ${t.name}`;
      G.style.setProperty("--fill", t.color);
      G.style.setProperty("--value", pctFor(sp));
      I.value = sp;
    };
    const load = () => Number(localStorage.getItem(KEY) || "0");
    const store= (sp) => localStorage.setItem(KEY, String(sp));
    let sp = load(); render(sp);
    minus.addEventListener("click", () => { sp = Math.max(0, sp-1); render(sp); });
    plus .addEventListener("click", () => { sp = sp+1; render(sp); });
    save .addEventListener("click", () => { store(sp); });
    reset.addEventListener("click", () => { sp = 0; render(sp); store(sp); });
    I.addEventListener("change", () => { sp = Math.max(0, parseInt(I.value||"0",10)); render(sp); });
  })();
})();
