(()=> {
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let currentLeague=null;
const posName=id=>({"1":"C","2":"LW","3":"RW","4":"D","5":"G","6":"G","7":"F","8":"F","9":"F","10":"F","11":"F","12":"F","13":"F","14":"F","15":"F","16":"F","17":"F","18":"F","19":"F","20":"F","21":"F","22":"F","23":"F","24":"F","25":"F","26":"F","27":"F","28":"F","29":"F","30":"F","31":"F","32":"F","33":"F","34":"F","35":"F","36":"F","37":"F","38":"F","39":"F","40":"F","41":"F","42":"F","43":"F","44":"F","45":"F","46":"F","47":"F","48":"F","49":"F","50":"F","51":"F","52":"F","53":"F","54":"F","55":"F","56":"F","57":"F","58":"F","59":"F","60":"F","61":"F","62":"F","63":"F","64":"F","65":"F","66":"F","67":"F","68":"F","69":"F","70":"F","71":"F","72":"F","73":"F","74":"F","75":"F","76":"F","77":"F","78":"F","79":"F","80":"F","81":"F","82":"F","83":"F","84":"F","85":"F","86":"F","87":"F","88":"F","89":"F","90":"F","91":"F","92":"F","93":"F","94":"F","95":"F","96":"F","97":"F","98":"F","99":"F","100":"F"})[String(id)]||"F";
function analyze(team,league){
 const roster=team.roster||[],counts={C:0,LW:0,RW:0,D:0,G:0,F:0};
 roster.forEach(p=>{const pos=posName(p.position);if(counts[pos]!==undefined)counts[pos]++;else counts.F++;});
 const teams=league.teams||[],records=teams.map(t=>Number(t.record?.percentage??((Number(t.record?.wins||0))/(Math.max(1,Number(t.record?.wins||0)+Number(t.record?.losses||0)+Number(t.record?.ties||0))))));
 const myIndex=teams.findIndex(t=>String(t.id)===String(team.id)),valid=records.filter(Number.isFinite),rank=valid.filter(v=>v>records[myIndex]).length+1;
 const size=teams.length||1,rosterSizes=teams.map(t=>(t.roster||[]).length),avg=rosterSizes.reduce((a,b)=>a+b,0)/Math.max(1,rosterSizes.length);
 const goalieScore=Math.max(2,Math.min(10,Math.round(10-Math.abs(counts.G-2)*2.5)));
 const defenseScore=Math.max(2,Math.min(10,Math.round(4+Math.min(counts.D,6)*.8)));
 const forwardCount=counts.C+counts.LW+counts.RW+counts.F;
 const offenseScore=Math.max(2,Math.min(10,Math.round(3+Math.min(forwardCount,12)*.55)));
 const depthScore=Math.max(2,Math.min(10,Math.round(5+(roster.length-avg)*.65)));
 const overall=Math.round((offenseScore+defenseScore+goalieScore+depthScore)/4*10)/10;
 const strengths=[],weaknesses=[];
 if(forwardCount>=10)strengths.push("Forward volume gives you several lineup options.");
 if(counts.D>=5)strengths.push("Defensive roster depth is a relative positive.");
 if(counts.G>=2&&counts.G<=3)strengths.push("Goalie count looks balanced for a typical roster.");
 if(rank<=Math.ceil(size/3))strengths.push("Your current league record is in the top third.");
 if(roster.length>=avg)strengths.push("Roster size is at or above the league average.");
 if(counts.G<2)weaknesses.push("Only "+counts.G+" goalie(s) imported; check whether your league format requires more coverage.");
 if(counts.D<4)weaknesses.push("Defence looks thin by roster count; consider adding a reliable D if your format rewards defenders.");
 if(forwardCount<8)weaknesses.push("Forward depth is limited by roster count.");
 if(rank>Math.ceil(size*2/3))weaknesses.push("Your current record is in the bottom third; prioritize consistent weekly contributors.");
 if(roster.length<avg)weaknesses.push("Your roster is smaller than the league average; verify that all roster slots imported.");
 if(!strengths.length)strengths.push("No major roster-count advantage stands out yet; use the category breakdown to target upgrades.");
 if(!weaknesses.length)weaknesses.push("No obvious structural weakness from roster counts. Player quality and category production still need a stats feed.");
 return {overall,rank,size,counts,offenseScore,defenseScore,goalieScore,depthScore,strengths,weaknesses,record:team.record||{},roster};
}
function recommendations(question,team,league,report){
 const q=question.toLowerCase(),roster=team.roster||[],names=roster.map(p=>p.name),mentioned=roster.find(p=>q.includes(p.name.toLowerCase()));
 const best=roster.slice().sort((a,b)=>posName(a.position)==="G"?1:-1),low=best[best.length-1];
 if(/drop|cut|waiv/.test(q)){
  if(mentioned)return "I would not recommend dropping "+mentioned.name+" from roster count alone. Check their recent fantasy production, injury status, role and available replacements first; those stats are not included in this ESPN import.";
  return "I can’t safely name a drop candidate from roster data alone. Review the lowest-producing healthy player who has a replaceable role, then compare them with the best available free agent. RinkIQ currently has your roster, but not ESPN free-agent availability or player-level fantasy totals.";
 }
 if(/trade|deal|sell|buy/.test(q)){
  if(mentioned)return "For "+mentioned.name+": consider trading only if you can turn a positional surplus into a clear upgrade at a weak spot. Your current structural gap is "+(report.counts.D<4?"defence depth":report.counts.G<2?"goalie coverage":"overall category/production data needs review")+". Check both sides’ rest-of-season production before accepting.";
  return "Use the Trade Analyzer to compare the players on both sides over the rest of the season. Based on your roster structure, target "+(report.counts.D<4?"a dependable defenceman":report.counts.G<2?"a goalie with a secure workload":"a high-impact player in a category where you trail")+". Don’t trade based on the 1–10 rating alone.";
 }
 if(/keep|hold/.test(q)&&mentioned)return "Keep "+mentioned.name+" for now unless their role, health or production has materially declined. This import does not include enough player-level performance data to justify selling them.";
 if(/strength|weak|rank|rating|score/.test(q))return "Your current structural rating is "+report.overall+"/10 (league record rank "+report.rank+" of "+report.size+"). Main strengths: "+report.strengths.join(" ")+" Main weaknesses: "+report.weaknesses.join(" ");
 return "My first recommendation: address "+(report.counts.D<4?"defence depth":report.counts.G<2?"goalie coverage":"the weakest fantasy category in your league standings")+". Tell me a player name or whether you’re considering a trade, drop, add or hold and I’ll narrow the advice. For precise player moves, connect player-level stats and waiver availability.";
}
function render(){
 const root=document.getElementById("teamEvaluationApp");if(!root||!currentLeague)return;
 root.innerHTML='<section class="team-eval"><div class="team-eval-head"><div><h3>Team evaluation</h3><p>Compare your roster structure and league position against every manager.</p></div><label>YOUR TEAM<select id="evalTeam">'+currentLeague.teams.map(t=>'<option value="'+esc(t.id)+'">'+esc(t.name)+'</option>').join("")+'</select></label></div><div id="evalReport"></div><div class="team-assistant"><div class="assistant-heading"><div><h3>RinkIQ team assistant</h3><p>Ask about trades, drops, adds, holds or how to improve your roster.</p></div><span>AI-style guidance</span></div><div id="assistantConversation" class="assistant-conversation"><div class="assistant-msg">I’ve imported your league. Ask me about a player or a roster move.</div></div><form id="teamAskForm" class="team-ask"><input id="teamAsk" placeholder="Should I trade, drop or keep a player?" autocomplete="off"><button type="submit">Ask RinkIQ ↗</button></form><small class="eval-disclaimer">Recommendations use imported roster and standings data. Player performance, injury, line-role and free-agent data are not yet connected to this assistant, so verify player-specific moves before acting.</small></div></section>';
 const select=document.getElementById("evalTeam");select.value=currentLeague.teams[0]?.id||"";
 select.addEventListener("change",update);
 document.getElementById("teamAskForm").addEventListener("submit",e=>{e.preventDefault();const input=document.getElementById("teamAsk"),q=input.value.trim();if(!q)return;const team=currentLeague.teams.find(t=>String(t.id)===String(select.value));const report=analyze(team,currentLeague),conversation=document.getElementById("assistantConversation");conversation.insertAdjacentHTML("beforeend",'<div class="user-msg">'+esc(q)+'</div><div class="assistant-msg">'+esc(recommendations(q,team,currentLeague,report))+'</div>');input.value="";conversation.scrollTop=conversation.scrollHeight;});
 update();
}
function update(){
 const team=currentLeague.teams.find(t=>String(t.id)===String(document.getElementById("evalTeam").value));if(!team)return;
 const r=analyze(team,currentLeague),bar=(label,value)=>'<div class="eval-score-row"><span>'+label+'</span><div class="eval-track"><i style="width:'+value*10+'%"></i></div><b>'+value.toFixed(1)+'/10</b></div>';
 document.getElementById("evalReport").innerHTML='<div class="eval-overview"><div class="eval-rating"><strong>'+r.overall.toFixed(1)+'</strong><span>/10</span><small>STRUCTURAL TEAM RATING</small></div><div class="eval-rank"><b>#'+r.rank+' <small>of '+r.size+'</small></b><span>League record rank</span><small>'+r.roster.length+' rostered players · league avg '+(currentLeague.teams.reduce((n,t)=>n+(t.roster||[]).length,0)/currentLeague.teams.length).toFixed(1)+'</small></div><div class="eval-bars">'+bar("Offence / forwards",r.offenseScore)+bar("Defence",r.defenseScore)+bar("Goaltending",r.goalieScore)+bar("Roster depth",r.depthScore)+'</div></div><div class="eval-grid"><article><h4>Strengths</h4>'+r.strengths.map(x=>'<p class="eval-positive">✓ '+esc(x)+'</p>').join("")+'</article><article><h4>Weaknesses & risks</h4>'+r.weaknesses.map(x=>'<p class="eval-risk">! '+esc(x)+'</p>').join("")+'</article></div><div class="eval-roster"><b>Roster composition</b><span>Forwards: '+(r.counts.C+r.counts.LW+r.counts.RW+r.counts.F)+' · Defence: '+r.counts.D+' · Goalies: '+r.counts.G+'</span></div><p class="eval-disclaimer">Important: this is a preliminary roster-structure rating, not a player-skill rating. ESPN roster import does not currently provide player fantasy totals, category production, line deployment or injury history here. Offensive/defensive scores reflect position depth, not proven player quality. Configure scoring and compare production in Trade Analyzer for deeper analysis.</p>';
}
window.RinkIQTeamEval=league=>{currentLeague=league;render();};
})();
