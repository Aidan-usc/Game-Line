// js/meta.js
(function () {
  // ---------- NFL divisions ----------
  window.NFL_TEAM_TO_DIVISION = {
    "Buffalo Bills":"AFC East","Miami Dolphins":"AFC East","New England Patriots":"AFC East","New York Jets":"AFC East",
    "Baltimore Ravens":"AFC North","Cincinnati Bengals":"AFC North","Cleveland Browns":"AFC North","Pittsburgh Steelers":"AFC North",
    "Houston Texans":"AFC South","Indianapolis Colts":"AFC South","Jacksonville Jaguars":"AFC South","Tennessee Titans":"AFC South",
    "Denver Broncos":"AFC West","Kansas City Chiefs":"AFC West","Las Vegas Raiders":"AFC West","Los Angeles Chargers":"AFC West",
    "Dallas Cowboys":"NFC East","New York Giants":"NFC East","Philadelphia Eagles":"NFC East","Washington Commanders":"NFC East",
    "Chicago Bears":"NFC North","Detroit Lions":"NFC North","Green Bay Packers":"NFC North","Minnesota Vikings":"NFC North",
    "Atlanta Falcons":"NFC South","Carolina Panthers":"NFC South","New Orleans Saints":"NFC South","Tampa Bay Buccaneers":"NFC South",
    "Arizona Cardinals":"NFC West","Los Angeles Rams":"NFC West","San Francisco 49ers":"NFC West","Seattle Seahawks":"NFC West"
  };

  // ---------- MLB divisions ----------
  window.MLB_TEAM_TO_DIVISION = {
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

  // ---------- CFB Power-4 + Notre Dame ----------
  // We’ll treat the "sec" page as CFB and filter by these conferences.
  window.CFB_TEAM_TO_CONF = {
    // SEC (16)
    "Alabama Crimson Tide":"SEC","Arkansas Razorbacks":"SEC","Auburn Tigers":"SEC","Florida Gators":"SEC","Georgia Bulldogs":"SEC",
    "Kentucky Wildcats":"SEC","LSU Tigers":"SEC","Mississippi State Bulldogs":"SEC","Missouri Tigers":"SEC","Ole Miss Rebels":"SEC",
    "South Carolina Gamecocks":"SEC","Tennessee Volunteers":"SEC","Texas A&M Aggies":"SEC","Vanderbilt Commodores":"SEC",
    "Texas Longhorns":"SEC","Oklahoma Sooners":"SEC",

    // Big Ten (18)
    "Illinois Fighting Illini":"Big Ten","Indiana Hoosiers":"Big Ten","Iowa Hawkeyes":"Big Ten","Maryland Terrapins":"Big Ten",
    "Michigan Wolverines":"Big Ten","Michigan State Spartans":"Big Ten","Minnesota Golden Gophers":"Big Ten","Nebraska Cornhuskers":"Big Ten",
    "Northwestern Wildcats":"Big Ten","Ohio State Buckeyes":"Big Ten","Penn State Nittany Lions":"Big Ten","Purdue Boilermakers":"Big Ten",
    "Rutgers Scarlet Knights":"Big Ten","Wisconsin Badgers":"Big Ten",
    "Oregon Ducks":"Big Ten","UCLA Bruins":"Big Ten","USC Trojans":"Big Ten","Washington Huskies":"Big Ten",

    // ACC (incl. 2024 adds)
    "Boston College Eagles":"ACC","Clemson Tigers":"ACC","Duke Blue Devils":"ACC","Florida State Seminoles":"ACC",
    "Georgia Tech Yellow Jackets":"ACC","Louisville Cardinals":"ACC","Miami Hurricanes":"ACC","North Carolina Tar Heels":"ACC",
    "NC State Wolfpack":"ACC","Pittsburgh Panthers":"ACC","Syracuse Orange":"ACC","Virginia Cavaliers":"ACC",
    "Virginia Tech Hokies":"ACC","Wake Forest Demon Deacons":"ACC","California Golden Bears":"ACC","Stanford Cardinal":"ACC","SMU Mustangs":"ACC",

    // Big 12 (incl. 2024 adds)
    "Arizona Wildcats":"Big 12","Arizona State Sun Devils":"Big 12","Baylor Bears":"Big 12","BYU Cougars":"Big 12",
    "Cincinnati Bearcats":"Big 12","Colorado Buffaloes":"Big 12","Houston Cougars":"Big 12","Iowa State Cyclones":"Big 12",
    "Kansas Jayhawks":"Big 12","Kansas State Wildcats":"Big 12","Oklahoma State Cowboys":"Big 12","TCU Horned Frogs":"Big 12",
    "Texas Tech Red Raiders":"Big 12","UCF Knights":"Big 12","Utah Utes":"Big 12","West Virginia Mountaineers":"Big 12",

    // Notre Dame
    "Notre Dame Fighting Irish":"Notre Dame"
  };
})();
