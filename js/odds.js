// js/odds.js
(function () {
  const DAYS = 86400000;

  // which API + window per page
  const SPORT_CFG = {
    mlb: { api: 'baseball_mlb',            days: 5,  filterType: 'division' },
    nfl: { api: 'americanfootball_nfl',    days: 9,  filterType: 'division' },
    sec: { api: 'americanfootball_ncaaf',  days: 9,  filterType: 'conference' } // CFB
  };

  // dropdown lists
  const NFL_DIVISIONS = ['All','AFC East','AFC North','AFC South','AFC West','NFC East','NFC North','NFC South','NFC West'];
  const MLB_DIVISIONS = ['All','AL East','AL Central','AL West','NL East','NL Central','NL West'];
  const CFB_CONFERENCES = ['All (Power 4 + ND)','SEC','Big Ten','Big 12','ACC','Notre Dame'];

  // config / key
  const ODDS_API_KEY = window.APP_CONFIG?.ODDS_API_KEY || 'REPLACE_WITH_YOUR_KEY';
  const ODDS_BASE    = window.APP_CONFIG?.ODDS_API_BASE || 'https://api.the-odds-api.com/v4';

  const BOOK_PRIORITY = ['draftkings','fanduel','betmgm','caesars','pointsbet_us'];

  // memory cache per sport (in-session)
  const mem = { data: {}, full: {} };  // mem.full[sport] = raw normalized list

  // --------- caching TTL ---------
  const CACHE_KEYS = { mlb:'pp:odds:mlb', nfl:'pp:odds:nfl', sec:'pp:odds:sec' };

  function ttlForEvent(iso){
    const now = Date.now();
    const t = new Date(iso).getTime();
    const d = (t - now) / DAYS;
    if (d <= 1) return 20 * 60 * 1000;     // 20 min
    if (d <= 2) return 60 * 60 * 1000;     // 1 hr
    return 2 * 60 * 60 * 1000;             // 2 hr
  }
  function expiryForPayload(events){
    const now = Date.now();
    const ttls = events.map(e => ttlForEvent(e.commence_time));
    const minTTL = Math.max(5*60*1000, Math.min(...ttls)); // at least 5m
    return now + (isFinite(minTTL) ? minTTL : 15*60*1000);
  }
  function readCache(key){
    try{
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (Date.now() > obj.expiresAt) return null;
      return obj.data;
    }catch{ return null; }
  }
  function writeCache(key, data, rawEvents){
    try{
      localStorage.setItem(key, JSON.stringify({ expiresAt: expiryForPayload(rawEvents), data }));
    }catch{}
  }

  // --------- API fetch + normalize ---------
  function pickBook(bookmakers){
    if (!bookmakers?.length) return null;
    for (const k of BOOK_PRIORITY){
      const b = bookmakers.find(x => (x.key || '').toLowerCase() === k);
      if (b) return b;
    }
    return bookmakers[0];
  }

  function normEvent(ev, sport){
    const book = pickBook(ev.bookmakers);
    const h2h = book?.markets?.find(m => m.key === 'h2h');
    const tot = book?.markets?.find(m => m.key === 'totals');

    const away = ev.away_team, home = ev.home_team;

    let mlAway = null, mlHome = null;
    if (h2h?.outcomes){
      for (const o of h2h.outcomes){
        if (o.name === away) mlAway = o.price;
        if (o.name === home) mlHome = o.price;
      }
    }

    let over=null, under=null, total=null;
    if (tot?.outcomes?.length){
      const o = tot.outcomes.find(o=> (o.name||'').toLowerCase()==='over');
      const u = tot.outcomes.find(o=> (o.name||'').toLowerCase()==='under');
      over  = o?.price ?? null;
      under = u?.price ?? null;
      total = o?.point ?? u?.point ?? null;
    }

    return {
      id: ev.id,
      time: ev.commence_time,
      location: ev.venue || '', // can be blank
      awayFull: away,
      homeFull: home,
      awayLogo: window.LogoFinder?.getLogo(away, sport) || (window.LogoFinder?.FALLBACK || 'assets/img/_placeholder.png'),
      homeLogo: window.LogoFinder?.getLogo(home, sport) || (window.LogoFinder?.FALLBACK || 'assets/img/_placeholder.png'),
      mlAway, mlHome, total, over, under,
      commence_time: ev.commence_time // keep raw for TTL calc
    };
  }

  async function getRawOdds(sport){
    const cfg = SPORT_CFG[sport];
    if (!cfg) throw new Error(`Unknown sport ${sport}`);
    const cacheKey = CACHE_KEYS[sport];

    const cached = readCache(cacheKey);
    if (cached){ mem.full[sport] = cached; return cached; }

    const url = `${ODDS_BASE}/sports/${cfg.api}/odds?regions=us&markets=h2h,totals&oddsFormat=american&dateFormat=iso&apiKey=${ODDS_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Odds API ${res.status}`);
    const raw = await res.json();

    const now = Date.now();
    const end = now + cfg.days * DAYS;
    const inWindow = raw.filter(g => {
      const t = new Date(g.commence_time).getTime();
      return t >= now && t <= end;
    }).sort((a,b)=> new Date(a.commence_time) - new Date(b.commence_time));

    const normalized = inWindow.map(ev => normEvent(ev, sport));
    mem.full[sport] = normalized;
    writeCache(cacheKey, normalized, inWindow);
    return normalized;
  }

  // --------- Filters + Search ---------
  function isPower4OrND(name){
    const c = window.CFB_TEAM_TO_CONF?.[name];
    return c === 'SEC' || c === 'Big Ten' || c === 'Big 12' || c === 'ACC' || name === 'Notre Dame Fighting Irish';
  }

  function applyFilters(list, sport, filterValue, query){
    const q = (query||'').trim().toLowerCase();
    return list.filter(ev => {
      // text search
      if (q){
        const hay = `${ev.awayFull} ${ev.homeFull}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      if (sport === 'nfl'){
        if (filterValue === 'All') return true;
        const a = window.NFL_TEAM_TO_DIVISION?.[ev.awayFull] || '';
        const h = window.NFL_TEAM_TO_DIVISION?.[ev.homeFull] || '';
        return a === filterValue || h === filterValue;
      }

      if (sport === 'mlb'){
        if (filterValue === 'All') return true;
        const a = window.MLB_TEAM_TO_DIVISION?.[ev.awayFull] || '';
        const h = window.MLB_TEAM_TO_DIVISION?.[ev.homeFull] || '';
        return a === filterValue || h === filterValue;
      }

      if (sport === 'sec'){ // CFB
        if (filterValue === 'All (Power 4 + ND)') return isPower4OrND(ev.awayFull) || isPower4OrND(ev.homeFull);
        if (filterValue === 'Notre Dame') return ev.awayFull === 'Notre Dame Fighting Irish' || ev.homeFull === 'Notre Dame Fighting Irish';
        const a = window.CFB_TEAM_TO_CONF?.[ev.awayFull] || '';
        const h = window.CFB_TEAM_TO_CONF?.[ev.homeFull] || '';
        return a === filterValue || h === filterValue;
      }

      return true;
    });
  }

  // Build / wire filter UI
  function buildFilterBar(sport){
    const mount = document.getElementById('filters');
    if (!mount) return;

    const cfg = SPORT_CFG[sport];
    let options = [];
    if (sport === 'nfl') options = NFL_DIVISIONS;
    else if (sport === 'mlb') options = MLB_DIVISIONS;
    else if (sport === 'sec') options = CFB_CONFERENCES;

    mount.innerHTML = `
      <div class="filter-left">
        <select id="filter-select" class="filter-select" aria-label="Filter">
          ${options.map(o => `<option value="${o}">${o}</option>`).join('')}
        </select>
      </div>
      <div class="filter-right">
        <input id="filter-search" class="filter-search" type="search" placeholder="Search teams…" />
        <button id="filter-refresh" class="filter-refresh" type="button">Refresh odds</button>
      </div>
    `;

    // restore persisted UI state
    const key = `pp:ui:${sport}`;
    try{
      const saved = JSON.parse(localStorage.getItem(key) || '{}');
      if (saved.filter) mount.querySelector('#filter-select').value = saved.filter;
      if (saved.q)      mount.querySelector('#filter-search').value = saved.q;
    }catch{}

    // wire
    const selectEl = mount.querySelector('#filter-select');
    const searchEl = mount.querySelector('#filter-search');
    const refreshEl= mount.querySelector('#filter-refresh');

    function persist(){
      try{
        localStorage.setItem(`pp:ui:${sport}`, JSON.stringify({ filter: selectEl.value, q: searchEl.value }));
      }catch{}
    }

    const doRender = async (forceFresh=false) => {
      let list;
      if (forceFresh){
        // clear cache for this sport
        try{ localStorage.removeItem(CACHE_KEYS[sport]); }catch{}
        mem.full[sport] = null;
      }
      list = mem.full[sport] || await getRawOdds(sport);

      const filtered = applyFilters(list, sport, selectEl.value, searchEl.value);
      // Ask parlay.js to re-render the board with this list
      if (window.reRenderOdds) window.reRenderOdds(filtered);
    };

    // live search (debounced)
    let t=null;
    searchEl.addEventListener('input', () => {
      persist();
      clearTimeout(t); t = setTimeout(()=>doRender(false), 200);
    });
    selectEl.addEventListener('change', () => { persist(); doRender(false); });
    refreshEl.addEventListener('click', () => doRender(true));

    // initial run after parlay did its first render
    setTimeout(()=>doRender(false), 50);
  }

  // Expose: initial fetch used by parlay.js on first paint
  async function getOddsFor(sport){
    // return current normalized (window-filtered) list; parlay.js will render
    return await getRawOdds(sport);
  }

  // auto-init filters on league pages
  window.addEventListener('DOMContentLoaded', () => {
    const sport = document.querySelector('.page--odds')?.dataset?.sport;
    if (sport && SPORT_CFG[sport]) buildFilterBar(sport);
  });

  window.OddsService = { getOddsFor };
})();
