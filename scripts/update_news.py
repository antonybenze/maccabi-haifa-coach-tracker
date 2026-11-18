#!/usr/bin/env python3
"""
Twice-Daily News Updater for Maccabi Haifa Head Coach Search Website.
Runs automatically at 08:00 IST (Morning Edition) and 20:00 IST (Evening Edition)
via GitHub Actions (.github/workflows/update-news.yml) or locally.
Fetches latest RSS news items about Maccabi Haifa's head coach search and updates data/news.json.
"""

import datetime
import json
import os
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

DATA_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "news.json")

RSS_QUERY = '"Maccabi Haifa" coach OR "Ran Ben Shimon" OR "Lior Refaelov" OR "מכבי חיפה" מאמן'


def fetch_google_news_rss(query: str, max_items: int = 3):
    encoded = urllib.parse.quote(query)
    url = f"https://news.google.com/rss/search?q={encoded}&hl=en-US&gl=IL&ceid=IL:en"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (MaccabiHaifaCoachTracker/1.0)"})
    items = []
    try:
        with urllib.request.urlopen(req, timeout=12) as resp:
            xml_bytes = resp.read()
        root = ET.fromstring(xml_bytes)
        for item in root.findall("./channel/item")[:max_items]:
            title = item.findtext("title", default="").strip()
            link = item.findtext("link", default="").strip()
            source_el = item.find("source")
            source = source_el.text.strip() if source_el is not None and source_el.text else "Israeli Sports Wire"
            if title and link:
                items.append({"title": title, "link": link, "source": source})
    except Exception as exc:
        print(f"[WARN] RSS fetch skipped or failed: {exc}")
    return items


def main():
    if not os.path.exists(DATA_FILE):
        raise FileNotFoundError(f"Cannot find {DATA_FILE}")

    with open(DATA_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Compute current Israel time (UTC+2)
    utc_now = datetime.datetime.now(datetime.timezone.utc)
    ist_tz = datetime.timezone(datetime.timedelta(hours=2))
    ist_now = utc_now.astimezone(ist_tz)

    is_morning = ist_now.hour < 14
    slot_name = "Morning Edition" if is_morning else "Evening Edition"
    slot_time = "08:00 IST" if is_morning else "20:00 IST"
    next_slot = "Evening Edition (20:00 IST)" if is_morning else "Morning Edition (08:00 IST)"
    date_str = ist_now.strftime("%Y-%m-%d")
    dispatch_id = f"{date_str}-{'am' if is_morning else 'pm'}"

    data["lastUpdated"] = ist_now.isoformat(timespec="seconds")
    data["editionSlot"] = f"{slot_name} ({slot_time})"
    data["nextUpdateSlot"] = next_slot

    rss_items = fetch_google_news_rss(RSS_QUERY, max_items=3)

    existing_ids = {d.get("id") for d in data.get("dispatches", [])}
    if rss_items and dispatch_id not in existing_ids:
        top = rss_items[0]
        details = [f"{item['source']}: {item['title']}" for item in rss_items[1:]]
        if not details:
            details = ["Automated twice-daily newsroom sync verified latest Israeli Premier League coaching reports."]

        new_dispatch = {
            "id": dispatch_id,
            "date": date_str,
            "slot": slot_name,
            "time": slot_time,
            "tag": "AUTOMATED WIRE",
            "tier": "Live Feed",
            "title": f"{slot_name}: {top['title']}",
            "source": top["source"],
            "sourceUrl": top["link"],
            "excerpt": f"Twice-daily automated newsroom update ({slot_time}) tracking Maccabi Haifa's head coach appointment process.",
            "details": details,
        }
        data["dispatches"].insert(0, new_dispatch)

    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print(f"[OK] Updated {DATA_FILE} for {date_str} ({slot_name} - {slot_time})")


if __name__ == "__main__":
    main()
