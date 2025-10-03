// js/odds.js
(function () {
  const API = "https://api.the-odds-api.com/v4";
  const KEY = window.ODDS_API_KEY || "85bd97903b7fe6cc8850b02f70e25ade";
  const REGIONS = "us";
  const MARKETS = "h2h,totals";
  const ODDS_FMT = "american";

  // windows
  const WINDOW_DAYS = {
    mlb: 5,
    nfl: 9,
    sec: 9, // sec == CFB
  };

  // map page keys to API sport keys
  const SPORT_TO_API = {
    mlb: "baseball_mlb",
    nfl: "americanfootball_nfl",
    sec: "americanfootball_ncaaf",
  };

  // book priority
  const BOOKS = ["draftkings", "fanduel", "betmgm", "caesars", "pointsbetus", "barstool"];

  // util
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

  // choose a bookmaker in our priority list
  function chooseBook(bookmakers) {
    const byKey = {};
    for (const b of bookmakers || []) byKey[b.key] = b;
    for (const pref of BOOKS) {
      if (byKey[pref]) return byKey[pref];
    }
    return bookmakers?.[0];
  }

  // build game rows that parlay.js expects
  function mapEventToGame(evt, sportKey) {
    const apiBook = chooseBook(evt.bookmakers || []);
    const markets = apiBook?.markets || [];
    const h2h = markets.find(m => m.key === "h2h");
    const totals = markets.find(m => m.key === "totals");

    // Moneyline
    let mlAway = null, mlHome = null;
    if (h2h?.outcomes?.length) {
      // find by name
      const oAway = h2h.outcomes.find(o => o.name === evt.away_team);
      const oHome = h2h.outcomes.find(o => o.name === evt.home_team);
      mlAway = oAway?.price ?? null;
      mlHome = oHome?.price ?? null;
    }

    // Totals: pick the total line if present
    let total = null, over = null, under = null;
    if (totals?.outcomes?.length) {
      const overO = totals.outcomes.find(o => o.name?.toLowerCase() === "over");
      const underO = totals.outcomes.find(o => o.name?.toLowerCase() === "under");
      total = overO?.point ?? underO?.point ?? null;
      over = overO?.price ?? null;
      under = underO?.price ?? null;
    }

    // Location: we can’t get a stadium city from API without a second dataset; use home team city as a reasonable label
    const homeCity = evt.home_team.split(" ").slice(0, -1).join(" ") || evt.home_team;

    return {
      id: evt.id,
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

  // Filters UI
// Filters UI
function buildFiltersUI(sportKey) {
  const wrap = document.getElementById("filters");
  if (!wrap) return;

  // Label text changes for CFB
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
          <input id="filter-search" class="filter-search" type="search" placeholder="Search teams…" aria-label="Search teams">
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
    // CFB (Power 4 + ND)
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

const _norm = s => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function matchDivisionConf(sportKey, filterValue, game) {
  const val = _norm(filterValue || "");
  if (!val || val.startsWith("all")) return true;

  const nflMap = window.NFL_TEAM_TO_DIVISION;
  const mlbMap = window.MLB_TEAM_TO_DIVISION;
  const cfbMap = window.CFB_TEAM_TO_CONF;

  const away = _norm(game.awayFull);
  const home = _norm(game.homeFull);

  const teamMatches = (fullName) => {
    if (sportKey === "mlb" && mlbMap) {
      const div = _norm(mlbMap[fullName] || "");
      return !!div && div === val;
    }
    if (sportKey === "nfl" && nflMap) {
      const div = _norm(nflMap[fullName] || "");
      return !!div && div === val;
    }
    if (sportKey === "sec" && cfbMap) {
      const conf = _norm(cfbMap[fullName] || "");
      if (!conf) return false;
      if (val === "notre dame") return conf === "notre dame";
      return conf === val;
    }
    // If maps aren’t available for this sport, don’t filter out the game
    return true;
  };

  return teamMatches(away) || teamMatches(home);
}
  // Public API
  async function getOddsFor(sportKey) {
    const sportApi = SPORT_TO_API[sportKey];
    if (!sportApi) throw new Error(`Unknown sport key: ${sportKey}`);
    if (!KEY) throw new Error("Missing API key (window.ODDS_API_KEY)");

    const now = new Date();
    const end = addDays(now, WINDOW_DAYS[sportKey] || 5);

    const url = new URL(`${API}/sports/${sportApi}/odds`);
    url.searchParams.set("apiKey", KEY);
    url.searchParams.set("regions", REGIONS);
    url.searchParams.set("markets", MARKETS);
    url.searchParams.set("oddsFormat", ODDS_FMT);
    url.searchParams.set("dateFormat", "iso");

    // Fetch all upcoming; we'll filter by commence_time window client side.
    const res = await fetch(url.toString());
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Odds API ${res.status}: ${txt}`);
    }
    const json = await res.json();

    // Filter by window and map to our game cards
    const games = (json || [])
      .filter(e => new Date(e.commence_time) <= end)
      .map(e => mapEventToGame(e, sportKey));

    // Sort by time
    games.sort((a, b) => new Date(a.time) - new Date(b.time));

    // Build filters UI (once) and wire up live filtering
    buildFiltersUI(sportKey);

    // Wire up filters
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
      // Re-render the grid with the new list
      if (window.reRenderOdds) window.reRenderOdds(filtered);
    }

    sel && sel.addEventListener("change", applyFilters);
    search && search.addEventListener("input", () => {
      // cheap debounce
      clearTimeout(applyFilters._t);
      applyFilters._t = setTimeout(applyFilters, 120);
    });
    refresh && refresh.addEventListener("click", () => location.reload());

    // Initial render
    if (window.reRenderOdds) window.reRenderOdds(games);
    return games;
  }

  // Expose
  window.OddsService = { getOddsFor };
})();



