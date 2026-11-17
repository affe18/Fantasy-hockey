const NHL="https://api-web.nhle.com/v1";
const TEAMS=["ANA","BOS","BUF","CGY","CAR","CHI","COL","CBJ","DAL","DET","EDM","FLA","LAK","MIN","MTL","NSH","NJD","NYI","NYR","OTT","PHI","PIT","SJS","SEA","STL","TBL","TOR","UTA","VAN","VGK","WPG","WSH"];
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function get(path){let lastError;for(let attempt=0;attempt<3;attempt++){try{const response=await fetch(NHL+path,{headers:{Accept:"application/json"},signal:AbortSignal.timeout(18000)});if(response.ok)return await response.json();const error=new Error("NHL API "+response.status+" for "+path);if(response.status!==429&&response.status<500)throw error;lastError=error}catch(error){lastError=error;if(!/429|5\d\d/.test(String(error.message)))throw error}if(attempt<2)await wait(400*(attempt+1))}throw lastError||new Error("NHL data request failed")}
function rows(v,key){if(Array.isArray(v))return v;if(Array.isArray(v?.[key]))return v[key];if(Array.isArray(v?.data))return v.data;if(Array.isArray(v?.skaters))return v.skaters;if(Array.isArray(v?.goalies))return v.goalies;return[]}
function num(...values){for(const value of values){if(value!==undefined&&value!==null&&value!==""&&Number.isFinite(Number(value)))return Number(value)}return 0}
function playerName(p){const first=p.firstName?.default||p.firstName||"",last=p.lastName?.default||p.lastName||"";return [first,last].filter(Boolean).join(" ")||p.name?.default||p.name||p.skaterFullName||p.goalieFullName||""}
function player(p,goalie){const id=String(p.playerId||p.id||"");const name=playerName(p);if(!id||!name)return null;return{id,name,team:p.teamAbbrev||p.team?.abbrev||"",position:p.positionCode||(goalie?"G":"F"),headshot:p.headshot||"",stats:{gamesPlayed:num(p.gamesPlayed,p.gp),goals:num(p.goals),assists:num(p.assists),points:num(p.points,p.pts),shots:num(p.shots,p.shotsOnGoal),hits:num(p.hits),blockedShots:num(p.blockedShots,p.blocks),pim:num(p.pim,p.penaltyMinutes),plusMinus:num(p.plusMinus),powerPlayPoints:num(p.powerPlayPoints,p.ppPoints),shortHandedPoints:num(p.shPoints,p.shortHandedPoints),gameWinningGoals:num(p.gameWinningGoals,p.gwg),faceoffWins:num(p.faceoffWins),wins:num(p.wins),saves:num(p.saves),goalsAgainst:num(p.goalsAgainst),shutouts:num(p.shutouts),savePct:num(p.savePct,p.savePercentage),gaa:num(p.goalsAgainstAverage,p.gaa),losses:num(p.losses),overtimeLosses:num(p.otLosses,p.overtimeLosses)}}}
function games(data){return(data?.games||data?.gameWeek||[]).flatMap(x=>x.games||[x]).filter(g=>g.gameDate||g.startTimeUTC)}
async function mapLimit(items,limit,worker){const output=new Array(items.length);let cursor=0;await Promise.all(Array.from({length:Math.min(limit,items.length)},async()=>{while(true){const index=cursor++;if(index>=items.length)return;output[index]=await worker(items[index])}}));return output}
async function handler(req,res,env){
 res.setHeader("Cache-Control","public, s-maxage=300, stale-while-revalidate=900");
 res.setHeader("Content-Type","application/json; charset=utf-8");
 if(req.method!=="GET"){res.setHeader("Allow","GET");return res.status(405).json({error:"Method not allowed"})}
 const failures=[];
 const [skaterResult,goalieResult]=await Promise.allSettled([
  get("/skater-stats-leaders/current?categories=points&limit=-1"),
  get("/goalie-stats-leaders/current?categories=wins&limit=-1")
 ]);
 const skaters=skaterResult.status==="fulfilled"?rows(skaterResult.value,"points"):[]; 
 const goalies=goalieResult.status==="fulfilled"?rows(goalieResult.value,"wins"):[];
 if(skaterResult.status==="rejected")failures.push("Skater stats: "+skaterResult.reason.message);
 if(goalieResult.status==="rejected")failures.push("Goalie stats: "+goalieResult.reason.message);
 const byId=new Map();
 for(const raw of skaters){const p=player(raw,false);if(p)byId.set(p.id,p)}
 for(const raw of goalies){const p=player(raw,true);if(p)byId.set(p.id,p)}
 const teams=[...new Set([...byId.values()].map(p=>p.team).filter(Boolean))];
 const scheduleStatus={};
 const today=new Date().toISOString().slice(0,10),schedules={};
 const scheduleResults=await mapLimit(TEAMS,8,async team=>{try{return{team,data:games(await get("/club-schedule-season/"+team+"/now")),ok:true}}catch(e){failures.push(team+" schedule: "+e.message);return{team,data:[],ok:false}}});
 for(const x of scheduleResults){scheduleStatus[x.team]=x.ok;schedules[x.team]=x.data.filter(g=>(g.gameDate||"").slice(0,10)>=today).map(g=>({date:g.gameDate,opponent:(g.awayTeam?.abbrev===x.team?g.homeTeam?.abbrev:g.awayTeam?.abbrev)||"TBD",home:g.homeTeam?.abbrev===x.team,gameState:g.gameState||""}));}
 const players=[...byId.values()];
 return res.status(200).json({updatedAt:new Date().toISOString(),players,schedules,scheduleStatus,teamsLoaded:teams.length,skatersLoaded:skaters.length,goaliesLoaded:goalies.length,statCategoriesLoaded:[...(skaterResult.status==="fulfilled"?["skaters"]:[]),...(goalieResult.status==="fulfilled"?["goalies"]:[])],failures});
}
export async function onRequest({request,env}){
 let body;
 if(request.method!=="GET"&&request.method!=="HEAD"){const raw=await request.text();if(raw){try{body=JSON.parse(raw)}catch{body=raw}}}
 const headers=new Headers();let status=200;
 const req={method:request.method,body};
 const res={setHeader(name,value){headers.set(name,String(value))},status(code){status=code;return this},json(payload){headers.set("Content-Type","application/json; charset=utf-8");return new Response(JSON.stringify(payload),{status,headers})}};
 try{const result=await handler(req,res,env);return result instanceof Response?result:new Response(null,{status:204,headers})}
 catch(error){return new Response(JSON.stringify({error:"Internal server error"}),{status:500,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}})}
}
