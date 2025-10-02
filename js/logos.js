// js/logos.js
(function () {
  const ROOT = "assets/img";

  // If any specific API team names don't match your filenames, add them here:
  const ALIASES = {
    nfl: {
      "Washington Commanders": "washington-commanders",
      "New York Jets": "new-york-jets",
      "Los Angeles Rams": "los-angeles-rams",
      "Cleveland Browns": "cleveland-browns"
    },
    mlb: {
      "San Diego Padres": "san-diego-padres",
      "Milwaukee Brewers": "milwaukee-brewers",
      "Tampa Bay Rays": "tampa-bay-rays",
      "Baltimore Orioles": "baltimore-orioles",
      "Pittsburgh Pirates": "pittsburgh-pirates",
      "Cincinnati Reds": "cincinnati-reds"
    },
    sec: {
      // CFB example aliases (expand as needed to match your filenames)
      "Florida State Seminoles": "florida-state-seminoles",
      "Virginia Cavaliers": "virginia-cavaliers",
      "TCU Horned Frogs": "tcu-horned-frogs",
      "Arizona State Sun Devils": "arizona-state-sun-devils",
      "Army Black Knights": "army-black-knights",
      "East Carolina Pirates": "east-carolina-pirates"
    }
  };

  function slugify(str) {
    return String(str)
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  function toPath(sport, fullName) {
    const alias = ALIASES[sport]?.[fullName];
    const file = alias ? alias : slugify(fullName);
    return `${ROOT}/${sport}/${file}.png`;
  }

  window.LogoFinder = {
    get(fullName, sport) {
      // Build a path to your three folders: assets/img/mlb|nfl|sec
      return toPath(sport, fullName);
    },
    placeholder() {
      return `${ROOT}/placeholder.png`; // optional; add a placeholder image if you want
    }
  };
})();
