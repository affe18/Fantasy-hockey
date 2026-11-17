const NHL = "https://api-web.nhle.com/v1";
const ESPN = "https://site.api.espn.com/apis/site/v2/sports/hockey/nhl";

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "RinkIQ-Fantasy-Hockey/1.0",
      "Accept": "application/json"
    },
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error(`Upstream returned HTTP ${response.status}`);
  return response.json();
}

function articlesFrom(payload) {
  const items = Array.isArray(payload?.articles) ? payload.articles : [];
  return items.slice(0, 30).map(item => ({
    headline: item.headline || item.title || "Hockey news",
    description: item.description || item.summary || "",
    published: item.published || item.lastModified || "",
    url: item.links?.web?.href || item.link || "",
    source: "ESPN"
  }));
}

async function attempt(url) {
  try {
    return { ok: true, data: await fetchJson(url) };
  } catch (error) {
    return { ok: false, error: String(error.message || error).slice(0, 220) };
  }
}

async function handler(req, res, env) {
  res.setHeader("Cache-Control", "no-store, no-cache, max-age=0, must-revalidate");
  res.setHeader("CDN-Cache-Control", "no-store");
  res.setHeader("Vercel-CDN-Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const [leaderResult, scheduleResult, scoreResult, standingsResult, newsResult, injuryResult] = await Promise.all([
    attempt(NHL + "/skater-stats-leaders/current?categories=points&limit=100"),
    attempt(NHL + "/schedule/now"),
    attempt(NHL + "/score/now"),
    attempt(NHL + "/standings/now"),
    attempt(ESPN + "/news"),
    attempt(ESPN + "/injuries")
  ]);

  const leadersPayload = leaderResult.data || {};
  const leaders = Array.isArray(leadersPayload)
    ? leadersPayload
    : (leadersPayload.skaters || leadersPayload.data || []);
  const schedulePayload = scheduleResult.data || {};
  const scorePayload = scoreResult.data || {};
  const injuryPayload = injuryResult.data || {};
  const injuryItems = injuryPayload.items || injuryPayload.injuries || [];
  const news = articlesFrom(newsResult.data || {});

  const sourceStatus = {
    nhlStats: leaderResult.ok && leaders.length > 0,
    schedule: scheduleResult.ok,
    scores: scoreResult.ok,
    standings: standingsResult.ok,
    news: newsResult.ok && news.length > 0,
    injuries: injuryResult.ok && Array.isArray(injuryItems)
  };
  const errors = [
    ["NHL scoring leaders", leaderResult],
    ["NHL schedule", scheduleResult],
    ["NHL scores", scoreResult],
    ["NHL standings", standingsResult],
    ["ESPN news", newsResult],
    ["ESPN injuries", injuryResult]
  ].filter(([, result]) => !result.ok)
   .map(([source, result]) => ({ source, message: result.error }));

  const hasAnyData = Object.values(sourceStatus).some(Boolean);
  const payload = {
    updatedAt: new Date().toISOString(),
    fetchedOnPageRequest: true,
    sourceStatus,
    leaders: leaders.slice(0, 100),
    schedule: (schedulePayload.games || scorePayload.games || []).slice(0, 100),
    scores: (scorePayload.games || []).slice(0, 100),
    standings: (standingsPayload => standingsPayload.standings || [])(standingsResult.data || {}).slice(0, 100),
    news,
    injuries: Array.isArray(injuryItems) ? injuryItems.slice(0, 100) : [],
    errors
  };

  if (!hasAnyData) {
    return res.status(502).json({
      error: "All live data providers failed. Please retry shortly.",
      updatedAt: payload.updatedAt,
      sourceStatus,
      errors
    });
  }
  return res.status(200).json(payload);
};


// Cloudflare Pages adapter for the existing JSON endpoint.
export async function onRequest({ request, env }) {
  let body;
  if (request.method !== "GET" && request.method !== "HEAD") {
    const raw = await request.text();
    if (raw) {
      try { body = JSON.parse(raw); }
      catch { body = raw; }
    }
  }
  const headers = new Headers();
  let status = 200;
  const req = { method: request.method, body };
  const res = {
    setHeader(name, value) { headers.set(name, String(value)); },
    status(code) { status = code; return this; },
    json(payload) {
      headers.set("Content-Type", "application/json; charset=utf-8");
      return new Response(JSON.stringify(payload), { status, headers });
    }
  };
  try {
    const result = await handler(req, res, env);
    return result instanceof Response ? result : new Response(null, { status: 204, headers });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
    });
  }
}
