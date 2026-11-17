const BASE="https://lm-api-reads.fantasy.espn.com/apis/v3/games/fhl/seasons";
const asArray=v=>Array.isArray(v)?v:[];
export async function onRequest({request}){
 const headers={"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"};
 if(request.method!=="GET")return new Response(JSON.stringify({error:"Use GET"}),{status:405,headers});
 const url=new URL(request.url),leagueId=String(url.searchParams.get("leagueId")||""),season=String(url.searchParams.get("season")||"");
 if(!/^\d{1,12}$/.test(leagueId)||!/^20\d{2}$/.test(season))return new Response(JSON.stringify({error:"A valid imported ESPN league ID and season are required."}),{status:400,headers});
 const limit=Math.min(100,Math.max(1,Number(url.searchParams.get("limit")||50)));
 const filter={players:{filterStatus:{value:["FREEAGENT","WAIVERS"]},limit,sortPercOwned:{sortPriority:1,sortAsc:false}}};
 const endpoint=BASE+"/"+season+"/segments/0/leagues/"+leagueId+"?view=kona_player_info&scoringPeriodId=0";
 try{
  const response=await fetch(endpoint,{headers:{Accept:"application/json","User-Agent":"Mozilla/5.0 RinkIQ","X-Fantasy-Filter":JSON.stringify(filter)},signal:AbortSignal.timeout(20000)});
  const raw=await response.text();
  if(!response.ok)return new Response(JSON.stringify({error:"ESPN player pool returned HTTP "+response.status+". The league may be private or ESPN may have changed its API.",upstreamStatus:response.status}),{status:response.status===401||response.status===403?401:502,headers});
  let data;try{data=JSON.parse(raw)}catch{return new Response(JSON.stringify({error:"ESPN returned an unreadable player-pool response."}),{status:502,headers})}
  const players=asArray(data.players).map(entry=>{
   const p=entry.player||{},pool=entry.playerPoolEntry||{};
   const name=p.fullName||[p.firstName,p.lastName].filter(Boolean).join(" ");
   return{id:String(p.id??entry.id??""),name,status:pool.status||entry.status||"UNKNOWN",onTeamId:entry.onTeamId??pool.onTeamId??0,position:p.defaultPositionId??null,eligibleSlots:asArray(p.eligibleSlots),proTeamId:p.proTeamId??null,injuryStatus:p.injuryStatus||"",injured:!!p.injured,percentOwned:p.ownership?.percentOwned??pool.percentOwned??null,percentStarted:p.ownership?.percentStarted??null,stats:asArray(p.stats).map(s=>({seasonId:s.seasonId,scoringPeriodId:s.scoringPeriodId,statSourceId:s.statSourceId,statSplitTypeId:s.statSplitTypeId,appliedTotal:s.appliedTotal,totalPoints:s.totalPoints}))};
  }).filter(p=>p.id&&p.name);
  return new Response(JSON.stringify({provider:"ESPN Fantasy",leagueId,season,count:players.length,players,updatedAt:new Date().toISOString()}),{status:200,headers});
 }catch(error){return new Response(JSON.stringify({error:error?.name==="TimeoutError"?"ESPN player-pool request timed out.":error?.message||"Unable to load ESPN free agents."}),{status:502,headers})}
}
