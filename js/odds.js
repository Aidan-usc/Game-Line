// js/odds.js
(function () {
  const API = "https://api.the-odds-api.com/v4";
  // Use config.js if present; otherwise fall back to the inline key you had
  const KEY = (window.ODDS_API_KEY && String(window.ODDS_API_KEY)) || "85bd97903b7fe6cc8850b02f70e25ade";
  const REGIONS = "us";
  const MARKETS = "h2h,totals";
  const ODDS_FMT = "american";

  // Windows
  const WINDOW_DAYS = {
    mlb: 5,
    nfl: 9,
    sec: 9, // sec == CFB
  };

  // Page key -> Odds API key
  const SPORT_TO_API = {
    mlb: "baseball_mlb",
    nfl: "americanfootball_nfl",
    sec: "americanfootball_ncaaf",
  };

  // Bookmaker priority
  const BOOKS = ["draftkings", "fanduel", "betmgm", "caesars", "pointsbetus", "barstool"];

  // ---- Helpers ----
  const norm = (window.__NAME_NORM__) || (s => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim());

// after: const norm = (window.__NAME_NORM__) || (...)
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
    // "Oct 2 • 7:10pm ET"
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
    for (const b of bookmakers || []) byKey[b.key] = b;
    for (const pref of BOOKS) if (byKey[pref]) return byKey[pref];
    return bookmakers?.[0];
  }

  // Build game rows that parlay.js expects
  function mapEventToGame(evt, sportKey) {
    const apiBook = chooseBook(evt.bookmakers || []);
    const markets = apiBook?.markets || [];
    const h2h = markets.find(m => m.key === "h2h");
    const totals = markets.find(m => m.key === "totals");

    // Moneyline
    let mlAway = null, mlHome = null;
    if (h2h?.outcomes?.length) {
      const oAway = h2h.outcomes.find(o => o.name === evt.away_team);
      const oHome = h2h.outcomes.find(o => o.name === evt.home_team);
      mlAway = oAway?.price ?? null;
      mlHome = oHome?.price ?? null;
    }

    // Totals
    let total = null, over = null, under = null;
    if (totals?.outcomes?.length) {
      const overO = totals.outcomes.find(o => norm(o.name) === "over");
      const underO = totals.outcomes.find(o => norm(o.name) === "under");
      total = overO?.point ?? underO?.point ?? null;
      over = overO?.price ?? null;
      under = underO?.price ?? null;
    }

    // Location label fallback = home "city part"
    const homeCity = evt.home_team.split(" ").slice(0, -1).join(" ") || evt.home_team;
    const ts = new Date(evt.commence_time).getTime();

    return {
      id: evt.id,
      ts,                                  // numeric timestamp for reliable sorting
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

    // Options by sport
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

  // Robust division/conf matching using normalized maps from meta.js
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

    // cache hit?
    const hit = _CACHE[sportKey];
    const nowMs = Date.now();
    if (hit && hit.expires > nowMs) {
      const cachedGames = mapAndFilter(hit.raw, sportKey);
      wireFiltersAndRender(sportKey, cachedGames);
      return cachedGames;
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

    // keep only events within our window to the client
    const upcoming = (json || []).filter(e => new Date(e.commence_time) <= end);

    // set cache
    _CACHE[sportKey] = {
      raw: upcoming,
      expires: nowMs + chooseTTLMillis(upcoming)
    };

    const games = mapAndFilter(upcoming, sportKey);
    wireFiltersAndRender(sportKey, games);
    return games;
  }

  // Map, sort, and return list shaped for rendering
  function mapAndFilter(events, sportKey) {
    const games = (events || []).map(e => mapEventToGame(e, sportKey));
    games.sort((a, b) => a.ts - b.ts);
    return games;
  }

  // Build filters, attach handlers, and render initial list
  function wireFiltersAndRender(sportKey, games) {
    buildFiltersUI(sportKey);

    const sel = document.getElementById("filter-league");
    const search = document.getElementById("filter-search");
    const refresh = document.getElementById("filter-refresh");

    function applyFilters() {
      const q = (search?.value || "").trim().toLowerCase();
      const bucket = sel?.value || "";
      const filtered = games.filter(g => {
        const hitsText = !q || (g.awayFull.toLowerCase().includes(q) || g.homeFull.toLowerCase().includes(q));
        const hitsBucket = matchDivisionConf(sportKey, bucket, g);
        return hitsText && hitsBucket;
      });
      window.reRenderOdds && window.reRenderOdds(filtered);
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
    window.reRenderOdds && window.reRenderOdds(games);
  }

  // Expose
  window.OddsService = { getOddsFor };
})();

