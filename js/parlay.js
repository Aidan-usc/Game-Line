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

  // ----- Parlay state -----
  const state = {
    sport: null,
    legs: [],           // {id, eventId, label, market, selection, line, odds}
    maxLegs: 10,
    wager: 10
  };

  // Expose global init
  window.initParlayPage = function initParlayPage(sport) {
    state.sport = sport;
    renderMockOdds(sport); // replace with live odds later
    hookRail();
    updateRail();
  };

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

  function renderGameCard(g) {
    // g: {id, time, away, home, mlAway, mlHome, total, over, under}
    return `
    <article class="game-card" data-game="${g.id}">
      <div class="gc-head">
        <div class="gc-time">${g.time}</div>
        <div class="gc-matchup">${g.away} @ ${g.home}</div>
      </div>
      <div class="gc-body">
        ${pickBtn({g, market:"ml", selection:"away", label:`${g.away} ML`, odds:g.mlAway})}
        ${pickBtn({g, market:"ml", selection:"home", label:`${g.home} ML`, odds:g.mlHome})}
      </div>
      <div class="gc-footer">
        <div>
          <span class="market-label">Over ${g.total}</span>
          ${pickBtn({g, market:"tot", selection:"over", label:`Over ${g.total}`, odds:g.over, line:g.total})}
        </div>
        <div>
          <span class="market-label">Under ${g.total}</span>
          ${pickBtn({g, market:"tot", selection:"under", label:`Under ${g.total}`, odds:g.under, line:g.total})}
        </div>
      </div>
    </article>`;
  }

  function pickBtn({g, market, selection, label, odds, line=null}) {
    const payload = {
      eid: g.id,
      game: `${g.away} @ ${g.home}`,
      market, selection, line,
      odds,
      label
    };
    return `<button class="pick-btn"
              data-payload='${JSON.stringify(payload)}'>
              ${label} <small>(${formatAmerican(odds)})</small>
            </button>`;
  }

  function formatAmerican(n) {
    const v = Number(n);
    return v > 0 ? `+${v}` : `${v}`;
  }

  // ----- Selection state management -----
  function toggleLeg({eid, market, selection, line, odds, label, game}) {
    const existingIdx = state.legs.findIndex(l => l.eventId === eid && l.market === market);
    if (existingIdx !== -1) {
      const isSame = state.legs[existingIdx].selection === selection && state.legs[existingIdx].odds === odds;
      if (isSame) { state.legs.splice(existingIdx, 1); return; }
      state.legs[existingIdx] = buildLeg({eid, market, selection, line, odds, label, game});
      return;
    }
    if (state.legs.length >= state.maxLegs) { alert(`Max ${state.maxLegs} legs reached.`); return; }
    state.legs.push(buildLeg({eid, market, selection, line, odds, label, game}));
  }

  function buildLeg({eid, market, selection, line, odds, label, game}) {
    return { id:`${eid}_${market}`, eventId:eid, game, market, selection, line, odds:Number(odds), label };
  }

  function markSelections({eid, market}) {
    const card = document.querySelector(`.game-card[data-game="${eid}"]`);
    if (!card) return;
    card.querySelectorAll(".pick-btn").forEach(b => b.classList.remove("selected"));
    const leg = state.legs.find(l => l.eventId === eid && l.market === market);
    if (!leg) return;
    card.querySelectorAll(".pick-btn").forEach(b => {
      const p = JSON.parse(b.dataset.payload);
      if (p.market === market && p.selection === leg.selection) b.classList.add("selected");
    });
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
          const p = JSON.parse(b.dataset.payload);
          if (p.market === leg.market) b.classList.remove("selected");
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
  }

  function renderLeg(l) {
    const m = l.market === "ml" ? "Moneyline" : (l.selection[0].toUpperCase() + l.selection.slice(1));
    const sub = l.market === "tot" ? `${m} ${l.line}` : m;
    return `<li class="leg">
      <div>
        <div class="title">${l.label}</div>
        <div class="meta">${l.game} • ${sub}</div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;">
        <span class="odds">${formatAmerican(l.odds)}</span>
        <span class="remove" title="Remove" data-id="${l.id}">✕</span>
      </div>
    </li>`;
  }

  // ----- Mock data (replace with odds.js later) -----
  function getMockData(sport) {
    const base = [
      { id:"g1", time:"Sep 24 • 8:10pm", away:"Milwaukee", home:"San Diego", mlAway:+107, mlHome:-131, total:7.5, over:-117, under:-104 },
      { id:"g2", time:"Sep 24 • 10:36pm", away:"Tampa Bay", home:"Baltimore", mlAway:+100, mlHome:-122, total:8.0, over:-114, under:-107 },
      { id:"g3", time:"Sep 24 • 10:41pm", away:"Pittsburgh", home:"Cincinnati", mlAway:-102, mlHome:-119, total:6.5, over:-124, under:+102 },
    ];
    if (sport === "nfl") {
      return [
        { id:"g4", time:"Sep 26 • 12:16am", away:"Seattle", home:"Arizona", mlAway:-122, mlHome:+102, total:43.5, over:-105, under:-115 },
        { id:"g5", time:"Sep 28 • 5:00pm", away:"Cleveland", home:"Detroit", mlAway:+390, mlHome:-520, total:44.5, over:-105, under:-115 },
        { id:"g6", time:"Sep 28 • 5:01pm", away:"Washington", home:"Atlanta", mlAway:+140, mlHome:-160, total:42.5, over:-108, under:-112 },
      ];
    }
    if (sport === "sec") {
      return [
        { id:"g7", time:"Sep 25 • 11:30pm", away:"Army", home:"ECU", mlAway:+180, mlHome:-218, total:53.5, over:-108, under:-112 },
        { id:"g8", time:"Sep 26 • 11:00pm", away:"FSU", home:"Virginia", mlAway:-258, mlHome:+210, total:59.5, over:-105, under:-115 },
        { id:"g9", time:"Sep 27 • 1:00am", away:"TCU", home:"ASU", mlAway:+110, mlHome:-130, total:55.5, over:-112, under:-108 },
      ];
    }
    return base;
  }
})();
