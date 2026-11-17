const BASE = "https://lm-api-reads.fantasy.espn.com/apis/v3/games";
module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, max-age=0");
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({error:"Use POST"}); }
  try {
    const b = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const rawLeague = String(b.leagueId || "").trim();
    let id = rawLeague;
    if (!/^\\d{1,12}$/.test(id)) {
      try {
        const parsed = new URL(rawLeague.startsWith("http") ? rawLeague : "https://" + rawLeague);
        id = parsed.searchParams.get("leagueId") || parsed.searchParams.get("leagueid") || "";
        if (!id) {
          const match = parsed.pathname.match(/\\/league\\/(\\d{1,12})(?:\\/|$)/i);
          if (match) id = match[1];
        }
      } catch (_) {}
    }
    const season = Number(b.season || new Date().getFullYear());
    if (!/^\\d{1,12}$/.test(id)) return res.status(400).json({error:"Paste your ESPN league or team page URL, or enter the league ID. The URL must contain a leagueId value."});
    if (!Number.isInteger(season) || season < 2010 || season > new Date().getFullYear()+1) return res.status(400).json({error:"Invalid season year."});
    if (b.sport && b.sport !== "fhl") return res.status(400).json({error:"Only ESPN Fantasy Hockey is supported currently."});
    const s2=String(b.espnS2||"").trim(), swid=String(b.swid||"").trim();
    if (!!s2 !== !!swid) return res.status(400).json({error:"Private leagues require both ESPN cookies, or leave both blank for a public league."});
    if (s2.length>5000 || swid.length>100) return res.status(400).json({error:"Cookie values are invalid."});
    const url=new URL(BASE+"/fhl/seasons/"+season+"/segments/0/leagues/"+id);
    ["mSettings","mTeam","mRoster","mMatchup","mMatchupScore","mStandings","mSchedule","mStatus"].forEach(v=>url.searchParams.append("view",v));
    const headers={Accept:"application/json","User-Agent":"Mozilla/5.0 RinkIQ league importer"};
    if(s2) headers.Cookie="espn_s2="+s2+"; SWID="+swid;
    const upstream=await fetch(url,{headers,signal:AbortSignal.timeout(20000)});
    const raw=await upstream.text();
    if(upstream.status===401||upstream.status===403) return res.status(401).json({error:"ESPN denied access. The league may be private, or the session cookies may be invalid/expired."});
    if(upstream.status===404) return res.status(404).json({error:"League not found for that season. Check the league ID and season."});
    if(!upstream.ok) return res.status(502).json({error:"ESPN returned HTTP "+upstream.status+"."});
    let d; try { d=JSON.parse(raw); } catch { return res.status(502).json({error:"ESPN did not return JSON; its API may have changed."}); }
    if(!Array.isArray(d.teams)||!d.teams.length) return res.status(422).json({error:"No teams returned. Check league ID, season and access."});
    const members=new Map((d.members||[]).map(m=>[m.id,m]));
    const teams=d.teams.map(t=>({id:t.id,name:t.name||t.location||("Team "+t.id),abbrev:t.abbrev||"",owners:(t.owners||[]).map(x=>members.get(x)?.displayName||members.get(x)?.firstName||"League member"),record:t.record?.overall||{},roster:(t.roster?.entries||[]).map(e=>{const ppe=e.playerPoolEntry||{},p=ppe.player||e.player||{},stats=ppe.stats||p.stats||[];const actual=Array.isArray(stats)?stats.filter(x=>Number(x.statSourceId??x.statTypeId??0)===0&&Number(x.statSplitTypeId??0)===0).sort((a,b)=>Number(b.seasonId||0)-Number(a.seasonId||0))[0]:null;const statPoints=actual?.appliedTotal??actual?.totalPoints??null;const points=ppe.totalPoints??statPoints??ppe.appliedStatTotal??p.totalPoints??null;return {id:p.id,name:[p.firstName,p.lastName].filter(Boolean).join(" ")||p.fullName||"Unknown player",position:String(p.defaultPositionId||""),proTeamId:p.proTeamId||null,injuryStatus:p.injuryStatus||"",lineupSlotId:e.lineupSlotId??null,fantasyPoints:points!=null&&Number.isFinite(Number(points))?Number(points):null,fantasyPointsSource:ppe.totalPoints!=null?"ESPN season total":statPoints!=null?"ESPN actual season stat line":ppe.appliedStatTotal!=null?"ESPN applied total":"unavailable"};}})));
    const settings=d.settings||{}, scoring=(settings.scoringSettings?.scoringItems||[]).map(x=>({statId:x.statId,points:Number(x.points),label:x.name||x.abbrev||("Stat "+x.statId)}));
    const matchups=(d.schedule||[]).map(m=>({week:m.matchupPeriodId,homeTeamId:m.home?.teamId,awayTeamId:m.away?.teamId,homeScore:m.home?.totalPoints,awayScore:m.away?.totalPoints}));
    return res.status(200).json({provider:"ESPN Fantasy",leagueId:id,season,leagueName:settings.name||d.name||("ESPN League "+id),size:teams.length,teams,scoring,rosterSlots:settings.rosterSettings?.lineupSlotCounts||{},matchups,importedAt:new Date().toISOString(),access:s2?"private authenticated":"public league",notice:"Read-only import. ESPN's API is undocumented and may change."});
  } catch(e) { return res.status(502).json({error:e.name==="TimeoutError"?"ESPN timed out. Try again.":(e.message||"Unable to import ESPN league.")}); }
};