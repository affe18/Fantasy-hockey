/* RinkIQ visual enhancements. Demo values remain explicitly labelled until live data is connected. */
(function(){
  const teamLogo=abbr=>`https://assets.nhle.com/logos/nhl/svg/${abbr}.svg`;
  const headshot=(abbr,id)=>`https://assets.nhle.com/mugs/nhl/20252026/${abbr}/${id}.png`;
  const roster=[
    {name:'Connor McDavid',team:'EDM',id:'8478402',pos:'C',points:42.8,trend:'up',change:'+12.4%',series:[8,11,9,13,12,16,18]},
    {name:'Leon Draisaitl',team:'EDM',id:'8477934',pos:'C',points:39.4,trend:'up',change:'+7.1%',series:[10,9,12,11,14,13,15]},
    {name:'Nathan MacKinnon',team:'COL',id:'8477492',pos:'C',points:37.1,trend:'steady',change:'+1.2%',series:[12,13,11,13,12,14,13]},
    {name:'Cale Makar',team:'COL',id:'8480069',pos:'D',points:31.6,trend:'down',change:'−5.3%',series:[16,15,14,13,14,12,11]},
    {name:'Auston Matthews',team:'TOR',id:'8479318',pos:'C',points:29.8,trend:'steady',change:'+0.8%',series:[11,12,10,12,11,13,12]}
  ];
  const trendLabel={up:'↗ Rising',down:'↘ Falling',steady:'→ Stable'};
  const trendClass={up:'up',down:'down',steady:'steady'};
  function image(src,cls,alt){return `<img class="${cls}" src="${src}" alt="${alt}" loading="lazy" onerror="this.style.display='none'">`;}
  function addTeamLogos(){
    document.querySelectorAll('.player-table tbody tr').forEach(row=>{
      const meta=row.querySelector('.player-meta'); if(!meta||row.querySelector('.rink-team-logo'))return;
      const abbr=(meta.textContent.match(/\b[A-Z]{2,3}\b/)||[])[0]; if(abbr)meta.insertAdjacentHTML('afterbegin',image(teamLogo(abbr),'rink-team-logo',abbr+' logo'));
      const name=row.querySelector('.player-name')?.textContent.trim(); const p=roster.find(x=>x.name===name);
      const initial=row.querySelector('.player-initial'); if(p&&initial){initial.outerHTML=image(headshot(p.team,p.id),'rink-avatar',p.name+' headshot');}
      const trend=row.querySelector('.trend'); if(p&&trend){trend.className='rink-trend '+trendClass[p.trend];trend.textContent=trendLabel[p.trend]+' · '+p.change;}
    });
  }
  function addPlayerPageImages(){
    if(!document.getElementById('directory'))return;
    const decorate=()=>{
      document.querySelectorAll('.player-option').forEach(button=>{
        const name=button.querySelector('strong')?.textContent.trim();const p=roster.find(x=>x.name===name);
        const initial=button.querySelector('.initial');if(p&&initial&&!button.querySelector('.rink-headshot'))initial.outerHTML=image(headshot(p.team,p.id),'rink-headshot',p.name+' headshot');
        const small=button.querySelector('small');if(p&&small&&!small.querySelector('img'))small.insertAdjacentHTML('afterbegin',image(teamLogo(p.team),'rink-team-logo',p.team+' logo'));
      });
      const title=document.querySelector('#detail .player-title');if(title&&!title.parentElement.querySelector('.rink-profile-photo')){const p=roster.find(x=>x.name===title.textContent.trim());if(p)title.insertAdjacentHTML('beforebegin',image(headshot(p.team,p.id),'rink-headshot rink-profile-photo',p.name+' headshot'));}
    };
    const target=document.getElementById('directory');if(target){new MutationObserver(decorate).observe(target,{childList:true,subtree:true});}
    decorate();
  }
  function buildDashboard(){
    const stats=document.querySelector('.stats');if(!stats||document.getElementById('rinkEnhancements'))return;
    const section=document.createElement('section');section.id='rinkEnhancements';section.className='rink-enhancement-grid';
    section.innerHTML=`
      <article class="rink-panel">
        <div class="rink-panel-head"><div><div class="rink-panel-title">Daily fantasy performance</div><div class="rink-panel-sub">Illustrative roster snapshot · replace with your league feed</div></div><span class="rink-live-tag">DEMO DATA</span></div>
        <div class="rink-summary">
          <div class="rink-summary-item"><small>Fantasy points today</small><strong>68.4</strong><span>↑ 8.2% vs avg.</span></div>
          <div class="rink-summary-item"><small>Top performer</small><strong>18.6</strong><span>McDavid · demo</span></div>
          <div class="rink-summary-item"><small>Roster trend</small><strong>Rising</strong><span>4 of 5 improving</span></div>
        </div>
        <div class="rink-panel-head" style="margin:18px 0 4px"><div><div class="rink-panel-title">Fantasy points trend</div><div class="rink-panel-sub">Sample daily totals · interactive range</div></div><div class="rink-chart-controls"><button type="button" data-range="7" aria-pressed="true">7D</button><button type="button" data-range="14" aria-pressed="false">14D</button></div></div>
        <svg class="rink-chart" viewBox="0 0 520 160" role="img" aria-label="Illustrative fantasy points trend chart"><defs><linearGradient id="rinkArea" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#73e0b0" stop-opacity=".24"/><stop offset="1" stop-color="#73e0b0" stop-opacity="0"/></linearGradient></defs><path class="area" d="M24 125 L100 105 L176 112 L252 75 L328 87 L404 48 L496 34 L496 145 L24 145 Z"/><path class="gridline" d="M24 35H496 M24 80H496 M24 125H496"/><path class="line" d="M24 125 L100 105 L176 112 L252 75 L328 87 L404 48 L496 34"/><circle class="dot" cx="496" cy="34" r="4"/></svg>
        <div class="rink-chart-legend"><span>Earlier</span><span>Recent</span></div>
        <p class="rink-disclaimer">Sample visualization only. Connect verified league scoring and daily roster results before using these numbers.</p>
      </article>
      <article class="rink-panel">
        <div class="rink-panel-head"><div><div class="rink-panel-title">Player rankings</div><div class="rink-panel-sub">Ranked by illustrative weekly projection</div></div><span class="rink-live-tag">DEMO DATA</span></div>
        <div class="rink-ranking">${roster.map((p,i)=>`<div class="rink-ranking-row"><span class="rink-rank">${i+1}</span>${image(headshot(p.team,p.id),'rink-headshot',p.name+' headshot')}<div><div class="name">${p.name} ${image(teamLogo(p.team),'rink-team-logo',p.team+' logo')}</div><div class="meta">${p.team} · ${p.pos} · <span class="rink-trend ${trendClass[p.trend]}">${trendLabel[p.trend]}</span></div></div><div class="points">${p.points.toFixed(1)}<small>proj. pts</small></div></div>`).join('')}</div>
        <p class="rink-disclaimer">Rankings are illustrative and are not current NHL projections.</p>
      </article>`;
    stats.insertAdjacentElement('afterend',section);
    section.querySelectorAll('[data-range]').forEach(button=>button.addEventListener('click',()=>{
      section.querySelectorAll('[data-range]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
      const long=button.dataset.range==='14';const chart=section.querySelector('.rink-chart');const path=chart.querySelector('.line');const area=chart.querySelector('.area');
      const d=long?'M24 118 L60 128 L96 103 L132 111 L168 90 L204 98 L240 76 L276 89 L312 67 L348 82 L384 53 L420 60 L458 42 L496 34':'M24 125 L100 105 L176 112 L252 75 L328 87 L404 48 L496 34';
      path.setAttribute('d',d);area.setAttribute('d',d+' L496 145 L24 145 Z');
    }));
  }
  function init(){addTeamLogos();addPlayerPageImages();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();