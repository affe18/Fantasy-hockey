const BASE = "https://lm-api-reads.fantasy.espn.com/apis/v3/games";

const asArray = (value) => Array.isArray(value) ? value : [];
const asObject = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};
const finiteNumber = (value) => value == null || value === "" || !Number.isFinite(Number(value)) ? null : Number(value);

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, max-age=0");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : asObject(req.body);
    const rawLeague = String(body.leagueId || "").trim();
    let leagueId = "";

    if (/^\d{1,12}$/.test(rawLeague)) {
      leagueId = rawLeague;
    } else {
      const decoded = (() => {
        try { return decodeURIComponent(rawLeague); } catch (_) { return rawLeague; }
      })();
      const queryMatch = decoded.match(/[?&]leagueId\s*=\s*["']?(\d{1,12})/i)
        || decoded.match(/\bleagueId\s*[:=]\s*["']?(\d{1,12})/i);
      const pathMatch = decoded.match(/\/league\/(\d{1,12})(?:[/?#]|$)/i);
      const hockeyPathMatch = decoded.match(/\/(?:hockey|fantasy)\/(?:league|team)\/(\d{1,12})(?:[/?#]|$)/i);
      leagueId = (queryMatch && queryMatch[1]) || (pathMatch && pathMatch[1]) || (hockeyPathMatch && hockeyPathMatch[1]) || "";
    }

    const now = new Date();
    const defaultSeason = now.getUTCMonth() >= 6 ? now.getUTCFullYear() + 1 : now.getUTCFullYear();
    const season = Number(body.season || defaultSeason);

    if (!/^\d{1,12}$/.test(leagueId)) {
      return res.status(400).json({ error: "Paste your ESPN league URL or enter its numeric league ID." });
    }
    if (!Number.isInteger(season) || season < 2010 || season > new Date().getFullYear() + 1) {
      return res.status(400).json({ error: "Invalid season year." });
    }
    if (body.sport && body.sport !== "fhl") {
      return res.status(400).json({ error: "Only ESPN Fantasy Hockey is supported currently." });
    }

    const espnS2 = String(body.espnS2 || "").trim();
    const swid = String(body.swid || "").trim();
    if (!!espnS2 !== !!swid) {
      return res.status(400).json({ error: "Private leagues require both ESPN cookies, or leave both blank for a public league." });
    }
    if (espnS2.length > 5000 || swid.length > 100) {
      return res.status(400).json({ error: "Cookie values are invalid." });
    }

    const url = new URL(BASE + "/fhl/seasons/" + season + "/segments/0/leagues/" + leagueId);
    ["mSettings", "mTeam", "mRoster", "mMatchup", "mMatchupScore", "mStandings", "mSchedule", "mStatus"]
      .forEach((view) => url.searchParams.append("view", view));

    const headers = { Accept: "application/json", "User-Agent": "Mozilla/5.0 RinkIQ league importer" };
    if (espnS2) headers.Cookie = "espn_s2=" + espnS2 + "; SWID=" + swid;

    const upstream = await fetch(url, { headers, signal: AbortSignal.timeout(20000) });
    const raw = await upstream.text();

    if (upstream.status === 401 || upstream.status === 403) {
      return res.status(401).json({ error: "ESPN says this league is not publicly viewable. Ask your league manager to enable public viewability, then try again." });
    }
    if (upstream.status === 404) {
      return res.status(404).json({ error: "League not found for that season. Check the league ID and season." });
    }
    if (!upstream.ok) {
      return res.status(502).json({ error: "ESPN returned HTTP " + upstream.status + "." });
    }

    let data;
    try { data = JSON.parse(raw); } catch (_) {
      return res.status(502).json({ error: "ESPN did not return JSON; its API may have changed." });
    }

    const espnTeams = asArray(data.teams);
    if (!espnTeams.length) {
      return res.status(422).json({ error: "ESPN returned no teams. Check the league ID, season and public access." });
    }

    const members = new Map(asArray(data.members).map((member) => {
      const item = asObject(member);
      return [item.id, item];
    }));

    const teams = espnTeams.map((rawTeam) => {
      const team = asObject(rawTeam);
      const owners = asArray(team.owners).map((owner) => {
        const ownerId = typeof owner === "string" ? owner : asObject(owner).id;
        const member = members.get(ownerId);
        return member ? (member.displayName || member.firstName || "League member") : "League member";
      });

      const roster = asArray(asObject(team.roster).entries).map((rawEntry) => {
        const entry = asObject(rawEntry);
        const playerPoolEntry = asObject(entry.playerPoolEntry);
        const player = asObject(playerPoolEntry.player || entry.player);
        const stats = asArray(playerPoolEntry.stats || player.stats);
        const actualStats = stats
          .filter((stat) => {
            const item = asObject(stat);
            return Number(item.statSourceId ?? item.statTypeId ?? 0) === 0
              && Number(item.statSplitTypeId ?? 0) === 0;
          })
          .sort((a, b) => Number(asObject(b).seasonId || 0) - Number(asObject(a).seasonId || 0));
        const actual = asObject(actualStats[0]);
        const statPoints = actual.appliedTotal ?? actual.totalPoints;
        const points = playerPoolEntry.totalPoints ?? statPoints ?? playerPoolEntry.appliedStatTotal ?? player.totalPoints;
        const firstName = typeof player.firstName === "string" ? player.firstName : "";
        const lastName = typeof player.lastName === "string" ? player.lastName : "";

        return {
          id: player.id ?? null,
          name: [firstName, lastName].filter(Boolean).join(" ") || player.fullName || "Unknown player",
          position: String(player.defaultPositionId || ""),
          eligibleSlotIds: asArray(player.eligibleSlots).map((slot) => String(slot)),
          proTeamId: player.proTeamId || null,
          injuryStatus: player.injuryStatus || "",
          lineupSlotId: entry.lineupSlotId ?? null,
          fantasyPoints: finiteNumber(points),
          fantasyPointsSource: playerPoolEntry.totalPoints != null ? "ESPN season total"
            : statPoints != null ? "ESPN actual season stat line"
            : playerPoolEntry.appliedStatTotal != null ? "ESPN applied total" : "unavailable"
        };
      });

      return {
        id: team.id ?? null,
        name: team.name || team.location || ("Team " + (team.id ?? "")),
        abbrev: team.abbrev || "",
        owners,
        record: asObject(asObject(team.record).overall),
        roster
      };
    });

    const settings = asObject(data.settings);
    const scoringItems = asArray(asObject(settings.scoringSettings).scoringItems);
    const scoring = scoringItems.map((rawItem) => {
      const item = asObject(rawItem);
      return {
        statId: item.statId ?? null,
        points: finiteNumber(item.points),
        label: item.name || item.abbrev || ("Stat " + (item.statId ?? ""))
      };
    });
    const matchups = asArray(data.schedule).map((rawMatchup) => {
      const matchup = asObject(rawMatchup);
      const home = asObject(matchup.home);
      const away = asObject(matchup.away);
      return {
        week: matchup.matchupPeriodId ?? null,
        homeTeamId: home.teamId ?? null,
        awayTeamId: away.teamId ?? null,
        homeScore: finiteNumber(home.totalPoints),
        awayScore: finiteNumber(away.totalPoints)
      };
    });

    return res.status(200).json({
      provider: "ESPN Fantasy",
      leagueId,
      season,
      leagueName: settings.name || data.name || ("ESPN League " + leagueId),
      size: teams.length,
      teams,
      scoring,
      rosterSlots: asObject(asObject(settings.rosterSettings).lineupSlotCounts),
      matchups,
      importedAt: new Date().toISOString(),
      access: espnS2 ? "private authenticated" : "public league",
      notice: "Read-only import. ESPN's API is undocumented and may change."
    });
  } catch (error) {
    const message = error && error.name === "TimeoutError" ? "ESPN timed out. Try again."
      : (error && typeof error.message === "string" ? error.message : "Unable to import ESPN league.");
    return res.status(502).json({ error: message });
  }
};
