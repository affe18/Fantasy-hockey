const STATS="https://api.nhle.com/stats/rest/en";
const NHL="https://api-web.nhle.com/v1";
const TEAMS=["ANA","BOS","BUF","CGY","CAR","CHI","COL","CBJ","DAL","DET","EDM","FLA","LAK","MIN","MTL","NSH","NJD","NYI","NYR","OTT","PHI","PIT","SJS","SEA","STL","TBL","TOR","UTA","VAN","VGK","WPG","WSH"];
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function fetchJson(url){
 let lastError;
 for(let attempt=0;attempt<3;attempt++){
  try{
   const response=await fetch(url,{headers:{Accept:"application/json"},signal:AbortSignal.timeout(18000)});
   if(response.ok)return await response.json();
   const error=new Error("Upstream HTTP "+response.status+" for "+url);
   if(response.status!==429&&response.status<500)throw error;
   lastError=error;
  }catch(error){lastError=error;if(!/429|5\d\d/.test(String(error.message)))throw error}
  if(attempt<2)await wait(700*(attempt+1));
 }
 throw lastError||new Error("NHL data request failed");
}
function seasonId(){const now=new Date(),year=now.getUTCMonth()>=6?now.getUTCFullYear():now.getUTCFullYear()-1;return String(year)+String(year+1)}
function statsUrl(kind,report,season){
 const url=new URL(STATS+"/"+kind+"/"+report);
 url.searchParams.set("cayenneExp","seasonId="+season+" and gameTypeId=2");
 url.searchParams.set("isAggregate","false");
 url.searchParams.set("isGame","false");
 url.searchParams.set("start","0");
 url.searchParams.set("limit","-1");
 return url.toString();
}
function dataRows(payload){return Array.isArray(payload?.data)?payload.data:[]}
function num(...values){for(const value of values){if(value!==undefined&&value!==null&&value!==""&&Number.isFinite(Number(value)))return Number(value)}return 0}
function teamAbbrev(value){const values=String(value||"").split(",").map(x=>x.trim()).filter(Boolean);return values[values.length-1]||""}
function buildPlayer(row,goalie,extra={}){
 const id=String(row.playerId||"");
 const name=row.skaterFullName||row.goalieFullName||[row.firstName,row.lastName].filter(Boolean).join(" ");
 if(!id||!name)return null;
 return{id,name,team:teamAbbrev(row.teamAbbrevs||row.teamAbbrev),position:row.positionCode||(goalie?"G":"F"),stats:{
  gamesPlayed:num(row.gamesPlayed),goals:num(row.goals),assists:num(row.assists),points:num(row.points),
  shots:num(row.shots),hits:num(extra.hits),blockedShots:num(extra.blockedShots),pim:num(row.penaltyMinutes,row.pim),
  plusMinus:num(row.plusMinus),powerPlayPoints:num(row.ppPoints,row.powerPlayPoints),shortHandedPoints:num(row.shPoints,row.shortHandedPoints),
  gameWinningGoals:num(row.gameWinningGoals),faceoffWins:num(extra.faceoffWins,row.faceoffWins),
  wins:num(row.wins),saves:num(row.saves),goalsAgainst:num(row.goalsAgainst),shutouts:num(row.shutouts),
  savePct:num(row.savePct),gaa:num(row.goalsAgainstAverage),losses:num(row.losses),overtimeLosses:num(row.otLosses)
 }}
}
function games(data){return(data?.games||data?.gameWeek||[]).flatMap(item=>item.games||[item]).filter(game=>game.gameDate||game.startTimeUTC)}
async function mapLimit(items,limit,worker){const output=new Array(items.length);let cursor=0;await Promise.all(Array.from({length:Math.min(limit,items.length)},async()=>{while(true){const index=cursor++;if(index>=items.length)return;output[index]=await worker(items[index])}}));return output}
module.exports=async function handler(req,res){
 res.setHeader("Cache-Control","public, s-maxage=300, stale-while-revalidate=900");
 res.setHeader("Content-Type","application/json; charset=utf-8");
 if(req.method!=="GET"){res.setHeader("Allow","GET");return res.status(405).json({error:"Method not allowed"})}
 const season=seasonId(),failures=[],query=req.query||{},scheduleOnly=String(query.schedulesOnly||"") === "1";
 const requestedTeams=scheduleOnly?String(query.teams||"").split(",").map(team=>team.trim().toUpperCase()).filter(team=>TEAMS.includes(team)):[];
 const requests=[
  ["skaterSummary",statsUrl("skater","summary",season)],
  ["goalieSummary",statsUrl("goalie","summary",season)],
  ["skaterRealtime",statsUrl("skater","realtime",season)],
  ["faceoffWins",statsUrl("skater","faceoffwins",season)]
 ];
 const results=scheduleOnly?[]:await Promise.all(requests.map(async([key,url])=>{try{return{key,data:await fetchJson(url),ok:true}}catch(error){failures.push(key+": "+error.message);return{key,data:null,ok:false}}}));
 const byId=new Map(),extraById=new Map();
 const result=(key)=>results.find(item=>item.key===key);
 for(const row of dataRows(result("skaterSummary").data)){const p=buildPlayer(row,false);if(p)byId.set(p.id,p)}
 for(const row of dataRows(result("goalieSummary").data)){const p=buildPlayer(row,true);if(p)byId.set(p.id,p)}
 for(const row of dataRows(result("skaterRealtime").data)){const id=String(row.playerId||"");if(id)extraById.set(id,{...(extraById.get(id)||{}),hits:num(row.hits),blockedShots:num(row.blockedShots,row.blocks)})}
 for(const row of dataRows(result("faceoffWins").data)){const id=String(row.playerId||"");if(id)extraById.set(id,{...(extraById.get(id)||{}),faceoffWins:num(row.faceoffWins,row.totalFaceoffWins)})}
 for(const [id,p] of byId){const extra=extraById.get(id)||{};p.stats.hits=extra.hits??p.stats.hits;p.stats.blockedShots=extra.blockedShots??p.stats.blockedShots;p.stats.faceoffWins=extra.faceoffWins??p.stats.faceoffWins}
 const today=new Date().toISOString().slice(0,10),schedules={},scheduleStatus={};
 const scheduleResults=await mapLimit(requestedTeams,3,async team=>{try{return{team,data:games(await fetchJson(NHL+"/club-schedule-season/"+team+"/now")),ok:true}}catch(error){failures.push(team+" schedule: "+error.message);return{team,data:[],ok:false}}});
 for(const item of scheduleResults){scheduleStatus[item.team]=item.ok;schedules[item.team]=item.data.filter(game=>(game.gameDate||"").slice(0,10)>=today).map(game=>({date:game.gameDate,opponent:(game.awayTeam?.abbrev===item.team?game.homeTeam?.abbrev:game.awayTeam?.abbrev)||"TBD",home:game.homeTeam?.abbrev===item.team,gameState:game.gameState||""}))}
 // Include active NHL roster members even if they have not recorded a current-season stat line.
 const rosterResults=scheduleOnly?[]:await mapLimit(TEAMS,4,async team=>{
  try{return {team,data:await fetchJson(NHL+"/roster/"+team+"/current"),ok:true}}
  catch(error){failures.push(team+" roster: "+error.message);return {team,data:null,ok:false}}
 });
 let rosterTeamsLoaded=0,rosterPlayersAdded=0;
 for(const item of rosterResults){
  if(!item.ok)continue;
  rosterTeamsLoaded++;
  for(const group of ["forwards","defensemen","goalies"]){
   for(const row of (item.data?.[group]||[])){
    const id=String(row.id||row.playerId||"");
    const first=typeof row.firstName==="string"?row.firstName:row.firstName?.default;
    const last=typeof row.lastName==="string"?row.lastName:row.lastName?.default;
    const fullName=typeof row.fullName==="string"?row.fullName:row.fullName?.default;
    const name=fullName||[first,last].filter(Boolean).join(" ");
    if(!id||!name||byId.has(id))continue;
    const position=row.positionCode||(group==="goalies"?"G":group==="defensemen"?"D":"F");
    byId.set(id,{id,name,team:item.team,position,stats:{gamesPlayed:0,goals:0,assists:0,points:0,shots:0,hits:0,blockedShots:0,pim:0,plusMinus:0,powerPlayPoints:0,shortHandedPoints:0,gameWinningGoals:0,faceoffWins:0,wins:0,saves:0,goalsAgainst:0,shutouts:0,savePct:0,gaa:0,losses:0,overtimeLosses:0},statsAvailable:false});
    rosterPlayersAdded++;
   }
  }
 }
 const players=[...byId.values()];
 return res.status(200).json({updatedAt:new Date().toISOString(),seasonId:season,statSource:"NHL Stats REST",mode:scheduleOnly?"schedules":"players",players,schedules,scheduleStatus,teamsLoaded:[...new Set(players.map(p=>p.team).filter(Boolean))].length,skatersLoaded:dataRows(result("skaterSummary").data).length,goaliesLoaded:dataRows(result("goalieSummary").data).length,statCategoriesLoaded:results.filter(item=>item.ok).map(item=>item.key),rosterTeamsLoaded,rosterPlayersAdded,failures});
};
