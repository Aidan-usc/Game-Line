// js/parlay.js
(function () {
  // ----- Odds math helpers -----
  function americanToDecimal(american) {
    const a = Number(american);
    return a > 0 ? 1 + a / 100 : 1 + 100 / Math.abs(a);
  }
  function decimalToAmerican(decimal) {
    const profit = decimal - 1;
    if (profit >= 1) return `+${Math.round(profit * 100)}`;
    return `-${Math.round(100 / profit)}`;
  }
  function projectedPayout(stake, americanOddsArray) {
    const decs = americanOddsArray.map(americanToDecimal);
    const product = decs.reduce((m, d) => m * d, 1);
    return { payout: +(stake * product).toFixed(2), product };
  }

  // Split "City Words Mascot" into {city, mascot} (mascot = last word)
  function splitCityMascot(full) {
    const parts = String(full || "").trim().split(/\s+/);
    if (parts.length === 0) return { city: "", mascot: "" };
    const mascot = parts.pop();
    const city = parts.join(" ");
    return { city, mascot };
  }

  // ----- Parlay state -----
  const state = {
    sport: null,
    legs: [],           // {id, eventId, away:{city,mascot}, home:{city,mascot}, market, selection, line, odds}
    maxLegs: 10,
    wager: 10
  };

  // ----- Rail mode handling -----
  let railEl, titleEl;
  function setRailMode(mode) {
    if (!railEl) return;
    const isParlay = mode === "parlay";
    railEl.classList.toggle("mode-parlay", isParlay);
    railEl.classList.toggle("mode-bets", !isParlay);
    if (titleEl) titleEl.textContent = isParlay ? "Build a Parlay" : "Bets in Play";
  }

  // Expose global init
  window.initParlayPage = function initParlayPage(sport) {
    state.sport = sport;

    railEl = document.getElementById("parlay-rail");
    titleEl = document.getElementById("rail-title");
    setRailMode("bets"); // default view

renderLiveOdds(sport).catch(err => {
  console.warn("Live odds failed, falling back to mock:", err);
  renderMockOdds(sport);
});

    hookRail();
    updateRail();
  };

async function renderLiveOdds(sport) {
  if (!window.OddsService) throw new Error("OddsService missing");
  const data = await window.OddsService.getOddsFor(sport);
  const board = document.getElementById("odds-board");
  if (!board) return;

  board.innerHTML = data.map(renderGameCard).join("");

  // attach click handlers
  board.querySelectorAll(".pick-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const payload = JSON.parse(btn.dataset.payload);
      toggleLeg(payload);
      markSelections(payload);
      updateRail();
    });
  });
}

  
  // ----- Render odds (mock for now) -----
  function renderMockOdds(sport) {
    const data = getMockData(sport);
    const board = document.getElementById("odds-board");
    if (!board) return;
    board.innerHTML = data.map(renderGameCard).join("");

    // click handlers
    board.querySelectorAll(".pick-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const payload = JSON.parse(btn.dataset.payload);
        toggleLeg(payload);
        markSelections(payload);
        updateRail();
      });
    });
  }

  // Card markup with logos, city/mascot blocks, @ in the middle, and clean markets
  function renderGameCard(g) {
    const a = splitCityMascot(g.awayFull);
    const h = splitCityMascot(g.homeFull);
    const dt = g.time || ""; // e.g., "Oct 2 • 7:10pm ET"
    const loc = g.location || (h.city ? `${h.city}` : ""); // fallback: home city

    return `
    <article class="game-card" data-game="${g.id}">
      <div class="gc-head">
        <div class="gc-dt">${dt}</div>
        <div class="gc-loc">${loc}</div>
      </div>

      <div class="gc-center">
        <div class="team team-away">
          <img class="team-logo" src="${g.awayLogo || 'assets/img/logos/_placeholder.png'}" alt="${g.awayFull} logo" onerror="this.src='assets/img/logos/_placeholder.png'">
          <div class="team-city">${a.city}</div>
          <div class="team-mascot">${a.mascot}</div>
        </div>

        <div class="at">@</div>

        <div class="team team-home">
          <img class="team-logo" src="${g.homeLogo || 'assets/img/logos/_placeholder.png'}" alt="${g.homeFull} logo" onerror="this.src='assets/img/logos/_placeholder.png'">
          <div class="team-city">${h.city}</div>
          <div class="team-mascot">${h.mascot}</div>
        </div>
      </div>

      <div class="gc-markets">
        <div class="market ml">
          <div class="market-label">Moneyline</div>
          <div class="ml-row">
            ${pickBtn({g, a, h, market:"ml", selection:"away", label:`${g.awayFull} ML`, odds:g.mlAway})}
            ${pickBtn({g, a, h, market:"ml", selection:"home", label:`${g.homeFull} ML`, odds:g.mlHome})}
          </div>
        </div>

<div class="market tot">
  <div class="market-label">Totals</div>
  <div class="total-number">Total: ${g.total ?? "—"}</div>
  <div class="tot-row">
    <div class="tot-col">
      <div class="side-label">Under</div>
      ${pickBtn({g, a, h, market:"tot", selection:"under", label:`Under ${g.total}`, odds:g.under, line:g.total})}
    </div>
    <div class="tot-col">
      <div class="side-label">Over</div>
      ${pickBtn({g, a, h, market:"tot", selection:"over", label:`Over ${g.total}`, odds:g.over, line:g.total})}
    </div>
  </div>
</div>


</div>

    </article>`;
  }

  function pickBtn({g, a, h, market, selection, label, odds, line=null}) {
    const payload = {
      eid: g.id,
      away: { city: a.city, mascot: a.mascot, full: g.awayFull },
      home: { city: h.city, mascot: h.mascot, full: g.homeFull },
      market, selection, line,
      odds: Number(odds),
      label
    };
    const aria = market === "ml"
      ? `Moneyline ${selection === 'away' ? g.awayFull : g.homeFull} ${formatAmerican(odds)}`
      : `Totals ${selection} ${line} ${formatAmerican(odds)}`;

    return `<button class="pick-btn"
              aria-label="${aria}"
              data-payload='${JSON.stringify(payload)}'>
              ${formatAmerican(odds)}
            </button>`;
  }

  function formatAmerican(n) {
    const v = Number(n);
    return v > 0 ? `+${v}` : `${v}`;
  }

  // ----- Selection state management -----
  function toggleLeg(p) {
    const { eid, market, selection } = p;
    const existingIdx = state.legs.findIndex(l => l.eventId === eid && l.market === market);
    if (existingIdx !== -1) {
      const isSame = state.legs[existingIdx].selection === selection && state.legs[existingIdx].odds === p.odds;
      if (isSame) {
        state.legs.splice(existingIdx, 1);
      } else {
        state.legs[existingIdx] = buildLeg(p);
      }
    } else {
      if (state.legs.length >= state.maxLegs) { alert(`Max ${state.maxLegs} legs reached.`); return; }
      state.legs.push(buildLeg(p));
      if (state.legs.length === 1) setRailMode("parlay"); // first leg switches view
    }
  }

  function buildLeg(p) {
    return {
      id:`${p.eid}_${p.market}`,
      eventId: p.eid,
      away: p.away, home: p.home,
      market: p.market, selection: p.selection, line: p.line,
      odds: Number(p.odds),
    };
  }

  function markSelections({eid, market, selection}) {
    const card = document.querySelector(`.game-card[data-game="${eid}"]`);
    if (!card) return;
    // Clear current
    card.querySelectorAll(".pick-btn").forEach(b => b.classList.remove("selected"));
    // Re-select
    const match = Array.from(card.querySelectorAll(".pick-btn")).find(b => {
      try {
        const p = JSON.parse(b.dataset.payload);
        return p.market === market && p.selection === selection;
      } catch { return false; }
    });
    if (match) match.classList.add("selected");
  }

  // ----- Right rail -----
  function hookRail() {
    const wager = document.getElementById("wager");
    if (wager) {
      wager.addEventListener("input", () => {
        const v = Math.max(1, Number(wager.value || 0));
        state.wager = v;
        updateRail();
      });
    }
    const clearBtn = document.getElementById("clear-parlay");
    clearBtn && clearBtn.addEventListener("click", () => {
      state.legs = [];
      document.querySelectorAll(".pick-btn.selected").forEach(b => b.classList.remove("selected"));
      setRailMode("bets");
      updateRail();
    });
    const submitBtn = document.getElementById("submit-parlay");
    submitBtn && submitBtn.addEventListener("click", () => {
      if (!state.legs.length) return;
      alert(`Parlay submitted (${state.legs.length} legs, $${state.wager}) — mock only`);
    });
  }

  function updateRail() {
    const ul = document.getElementById("parlay-legs");
    if (!ul) return;
    const oddsArr = state.legs.map(l => l.odds);
    ul.innerHTML = state.legs.map(renderLeg).join("");

    ul.querySelectorAll(".remove").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        const leg = state.legs.find(l => l.id === id);
        const card = document.querySelector(`.game-card[data-game="${leg.eventId}"]`);
        if (card) card.querySelectorAll(".pick-btn").forEach(b => {
          try {
            const p = JSON.parse(b.dataset.payload);
            if (p.market === leg.market) b.classList.remove("selected");
          } catch {}
        });
        state.legs = state.legs.filter(l => l.id !== id);
        updateRail();
      });
    });

    const stake = Number((document.getElementById("wager") || {}).value || state.wager);
    const { payout, product } = projectedPayout(stake, oddsArr);
    const american = oddsArr.length ? decimalToAmerican(product) : "+0";

    const totalEl = document.getElementById("total-odds");
    totalEl && (totalEl.textContent = american);
    const payEl = document.getElementById("payout");
    payEl && (payEl.textContent = `$${payout.toFixed(2)}`);

    const submitBtn = document.getElementById("submit-parlay");
    submitBtn && (submitBtn.disabled = state.legs.length === 0);

    if (state.legs.length === 0) setRailMode("bets");
  }

  // Right-rail leg: 5-line left block with @ in middle
  function renderLeg(l) {
    const a = l.away || {city:"", mascot:""};
    const h = l.home || {city:"", mascot:""};
    const marketLabel = l.market === "ml" ? "Moneyline" : (l.selection[0].toUpperCase() + l.selection.slice(1) + (l.line ? ` ${l.line}` : ""));
    return `<li class="leg">
      <div class="names">
        <div class="name-city">${a.city}</div>
        <div class="name-mascot">${a.mascot}</div>
        <div class="name-at">@</div>
        <div class="name-city">${h.city}</div>
        <div class="name-mascot">${h.mascot}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
        <span class="odds">${formatAmerican(l.odds)}</span>
        <span class="meta" style="font-size:12px;opacity:.75;">${marketLabel}</span>
        <span class="remove" title="Remove" data-id="${l.id}">✕</span>
      </div>
    </li>`;
  }

  // ----- Mock data (replace with Odds API later) -----
  function getMockData(sport) {
    // You can swap logos with your own assets; these paths are examples.
    const logo = t => `assets/img/logos/${t}.png`;
    if (sport === "nfl") {
      return [
        { id:"g4", time:"Oct 3 • 1:00pm ET", location:"Glendale, AZ", awayFull:"Seattle Seahawks", homeFull:"Arizona Cardinals",
          awayLogo:logo("SEA"), homeLogo:logo("ARI"), mlAway:-122, mlHome:+102, total:43.5, over:-105, under:-115 },
        { id:"g5", time:"Oct 3 • 4:25pm ET", location:"Detroit, MI", awayFull:"Cleveland Browns", homeFull:"Detroit Lions",
          awayLogo:logo("CLE"), homeLogo:logo("DET"), mlAway:+390, mlHome:-520, total:44.5, over:-105, under:-115 },
        { id:"g6", time:"Oct 3 • 8:20pm ET", location:"Atlanta, GA", awayFull:"Washington Commanders", homeFull:"Atlanta Falcons",
          awayLogo:logo("WAS"), homeLogo:logo("ATL"), mlAway:+140, mlHome:-160, total:42.5, over:-108, under:-112 },
      ];
    }
    if (sport === "sec") {
      return [
        { id:"g7", time:"Oct 4 • 7:30pm ET", location:"Greenville, NC", awayFull:"Army Black Knights", homeFull:"East Carolina Pirates",
          awayLogo:logo("ARMY"), homeLogo:logo("ECU"), mlAway:+180, mlHome:-218, total:53.5, over:-108, under:-112 },
        { id:"g8", time:"Oct 5 • 7:00pm ET", location:"Charlottesville, VA", awayFull:"Florida State Seminoles", homeFull:"Virginia Cavaliers",
          awayLogo:logo("FSU"), homeLogo:logo("UVA"), mlAway:-258, mlHome:+210, total:59.5, over:-105, under:-115 },
        { id:"g9", time:"Oct 5 • 9:00pm ET", location:"Tempe, AZ", awayFull:"TCU Horned Frogs", homeFull:"Arizona State Sun Devils",
          awayLogo:logo("TCU"), homeLogo:logo("ASU"), mlAway:+110, mlHome:-130, total:55.5, over:-112, under:-108 },
      ];
    }
    // default MLB
    return [
      { id:"g1", time:"Oct 2 • 7:10pm ET", location:"San Diego, CA", awayFull:"Milwaukee Brewers", homeFull:"San Diego Padres",
        awayLogo:logo("MIL"), homeLogo:logo("SD"), mlAway:+107, mlHome:-131, total:7.5, over:-117, under:-104 },
      { id:"g2", time:"Oct 2 • 9:05pm ET", location:"Baltimore, MD", awayFull:"Tampa Bay Rays", homeFull:"Baltimore Orioles",
        awayLogo:logo("TB"), homeLogo:logo("BAL"), mlAway:+100, mlHome:-122, total:8.0, over:-114, under:-107 },
      { id:"g3", time:"Oct 2 • 9:10pm ET", location:"Cincinnati, OH", awayFull:"Pittsburgh Pirates", homeFull:"Cincinnati Reds",
        awayLogo:logo("PIT"), homeLogo:logo("CIN"), mlAway:-102, mlHome:-119, total:6.5, over:-124, under:+102 },
    ];
  }
})();




