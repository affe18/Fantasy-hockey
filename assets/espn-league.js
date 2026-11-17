(()=>{
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let league=null;
function renderTab(tab){
 const el=$("espnTabContent"),teams=league.teams;
 if(tab==="teams")el.innerHTML=teams.map(t=>'<div class="espn-team"><b>'+esc(t.name)+'</b><span>'+esc((t.owners||[]).join(", "))+' · '+t.roster.length+' players</span></div>').join("");
 if(tab==="rosters")el.innerHTML='<div class="espn-roster-grid">'+teams.map(t=>'<section class="espn-team-card"><h4>'+esc(t.name)+'</h4>'+t.roster.map(p=>'<div class="espn-player"><span>'+esc(p.name)+'</span><small>'+esc(p.position)+'</small></div>').join("")+'</section>').join("")+'</div>';
 if(tab==="scoring")el.innerHTML=league.scoring.length?'<h4>League scoring rules</h4><table><thead><tr><th>Statistic</th><th>Points</th></tr></thead><tbody>'+league.scoring.map(x=>'<tr><td>'+esc(x.label)+'</td><td>'+esc(x.points)+'</td></tr>').join("")+'</tbody></table>':'ESPN did not return scoring settings for this league.';
 if(tab==="standings")el.innerHTML='<h4>League standings</h4><table><thead><tr><th>Team</th><th>W</th><th>L</th><th>T</th></tr></thead><tbody>'+teams.map(t=>'<tr><td>'+esc(t.name)+'</td><td>'+(t.record?.wins??"—")+'</td><td>'+(t.record?.losses??"—")+'</td><td>'+(t.record?.ties??"—")+'</td></tr>').join("")+'</tbody></table>';
 if(tab==="matchups")el.innerHTML=league.matchups.length?'<h4>Matchups</h4><div class="espn-matchups">'+league.matchups.map(m=>'<div class="espn-team"><span>Week '+esc(m.week)+': '+esc(teams.find(t=>t.id===m.homeTeamId)?.name||"Team "+m.homeTeamId)+' vs '+esc(teams.find(t=>t.id===m.awayTeamId)?.name||"Team "+m.awayTeamId)+'</span><b>'+esc(m.homeScore??"—")+' – '+esc(m.awayScore??"—")+'</b></div>').join("")+'</div>':'No matchup data was returned.';
}
function acceptLeague(data){
 league=data;
 const root=$("espnResults");
 root.innerHTML='<div class="espn-card"><h3>'+esc(league.leagueName)+'</h3><p>'+league.season+' season · '+league.size+' teams · Connected directly to ESPN</p><div class="espn-tabs"><button data-tab="teams">All teams</button><button data-tab="rosters">Rosters</button><button data-tab="scoring">Scoring rules</button><button data-tab="standings">Standings</button><button data-tab="matchups">Matchups</button></div><div id="espnTabContent"></div><div id="teamEvaluationApp"></div></div>';
 root.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{root.querySelectorAll("[data-tab]").forEach(x=>x.classList.toggle("active",x===b));renderTab(b.dataset.tab);});
 root.querySelector('[data-tab="teams"]').classList.add("active");renderTab("teams");
 window.dispatchEvent(new CustomEvent("rinkiq:league-imported",{detail:league}));
 if(window.RinkIQTeamEval)window.RinkIQTeamEval(league);
}
function init(){
 const root=$("espnLeagueApp");if(!root||root.dataset.ready)return;root.dataset.ready="1";
 root.innerHTML='<div class="espn-import"><div class="espn-connect-head"><div><span class="espn-step-label">CONNECT YOUR LEAGUE</span><h3>Connect your ESPN league</h3><p>One link is all we need. Your league must be publicly viewable.</p></div><a class="espn-login-link" href="https://www.espn.com/fantasy/hockey/" target="_blank" rel="noopener">Open ESPN ↗</a></div><form id="espnImportForm" class="espn-import-form"><label for="espnLeagueUrl">Paste your ESPN Fantasy Hockey league URL</label><input id="espnLeagueUrl" name="leagueId" type="text" inputmode="url" autocapitalize="off" spellcheck="false" placeholder="https://fantasy.espn.com/hockey/league?leagueId=…" autocomplete="url" required><button class="espn-button" id="espnImportButton" type="submit">Connect my league</button></form><aside class="espn-import-note"><div class="espn-note-heading"><b>Before you import</b><button type="button" id="espnStepsToggle" class="espn-steps-toggle" aria-expanded="false" aria-controls="espnImportSteps">Show steps</button></div><ul><li>Your ESPN Fantasy Hockey league must be set to <b>Publicly Viewable</b>.</li><li>Paste the <b>league URL</b> (it must include your league ID), not just a team page or ESPN homepage.</li><li>Use a league with data available for the current season.</li><li>Once connected, the system can read the league’s teams and rosters.</li></ul><p>Only the league manager can change the privacy setting. Making it public does not let others join or manage your league.</p><a href="https://support.espn.com/hc/en-us/articles/47160849553940-Making-a-Private-League-Public-LM-Only" target="_blank" rel="noopener">How to make your league public ↗</a><div id="espnImportSteps" class="espn-import-steps" hidden><b>Steps to make your ESPN league public</b><ol><li>Open ESPN Fantasy Hockey and sign in.</li><li>Open the league you want to import.</li><li>Go to <b>League</b>, then <b>Settings</b>.</li><li>Under <b>Basic Settings</b>, choose <b>Edit Basic Settings</b>.</li><li>Find the public viewability setting, switch it to <b>Yes</b>, and save.</li><li>Return here, copy your league URL from ESPN, paste it into the box, and select <b>Connect my league</b>.</li></ol><p>If you are not the league manager, ask the manager to complete the privacy-setting steps.</p></div></aside><div id="espnStatus" class="espn-status" role="status" aria-live="polite">Paste your league link above to get started.</div><div id="espnResults"></div></div>';
 const stepsToggle=$("espnStepsToggle"),stepsPanel=$("espnImportSteps");stepsToggle.addEventListener("click",()=>{const expanded=stepsToggle.getAttribute("aria-expanded")==="true";stepsToggle.setAttribute("aria-expanded",String(!expanded));stepsPanel.hidden=expanded;stepsToggle.textContent=expanded?"Show steps":"Hide steps";});
 $("espnImportForm").addEventListener("submit",async e=>{
  e.preventDefault();const button=$("espnImportButton"),status=$("espnStatus"),rawLeagueUrl=$("espnLeagueUrl").value.trim();const leagueMatch=rawLeagueUrl.match(/(?:[?&]leagueId=|\bleagueId\s*[:=]\s*["\']?|\/league\/)(\d{1,12})/i);const leagueId=/^\d{1,12}$/.test(rawLeagueUrl)?rawLeagueUrl:(leagueMatch&&leagueMatch[1]||"");if(!leagueId){status.textContent="Please paste a valid ESPN Fantasy Hockey league URL containing a numeric leagueId.";return;}
  button.disabled=true;button.textContent="Connecting…";status.textContent="Checking your league with ESPN…";
  try{
   const response=await fetch("/api/espn-league",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({leagueId,sport:"fhl"})});
   const data=await response.json();if(!response.ok)throw new Error(data.error||"Unable to connect to this league.");
   acceptLeague(data);status.textContent="Connected successfully. Your league data has been imported.";
  }catch(error){status.textContent=error.message;}
  finally{button.disabled=false;button.textContent="Connect my league";}
 });
}
const observer=new MutationObserver(init);observer.observe(document.body,{childList:true,subtree:true});init();
})();