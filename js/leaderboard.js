// assets/js/leaderboard.js
(function () {
  // ---------- Utilities ----------
  const fmtMoney = n =>
    (n < 0 ? "-$" : "$") + Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 });

  const fmtPct = n => (isFinite(n) ? (n * 100).toFixed(1) + "%" : "—");

  const byNumDesc = key => (a, b) => (b[key] ?? 0) - (a[key] ?? 0);

  const pick = (obj, keys) => keys.reduce((m, k) => (m[k] = obj[k], m), {});

  // ---------- Mock data (front-end only) ----------
  // We generate a stable-ish set per session so the page feels alive during dev.
  const SPORTS = ["mlb", "nfl", "sec"]; // sec = CFB
  const N = 120; // mock users

  function randBetween(min, max) {
    return Math.random() * (max - min) + min;
  }
  function randInt(min, max) {
    return Math.floor(randBetween(min, max + 1));
  }

  function makeUser(i) {
    const name = [
      "Alex","Blake","Casey","Drew","Evan","Flynn","Gray","Hayes","Indy","Jules",
      "Kai","Lane","Mack","Nico","Oak","Pax","Quinn","Rey","Shea","Tate",
      "Uma","Vale","Wren","Yuri","Zan"
    ][i % 25] + " " + ["A.","B.","C.","D.","E.","F.","G."][i % 7];

    // For each sport and an "all" rollup, make a tiny stat snapshot per range.
    const ranges = ["7d","30d","all"];
    const makeSnap = () => {
      const bets = randInt(2, 40);
      const wins = randInt(0, bets);
      const staked = randBetween(50, 2500);
      const net = randBetween(-800, 1600);
      const bestHit = Math.max(0, randBetween(0, net * 0.7) + randBetween(20, 500));
      const roi = staked ? net / staked : 0;
      return { bets, wins, losses: bets - wins, net, roi, bestHit };
    };

    const sportStats = Object.fromEntries(
      SPORTS.map(s => [s, Object.fromEntries(ranges.map(r => [r, makeSnap()]))])
    );

    // compute "all" as a blend of sports
    const all = Object.fromEntries(
      ranges.map(r => {
        const parts = SPORTS.map(s => sportStats[s][r]);
        const agg = parts.reduce((m, p) => ({
          bets: m.bets + p.bets,
          wins: m.wins + p.wins,
          losses: m.losses + p.losses,
          net: m.net + p.net,
          staked: (m.staked || 0) + Math.max(1, p.bets) * 25, // pretend $25 avg stake
          bestHit: Math.max(m.bestHit, p.bestHit),
        }), { bets:0, wins:0, losses:0, net:0, bestHit:0, staked:0 });
        agg.roi = agg.staked ? agg.net / agg.staked : 0;
        return [r, pick(agg, ["bets","wins","losses","net","roi","bestHit"])];
      })
    );

    sportStats.all = all;
    return { id: "u" + (1000 + i), name, sportStats };
  }

  const MOCK = Array.from({ length: N }, (_, i) => makeUser(i));

  // ---------- State ----------
  const state = {
    range: "7d",        // 7d | 30d | all
    scope: "net",       // net | roi | volume
    sport: "all",       // all | mlb | nfl | sec
  };

  // ---------- DOM refs ----------
  let winnersList, losersList, tbody, statUsers, statAvgRoi, statBigWin, statStreak, winnersTag, losersTag;

  function qs(id) { return document.getElementById(id); }

  function initRefs() {
    winnersList = qs("winners-list");
    losersList  = qs("losers-list");
    tbody       = qs("lb-tbody");
    statUsers   = qs("stat-users");
    statAvgRoi  = qs("stat-avg-roi");
    statBigWin  = qs("stat-biggest-win");
    statStreak  = qs("stat-streak");
    winnersTag  = qs("winners-tag");
    losersTag   = qs("losers-tag");
  }

  // ---------- Derivations ----------
  function currentSnap(user) {
    const s = state.sport;
    const key = s === "all" ? "all" : s;
    return user.sportStats[key][state.range];
  }

  function buildRows() {
    // decorate users with derived metrics for current filters
    const rows = MOCK.map(u => {
      const snap = currentSnap(u);
      const volume = snap.bets;
      const net = snap.net;
      const roi = snap.roi;
      const record = `${snap.wins}-${snap.losses}`;
      const best = snap.bestHit;
      return {
        id: u.id,
        name: u.name,
        record,
        net, roi, volume,
        best,
        last7d: u.sportStats[state.sport === "all" ? "all" : state.sport]["7d"].net
      };
    });

    // sort for main table by chosen scope
    const key = state.scope === "volume" ? "volume" : state.scope; // net | roi | volume
    rows.sort(byNumDesc(key));
    return rows;
  }

  // ---------- Render ----------
  function renderStats(rows) {
    statUsers.textContent  = rows.length.toString();
    const avgRoi = rows.reduce((m, r) => m + (r.roi || 0), 0) / (rows.length || 1);
    statAvgRoi.textContent = fmtPct(avgRoi);
    const maxWin = rows.reduce((m, r) => Math.max(m, r.best || 0), 0);
    statBigWin.textContent = fmtMoney(maxWin);
    // fake a longest streak number from leaders (since we don’t track streaks yet)
    const hot = Math.max(3, Math.round(randBetween(4, 10)));
    statStreak.textContent = hot + " wins";
  }

  function renderSideLists(rows) {
    const top = rows.slice(0, 5);
    const bottom = [...rows].reverse().slice(0, 5); // biggest losers by chosen scope

    const toLi = (r, i) => `
      <li class="rank">
        <span class="rk">${i + 1}</span>
        <span class="nm">${r.name}</span>
        <span class="mv ${r.net >= 0 ? "up" : "down"}">
          ${state.scope === "roi" ? fmtPct(r.roi) :
            state.scope === "volume" ? r.volume :
            fmtMoney(r.net)}
        </span>
      </li>`;

    winnersList.innerHTML = top.map((r, i) => toLi(r, i)).join("");
    losersList.innerHTML  = bottom.map((r, i) => toLi(r, i)).join("");

    const tagText = (range, scope) => `${range.toUpperCase()} · ${scope === "net" ? "Net" :
      scope === "roi" ? "ROI" : "Volume"}`;
    winnersTag.textContent = tagText(state.range, state.scope);
    losersTag.textContent  = tagText(state.range, state.scope);
  }

  function renderTable(rows) {
    const toTr = (r, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${r.name}</td>
        <td>${r.record}</td>
        <td class="${r.net >= 0 ? "pos" : "neg"}">${fmtMoney(r.net)}</td>
        <td>${fmtPct(r.roi)}</td>
        <td>${fmtMoney(r.best)}</td>
        <td class="${r.last7d >= 0 ? "pos" : "neg"}">${fmtMoney(r.last7d)}</td>
      </tr>`;
    tbody.innerHTML = rows.slice(0, 50).map(toTr).join("");
  }

  function renderAll() {
    const rows = buildRows();
    renderStats(rows);
    renderSideLists(rows);
    renderTable(rows);
  }

  // ---------- Interactions ----------
  function bindUI() {
    // range tabs
    document.querySelectorAll('.lb-seg [data-range]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.lb-seg [data-range]').forEach(b => b.classList.toggle('is-active', b === btn));
        state.range = btn.dataset.range; // 7d | 30d | all
        renderAll();
      });
    });

    // scope tabs
    document.querySelectorAll('.lb-seg [data-scope]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.lb-seg [data-scope]').forEach(b => b.classList.toggle('is-active', b === btn));
        state.scope = btn.dataset.scope; // net | roi | volume
        renderAll();
      });
    });

    // sport select
    const sel = document.getElementById('lb-sport');
    if (sel) {
      sel.addEventListener('change', () => {
        state.sport = sel.value; // all | mlb | nfl | sec
        renderAll();
      });
    }
  }

  // ---------- Boot ----------
  window.addEventListener('DOMContentLoaded', () => {
    initRefs();
    bindUI();
    renderAll();
  });
})();
