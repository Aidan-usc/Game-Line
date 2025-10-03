// js/meta.js
(function () {
  // Normalizer used across app
  const norm = s => String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  // Helper: build a normalized copy of a plain object map
  function normalizeMap(src) {
    const out = {};
    for (const [k, v] of Object.entries(src)) out[norm(k)] = v;
    return out;
  }

  // --- NFL divisions (human-readable keys) ---
  const NFL_RAW = {
    // AFC East
    "Buffalo Bills": "AFC East",
    "Miami Dolphins": "AFC East",
    "New York Jets": "AFC East",
    "New England Patriots": "AFC East",

    // AFC North
    "Baltimore Ravens": "AFC North",
    "Cincinnati Bengals": "AFC North",
    "Cleveland Browns": "AFC North",
    "Pittsburgh Steelers": "AFC North",

    // AFC South
    "Houston Texans": "AFC South",
    "Indianapolis Colts": "AFC South",
    "Jacksonville Jaguars": "AFC South",
    "Tennessee Titans": "AFC South",

    // AFC West
    "Denver Broncos": "AFC West",
    "Kansas City Chiefs": "AFC West",
    "Las Vegas Raiders": "AFC West",
    "Los Angeles Chargers": "AFC West",

    // NFC East
    "Dallas Cowboys": "NFC East",
    "New York Giants": "NFC East",
    "Philadelphia Eagles": "NFC East",
    "Washington Commanders": "NFC East",

    // NFC North
    "Chicago Bears": "NFC North",
    "Detroit Lions": "NFC North",
    "Green Bay Packers": "NFC North",
    "Minnesota Vikings": "NFC North",

    // NFC South
    "Atlanta Falcons": "NFC South",
    "Carolina Panthers": "NFC South",
    "New Orleans Saints": "NFC South",
    "Tampa Bay Buccaneers": "NFC South",

    // NFC West
    "Arizona Cardinals": "NFC West",
    "Los Angeles Rams": "NFC West",
    "San Francisco 49ers": "NFC West",
    "Seattle Seahawks": "NFC West"
  };

  // --- MLB divisions ---
  const MLB_RAW = {
    // AL East
    "Baltimore Orioles": "AL East",
    "Boston Red Sox": "AL East",
    "New York Yankees": "AL East",
    "Tampa Bay Rays": "AL East",
    "Toronto Blue Jays": "AL East",
    // AL Central
    "Chicago White Sox": "AL Central",
    "Cleveland Guardians": "AL Central",
    "Detroit Tigers": "AL Central",
    "Kansas City Royals": "AL Central",
    "Minnesota Twins": "AL Central",
    // AL West
    "Houston Astros": "AL West",
    "Los Angeles Angels": "AL West",
    "Oakland Athletics": "AL West",
    "Seattle Mariners": "AL West",
    "Texas Rangers": "AL West",
    // NL East
    "Atlanta Braves": "NL East",
    "Miami Marlins": "NL East",
    "New York Mets": "NL East",
    "Philadelphia Phillies": "NL East",
    "Washington Nationals": "NL East",
    // NL Central
    "Chicago Cubs": "NL Central",
    "Cincinnati Reds": "NL Central",
    "Milwaukee Brewers": "NL Central",
    "Pittsburgh Pirates": "NL Central",
    "St. Louis Cardinals": "NL Central",
    // NL West
    "Arizona Diamondbacks": "NL West",
    "Colorado Rockies": "NL West",
    "Los Angeles Dodgers": "NL West",
    "San Diego Padres": "NL West",
    "San Francisco Giants": "NL West"
  };

  // --- CFB (Power 4 + ND)—seed list; expand as needed ---
  const CFB_RAW = {
    // SEC
    "Alabama Crimson Tide": "SEC",
    "Georgia Bulldogs": "SEC",
    "Florida Gators": "SEC",
    "Auburn Tigers": "SEC",
    // Big Ten
    "Ohio State Buckeyes": "Big Ten",
    "Michigan Wolverines": "Big Ten",
    "Penn State Nittany Lions": "Big Ten",
    // Big 12
    "Oklahoma State Cowboys": "Big 12",
    "Kansas State Wildcats": "Big 12",
    // ACC
    "Florida State Seminoles": "ACC",
    "Clemson Tigers": "ACC",
    "North Carolina Tar Heels": "ACC",
    // Independent
    "Notre Dame Fighting Irish": "Notre Dame"
  };

  // Build normalized maps
  const NFL = normalizeMap(NFL_RAW);
  const MLB = normalizeMap(MLB_RAW);
  const CFB = normalizeMap(CFB_RAW);

  // Expose (simple objects; no Proxy needed once normalized)
  window.NFL_TEAM_TO_DIVISION = NFL;
  window.MLB_TEAM_TO_DIVISION = MLB;
  window.CFB_TEAM_TO_CONF     = CFB;

  // Share the normalizer so odds.js can reuse exactly the same rules
  window.__NAME_NORM__ = norm;
})();
