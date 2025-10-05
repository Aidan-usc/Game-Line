// Hide games X minutes after their posted kickoff time
const POST_KICK_HIDE_MIN = 10;
const POST_KICK_HIDE_MS  = POST_KICK_HIDE_MIN * 60 * 1000;

// js/odds.js
(function () {
  const API = "https://api.the-odds-api.com/v4";
  // Prefer config.js if present; otherwise use inline key
  const KEY = (window.ODDS_API_KEY && String(window.ODDS_API_KEY)) || "621d73608d860d481b0069526302c7ee";
  const REGIONS  = "us";
  const MARKETS  = "h2h,totals";
  const ODDS_FMT = "american";

  // Lookahead window (days)
  const WINDOW_DAYS = { mlb: 5, nfl: 9, sec: 9 };

  // Page key -> Odds API key
  const SPORT_TO_API = {
    mlb: "baseball_mlb",
    nfl: "americanfootball_nfl",
    sec: "americanfootball_ncaaf",
  };

  // Bookmaker priority (cascading)
  const BOOKS = ["draftkings", "fanduel", "betmgm", "caesars", "pointsbetus", "barstool"];

  // ======== Name normalization & aliases ========
  const norm =
    (window.__NAME_NORM__) ||
    (s => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim());

  function canonTeamName(sportKey, name) {
    const n = norm(name);
    const al = (window.TEAM_ALIASES && window.TEAM_ALIASES[sportKey]) || {};
    return al[n] || n;
  }

  const eqName = (a,b) => norm(a) === norm(b);

  // ======== Date helpers ========
  const addDays = (d, n) => {
    const t = new Date(d);
    t.setDate(t.getDate() + n);
    return t;
  };

  function fmtDT(dt) {
    try {
      const d = new Date(dt);
      const optsD = { month: "short", day: "numeric" };
      const optsT = { hour: "numeric", minute: "2-digit" };
      return `${d.toLocaleDateString(undefined, optsD)} • ${d.toLocaleTimeString(undefined, optsT)} ET`;
    } catch { return ""; }
  }

  // ======== Variable TTL in-memory cache (per session) ========
  // <= 24h -> 20m, <=48h -> 60m, >48h -> 120m
  const _CACHE = {}; // { [sportKey]: { expires:number, raw:any[] } }

  function chooseTTLMillis(events) {
    const now = Date.now();
    const minsUntil = (dt) => (new Date(dt).getTime() - now) / 60000;
    let minMinutes = Infinity;
    for (const e of events || []) {
      const m = minsUntil(e.commence_time);
      if (m < minMinutes) minMinutes = m;
    }
    if (!isFinite(minMinutes)) return 120 * 60 * 1000; // 2h default
    if (minMinutes <= 24 * 60) return 20 * 60 * 1000;  // 20 min day-of
    if (minMinutes <= 48 * 60) return 60 * 60 * 1000;  // 1 hour for 1–2 days
    return 120 * 60 * 1000;                            // 2 hours for 3+ days
  }

  // ======== DEV daily cache (per browser, resets at local midnight) ========
  const DAILY_CACHE = true; // flip to false later when you want fresher pulls

  function _todayKey() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}${m}${day}`;
  }
  const _LS_DAILY_KEY = (sport) => `odds_daily_${sport}_${_todayKey()}`;

  function _readDaily(sport) {
    try {
      const raw = localStorage.getItem(_LS_DAILY_KEY(sport));
      if (!raw) return null;
      const obj = JSON.parse(raw);
      return Array.isArray(obj.raw) ? obj.raw : null;
    } catch { return null; }
  }
  function _writeDaily(sport, events) {
    try { localStorage.setItem(_LS_DAILY_KEY(sport), JSON.stringify({ raw: events })); } catch {}
  }
  function _purgeOldDaily(sport) {
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith(`odds_daily_${sport}_`) && k !== _LS_DAILY_KEY(sport)) {
          localStorage.removeItem(k);
        }
      }
    } catch {}
  }

  // ======== Market & mapping helpers ========
  // Pick a market (h2h or totals) using BOOKS priority, then any book as fallback
  function pickMarket(bookmakers, key) {
    const list = bookmakers || [];
    const byPriority = BOOKS.map(k => list.find(b => b && b.key === k)).filter(Boolean);

    for (const b of byPriority) {
      const m = (b.markets || []).find(x => x.key === key);
      if (m?.outcomes?.length >= 2) return m;
    }
    for (const b of list) {
      const m = (b.markets || []).find(x => x.key === key);
      if (m?.outcomes?.length >= 2) return m;
    }
    return null;
  }

  // Map an API event to your card model
  function mapEventToGame(evt, sportKey) {
    const h2h    = pickMarket(evt.bookmakers, "h2h");
    const totals = pickMarket(evt.bookmakers, "totals");

    // Moneyline
    let mlAway = null, mlHome = null;
    if (h2h?.outcomes?.length) {
      const oAway = h2h.outcomes.find(o => eqName(o.name, evt.away_team));
      const oHome = h2h.outcomes.find(o => eqName(o.name, evt.home_team));
      mlAway = Number.isFinite(+oAway?.price) ? +oAway.price : null;
      mlHome = Number.isFinite(+oHome?.price) ? +oHome.price : null;
    }

    // Totals
    let total = null, over = null, under = null;
    if (totals?.outcomes?.length) {
      const overO  = totals.outcomes.find(o => norm(o.name) === "over");
      const underO = totals.outcomes.find(o => norm(o.name) === "under");
      const line   = Number.isFinite(+overO?.point) ? +overO.point
                   : Number.isFinite(+underO?.point) ? +underO.point
                   : null;
      total = line;
      over  = Number.isFinite(+overO?.price)  ? +overO.price  : null;
      under = Number.isFinite(+underO?.price) ? +underO.price : null;
    }

    // Location: show for MLB/NFL; hide for CFB (per your preference)
    const homeCity = evt.home_team.split(" ").slice(0, -1).join(" ") || evt.home_team;
    const location = (sportKey === "sec") ? "" : homeCity;

    return {
      id: evt.id,
      ts: new Date(evt.commence_time).getTime(),
      time: fmtDT(evt.commence_time),
      location,
      awayFull: evt.away_team,
      homeFull: evt.home_team,
      awayLogo: window.LogoFinder?.get(evt.away_team, sportKey),
      homeLogo: window.LogoFinder?.get(evt.home_team, sportKey),
      mlAway, mlHome,
      total, over, under
    };
  }

  // ======== Power-4 + Notre Dame helpers (CFB only) ========
  const POWER4_CONFS = new Set(["sec", "big ten", "big 12", "acc"]);
  function _teamConfCFB(fullName){
    const map = window.CFB_TEAM_TO_CONF || {};
    const key = canonTeamName("sec", fullName);
    return norm(map[key] || "");
  }
  function isPower4TeamCFB(name){
    const conf = _teamConfCFB(name);
    // include Notre Dame specifically (some maps label it "Independent", others "Notre Dame")
    if (conf === "notre dame") return true;
    if (conf === "independent" && norm(name).startsWith("notre dame")) return true;
    return POWER4_CONFS.has(conf);
  }
  function isPower4MatchCFB(evt){
    return isPower4TeamCFB(evt.away_team) || isPower4TeamCFB(evt.home_team);
  }

  // ======== Filters UI ========
  function buildFiltersUI(sportKey) {
    const wrap = document.getElementById("filters");
    if (!wrap) return;

    const labelText = sportKey === "sec" ? "Conference" : "Division";

    wrap.innerHTML = `
      <div class="filter-bar-inner">
        <div class="filter-left">
          <label class="filter-label" for="filter-league">${labelText}</label>
          <div class="select-wrap">
            <select id="filter-league" class="filter-select" aria-label="${labelText} filter"></select>
          </div>
        </div>

        <div class="filter-right">
          <div class="search-wrap">
            <input id="filter-search" class="filter-search" type="search"
                   placeholder="Search teams…" aria-label="Search teams">
          </div>
          <button id="filter-refresh" class="btn btn-refresh" type="button" title="Refresh odds">↻</button>
        </div>
      </div>
    ";

    const sel = document.getElementById("filter-league");
    const opts =
      sportKey === "mlb" ? [
        "All",
        "AL East","AL Central","AL West",
        "NL East","NL Central","NL West"
      ] :
      sportKey === "nfl" ? [
        "All",
        "AFC East","AFC North","AFC South","AFC West",
        "NFC East","NFC North","NFC South","NFC West"
      ] :
      [
        "All (Power 4 + ND)",
        "SEC","Big Ten","Big 12","ACC","Notre Dame"
      ];

    for (const o of opts) {
      const el = document.createElement("option");
      el.value = o; el.textContent = o;
      sel.appendChild(el);
    }
  }

  // Division/conf matching with maps from meta.js (match if either team belongs)
  function matchDivisionConf(sportKey, filterValue, game) {
    const val = norm(filterValue || "");
    if (!val || val.startsWith("all")) return true;

    const nflMap = window.NFL_TEAM_TO_DIVISION;
    const mlbMap = window.MLB_TEAM_TO_DIVISION;
    const cfbMap = window.CFB_TEAM_TO_CONF;

    const away = canonTeamName(sportKey, game.awayFull);
    const home = canonTeamName(sportKey, game.homeFull);

    const teamMatches = (fullName) => {
      if (sportKey === "mlb" && mlbMap) {
        const div = norm(mlbMap[fullName] || "");
        return !!div && div === val;
      }
      if (sportKey === "nfl" && nflMap) {
        const div = norm(nflMap[fullName] || "");
        return !!div && div === val;
      }
      if (sportKey === "sec" && cfbMap) {
        const conf = norm(cfbMap[fullName] || "");
        if (!conf) return false;
        // ND special-case: treat a "Notre Dame" filter as matching either "notre dame" or "independent"
        if (val === "notre dame") return (conf === "notre dame" || conf === "independent");
        return conf === val;
      }
      // if no map for this sport, don't filter out
      return true;
    };

    return teamMatches(away) || teamMatches(home);
  }

  // ======== Public API ========
  async function getOddsFor(sportKey) {
    const sportApi = SPORT_TO_API[sportKey];
    if (!sportApi) throw new Error(`Unknown sport key: ${sportKey}`);
    if (!KEY) throw new Error("Missing API key (window.ODDS_API_KEY)");

    // Daily cache short-circuit (per browser)
    if (DAILY_CACHE) {
      const lsRaw = _readDaily(sportKey);
      if (lsRaw) {
        // Apply CFB Power-4+ND restriction if this is the CFB page
        let filtered = lsRaw;
        if (sportKey === "sec") filtered = filtered.filter(isPower4MatchCFB);
        const games = mapAndSort(filtered, sportKey).filter(hidePostKick);
        return wireFiltersAndRender(sportKey, games);
      }
    }

    // In-memory cache short-circuit
    const nowMs = Date.now();
    const hit = _CACHE[sportKey];
    if (hit && hit.expires > nowMs) {
      let raw = hit.raw;
      if (sportKey === "sec") raw = raw.filter(isPower4MatchCFB);
      const cachedGames = mapAndSort(raw, sportKey).filter(hidePostKick);
      return wireFiltersAndRender(sportKey, cachedGames);
    }

    // Network fetch
    const end = addDays(new Date(), WINDOW_DAYS[sportKey] || 5);
    const url = new URL(`${API}/sports/${sportApi}/odds`);
    url.searchParams.set("apiKey", KEY);
    url.searchParams.set("regions", REGIONS);
    url.searchParams.set("markets", MARKETS);
    url.searchParams.set("oddsFormat", ODDS_FMT);
    url.searchParams.set("dateFormat", "iso");

    const res = await fetch(url.toString());
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Odds API ${res.status}: ${txt}`);
    }
    const json = await res.json();

    // Window filter (upper bound only)
    let upcoming = (json || []).filter(e => new Date(e.commence_time) <= end);

    // Restrict CFB page to Power-4 + Notre Dame only
    if (sportKey === "sec") {
      upcoming = upcoming.filter(isPower4MatchCFB);
    }

    // Write daily cache for the day
    if (DAILY_CACHE) {
      _purgeOldDaily(sportKey);
      _writeDaily(sportKey, upcoming);
    }

    // Also keep an in-memory TTL cache in this tab
    _CACHE[sportKey] = {
      raw: upcoming,
      expires: nowMs + chooseTTLMillis(upcoming)
    };

    const games = mapAndSort(upcoming, sportKey).filter(hidePostKick);
    return wireFiltersAndRender(sportKey, games);
  }

  // Map + sort helper
  function mapAndSort(events, sportKey) {
    const games = (events || []).map(e => mapEventToGame(e, sportKey));
    games.sort((a, b) => a.ts - b.ts);
    return games;
  }

  // Post-kickoff hiding predicate
  function hidePostKick(g) {
    return Date.now() <= (g.ts + POST_KICK_HIDE_MS);
  }

  // Build filters, attach handlers, and render (with periodic refresh for post-kick hide)
  function wireFiltersAndRender(sportKey, allGames) {
    buildFiltersUI(sportKey);

    const sel     = document.getElementById("filter-league");
    const search  = document.getElementById("filter-search");
    const refresh = document.getElementById("filter-refresh");

    function computeFiltered() {
      const q = (search?.value || "").trim().toLowerCase();
      const bucket = sel?.value || "";

      const list = allGames
        .filter(hidePostKick)
        .filter(g => {
          const hitsText = !q || g.awayFull.toLowerCase().includes(q) || g.homeFull.toLowerCase().includes(q);
          const hitsBucket = matchDivisionConf(sportKey, bucket, g);
          return hitsText && hitsBucket;
        })
        .sort((a, b) => a.ts - b.ts);

      return list;
    }

    function applyFilters() {
      window.reRenderOdds && window.reRenderOdds(computeFiltered());
    }

    sel && sel.addEventListener("change", applyFilters);
    if (search) {
      let t;
      search.addEventListener("input", () => {
        clearTimeout(t);
        t = setTimeout(applyFilters, 120);
      });
    }
    refresh && refresh.addEventListener("click", () => location.reload());

    // Initial render
    const initial = computeFiltered();
    window.reRenderOdds && window.reRenderOdds(initial);

    // Re-check every 60s so games auto-hide ~10 minutes after kickoff
    if (!window.__kickoffHideTimer) {
      window.__kickoffHideTimer = setInterval(applyFilters, 60_000);
    }

    return initial;
  }

  // Expose
  window.OddsService = { getOddsFor };
})();
