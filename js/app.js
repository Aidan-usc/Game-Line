(function(){
  const state = { legs: [], stake: 10 };

  function findLeg(gameId, market){ return state.legs.find(l => l.game_id===gameId && l.market===market); }
  function toggleLeg(leg){
    const i = state.legs.findIndex(l => l.game_id===leg.game_id && l.market===leg.market);
    if(i>=0){ state.legs.splice(i,1); } else {
      if(state.legs.length >= GL.maxLegs) return alert(`Max ${GL.maxLegs} legs`);
      state.legs.push(leg);
    }
    renderParlay();
  }

  function americanToDecimal(odds){ return odds>0 ? 1+(odds/100) : 1+(100/Math.abs(odds)); }
  function parlayDecimal(){ return state.legs.reduce((p,l)=>p*americanToDecimal(l.odds),1); }
  function impliedAmerican(dec){ if(dec<=1) return 0; return (dec>=2)?Math.round((dec-1)*100):Math.round(-100/(dec-1)); }

  function renderParlay(){
    const box = document.querySelector('#gl-parlay');
    if(!box) return;
    box.querySelector('.legs').innerHTML = state.legs.map(l =>
      `<div class="card" style="padding:8px;margin-bottom:8px">
         <div>${l.label}</div>
         <div style="font-weight:700">${l.odds>0?`+${l.odds}`:l.odds}</div>
       </div>`).join('') || '<div class="card">No selections yet.</div>';

    const dec = parlayDecimal();
    const american = impliedAmerican(dec);
    const stake = Math.min(state.stake, GL.maxStake);
    const payout = (stake * dec).toFixed(2);

    box.querySelector('.total-odds').textContent = american>0?`+${american}`:american;
    box.querySelector('.proj').textContent = `$${payout}`;
    const stakeInput = box.querySelector('input[name="stake"]');
    if(stakeInput) stakeInput.value = stake;
    box.querySelector('button.submit').disabled = !state.legs.length || stake<=0;
  }

  document.addEventListener('input', (e)=>{
    if(e.target.matches('#gl-parlay input[name="stake"]')){
      let v = parseFloat(e.target.value||'0'); if(isNaN(v)) v=0;
      state.stake = Math.min(v, GL.maxStake);
      renderParlay();
    }
  });

  document.addEventListener('click', (e)=>{
    const t = e.target.closest('[data-leg]');
    if(t){
      toggleLeg(JSON.parse(t.dataset.leg));
      t.classList.toggle('is-selected');
    }
    if(e.target.matches('#gl-parlay .submit')){
      placeParlay();
    }
  });

  async function placeParlay(){
    try{
      const res = await fetch(GL.rest+'parlay', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'X-WP-Nonce':GL.nonce },
        body: JSON.stringify({ legs: state.legs, stake: Math.min(state.stake, GL.maxStake) })
      });
      const data = await res.json();
      if(!res.ok) throw new Error(data?.message||'Failed');
      alert('Parlay placed!');
      state.legs = []; renderParlay();
    }catch(err){ alert(err.message); }
  }

// --------- Games renderer ----------
async function loadGames(){
  const grid = document.querySelector('#gl-games');
  if(!grid) return;
  const league = grid.dataset.league || 'CFB';

  try{
    const res = await fetch(`${GL.rest}games?league=${encodeURIComponent(league)}`);
    const games = await res.json();
    if(!Array.isArray(games) || !games.length){
      grid.innerHTML = `<div class="card">No scheduled games.</div>`;
      return;
    }

    grid.innerHTML = games.map(g => gameCardHTML(league, g)).join('');
  }catch(e){
    grid.innerHTML = `<div class="card">Error loading games.</div>`;
  }
}

function gameCardHTML(league, g){
  const leagueLower = league.toLowerCase();
  const logoBase = GL.imgBase ? `${GL.imgBase}/${leagueLower}` : '';
  const homeSlug = (g.home||'').toLowerCase();
  const awaySlug = (g.away||'').toLowerCase();
  const homeLogoUrl = logoBase ? `${logoBase}/${homeSlug}.png` : '';
  const awayLogoUrl = logoBase ? `${logoBase}/${awaySlug}.png` : '';

  const kickoff = g.kickoff ? new Date(g.kickoff + 'Z') : null;
  const t = kickoff ? kickoff.toLocaleString(undefined, {month:'short', day:'numeric', hour:'numeric', minute:'2-digit'}) : '';

  // helpers
  const abbr = s => (s||'').split(/[\s-]+/).map(w=>w[0]||'').join('').slice(0,2).toUpperCase();
  const city  = s => (s||'').split('-').join(' ').split(' ').slice(0,-1).join(' ') || (s||'');
  const nick  = s => (s||'').split('-').join(' ').split(' ').slice(-1).join(' ');

  // leg payloads used by toggleLeg()
  const mlAway = { game_id:g.id, market:'ml', selection:'away', odds:g.ml_away,
                   label:`${g.away} @ ${g.home} (away ${fmtOdds(g.ml_away)})` };
  const mlHome = { game_id:g.id, market:'ml', selection:'home', odds:g.ml_home,
                   label:`${g.away} @ ${g.home} (home ${fmtOdds(g.ml_home)})` };
  const ouOver = { game_id:g.id, market:'ou', selection:'over', line:g.total_number, odds:g.ou_over,
                   label:`${g.away} @ ${g.home} (Over ${g.total_number} ${fmtOdds(g.ou_over)})` };
  const ouUnder= { game_id:g.id, market:'ou', selection:'under', line:g.total_number, odds:g.ou_under,
                   label:`${g.away} @ ${g.home} (Under ${g.total_number} ${fmtOdds(g.ou_under)})` };

  return `
  <div class="card game-card">
    <div class="game-head">
      <div>${t ? t : '&nbsp;'}</div>
      <div></div>
    </div>

    <div class="game-body">
      <div class="teams">
        <div style="display:flex;gap:10px;align-items:center;justify-content:flex-start">
          <div class="badge">
            ${awayLogoUrl ? `<img src="${awayLogoUrl}" alt="${g.away}">`
                          : `<span class="abbr">${abbr(awaySlug)}</span>`}
          </div>
          <div class="team-lines">
            <div class="team-top">${city(awaySlug)}</div>
            <div class="team-bot">${nick(awaySlug)}</div>
          </div>
        </div>

        <div class="at">@</div>

        <div style="display:flex;gap:10px;align-items:center;justify-content:flex-start">
          <div class="badge">
            ${homeLogoUrl ? `<img src="${homeLogoUrl}" alt="${g.home}">`
                          : `<span class="abbr">${abbr(homeSlug)}</span>`}
          </div>
          <div class="team-lines">
            <div class="team-top">${city(homeSlug)}</div>
            <div class="team-bot">${nick(homeSlug)}</div>
          </div>
        </div>
      </div>

      <div class="pill-row">
        <button class="pill" data-leg='${encodeURIComponent(JSON.stringify(mlAway))}'>
          <span>away <span class="sub">${fmtOdds(g.ml_away)}</span></span>
        </button>
        <button class="pill" data-leg='${encodeURIComponent(JSON.stringify(mlHome))}'>
          <span>home <span class="sub">${fmtOdds(g.ml_home)}</span></span>
        </button>
        <button class="pill" data-leg='${encodeURIComponent(JSON.stringify(ouOver))}'>
          <span>Over ${g.total_number} <span class="sub">${fmtOdds(g.ou_over)}</span></span>
        </button>
        <button class="pill" data-leg='${encodeURIComponent(JSON.stringify(ouUnder))}'>
          <span>Under ${g.total_number} <span class="sub">${fmtOdds(g.ou_under)}</span></span>
        </button>
      </div>
    </div>
  </div>`;
}

document.addEventListener('click', (e)=>{
  const pill = e.target.closest('[data-leg]');
  if(pill){
    toggleLeg(JSON.parse(decodeURIComponent(pill.dataset.leg)));
    pill.classList.toggle('is-selected');
  }
  if(e.target.matches('#gl-parlay .submit')){ placeParlay(); }
});


function fmtOdds(o){ return (o>0?`+${o}`:o); }

// kick it off
loadGames();


  renderParlay();
})();

// Turn "Arizona State Sun Devils" → "arizona-state-sun-devils"
function teamSlug(name) {
  if (!name) return '';
  return String(name)
    .toLowerCase()
    .normalize('NFD')                   // strip accents
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')             // & → and
    .replace(/[^a-z0-9]+/g, '-')        // non-alphanum → -
    .replace(/^-+|-+$/g, '');           // trim leading/trailing -
}

