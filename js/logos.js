// js/logos.js
(function () {
  const DIR = {
    mlb: "assets/img/mlb/",
    nfl: "assets/img/nfl/",
    sec: "assets/img/sec/",
  };
  const FALLBACK = "assets/img/_placeholder.png";

  // Use this when API team names don't match your file naming
  // Add/adjust as you discover mismatches.
  const ALIAS = {
    "Boston Red Sox": "boston-red-sox",
    "Chicago White Sox": "chicago-white-sox",
    "Los Angeles Angels": "los-angeles-angels", // example
    "Texas A&M Aggies": "texas-am-aggies",
    "BYU Cougars": "byu-cougars",
    // NFL examples already consistent with your screenshot:
    // "Arizona Cardinals": "arizona-cardinals", etc.
  };

  function slugify(name) {
    if (!name) return "";
    if (ALIAS[name]) return ALIAS[name];
    return name
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function getLogo(teamName, sport) {
    const base = DIR[sport] || "assets/img/";
    const slug = slugify(teamName);
    return `${base}${slug}.png`;
  }

  window.LogoFinder = { getLogo, slugify, FALLBACK };
})();
