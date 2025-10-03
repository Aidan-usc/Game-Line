// js/meta.js
(function () {
  // Shared normalizer
  const norm = s => String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  const normalizeMap = (src) => {
    const out = {};
    for (const [k, v] of Object.entries(src)) out[norm(k)] = v;
    return out;
  };

  // ---------- NFL ----------
  const NFL_RAW = {
    // AFC East
    "Buffalo Bills":"AFC East","Miami Dolphins":"AFC East","New York Jets":"AFC East","New England Patriots":"AFC East",
    // AFC North
    "Baltimore Ravens":"AFC North","Cincinnati Bengals":"AFC North","Cleveland Browns":"AFC North","Pittsburgh Steelers":"AFC North",
    // AFC South
    "Houston Texans":"AFC South","Indianapolis Colts":"AFC South","Jacksonville Jaguars":"AFC South","Tennessee Titans":"AFC South",
    // AFC West
    "Denver Broncos":"AFC West","Kansas City Chiefs":"AFC West","Las Vegas Raiders":"AFC West","Los Angeles Chargers":"AFC West",
    // NFC East
    "Dallas Cowboys":"NFC East","New York Giants":"NFC East","Philadelphia Eagles":"NFC East","Washington Commanders":"NFC East",
    // NFC North
    "Chicago Bears":"NFC North","Detroit Lions":"NFC North","Green Bay Packers":"NFC North","Minnesota Vikings":"NFC North",
    // NFC South
    "Atlanta Falcons":"NFC South","Carolina Panthers":"NFC South","New Orleans Saints":"NFC South","Tampa Bay Buccaneers":"NFC South",
    // NFC West
    "Arizona Cardinals":"NFC West","Los Angeles Rams":"NFC West","San Francisco 49ers":"NFC West","Seattle Seahawks":"NFC West"
  };

  // ---------- MLB ----------
  const MLB_RAW = {
    // AL East
    "Baltimore Orioles":"AL East","Boston Red Sox":"AL East","New York Yankees":"AL East","Tampa Bay Rays":"AL East","Toronto Blue Jays":"AL East",
    // AL Central
    "Chicago White Sox":"AL Central","Cleveland Guardians":"AL Central","Detroit Tigers":"AL Central","Kansas City Royals":"AL Central","Minnesota Twins":"AL Central",
    // AL West
    "Houston Astros":"AL West","Los Angeles Angels":"AL West","Oakland Athletics":"AL West","Seattle Mariners":"AL West","Texas Rangers":"AL West",
    // NL East
    "Atlanta Braves":"NL East","Miami Marlins":"NL East","New York Mets":"NL East","Philadelphia Phillies":"NL East","Washington Nationals":"NL East",
    // NL Central
    "Chicago Cubs":"NL Central","Cincinnati Reds":"NL Central","Milwaukee Brewers":"NL Central","Pittsburgh Pirates":"NL Central","St. Louis Cardinals":"NL Central",
    // NL West
    "Arizona Diamondbacks":"NL West","Colorado Rockies":"NL West","Los Angeles Dodgers":"NL West","San Diego Padres":"NL West","San Francisco Giants":"NL West"
  };

  // ---------- CFB (Power 4 + Notre Dame) ----------
  const SEC = ["Alabama Crimson Tide","Arkansas Razorbacks","Auburn Tigers","Florida Gators","Georgia Bulldogs","Kentucky Wildcats","LSU Tigers","Mississippi State Bulldogs","Missouri Tigers","Ole Miss Rebels","South Carolina Gamecocks","Tennessee Volunteers","Texas A&M Aggies","Vanderbilt Commodores","Texas Longhorns","Oklahoma Sooners"];
  const BIG_TEN = ["Illinois Fighting Illini","Indiana Hoosiers","Iowa Hawkeyes","Maryland Terrapins","Michigan Wolverines","Michigan State Spartans","Minnesota Golden Gophers","Nebraska Cornhuskers","Northwestern Wildcats","Ohio State Buckeyes","Penn State Nittany Lions","Purdue Boilermakers","Rutgers Scarlet Knights","Wisconsin Badgers","Oregon Ducks","UCLA Bruins","USC Trojans","Washington Huskies"];
  const BIG_12 = ["Arizona Wildcats","Arizona State Sun Devils","Baylor Bears","BYU Cougars","Cincinnati Bearcats","Colorado Buffaloes","Houston Cougars","Iowa State Cyclones","Kansas Jayhawks","Kansas State Wildcats","Oklahoma State Cowboys","TCU Horned Frogs","Texas Tech Red Raiders","UCF Knights","Utah Utes","West Virginia Mountaineers"];
  const ACC = ["Boston College Eagles","Clemson Tigers","Duke Blue Devils","Florida State Seminoles","Georgia Tech Yellow Jackets","Louisville Cardinals","Miami (FL) Hurricanes","North Carolina Tar Heels","NC State Wolfpack","Pittsburgh Panthers","Syracuse Orange","Virginia Cavaliers","Virginia Tech Hokies","Wake Forest Demon Deacons","California Golden Bears","Stanford Cardinal","SMU Mustangs"];
  const ND = ["Notre Dame Fighting Irish"];

  const CFB_RAW = {};
  for (const t of SEC) CFB_RAW[t] = "SEC";
  for (const t of BIG_TEN) CFB_RAW[t] = "Big Ten";
  for (const t of BIG_12) CFB_RAW[t] = "Big 12";
  for (const t of ACC) CFB_RAW[t] = "ACC";
  for (const t of ND) CFB_RAW[t] = "Notre Dame";

  // ---------- Aliases for common API variants ----------
  // Keys and values are *normalized* (lowercased, punctuation stripped)
  window.TEAM_ALIASES = {
    nfl: {
      "la rams":"los angeles rams",
      "la chargers":"los angeles chargers",
      "washington football team":"washington commanders",
      "ny giants":"new york giants",
      "ny jets":"new york jets",
      "jax jaguars":"jacksonville jaguars"
    },
    mlb: {
      "la angels":"los angeles angels",
      "los angeles angels of anaheim":"los angeles angels",
      "arizona dbacks":"arizona diamondbacks",
      "arizona d backs":"arizona diamondbacks",
      "ny mets":"new york mets",
      "ny yankees":"new york yankees",
      "st louis cardinals":"st louis cardinals",     // normalize dotted/undotted
      "chi white sox":"chicago white sox",
      "chi cubs":"chicago cubs"
    },
    sec: {
      "mississippi rebels":"ole miss rebels",
      "lsu":"lsu tigers",
      "miami hurricanes":"miami (fl) hurricanes"
    }
  };

  // Normalize maps (keys normalized, values readable)
  window.NFL_TEAM_TO_DIVISION = normalizeMap(NFL_RAW);
  window.MLB_TEAM_TO_DIVISION = normalizeMap(MLB_RAW);
  window.CFB_TEAM_TO_CONF     = normalizeMap(CFB_RAW);

  // Expose the normalizer so odds.js can reuse it
  window.__NAME_NORM__ = norm;
})();
