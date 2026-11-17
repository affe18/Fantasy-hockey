/* Fetch fresh NHL/ESPN data whenever a visitor opens or reloads the dashboard. */
(async function(){
  const root=document.querySelector('.main'); if(!root)return;
  let initialPanel=document.getElementById('rinkLiveFeed');
  if(!initialPanel){initialPanel=document.createElement('section');initialPanel.id='rinkLiveFeed';initialPanel.className='rink-enhancement-grid';initialPanel.innerHTML='<article class="rink-panel scoring-leaders-panel"><div class="rink-panel-head"><div><div class="rink-panel-title">NHL scoring leaders</div><div class="rink-panel-sub">Loading current league leaderboard…</div></div><span class="rink-live-tag">LIVE NHL DATA</span></div><div class="rink-loading">Fetching the latest scoring leaders…</div></article>';const onboarding=root.querySelector('.league-onboarding');if(onboarding)onboarding.insertAdjacentElement('afterend',initialPanel);else root.prepend(initialPanel);}
  const url='/api/refresh';
  const fmtDate=value=>{if(!value)return 'Time unavailable';const d=new Date(value);return Number.isNaN(d.getTime())?'Time unavailable':d.toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'});};
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function render(data,playerData={}){
    let panel=document.getElementById('rinkLiveFeed');
    if(!panel){panel=initialPanel;}
    const leaders=(data.leaders||[]).slice(0,8);
    const news=(data.news||[]).slice(0,7);
    const injuryRaw=Array.isArray(data.injuries)?data.injuries:[];
    const injuries=injuryRaw.flatMap(group=>Array.isArray(group?.injuries)?group.injuries.map(item=>({...item,team:item.team||group.team||group.displayName||""})):[group]);
    const playerRows=Array.isArray(playerData.players)?playerData.players:[];
    const playerByName=new Map(playerRows.map(p=>[String(p.name||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]/g,""),p]));
    let connectedLeague=null;try{connectedLeague=JSON.parse(localStorage.getItem("rinkIQ.importedLeague.v1")||"null")}catch(_){}
    const rosterNames=new Set((connectedLeague?.teams||[]).flatMap(t=>t.roster||[]).map(p=>String(p.name||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]/g,"")));
    const injuryRanked=injuries.map(item=>{const name=item.athlete?.displayName||item.player?.displayName||item.name||item.athlete?.fullName||"";const key=String(name).normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]/g,"");const player=playerByName.get(key);return{item,name,player,points:Number(player?.stats?.points??-1)}}).filter(x=>x.name&&(!connectedLeague||rosterNames.has(String(x.name).normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]/g,"")))).sort((a,b)=>b.points-a.points);
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
        ${injuryRanked.length?injuryRanked.slice(0,connectedLeague?20:10).map(({item,name,player})=>'<div class="news-item"><i class="news-mark"></i><div class="news-copy"><b>'+esc(name)+'</b><div>'+esc(item.status||item.details?.type||item.shortComment||item.description||'Listed on injury report')+'</div><small>'+esc(item.team?.displayName||item.team?.name||item.team||player?.team||'NHL')+' · '+(player?esc(player.stats?.points||0)+' NHL points':'NHL stats unavailable')+'</small></div></div>').join(''):'<p class="rink-disclaimer">'+(connectedLeague?'No players from your imported roster appear in the available injury feed.':'No injury entries returned.')+' This does not confirm that every player is healthy.</p>'}
      </article>
      <article class="rink-panel">
        <div class="rink-panel-head"><div><div class="rink-panel-title">NHL games</div><div class="rink-panel-sub">Upcoming / current schedule snapshot</div></div></div>
        ${games.length?games.map(g=>{const away=g.awayTeam?.abbrev||g.awayTeam?.placeName?.default||g.awayTeam?.name||'Away';const home=g.homeTeam?.abbrev||g.homeTeam?.placeName?.default||g.homeTeam?.name||'Home';return '<div class="schedule"><div class="team-match"><div><div class="match-name">'+esc(away)+' @ '+esc(home)+'</div><div class="match-meta">'+esc(g.gameDate||g.startTimeUTC||g.gameState||'Scheduled')+'</div></div></div><div class="schedule-right"><b>'+esc(g.gameState||g.gameType||'NHL')+'</b></div></div>';}).join(''):'<p class="rink-disclaimer">No games were returned for the current schedule window.</p>'}
      </article>`;
  }
  try{
    const [response,playersResponse]=await Promise.all([fetch(url+'?request='+Date.now(),{cache:'no-store',headers:{'Cache-Control':'no-cache'}}),fetch('/api/trade-data',{cache:'no-store'})]);
    if(!response.ok)throw new Error('Live feed HTTP '+response.status);
    const data=await response.json();
    let playerData={};if(playersResponse.ok){try{playerData=await playersResponse.json()}catch(_){}}
    render(data,playerData);
  }catch(error){
    const panel=document.createElement('section');panel.className='rink-panel';panel.innerHTML='<article class="rink-panel scoring-leaders-panel"><div class="rink-panel-title">NHL scoring leaders</div><p class="rink-disclaimer">The live scoring feed could not load. Refresh the page to try again.</p></article>';
    console.warn('RinkIQ data feed:',error);
  }
})();