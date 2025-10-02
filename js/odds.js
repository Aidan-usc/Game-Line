// js/odds.js
(function () {
  const DEFAULT_REGION = "us";
  const DEFAULT_MARKETS = "h2h,totals";   // moneyline + totals
  const DEFAULT_ODDS_FORMAT = "american";
  const DEFAULT_DATE_FORMAT = "iso";

  // For now this is public in the client. Later: move to a proxy (see note below).
  const ODDS_API_KEY = window.APP_CONFIG?.ODDS_API_KEY || "85bd97903b7fe6cc8850b02f70e25ade";
  const ODDS_BASE    = window.APP_CONFIG?.ODDS_API_BASE || "https://api.the-odds-api.com/v4";

  const SPORT_KEYS = {
    mlb: "baseball_mlb",
    nfl: "americanfootball_nfl",
    sec: "americanfootball_ncaaf",  // filter to SEC teams client-side
  };

  const BOOK_ORDER = ["draftkings", "fanduel", "betmgm", "caesars", "pointsbet_us"];

  function bestBook(bookmakers) {
    if (!Array.isArray(bookmakers) || !bookmakers.length) return null;
    for (const k of BOOK_ORDER) {
      const b = bookmakers.find(x => (x.key || "").toLowerCase() === k);
      if (b) return b;
    }
    return bookmakers[0];
  }

  async function fetchOddsRaw(sportKey) {
    const params = new URLSearchParams({
      regions: DEFAULT_REGION,
      markets: DEFAULT_MARKETS,
      oddsFormat: DEFAULT_ODDS_FORMAT,
      dateFormat: DEFAULT_DATE_FORMAT,
      apiKey: ODDS_API_KEY,
    });
    const url = `${ODDS_BASE}/sports/${sportKey}/odds?${params}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Odds API ${res.status}`);
    return res.json();
  }

  function normalise(raw, sport) {
    const out = [];
    for (const ev of raw) {
      const book = bestBook(ev.bookmakers);
      if (!book) continue;

      const h2h = (book.markets || []).find(m => m.key === "h2h");
      const tot = (book.markets || []).find(m => m.key === "totals");

      let mlAway = null, mlHome = null;
      if (h2h?.outcomes) {
        for (const o of h2h.outcomes) {
          if (o.name === ev.away_team) mlAway = o.price;
          if (o.name === ev.home_team) mlHome = o.price;
        }
      }

      let total = null, over = null, under = null;
      if (tot?.outcomes) {
        for (const o of tot.outcomes) {
          const n = (o.name || "").toLowerCase();
          if (n === "over")  { over  = o.price; total = o.point ?? total; }
          if (n === "under") { under = o.price; total = o.point ?? total; }
        }
      }

      out.push({
        id: ev.id,
        time: formatDT(ev.commence_time),
        location: deriveLocation(ev.home_team),
        awayFull: ev.away_team,
        homeFull: ev.home_team,
        awayLogo: window.LogoFinder?.getLogo(ev.away_team, sport),
        homeLogo: window.LogoFinder?.getLogo(ev.home_team, sport),
        mlAway, mlHome,
        total, over, under,
      });
    }

    if (sport === "sec") {
      const SEC_TEAMS = [
        "Alabama Crimson Tide","Arkansas Razorbacks","Auburn Tigers","Florida Gators",
        "Georgia Bulldogs","Kentucky Wildcats","LSU Tigers","Mississippi State Bulldogs",
        "Missouri Tigers","Ole Miss Rebels","South Carolina Gamecocks","Tennessee Volunteers",
        "Texas A&M Aggies","Vanderbilt Commodores","Texas Longhorns","Oklahoma Sooners"
      ];
      const SEC = new Set(SEC_TEAMS);
      return out.filter(e => SEC.has(e.awayFull) || SEC.has(e.homeFull));
    }
    return out;
  }

  function formatDT(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return "";
    const s = d.toLocaleString("en-US", {
      timeZone: "America/New_York",
      month: "short", day: "numeric",
      hour: "numeric", minute: "2-digit",
      hour12: true
    }).replace(",", "");
    return `${s} ET`;
  }

  function deriveLocation(homeFull) {
    const parts = String(homeFull || "").trim().split(/\s+/);
    if (parts.length <= 1) return homeFull || "";
    parts.pop(); // mascot
    return parts.join(" ");
  }

  async function getOddsFor(sport) {
    const key = SPORT_KEYS[sport];
    if (!key) throw new Error(`Unknown sport ${sport}`);
    const raw = await fetchOddsRaw(key);
    return normalise(raw, sport);
  }

  window.OddsService = { getOddsFor };
})();

