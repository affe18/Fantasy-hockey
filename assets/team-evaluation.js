(()=> {
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let currentLeague=null;
const position=id=>({"1":"C","2":"LW","3":"RW","4":"D","5":"G","6":"G"})[String(id)]||"F";
function teamPoints(team){
 const result={offense:0,defense:0,goalies:0,total:0,known:0,unknown:0,players:[]};
 (team.roster||[]).forEach(p=>{
  const pos=position(p.position),pts=Number(p.fantasyPoints);
  if(p.fantasyPoints==null||!Number.isFinite(pts)){result.unknown++;return;}
  result.known++;result.total+=pts;
  if(pos==="D")result.defense+=pts;else if(pos==="G")result.goalies+=pts;else result.offense+=pts;
  result.players.push({...p,pos,points:pts});
 });
 return result;
}
function leagueRatings(team,league){
 const all=league.teams.map(t=>({team:t,points:teamPoints(t)})),mine=all.find(x=>String(x.team.id)===String(team.id));
 const categories=["offense","defense","goalies","total"],means={};
 categories.forEach(k=>means[k]=all.reduce((n,x)=>n+x.points[k],0)/Math.max(1,all.length));
 const rating=k=>means[k]>0?Math.max(1,Math.min(10,Math.round((mine.points[k]/means[k]*5)*10)/10)):null;
 const rank=k=>1+all.filter(x=>x.points[k]>mine.points[k]).length;
 const players=mine.points.players;
 const strengths=[],weaknesses=[];
 categories.slice(0,3).forEach(k=>{const r=rating(k);if(r!=null&&r>=6.5)strengths.push(label(k)+" is a strength: "+mine.points[k].toFixed(1)+" fantasy points, "+r.toFixed(1)+"/10 (rank "+rank(k)+"/"+all.length+").");if(r!=null&&r<4.5)weaknesses.push(label(k)+" is a weakness: "+mine.points[k].toFixed(1)+" fantasy points, "+r.toFixed(1)+"/10 (rank "+rank(k)+"/"+all.length+").");});
 if(mine.points.unknown)weaknesses.push(mine.points.unknown+" rostered player(s) have no ESPN fantasy-point total in the import, so the team score may be incomplete.");
 if(!strengths.length)strengths.push("No position group is clearly above the league average in fantasy points yet.");
 if(!weaknesses.length)weaknesses.push("No position group is clearly below the league average in fantasy points.");
 return {all,mine,means,ratings:{offense:rating("offense"),defense:rating("defense"),goalies:rating("goalies"),total:rating("total")},ranks:{offense:rank("offense"),defense:rank("defense"),goalies:rank("goalies"),total:rank("total")},strengths,weaknesses};
}
function label(k){return({offense:"Offence",defense:"Defence",goalies:"Goaltending",total:"Overall team"})[k]||k}
function recommendations(question,team,league,report){
 const q=question.toLowerCase(),roster=report.mine.points.players,mentioned=roster.find(p=>q.includes(p.name.toLowerCase()));
 const weakest=["offense","defense","goalies"].filter(k=>report.ratings[k]!=null).sort((a,b)=>report.ratings[a]-report.ratings[b])[0];
 if(/drop|cut|waiv/.test(q)){
  if(mentioned)return "You asked about "+mentioned.name+". Their imported season total is "+mentioned.points.toFixed(1)+" fantasy points. Compare that with your lowest-scoring rostered player at the same position and available free agents before dropping them; this page does not yet import waiver availability.";
  const low=roster.slice().sort((a,b)=>a.points-b.points)[0];return low?"Your lowest imported scorer is "+low.name+" ("+low.points.toFixed(1)+" points). That makes them a review candidate, not an automatic drop. Check games played, injury status, role and free-agent replacements first.":"I don't have enough player fantasy-point data to identify a drop candidate.";
 }
 if(/trade|deal|sell|buy/.test(q)){
  const target=weakest?label(weakest).toLowerCase():"position group with missing points data";
  return (mentioned?mentioned.name+" has "+mentioned.points.toFixed(1)+" imported fantasy points. ":"")+"Your lowest-rated group is "+target+". Consider trading from a position group you can afford to weaken to improve that area, but compare both players' points per game and remaining schedule in the Trade Analyzer before accepting.";
 }
 if(/keep|hold/.test(q)&&mentioned)return " "+mentioned.name+" has "+mentioned.points.toFixed(1)+" fantasy points in the imported season totals. Keep them if their recent production, health and role remain stable; compare their points per game and replacement options before deciding.";
 if(/strength|weak|rank|rating|score/.test(q))return "Your ratings: offence "+(report.ratings.offense?.toFixed(1)??"N/A")+"/10, defence "+(report.ratings.defense?.toFixed(1)??"N/A")+"/10, goalies "+(report.ratings.goalies?.toFixed(1)??"N/A")+"/10. Weakest group: "+(weakest?label(weakest):"not enough scoring data")+".";
 return "Your biggest opportunity is improving "+(weakest?label(weakest).toLowerCase():"the position group with missing data")+". Ask me about a specific player, or whether to trade, drop, add or hold them. I’ll use the imported season fantasy-point totals and your league comparison.";
}
function render(){
 const root=document.getElementById("teamEvaluationApp");if(!root||!currentLeague)return;
 root.innerHTML='<section class="team-eval"><div class="team-eval-head"><div><h3>Your team fantasy-point grades</h3><p>Position-group ratings compare each group’s season fantasy points with the average team in your ESPN league.</p></div><label>YOUR TEAM<select id="evalTeam">'+currentLeague.teams.map(t=>'<option value="'+esc(t.id)+'">'+esc(t.name)+'</option>').join("")+'</select></label></div><div id="evalReport"></div><div class="team-assistant"><div class="assistant-heading"><div><h3>RinkIQ team assistant</h3><p>Ask about trades, drops, adds, holds or how to improve your team.</p></div><span>Roster-aware guidance</span></div><div id="assistantConversation" class="assistant-conversation"><div class="assistant-msg">I’ve loaded your team’s fantasy-point totals. Ask me about a player or a roster move.</div></div><form id="teamAskForm" class="team-ask"><input id="teamAsk" placeholder="Should I trade, drop or keep a player?" autocomplete="off"><button type="submit">Ask RinkIQ ↗</button></form><small class="eval-disclaimer">Grades use ESPN season-to-date fantasy points under your league’s scoring rules when ESPN supplies player totals. They are relative to teams in this league, not projections of future performance. Missing player totals are excluded and flagged.</small></div></section>';
 const select=document.getElementById("evalTeam");select.value=currentLeague.teams[0]?.id||"";
 select.addEventListener("change",update);
 document.getElementById("teamAskForm").addEventListener("submit",e=>{e.preventDefault();const input=document.getElementById("teamAsk"),q=input.value.trim();if(!q)return;const team=currentLeague.teams.find(t=>String(t.id)===String(select.value));const report=leagueRatings(team,currentLeague),conversation=document.getElementById("assistantConversation");conversation.insertAdjacentHTML("beforeend",'<div class="user-msg">'+esc(q)+'</div><div class="assistant-msg">'+esc(recommendations(q,team,currentLeague,report))+'</div>');input.value="";conversation.scrollTop=conversation.scrollHeight;});
 update();
}
function update(){
 const team=currentLeague.teams.find(t=>String(t.id)===String(document.getElementById("evalTeam").value));if(!team)return;
 const r=leagueRatings(team,currentLeague),bar=(key)=>{const value=r.ratings[key];return '<div class="eval-score-row"><span>'+label(key)+'</span><div class="eval-track"><i style="width:'+(value==null?0:value*10)+'%"></i></div><b>'+(value==null?"N/A":value.toFixed(1)+"/10")+'</b></div>'};
 const point=(key)=>r.mine.points[key].toFixed(1);
 document.getElementById("evalReport").innerHTML='<div class="eval-overview"><div class="eval-rating"><strong>'+(r.ratings.total==null?"N/A":r.ratings.total.toFixed(1))+'</strong><span>/10</span><small>OVERALL TEAM GRADE</small></div><div class="eval-rank"><b>#'+r.ranks.total+' <small>of '+r.all.length+'</small></b><span>Overall fantasy-point rank</span><small>'+r.mine.points.known+' players scored · '+r.mine.points.unknown+' missing</small></div><div class="eval-bars">'+bar("offense")+bar("defense")+bar("goalies")+'</div></div><div class="eval-category-points"><div><b>Offence</b><strong>'+point("offense")+'</strong><small>Fantasy points · rank #'+r.ranks.offense+'</small></div><div><b>Defence</b><strong>'+point("defense")+'</strong><small>Fantasy points · rank #'+r.ranks.defense+'</small></div><div><b>Goalies</b><strong>'+point("goalies")+'</strong><small>Fantasy points · rank #'+r.ranks.goalies+'</small></div></div><div class="eval-grid"><article><h4>Strengths</h4>'+r.strengths.map(x=>'<p class="eval-positive">✓ '+esc(x)+'</p>').join("")+'</article><article><h4>Weaknesses & risks</h4>'+r.weaknesses.map(x=>'<p class="eval-risk">! '+esc(x)+'</p>').join("")+'</article></div><p class="eval-disclaimer">Scoring method: each position group is rated against the league average: 5/10 equals average, above-average point totals score higher, and below-average totals score lower (bounded from 1 to 10). ESPN position IDs are interpreted as C/LW/RW/D/G. If your league’s ESPN response does not include season totals, the relevant grade displays N/A rather than inventing a score.</p>';
}
window.RinkIQTeamEval=league=>{currentLeague=league;render();};
})();