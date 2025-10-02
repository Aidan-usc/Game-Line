// js/odds.js
(function () {
  const DEFAULT_REGION = "us";
  const DEFAULT_MARKETS = "h2h,totals";   // moneyline + totals
  const DEFAULT_ODDS_FORMAT = "american";
  const DEFAULT_DATE_FORMAT = "iso";

  // TEMP: put your API key here for now (public).
  // Later, switch to a proxy (see Worker at bottom).
  const ODDS_API_KEY = window.APP_CONFIG?.ODDS_API_KEY || "REPLACE_WITH_YOUR_KEY";
  const ODDS_BASE = window.APP_CONFIG?.ODDS_API_BASE || "https://api.the-odds-api.com/v4";

  const SPORT_KEYS = {
    mlb: "baseball_mlb",
    nfl: "americanfootball_nfl",
    sec: "americanfootball_ncaaf", // We'll filter to SEC teams client-side
  };

  const BOOK_ORDER = ["draftkings", "fanduel", "betmgm", "caesars", "pointsbet_us"];

  function pickBook(bookmakers) {
    if (!Array.isArray(bookmakers) || bookmakers.length === 0) return null;
    for (const pref of BOOK_ORDER) {
      const found = bookmakers.find(b => (b.key || "").toLowerCase() === pref);
      if (found) return found;
    }
    return bookmakers[0];
  }

  // Fetch odds from The Odds API
  async function fetchOddsRaw(sportKey) {
    const params = new URLSearchParams({
      regions: DEFAULT_REGION,
      markets: DEFAULT_MARKETS,
      oddsFormat: DEFAULT_ODDS_FORMAT,
      dateFormat: DEFAULT_DATE_FORMAT,
      apiKey: ODDS_API_KEY,
    });
    const url = `${ODDS_BASE}/sports/${sportKey}/odds?${params.toString()}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Odds API ${res.status}`);
    return res.json();
  }

  // Normalise to the shape parlay.js expects
  function normaliseEvents(raw, sport) {
    const events = [];
    for (const ev of raw) {
      const book = pickBook(ev.bookmakers);
      if (!book) continue;

      const h2h = (book.markets || []).find(m => m.key === "h2h");
      const tot = (book.markets || []).find(m => m.key === "totals");

      // moneyline
      let mlAway = null, mlHome = null;
      if (h2h && h2h.outcomes) {
        for (const o of h2h.outcomes) {
          if (o.name === ev.away_team) mlAway = o.price;
          if (o.name === ev.home_team) mlHome = o.price;
        }
      }

      // totals (one point used for both over/under)
      let total = null, over = null, under = null;
      if (tot && tot.outcomes) {
        for (const o of tot.outcomes) {
          if (o.name?.toLowerCase() === "over") { over = o.price; total = o.point ?? total; }
          if (o.name?.toLowerCase() === "under") { under = o.price; total = o.point ?? total; }
        }
      }

      // Compose
      events.push({
        id: ev.id,
        time: formatDT(ev.commence_time),
        location: deriveLocation(ev.home_team), // city of the home team
        awayFull: ev.away_team,
        homeFull: ev.home_team,
        awayLogo: window.LogoFinder?.getLogo(ev.away_team),
        homeLogo: window.LogoFinder?.getLogo(ev.home_team),
        mlAway, mlHome,
        total, over, under,
      });
    }

    // Optionally filter to SEC games by team set (for sec page)
    if (sport === "sec") {
      return events.filter(e => SEC_SET.has(e.awayFull) || SEC_SET.has(e.homeFull));
    }
    return events;
  }

  // Format ISO to "Oct 2 • 7:10pm ET"
  function formatDT(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return "";
    const parts = d.toLocaleString("en-US", {
      timeZone: "America/New_York",
      month: "short", day: "numeric",
      hour: "numeric", minute: "2-digit",
      hour12: true,
    }).replace(",", "");
    return `${parts} ET`;
  }

  // Location = derived from home team (city part)
  function deriveLocation(fullTeam) {
    const parts = String(fullTeam || "").trim().split(/\s+/);
    if (parts.length <= 1) return fullTeam || "";
    parts.pop(); // drop mascot
    return parts.join(" ");
  }

  const SEC_TEAMS = [
    "Alabama Crimson Tide","Arkansas Razorbacks","Auburn Tigers","Florida Gators",
    "Georgia Bulldogs","Kentucky Wildcats","LSU Tigers","Mississippi State Bulldogs",
    "Missouri Tigers","Ole Miss Rebels","South Carolina Gamecocks","Tennessee Volunteers",
    "Texas A&M Aggies","Vanderbilt Commodores","Texas Longhorns","Oklahoma Sooners"
  ];
  const SEC_SET = new Set(SEC_TEAMS);

  async function getOddsFor(sport) {
    const sportKey = SPORT_KEYS[sport];
    if (!sportKey) throw new Error(`Unknown sport ${sport}`);
    const raw = await fetchOddsRaw(sportKey);
    return normaliseEvents(raw, sport);
  }

  window.OddsService = { getOddsFor };
})();
