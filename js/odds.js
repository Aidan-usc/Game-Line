// Hide games X minutes after their posted kickoff time
const POST_KICK_HIDE_MIN = 10;
const POST_KICK_HIDE_MS  = POST_KICK_HIDE_MIN * 60 * 1000;

// js/odds.js
(function () {
  const API = "https://api.the-odds-api.com/v4";
  // Use config.js if present; otherwise fall back to the inline key you had
  const KEY = (window.ODDS_API_KEY && String(window.ODDS_API_KEY)) || "621d73608d860d481b0069526302c7ee";
  const REGIONS = "us";
  const MARKETS = "h2h,totals";
  const ODDS_FMT = "american";

  // Lookahead window (days)
  const WINDOW_DAYS = { mlb: 5, nfl: 9, sec: 9 };

  // Page key -> Odds API key
  const SPORT_TO_API = {
    mlb: "baseball_mlb",
    nfl: "americanfootball_nfl",
    sec: "americanfootball_ncaaf",
  };

  // Bookmaker priority
  const BOOKS = ["draftkings", "fanduel", "betmgm", "caesars", "pointsbetus", "barstool"];

  // ---- Helpers ----
  const norm =
    (window.__NAME_NORM__) ||
    (s => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim());

  function canonTeamName(sportKey, name) {
    const n = norm(name);
    const al = (window.TEAM_ALIASES && window.TEAM_ALIASES[sportKey]) || {};
    return al[n] || n;
  }

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

  // Variable TTL in-memory cache (per sport)
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

  function chooseBook(bookmakers) {
    const byKey = {};
    for (const b of (bookmakers || [])) byKey[b.key] = b;
    for (const pref of BOOKS) if (byKey[pref]) return byKey[pref];
    return bookmakers?.[0];
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
    mlAway = Number.isFinite(+oAway?.price) ? oAway.price : null;
    mlHome = Number.isFinite(+oHome?.price) ? oHome.price : null;
  }

  // Totals
  let total = null, over = null, under = null;
  if (totals?.outcomes?.length) {
    const overO  = totals.outcomes.find(o => String(o.name).toLowerCase() === "over");
    const underO = totals.outcomes.find(o => String(o.name).toLowerCase() === "under");
    const line   = Number.isFinite(+overO?.point) ? +overO.point : (Number.isFinite(+underO?.point) ? +underO.point : null);
    total = line;
    over  = Number.isFinite(+overO?.price)  ? overO.price  : null;
    under = Number.isFinite(+underO?.price) ? underO.price : null;
  }

  const homeCity = evt.home_team.split(" ").slice(0, -1).join(" ") || evt.home_team;

  return {
    id: evt.id,
    ts: new Date(evt.commence_time).getTime(),
    time: fmtDT(evt.commence_time),
    location: homeCity,
    awayFull: evt.away_team,
    homeFull: evt.home_team,
    awayLogo: window.LogoFinder?.get(evt.away_team, sportKey),
    homeLogo: window.LogoFinder?.get(evt.home_team, sportKey),
    mlAway, mlHome,
    total, over, under
  };
}

  // ---- Filters UI ----
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
    `;

    // options by sport
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

  // Division/conf matching with maps from meta.js
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
        if (val === "notre dame") return conf === "notre dame";
        return conf === val;
      }
      return true; // fail-open if map missing
    };

    return teamMatches(away) || teamMatches(home);
  }

  // ---- Public API ----
  async function getOddsFor(sportKey) {
    const sportApi = SPORT_TO_API[sportKey];
    if (!sportApi) throw new Error(`Unknown sport key: ${sportKey}`);
    if (!KEY) throw new Error("Missing API key (window.ODDS_API_KEY)");

    const nowMs = Date.now();

    // cache hit?
    const hit = _CACHE[sportKey];
    if (hit && hit.expires > nowMs) {
      const cachedGames = mapAndSort(hit.raw, sportKey);
      return wireFiltersAndRender(sportKey, cachedGames);
    }

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

    // Keep only events within lookahead window (upper bound only)
    const upcoming = (json || []).filter(e => new Date(e.commence_time) <= end);

    // cache raw
    _CACHE[sportKey] = {
      raw: upcoming,
      expires: nowMs + chooseTTLMillis(upcoming)
    };

    const games = mapAndSort(upcoming, sportKey);
    return wireFiltersAndRender(sportKey, games);
  }

  // Map + sort helper
  function mapAndSort(events, sportKey) {
    const games = (events || []).map(e => mapEventToGame(e, sportKey));
    games.sort((a, b) => a.ts - b.ts);
    return games;
  }

  // Pick a market (h2h or totals) from our priority list; fall back to any that has 2+ outcomes
function pickMarket(bookmakers, key) {
  const list = bookmakers || [];
  const byPriority = BOOKS
    .map(k => list.find(b => b.key === k))
    .filter(Boolean);

  // First, try by our priority
  for (const b of byPriority) {
    const m = (b.markets || []).find(x => x.key === key);
    if (m?.outcomes?.length >= 2) return m;
  }
  // Fallback: any book that has both sides
  for (const b of list) {
    const m = (b.markets || []).find(x => x.key === key);
    if (m?.outcomes?.length >= 2) return m;
  }
  return null;
}

const eqName = (a,b) => (window.__NAME_NORM__||((s)=>String(s||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim()))(a) ===
                        (window.__NAME_NORM__||((s)=>String(s||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim()))(b);


  // Build filters, attach handlers, and render with post-kick hiding
  function wireFiltersAndRender(sportKey, allGames) {
    buildFiltersUI(sportKey);

    const sel     = document.getElementById("filter-league");
    const search  = document.getElementById("filter-search");
    const refresh = document.getElementById("filter-refresh");

    function computeFiltered() {
      const q = (search?.value || "").trim().toLowerCase();
      const bucket = sel?.value || "";
      const nowMs = Date.now();

      const filtered = allGames
        // hide games >= 10 minutes after kickoff
        .filter(g => nowMs <= (g.ts + POST_KICK_HIDE_MS))
        // text + division/conf bucket
        .filter(g => {
          const hitsText = !q || g.awayFull.toLowerCase().includes(q) || g.homeFull.toLowerCase().includes(q);
          const hitsBucket = matchDivisionConf(sportKey, bucket, g);
          return hitsText && hitsBucket;
        })
        .sort((a, b) => a.ts - b.ts);

      return filtered;
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

    // Re-check every 60s so games drop off 10 min after kickoff automatically
    if (!window.__kickoffHideTimer) {
      window.__kickoffHideTimer = setInterval(applyFilters, 60_000);
    }

    return initial;
  }

  // Expose
  window.OddsService = { getOddsFor };
})();


