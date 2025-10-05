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

  // Page key -> Odds API key (canonical keys are 'mlb', 'nfl', 'sec')
  const SPORT_TO_API = {
    mlb: "baseball_mlb",
    nfl: "americanfootball_nfl",
    sec: "americanfootball_ncaaf",
  };

  // Accept common aliases and normalize to canonical keys above
  const SPORT_ALIASES = { cfb: "sec", ncaaf: "sec", college_football: "sec" };
  const canonSportKey = k => (SPORT_ALIASES[String(k||"").toLowerCase()] || String(k||"").toLowerCase());
  const isCFB = k => canonSportKey(k) === "sec";

  // Bookmaker priority (cascading)
  const BOOKS = ["draftkings", "fanduel", "betmgm", "caesars", "pointsbetus", "barstool"];

  // ======== Name normalization & aliases ========
  const norm =
    (window.__NAME_NORM__) ||
    (s => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim());

  function canonTeamName(sportKey, name) {
    const n = norm(name);
    const al = (window.TEAM_ALIASES && window.TEAM_ALIASES[canonSportKey(sportKey)]) || {};
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

  // ======== Power-4 + Notre Dame restriction for CFB ========
  // Uses your window.CFB_TEAM_TO_CONF map (normalized values like 'sec', 'big ten', 'big 12', 'acc', 'independent', etc).
  // Fails open (returns true) if the map is missing so we don't break the page during dev.
  function isPower4MatchCFB(evt) {
    const confMap = window.CFB_TEAM_TO_CONF;
    if (!confMap) return true; // fail open if map not loaded

    const awayKey = canonTeamName("sec", evt.away_team);
    const homeKey = canonTeamName("sec", evt.home_team);
    const cAway = norm(confMap[awayKey] || "");
    const cHome = norm(confMap[homeKey] || "");

    const isPower4Conf = (c, teamNameNorm) =>
      c === "sec" || c === "big ten" || c === "big 12" || c === "acc" ||
      (c === "independent" && teamNameNorm === "notre dame");

    const awayIsND = norm(awayKey) === "notre dame";
    const homeIsND = norm(homeKey) === "notre dame";

    return isPower4Conf(cAway, awayIsND ? "notre dame" : "") ||
           isPower4Conf(cHome, homeIsND ? "notre dame" : "");
  }

  // ======== Market & mapping helpers ========
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

    // Location: show for MLB/NFL; hide for CFB (your preference)
    const homeCity = evt.home_team.split(" ").slice(0, -1).join(" ") || evt.home_team;
    const location = isCFB(sportKey) ? "" : homeCity;

    return {
      id: evt.id,
      ts: new Date(evt.commence_time).getTime(),
      time: fmtDT(evt.commence_time),
      location,
      awayFull: evt.away_team,
      homeFull: evt.home_team,
      awayLogo: window.LogoFinder?.get(evt.away_team, canonSportKey(sportKey)),
      homeLogo: window.LogoFinder?.get(evt.home_team, canonSportKey(sportKey)),
      mlAway, mlHome,
      total, over, under
    };
  }

  // ======== Filters UI ========
  function buildFiltersUI(sportKey) {
    const wrap = document.getElementById("filters");
    if (!wrap) return;

    const labelText = isCFB(sportKey) ? "Conference" : "Division";

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
    `;

    const sel = document.getElementById("filter-league");
    const opts =
      canonSportKey(sportKey) === "mlb" ? [
        "All",
        "AL East","AL Central","AL West",
        "NL East","NL Central","NL West"
      ] :
      canonSportKey(sportKey) === "nfl" ? [
        "All",
        "AFC East","AFC North","AFC South","AFC West",
        "NFC East","NFC North","NFC South","NFC West"
      ] : [
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
      if (canonSportKey(sportKey) === "mlb" && mlbMap) {
        const div = norm(mlbMap[fullName] || "");
        return !!div && div === val;
      }
      if (canonSportKey(sportKey) === "nfl" && nflMap) {
        const div = norm(nflMap[fullName] || "");
        return !!div && div === val;
      }
      if (isCFB(sportKey) && cfbMap) {
        const conf = norm(cfbMap[fullName] || "");
        if (!conf) return false;
        if (val === "notre dame") return conf === "independent"; // ND special
        return conf === val;
      }
      // if no map for this sport, don't filter out
      return true;
    };

    return teamMatches(away) || teamMatches(home);
  }

  // ======== Public API ========
  async function getOddsFor(sportKey) {
    const sk = canonSportKey(sportKey);
    const sportApi = SPORT_TO_API[sk];
    if (!sportApi) throw new Error(`Unknown sport key: ${sportKey}`);
    if (!KEY) throw new Error("Missing API key (window.ODDS_API_KEY)");

    // Daily cache short-circuit (per browser)
    if (DAILY_CACHE) {
      const lsRaw = _readDaily(sk);
      if (lsRaw) {
        const raw = isCFB(sk) ? lsRaw.filter(isPower4MatchCFB) : lsRaw;
        const games = mapAndSort(raw, sk).filter(hidePostKick);
        return wireFiltersAndRender(sk, games);
      }
    }

    // In-memory cache short-circuit
    const nowMs = Date.now();
    const hit = _CACHE[sk];
    if (hit && hit.expires > nowMs) {
      let raw = hit.raw;
      if (isCFB(sk)) raw = raw.filter(isPower4MatchCFB);
      const cachedGames = mapAndSort(raw, sk).filter(hidePostKick);
      return wireFiltersAndRender(sk, cachedGames);
    }

    // Network fetch
    const end = addDays(new Date(), WINDOW_DAYS[sk] || 5);
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
    let upcoming = (await res.json() || []).filter(e => new Date(e.commence_time) <= end);

    // Restrict CFB to Power-4 + Notre Dame
    if (isCFB(sk)) upcoming = upcoming.filter(isPower4MatchCFB);

    // Write daily cache for the day
    if (DAILY_CACHE) {
      _purgeOldDaily(sk);
      _writeDaily(sk, upcoming);
    }

    // Also keep an in-memory TTL cache in this tab
    _CACHE[sk] = {
      raw: upcoming,
      expires: nowMs + chooseTTLMillis(upcoming)
    };

    const games = mapAndSort(upcoming, sk).filter(hidePostKick);
    return wireFiltersAndRender(sk, games);
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
