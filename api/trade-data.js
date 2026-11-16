const NHL="https://api-web.nhle.com/v1";
const TEAMS=["ANA","BOS","BUF","CGY","CAR","CHI","COL","CBJ","DAL","DET","EDM","FLA","LAK","MIN","MTL","NSH","NJD","NYI","NYR","OTT","PHI","PIT","SJS","SEA","STL","TBL","TOR","UTA","VAN","VGK","WPG","WSH"];
async function get(path){const r=await fetch(NHL+path,{headers:{Accept:"application/json"},signal:AbortSignal.timeout(18000)});if(!r.ok)throw new Error("NHL API "+r.status+" for "+path);return r.json();}
function listRoster(data,team){const groups=[["forwards","F"],["defensemen","D"],["goalies","G"]];return groups.flatMap(([key,pos])=>(data?.[key]||[]).map(p=>({id:String(p.id||p.playerId),name:[p.firstName?.default||p.firstName,p.lastName?.default||p.lastName].filter(Boolean).join(" "),team,position:p.positionCode||pos,shoots:p.shootsCatches||"",headshot:p.headshot||"",jersey:p.sweaterNumber||null}))).filter(p=>p.id&&p.name);}
function flattenSchedule(data){return (data?.games||data?.gameWeek||[]).flatMap(x=>x.games||[x]).filter(g=>g.gameDate||g.startTimeUTC);}
module.exports=async function handler(req,res){
 res.setHeader("Cache-Control","public, s-maxage=300, stale-while-revalidate=900");res.setHeader("Content-Type","application/json; charset=utf-8");
 if(req.method!=="GET"){res.setHeader("Allow","GET");return res.status(405).json({error:"Method not allowed"});}
 const failures=[];
 const rosterResults=await Promise.all(TEAMS.map(async team=>{try{return {team,data:await get("/roster/"+team+"/current")};}catch(e){failures.push(team+" roster: "+e.message);return {team,data:null};}}));
 const [skaters,goalies]=await Promise.all([
  get("/skater-stats-leaders/current?categories=points&limit=-1").catch(e=>{failures.push("Skater stats: "+e.message);return null;}),
  get("/goalie-stats-leaders/current?categories=wins&limit=-1").catch(e=>{failures.push("Goalie stats: "+e.message);return null;})
 ]);
 const roster=rosterResults.flatMap(x=>x.data?listRoster(x.data,x.team):[]);
 const statRows=(v)=>Array.isArray(v)?v:(v?.data||v?.points||v?.wins||[]);
 const statMap=new Map([...statRows(skaters),...statRows(goalies)].map(p=>[String(p.playerId||p.id),p]));
 const players=roster.map(p=>{const s=statMap.get(p.id)||{};return {...p,stats:{gamesPlayed:Number(s.gamesPlayed||s.gp||0),goals:Number(s.goals||0),assists:Number(s.assists||0),points:Number(s.points||0),shots:Number(s.shots||s.shotsOnGoal||0),powerPlayPoints:Number(s.powerPlayPoints||s.ppPoints||0),hits:Number(s.hits||0),blockedShots:Number(s.blockedShots||s.blocks||0),wins:Number(s.wins||0),saves:Number(s.saves||0),goalsAgainst:Number(s.goalsAgainst||0),shutouts:Number(s.shutouts||0),savePct:Number(s.savePct||s.savePercentage||0),gaa:Number(s.goalsAgainstAverage||s.gaa||0)}};});
 const today=new Date().toISOString().slice(0,10);
 const scheduleResults=await Promise.all(TEAMS.map(async team=>{try{return {team,games:flattenSchedule(await get("/club-schedule-season/"+team+"/now"))};}catch(e){failures.push(team+" schedule: "+e.message);return {team,games:[]};}}));
 const schedules={};for(const x of scheduleResults)schedules[x.team]=x.games.filter(g=>(g.gameDate||"").slice(0,10)>=today).map(g=>({date:g.gameDate,opponent:(g.awayTeam?.abbrev===x.team?g.homeTeam?.abbrev:g.awayTeam?.abbrev)||"TBD",home:g.homeTeam?.abbrev===x.team,gameState:g.gameState||""}));
 return res.status(200).json({updatedAt:new Date().toISOString(),season:"current",players,schedules,teamsLoaded:rosterResults.filter(x=>x.data).length,failures});
};