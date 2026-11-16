#!/usr/bin/env python3
"""Fetch public NHL stats/schedule/score data and ESPN hockey news/injuries."""
import json, os, time, urllib.request, urllib.error
from datetime import datetime, timezone

OUT = "data/nhl-data.json"
HEADERS = {"User-Agent": "RinkIQ-Fantasy-Hockey/1.0 (+https://github.com/affe18/Fantasy-hockey)", "Accept": "application/json"}

def get_json(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=20) as response:
        return json.loads(response.read().decode("utf-8"))

def get_or_empty(url, errors, key):
    for attempt in range(3):
        try:
            return get_json(url)
        except Exception as exc:
            if attempt == 2:
                errors.append({"source": key, "message": str(exc)[:240]})
            else:
                time.sleep(2 * (attempt + 1))
    return {}

def articles_from(payload):
    items = payload.get("articles", []) if isinstance(payload, dict) else []
    out = []
    for item in items[:30]:
        if not isinstance(item, dict): continue
        links = item.get("links") or {}
        web = links.get("web") or {}
        out.append({
            "headline": item.get("headline") or item.get("title") or "Hockey news",
            "description": item.get("description") or item.get("summary") or "",
            "published": item.get("published") or item.get("lastModified") or "",
            "url": web.get("href") or item.get("link") or "",
            "source": "ESPN"
        })
    return out

def main():
    errors = []
    nhl = "https://api-web.nhle.com/v1"
    espn = "https://site.api.espn.com/apis/site/v2/sports/hockey/nhl"
    leaders = get_or_empty(nhl + "/skater-stats-leaders/current?categories=points&limit=100", errors, "NHL scoring leaders")
    schedule = get_or_empty(nhl + "/schedule/now", errors, "NHL schedule")
    scores = get_or_empty(nhl + "/score/now", errors, "NHL scores")
    standings = get_or_empty(nhl + "/standings/now", errors, "NHL standings")
    news = get_or_empty(espn + "/news", errors, "ESPN news")
    injuries = get_or_empty(espn + "/injuries", errors, "ESPN injuries")

    players = leaders if isinstance(leaders, list) else leaders.get("skaters", leaders.get("data", []))
    if not isinstance(players, list): players = []
    games = schedule.get("games", []) if isinstance(schedule, dict) else []
    if not games and isinstance(scores, dict): games = scores.get("games", [])
    injury_items = injuries.get("items", injuries.get("injuries", [])) if isinstance(injuries, dict) else []
    payload = {
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "season": "current",
        "sourceStatus": {
            "nhlStats": bool(players),
            "schedule": bool(schedule),
            "scores": bool(scores),
            "news": bool(articles_from(news)),
            "injuries": bool(injury_items)
        },
        "leaders": players[:100],
        "schedule": games[:100],
        "scores": scores.get("games", []) if isinstance(scores, dict) else [],
        "standings": standings.get("standings", []) if isinstance(standings, dict) else [],
        "news": articles_from(news),
        "injuries": injury_items[:100] if isinstance(injury_items, list) else [],
        "errors": errors
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print("Wrote", OUT, "| leaders:", len(payload["leaders"]), "| games:", len(payload["schedule"]), "| news:", len(payload["news"]), "| injuries:", len(payload["injuries"]))
    if not any(payload["sourceStatus"].values()):
        raise SystemExit("All data sources failed; refusing to publish an empty snapshot.")

if __name__ == "__main__":
    main()
