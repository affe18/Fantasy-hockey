/* Fetch fresh NHL/ESPN data whenever a visitor opens or reloads the dashboard. */
(async function(){
  const root=document.querySelector('.main'); if(!root)return;
  let initialPanel=document.getElementById('rinkLiveFeed');
  if(!initialPanel){initialPanel=document.createElement('section');initialPanel.id='rinkLiveFeed';initialPanel.className='rink-enhancement-grid';initialPanel.innerHTML='<article class="rink-panel scoring-leaders-panel"><div class="rink-panel-head"><div><div class="rink-panel-title">NHL scoring leaders</div><div class="rink-panel-sub">Loading current league leaderboard…</div></div><span class="rink-live-tag">LIVE NHL DATA</span></div><div class="rink-loading">Fetching the latest scoring leaders…</div></article>';const onboarding=root.querySelector('.league-onboarding');if(onboarding)onboarding.insertAdjacentElement('afterend',initialPanel);else root.prepend(initialPanel);}
  const url='/api/refresh';
  const fmtDate=value=>{if(!value)return 'Time unavailable';const d=new Date(value);return Number.isNaN(d.getTime())?'Time unavailable':d.toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'});};
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function render(data){
    let panel=document.getElementById('rinkLiveFeed');
    if(!panel){panel=initialPanel;}
    const leaders=(data.leaders||[]).slice(0,8);
    const news=(data.news||[]).slice(0,7);
    const injuries=(data.injuries||[]).slice(0,5);
    const games=(data.schedule||[]).slice(0,6);
    const leaderName=p=>[p.firstName?.default||p.firstName||'',p.lastName?.default||p.lastName||''].filter(Boolean).join(' ')||p.name?.default||p.name||p.skaterFullName||'NHL player';
    const points=p=>p.points??p.pts??p.point??'—';
    panel.innerHTML=`
      <article class="rink-panel scoring-leaders-panel">
        <div class="rink-panel-head"><div><div class="rink-panel-title">NHL scoring leaders</div><div class="rink-panel-sub">Current league leaderboard · official NHL stats endpoint</div></div><span class="rink-live-tag">DATA FEED</span></div>
        ${leaders.length?'<div class="rink-ranking">'+leaders.map((p,i)=>'<div class="rink-ranking-row"><span class="rink-rank">'+(i+1)+'</span><div><div class="name">'+esc(leaderName(p))+'</div><div class="meta">'+esc(p.teamAbbrev||p.team?.abbrev||p.position||'NHL')+'</div></div><div class="points">'+esc(points(p))+'<small>points</small></div></div>').join('')+'</div>':'<p class="rink-disclaimer">The NHL stats feed has not returned data yet. Try refreshing shortly.</p>'}
        <p class="rink-disclaimer">Fetched for this page load: ${esc(fmtDate(data.updatedAt))}. NHL scoring points are not the same as your league's fantasy points.</p>
      </article>
      <article class="rink-panel">
        <div class="rink-panel-head"><div><div class="rink-panel-title">Latest hockey news</div><div class="rink-panel-sub">Recent headlines from ESPN's hockey feed</div></div><span class="rink-live-tag">DATA FEED</span></div>
        ${news.length?news.map(n=>'<div class="news-item"><i class="news-mark green"></i><div class="news-copy"><b>'+esc(n.headline)+'</b>'+(n.description?'<div>'+esc(n.description)+'</div>':'')+'<small>'+esc(fmtDate(n.published))+' · '+(n.url?'<a class="inline-link" href="'+esc(n.url)+'" target="_blank" rel="noopener">Read story ↗</a>':'ESPN')+'</small></div></div>').join(''):'<p class="rink-disclaimer">No news items were returned in the latest refresh.</p>'}
      </article>
      <article class="rink-panel">
        <div class="rink-panel-head"><div><div class="rink-panel-title">Injury report</div><div class="rink-panel-sub">Latest available ESPN injury feed</div></div></div>
        ${injuries.length?injuries.map(item=>'<div class="news-item"><i class="news-mark"></i><div class="news-copy"><b>'+esc(item.athlete?.displayName||item.player?.displayName||item.name||'Player update')+'</b><div>'+esc(item.status||item.details||item.description||'See source for status')+'</div><small>'+esc(item.team?.displayName||item.team?.name||'NHL')+'</small></div></div>').join(''):'<p class="rink-disclaimer">No injury entries returned. This does not mean every player is healthy.</p>'}
      </article>
      <article class="rink-panel">
        <div class="rink-panel-head"><div><div class="rink-panel-title">NHL games</div><div class="rink-panel-sub">Upcoming / current schedule snapshot</div></div></div>
        ${games.length?games.map(g=>{const away=g.awayTeam?.abbrev||g.awayTeam?.placeName?.default||g.awayTeam?.name||'Away';const home=g.homeTeam?.abbrev||g.homeTeam?.placeName?.default||g.homeTeam?.name||'Home';return '<div class="schedule"><div class="team-match"><div><div class="match-name">'+esc(away)+' @ '+esc(home)+'</div><div class="match-meta">'+esc(g.gameDate||g.startTimeUTC||g.gameState||'Scheduled')+'</div></div></div><div class="schedule-right"><b>'+esc(g.gameState||g.gameType||'NHL')+'</b></div></div>';}).join(''):'<p class="rink-disclaimer">No games were returned for the current schedule window.</p>'}
      </article>`;
  }
  try{
    const response=await fetch(url+'?request='+Date.now(),{cache:'no-store',headers:{'Cache-Control':'no-cache'}});
    if(!response.ok)throw new Error('HTTP '+response.status);
    render(await response.json());
  }catch(error){
    const panel=document.createElement('section');panel.className='rink-panel';panel.innerHTML='<article class="rink-panel scoring-leaders-panel"><div class="rink-panel-title">NHL scoring leaders</div><p class="rink-disclaimer">The live scoring feed could not load. Refresh the page to try again.</p></article>';
    console.warn('RinkIQ data feed:',error);
  }
})();