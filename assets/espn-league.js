(()=> {
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let league=null;
function normalizePlayer(p){return {id:p.id??p.playerId??null,name:p.name||p.playerName||p.fullName||[p.firstName,p.lastName].filter(Boolean).join(" ")||"Unknown player",position:p.position||p.pos||p.defaultPosition||p.defaultPositionId||"",proTeamId:p.proTeamId||p.teamAbbrev||p.nhlTeam||null,injuryStatus:p.injuryStatus||"",lineupSlotId:p.lineupSlotId??null,fantasyPoints:p.fantasyPoints??p.points??p.totalPoints??null};}
function normalizeLeague(data,filename){
 const raw=data.league||data;
 if(Array.isArray(raw.teams)&&raw.teams.length){
  const teams=raw.teams.map((t,i)=>{
   const entries=Array.isArray(t.roster)?t.roster:(t.roster?.entries||t.players||[]);
   return {id:t.id??t.teamId??i+1,name:t.name||t.teamName||t.location||("Team "+(i+1)),abbrev:t.abbrev||"",owners:Array.isArray(t.owners)?t.owners.map(o=>typeof o==="string"?o:(o.displayName||o.name||"League member")):(t.owner?[String(t.owner)]:[]),record:t.record?.overall||t.record||{},roster:entries.map(e=>normalizePlayer(e.playerPoolEntry?.player||e.player||e))};
  });
  const settings=raw.settings||{};
  return {provider:"ESPN Fantasy",leagueId:raw.leagueId||data.leagueId||"uploaded",season:Number(raw.season||data.season||new Date().getFullYear()),leagueName:settings.name||raw.leagueName||raw.name||filename.replace(/\.(json|csv)$/i,""),size:teams.length,teams,scoring:raw.scoring||settings.scoringSettings?.scoringItems?.map(x=>({statId:x.statId,points:Number(x.points),label:x.name||x.abbrev||("Stat "+x.statId)}))||[],rosterSlots:raw.rosterSlots||settings.rosterSettings?.lineupSlotCounts||{},matchups:raw.matchups||raw.schedule||[],access:"uploaded league file",importedAt:new Date().toISOString()};
 }
 throw new Error("This JSON file does not contain a teams array. Upload an ESPN league JSON response or a CSV with Team, Player and Position columns.");
}
function parseCSV(text){
 const rows=[];let row=[],cell="",quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'&&text[i+1]==='"'){cell+='"';i++;}else if(c==='"')quoted=false;else cell+=c;}else if(c==='"')quoted=true;else if(c===","){row.push(cell.trim());cell="";}else if(c==="\n"){row.push(cell.trim());if(row.some(Boolean))rows.push(row);row=[];cell="";}else if(c!=="\r")cell+=c;}
 row.push(cell.trim());if(row.some(Boolean))rows.push(row);if(rows.length<2)throw new Error("The CSV needs a header row and at least one player row.");
 const headers=rows.shift().map(h=>h.toLowerCase().replace(/[\s_-]+/g,""));
 const col=(...names)=>headers.findIndex(h=>names.includes(h));
 const ti=col("team","teamname","fantasyteam"),pi=col("player","playername","name","athlete"),posi=col("position","pos"),oi=col("owner","manager"),wi=col("wins"),li=col("losses"),ti2=col("ties"),fi=col("fantasypoints","points","totalpoints");
 if(ti<0||pi<0)throw new Error("CSV headers must include Team and Player. Position, Owner, Wins, Losses and Points are optional.");
 const teams=new Map();
 rows.forEach(r=>{const name=r[ti]||"Unassigned";if(!teams.has(name))teams.set(name,{id:teams.size+1,name,abbrev:"",owners:[],record:{wins:0,losses:0,ties:0},roster:[]});const t=teams.get(name);if(oi>=0&&r[oi]&&!t.owners.includes(r[oi]))t.owners.push(r[oi]);if(wi>=0)t.record.wins=Number(r[wi])||0;if(li>=0)t.record.losses=Number(r[li])||0;if(ti2>=0)t.record.ties=Number(r[ti2])||0;t.roster.push(normalizePlayer({name:r[pi],position:posi>=0?r[posi]:"",fantasyPoints:fi>=0&&r[fi]!==""?Number(r[fi]):null}));});
 return {provider:"Uploaded league file",leagueId:"uploaded",season:new Date().getFullYear(),leagueName:"Imported fantasy league",size:teams.size,teams:[...teams.values()],scoring:[],rosterSlots:{},matchups:[],importedAt:new Date().toISOString(),access:"CSV upload"};
}
function renderResults(){
 const root=$("espnResults");if(!root||!league)return;
 root.innerHTML='<div class="espn-card"><h3>'+esc(league.leagueName)+'</h3><p>'+league.season+' season · '+league.size+' teams · '+esc(league.access)+'</p><div class="espn-tabs"><button data-tab="teams">All teams</button><button data-tab="rosters">Roster comparison</button><button data-tab="scoring">Scoring rules</button><button data-tab="standings">Standings</button><button data-tab="matchups">Matchups</button></div><div id="espnTabContent"></div><div id="teamEvaluationApp"></div></div>';
 root.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{root.querySelectorAll("[data-tab]").forEach(x=>x.classList.toggle("active",x===b));renderTab(b.dataset.tab);});renderTab("teams");if(window.RinkIQTeamEval)window.RinkIQTeamEval(league);
}
function renderTab(tab){
 const el=$("espnTabContent"),teams=league.teams;
 if(tab==="teams")el.innerHTML=teams.map(t=>'<div class="espn-team"><b>'+esc(t.name)+'</b><span>'+esc((t.owners||[]).join(", "))+' · '+t.roster.length+' players</span></div>').join("");
 if(tab==="rosters")el.innerHTML='<div class="espn-roster-grid">'+teams.map(t=>'<section class="espn-team-card"><h4>'+esc(t.name)+'</h4>'+t.roster.map(p=>'<div class="espn-player"><span>'+esc(p.name)+'</span><small>'+esc(p.position)+'</small></div>').join("")+'</section>').join("")+'</div>';
 if(tab==="scoring")el.innerHTML=league.scoring.length?'<h4>League scoring rules</h4><table><thead><tr><th>Statistic</th><th>ESPN stat ID</th><th>Points</th></tr></thead><tbody>'+league.scoring.map(x=>'<tr><td>'+esc(x.label)+'</td><td>'+esc(x.statId)+'</td><td>'+esc(x.points)+'</td></tr>').join("")+'</tbody></table><p>Roster slots: '+esc(JSON.stringify(league.rosterSlots))+'</p>':'Scoring settings were not included in this file.';
 if(tab==="standings")el.innerHTML='<h4>League standings</h4><table><thead><tr><th>Team</th><th>W</th><th>L</th><th>T</th></tr></thead><tbody>'+teams.map(t=>'<tr><td>'+esc(t.name)+'</td><td>'+(t.record?.wins??"—")+'</td><td>'+(t.record?.losses??"—")+'</td><td>'+(t.record?.ties??"—")+'</td></tr>').join("")+'</tbody></table>';
 if(tab==="matchups")el.innerHTML=league.matchups.length?'<h4>Matchups</h4><pre class="espn-data-preview">'+esc(JSON.stringify(league.matchups,null,2))+'</pre>':'Matchup history was not included in this file.';
}
function acceptLeague(data){league=data;renderResults();window.dispatchEvent(new CustomEvent("rinkiq:league-imported",{detail:league}));}
async function importFile(file){
 if(!file)return;const status=$("espnStatus");status.textContent="Reading "+file.name+"…";
 try{if(file.size>15*1024*1024)throw new Error("Please use a file smaller than 15 MB.");const content=await file.text();let data;if(/\.csv$/i.test(file.name)||file.type==="text/csv")data=parseCSV(content);else{try{data=normalizeLeague(JSON.parse(content),file.name);}catch(e){if(e instanceof SyntaxError)throw new Error("This JSON file could not be read. Make sure it is a valid JSON export.");throw e;}}
 acceptLeague(data);status.textContent="League file imported. "+league.size+" teams and "+league.teams.reduce((n,t)=>n+t.roster.length,0)+" players loaded. Check each tab for the data included in your file.";
 }catch(e){status.textContent=e.message||"Could not import this file.";}finally{$("espnFile").value="";}
}
function init(){
 const root=$("espnLeagueApp");if(!root||root.dataset.ready)return;root.dataset.ready="1";
 root.innerHTML='<div class="espn-import"><div class="espn-connect-head"><div><span class="espn-step-label">CONNECT YOUR LEAGUE</span><h3>Connect ESPN Fantasy Hockey</h3><p>Try a direct league lookup, or upload your league data file.</p></div><a class="espn-login-link" href="https://www.espn.com/fantasy/hockey/" target="_blank" rel="noopener">Open ESPN sign in ↗</a></div><form id="espnImportForm" class="espn-import-form"><label for="espnLeagueUrl">Your ESPN league URL or league ID</label><input id="espnLeagueUrl" name="leagueId" type="text" placeholder="Paste your ESPN Fantasy Hockey league link" autocomplete="url" required><div class="espn-fields"><label for="espnSeason">Season<input id="espnSeason" name="season" type="number" min="2010" max="2027" value="'+new Date().getFullYear()+'"></label></div><button class="espn-button" id="espnImportButton" type="submit">Import my league</button></form><div class="espn-warning"><b>Private league:</b> A copied URL identifies your league but does not grant access. ESPN does not provide public third-party OAuth. If direct lookup is blocked, use the file upload below. Never enter your ESPN password here.</div><section class="espn-file-import"><h4>Import using a league data file</h4><p>Upload a JSON league-data file or a CSV roster file. CSV needs <b>Team</b> and <b>Player</b> columns; Position, Owner, Wins, Losses and Points are optional.</p><label class="espn-file-button" for="espnFile">Choose JSON or CSV file</label><input id="espnFile" type="file" accept=".json,.csv,application/json,text/csv"><small>Files are read in your browser and are not sent to ESPN.</small></section><div id="espnStatus" class="espn-status" role="status" aria-live="polite">Paste your league URL above or upload a league data file.</div><div id="espnResults"></div></div>';
 $("espnFile").addEventListener("change",e=>importFile(e.target.files?.[0]));
 $("espnImportForm").addEventListener("submit",async e=>{e.preventDefault();const button=$("espnImportButton"),status=$("espnStatus"),leagueId=$("espnLeagueUrl").value.trim(),season=Number($("espnSeason").value);button.disabled=true;button.textContent="Connecting…";status.textContent="Looking up your ESPN league…";try{const response=await fetch("/api/espn-league",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({leagueId,season,sport:"fhl"})});const data=await response.json();if(!response.ok)throw new Error(data.error||"Unable to import this league.");acceptLeague(data);status.textContent="League imported successfully.";}catch(error){status.textContent=error.message+" If ESPN marks the league private, upload a league data file instead.";}finally{button.disabled=false;button.textContent="Import my league";}});
}
const observer=new MutationObserver(init);observer.observe(document.body,{childList:true,subtree:true});init();
})();