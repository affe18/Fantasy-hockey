(()=>{
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let league=null;
function renderResults(){
 const root=$("espnResults");if(!root||!league)return;
 root.innerHTML='<div class="espn-card"><h3>'+esc(league.leagueName)+'</h3><p>'+league.season+' season · '+league.size+' teams · '+esc(league.access)+'</p><div class="espn-tabs"><button data-tab="teams">All teams</button><button data-tab="rosters">Roster comparison</button><button data-tab="scoring">Scoring rules</button><button data-tab="standings">Standings</button><button data-tab="matchups">Matchups</button></div><div id="espnTabContent"></div><div id="teamEvaluationApp"></div></div>';
 root.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{root.querySelectorAll("[data-tab]").forEach(x=>x.classList.toggle("active",x===b));renderTab(b.dataset.tab);});renderTab("teams");if(window.RinkIQTeamEval)window.RinkIQTeamEval(league);
}
function renderTab(tab){
 const el=$("espnTabContent"),teams=league.teams;
 if(tab==="teams")el.innerHTML=teams.map(t=>'<div class="espn-team"><b>'+esc(t.name)+'</b><span>'+esc((t.owners||[]).join(", "))+' · '+t.roster.length+' players</span></div>').join("");
 if(tab==="rosters")el.innerHTML='<div class="espn-roster-grid">'+teams.map(t=>'<section class="espn-team-card"><h4>'+esc(t.name)+'</h4>'+t.roster.map(p=>'<div class="espn-player"><span>'+esc(p.name)+'</span><small>'+esc(p.position)+'</small></div>').join("")+'</section>').join("")+'</div>';
 if(tab==="scoring")el.innerHTML='<h4>League scoring rules</h4><table><thead><tr><th>Statistic</th><th>ESPN stat ID</th><th>Points</th></tr></thead><tbody>'+league.scoring.map(x=>'<tr><td>'+esc(x.label)+'</td><td>'+x.statId+'</td><td>'+x.points+'</td></tr>').join("")+'</tbody></table><p>Roster slots: '+esc(JSON.stringify(league.rosterSlots))+'</p>';
 if(tab==="standings")el.innerHTML='<h4>League standings</h4><table><thead><tr><th>Team</th><th>W</th><th>L</th><th>T</th><th>Win %</th></tr></thead><tbody>'+teams.map(t=>'<tr><td>'+esc(t.name)+'</td><td>'+(t.record?.wins??"—")+'</td><td>'+(t.record?.losses??"—")+'</td><td>'+(t.record?.ties??"—")+'</td><td>'+(t.record?.percentage??"—")+'</td></tr>').join("")+'</tbody></table>';
 if(tab==="matchups")el.innerHTML='<h4>Matchup records</h4><table><thead><tr><th>Week</th><th>Home team ID</th><th>Score</th><th>Away team ID</th><th>Score</th></tr></thead><tbody>'+league.matchups.map(m=>'<tr><td>'+(m.week??"—")+'</td><td>'+(m.homeTeamId??"—")+'</td><td>'+(m.homeScore??"—")+'</td><td>'+(m.awayTeamId??"—")+'</td><td>'+(m.awayScore??"—")+'</td></tr>').join("")+'</tbody></table>';
}
function init(){
 const root=$("espnLeagueApp");if(!root||root.dataset.ready)return;root.dataset.ready="1";
 root.innerHTML='<div class="espn-import"><p class="espn-intro">Add your league directly from your ESPN sign-in. No league ID or password needs to be entered here.</p><div class="espn-connect-steps"><p><b>1.</b> Sign in to ESPN in Chrome and open your Fantasy Hockey league.</p><p><b>2.</b> Click the Fantasy Hockey Inspection extension and choose <b>Add this ESPN league</b>.</p><a href="https://github.com/affe18/Fantasy-hockey/tree/main/espn-connector" target="_blank" rel="noopener">Install the Chrome extension</a></div><div id="espnStatus" class="espn-status">Waiting for your ESPN league to be added…</div><div id="espnResults"></div></div>';
}
window.addEventListener("rinkiq:league-imported",event=>{
 league=event.detail||null;if(!league)return;
 const status=$("espnStatus");if(status)status.textContent="Added "+league.leagueName+" · "+league.teams.length+" teams · "+league.scoring.length+" scoring rules.";
 renderResults();
});
const observer=new MutationObserver(init);observer.observe(document.body,{childList:true,subtree:true});init();
})();