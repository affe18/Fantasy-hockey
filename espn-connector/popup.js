const $=id=>document.getElementById(id);
$("season").value=new Date().getFullYear();
$("connect").addEventListener("click",async()=>{
 const button=$("connect"),status=$("status"),leagueId=$("leagueId").value.trim(),season=$("season").value;
 if(!/^\d{1,12}$/.test(leagueId)){status.textContent="Enter the numeric league ID from your ESPN league URL.";return;}
 if(!/^\d{4}$/.test(season)){status.textContent="Enter a valid season year.";return;}
 button.disabled=true;
 try{
  status.textContent="Using your existing ESPN browser session…";
  const endpoint=new URL("https://lm-api-reads.fantasy.espn.com/apis/v3/games/fhl/seasons/"+season+"/segments/0/leagues/"+leagueId);
  ["mSettings","mTeam","mRoster","mMatchup","mMatchupScore","mStandings","mSchedule","mStatus"].forEach(v=>endpoint.searchParams.append("view",v));
  const response=await fetch(endpoint,{credentials:"include",headers:{Accept:"application/json"}});
  if(!response.ok)throw new Error(response.status===401||response.status===403?"ESPN did not authorize this request. Sign in to ESPN in this Chrome profile and retry.":"ESPN returned HTTP "+response.status+".");
  const raw=await response.json();
  if(!Array.isArray(raw.teams)||!raw.teams.length)throw new Error("No teams returned. Check the league ID and season.");
  const members=new Map((raw.members||[]).map(m=>[m.id,m]));
  const teams=raw.teams.map(t=>({id:t.id,name:t.name||t.location||("Team "+t.id),abbrev:t.abbrev||"",owners:(t.owners||[]).map(x=>members.get(x)?.displayName||members.get(x)?.firstName||"League member"),record:t.record?.overall||{},roster:(t.roster?.entries||[]).map(e=>{const ppe=e.playerPoolEntry||{},p=ppe.player||e.player||{},stats=ppe.stats||p.stats||[],actual=Array.isArray(stats)?stats.filter(x=>Number(x.statSourceId??x.statTypeId??0)===0&&Number(x.statSplitTypeId??0)===0).sort((a,b)=>Number(b.seasonId||0)-Number(a.seasonId||0))[0]:null,points=ppe.totalPoints??actual?.appliedTotal??actual?.totalPoints??ppe.appliedStatTotal??p.totalPoints??null;return{id:p.id,name:[p.firstName,p.lastName].filter(Boolean).join(" ")||p.fullName||"Unknown player",position:String(p.defaultPositionId||""),proTeamId:p.proTeamId||null,injuryStatus:p.injuryStatus||"",lineupSlotId:e.lineupSlotId??null,fantasyPoints:points!=null&&Number.isFinite(Number(points))?Number(points):null,fantasyPointsSource:ppe.totalPoints!=null?"ESPN season total":actual?"ESPN actual season stat line":"unavailable"};}}));
  const settings=raw.settings||{},league={provider:"ESPN Fantasy",leagueId:String(leagueId),season:Number(season),leagueName:settings.name||raw.name||("ESPN League "+leagueId),size:teams.length,teams,scoring:(settings.scoringSettings?.scoringItems||[]).map(x=>({statId:x.statId,points:Number(x.points),label:x.name||x.abbrev||("Stat "+x.statId)})),rosterSlots:settings.rosterSettings?.lineupSlotCounts||{},matchups:(raw.schedule||[]).map(m=>({week:m.matchupPeriodId,homeTeamId:m.home?.teamId,awayTeamId:m.away?.teamId,homeScore:m.home?.totalPoints,awayScore:m.away?.totalPoints})),importedAt:new Date().toISOString(),access:"browser session",notice:"Read-only import through your existing ESPN browser session. ESPN's API is undocumented and may change."};
  status.textContent="Finding Fantasy Hockey Inspection…";
  let tabs=await chrome.tabs.query({active:true,lastFocusedWindow:true}),tab=tabs[0];
  if(!tab?.url?.startsWith("https://fantasy-hockey-bhunda-bros.vercel.app/")){tab=(await chrome.tabs.query({url:"https://fantasy-hockey-bhunda-bros.vercel.app/*"}))[0];}
  if(!tab?.id)throw new Error("Open Fantasy Hockey Inspection in a Chrome tab, then click the extension again.");
  await chrome.scripting.executeScript({target:{tabId:tab.id},func:(data)=>{localStorage.setItem("rinkIQ.importedLeague.v1",JSON.stringify(data));window.dispatchEvent(new CustomEvent("rinkiq:league-imported",{detail:data}));const p=document.getElementById("leagueImportPanel");if(p){p.hidden=false;p.style.display="block";}},args:[league]});
  status.textContent="Connected: "+league.leagueName+" ("+teams.length+" teams). Sign in to your website account to save it across devices.";
 }catch(error){status.textContent=error.message||"Unable to connect ESPN.";}
 finally{button.disabled=false;}
});