(()=> {
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let league=null;
function init(){
 const root=$("espnLeagueApp"); if(!root||root.dataset.ready)return;root.dataset.ready="1";
 root.innerHTML='<div class="espn-import"><p class="espn-intro">Import your ESPN Fantasy Hockey league to bring every team, roster, scoring rule, standings and matchup into RinkIQ. Compare your roster against every manager.</p><div class="espn-fields"><label>ESPN LEAGUE URL OR ID<input id="espnLeagueId" placeholder="Paste your ESPN league or team URL"></label><label>SEASON YEAR<input id="espnSeason" type="number" value="'+new Date().getFullYear()+'"></label></div><p class="espn-url-help">Copy the address from your ESPN league or team page and paste it here. We’ll find the league ID automatically.</p><div class="espn-warning"><b>Public league:</b> leave credentials blank. <b>Private league:</b> ESPN requires session cookies. Treat them like passwords. They are sent to this import endpoint for this request only and are not saved in browser storage or GitHub. Never share them or paste them into chat.</div><details><summary>Private league access (optional)</summary><div class="espn-fields"><label>espn_s2 cookie<input id="espnS2" type="password" autocomplete="off"></label><label>SWID cookie<input id="espnSwid" type="password" autocomplete="off"></label></div></details><button class="espn-button" id="espnImport">Import ESPN league</button><div id="espnStatus" class="espn-status">No league imported yet.</div><div id="espnResults"></div></div>';
 $("espnImport").onclick=importLeague;
}
async function importLeague(){
 const status=$("espnStatus"),btn=$("espnImport");const leagueId=$("espnLeagueId").value.trim(),season=$("espnSeason").value,s2=$("espnS2")?.value||"",swid=$("espnSwid")?.value||"";
 if(!leagueId){status.textContent="Enter your ESPN league ID.";return;}btn.disabled=true;status.textContent="Connecting to ESPN and importing league data…";
 try{const r=await fetch("/api/espn-league",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({leagueId,season,sport:"fhl",espnS2:s2,swid})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Import failed");league=d;try{localStorage.setItem("rinkIQ.importedLeague.v1",JSON.stringify(d));window.dispatchEvent(new CustomEvent("rinkiq:league-imported",{detail:d}));}catch(e){}$("espnS2").value="";$("espnSwid").value="";status.textContent="Imported "+d.teams.length+" teams · "+d.scoring.length+" scoring rules · "+d.matchups.length+" matchup records · "+d.access;renderResults();}catch(e){status.textContent=e.message;}finally{btn.disabled=false;}
}
function renderResults(){
 const root=$("espnResults");if(!root||!league)return;
 root.innerHTML='<div class="espn-card"><h3>'+esc(league.leagueName)+'</h3><p>'+league.season+' season · '+league.size+' teams · '+esc(league.access)+'</p><div class="espn-tabs"><button data-tab="teams">All teams</button><button data-tab="rosters">Roster comparison</button><button data-tab="scoring">Scoring rules</button><button data-tab="standings">Standings</button><button data-tab="matchups">Matchups</button></div><div id="espnTabContent"></div><div id="teamEvaluationApp"></div></div>';
 root.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{root.querySelectorAll("[data-tab]").forEach(x=>x.classList.toggle("active",x===b));renderTab(b.dataset.tab);});renderTab("teams");if(window.RinkIQTeamEval)window.RinkIQTeamEval(league);
}
function renderTab(tab){
 const el=$("espnTabContent"),teams=league.teams;
 if(tab==="teams")el.innerHTML=teams.map(t=>'<div class="espn-team"><b>'+esc(t.name)+'</b><span>'+esc(t.owners.join(", "))+' · '+t.roster.length+' players</span></div>').join("");
 if(tab==="rosters")el.innerHTML='<div class="espn-roster-grid">'+teams.map(t=>'<section class="espn-team-card"><h4>'+esc(t.name)+'</h4>'+t.roster.map(p=>'<div class="espn-player"><span>'+esc(p.name)+'</span><small>'+esc(p.position)+'</small></div>').join("")+'</section>').join("")+'</div>';
 if(tab==="scoring")el.innerHTML='<h4>League scoring rules</h4><table><thead><tr><th>Statistic</th><th>ESPN stat ID</th><th>Points</th></tr></thead><tbody>'+league.scoring.map(x=>'<tr><td>'+esc(x.label)+'</td><td>'+x.statId+'</td><td>'+x.points+'</td></tr>').join("")+'</tbody></table><p>Roster slots: '+esc(JSON.stringify(league.rosterSlots))+'</p>';
 if(tab==="standings")el.innerHTML='<h4>League standings</h4><table><thead><tr><th>Team</th><th>W</th><th>L</th><th>T</th><th>Win %</th></tr></thead><tbody>'+teams.map(t=>'<tr><td>'+esc(t.name)+'</td><td>'+(t.record.wins??"—")+'</td><td>'+(t.record.losses??"—")+'</td><td>'+(t.record.ties??"—")+'</td><td>'+(t.record.percentage??"—")+'</td></tr>').join("")+'</tbody></table>';
 if(tab==="matchups")el.innerHTML='<h4>Matchup records</h4><table><thead><tr><th>Week</th><th>Home team ID</th><th>Score</th><th>Away team ID</th><th>Score</th></tr></thead><tbody>'+league.matchups.map(m=>'<tr><td>'+(m.week??"—")+'</td><td>'+(m.homeTeamId??"—")+'</td><td>'+(m.homeScore??"—")+'</td><td>'+(m.awayTeamId??"—")+'</td><td>'+(m.awayScore??"—")+'</td></tr>').join("")+'</tbody></table>';
}
const observer=new MutationObserver(init);observer.observe(document.body,{childList:true,subtree:true});init();
})();