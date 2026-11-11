"""全站的内容索引：文章列表、年历、地平线、写作地点和片尾曲。"""

from datetime import date, datetime, timedelta
import math
from pathlib import Path
import re
import sys
from urllib.parse import unquote

sys.path.insert(0, str(Path(__file__).parent))
import songs as _songs  # noqa: E402

import yaml
from pymdownx.slugs import slugify


_FRONT_MATTER = re.compile(r"\A---\s*\n(.*?)\n---\s*\n", re.DOTALL)
_FIRST_HEADING = re.compile(r"^#\s+(.+?)\s*$", re.MULTILINE)
_BLOG_SECTIONS = {
    "monthly": "月记",
    "life": "生活",
}
_INDEX_SECTIONS = {
    "technology": "技术",
    "Share": "分享",
}


def _front_matter(path: Path):
    text = path.read_text(encoding="utf-8")
    match = _FRONT_MATTER.match(text)
    meta = yaml.safe_load(match.group(1)) if match else {}
    return meta or {}, text


def _excerpt(text):
    body = _FRONT_MATTER.sub("", text, count=1)
    for line in body.splitlines():
        line = line.strip()
        if not line or line[0] in "#!<>-|`[":
            continue
        line = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", line).replace("**", "").replace("*", "")
        return line[:72] + ("…" if len(line) > 72 else "")
    return ""


def _count(text):
    """返回（字数，阅读分钟）。中文按字、英文按词。"""
    body = _FRONT_MATTER.sub("", text, count=1)
    body = re.sub(r"```.*?```|`[^`]*`|<[^>]+>|!\[[^\]]*\]\([^)]*\)(\{[^}]*\})?", " ", body, flags=re.S)
    cjk = len(re.findall(r"[一-鿿㐀-䶿]", body))
    words = len(re.findall(r"[A-Za-z0-9]+", body))
    return cjk + words, max(1, round(cjk / 350 + words / 220))


def _as_date(value):
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        match = re.search(r"(\d{4})\D+(\d{1,2})\D+(\d{1,2})", value)
        if match:
            return date(*map(int, match.groups()))
    return None


def _blog_updates(docs_dir: Path):
    updates = []
    make_slug = slugify(case="lower")
    for section, label in _BLOG_SECTIONS.items():
        for path in (docs_dir / section / "posts").glob("*.md"):
            meta, text = _front_matter(path)
            published = _as_date(meta.get("date"))
            heading = _FIRST_HEADING.search(text)
            title = meta.get("title") or (heading.group(1).strip() if heading else path.stem)
            if not published or meta.get("draft") is True:
                continue
            words, minutes = _count(text)
            updates.append({
                "date": published,
                "label": label,
                "title": title,
                "url": f"{section}/{meta.get('slug') or make_slug(title, '-')}/",
                "section": section,
                "excerpt": _excerpt(text),
                "minutes": minutes,
                "words": words,
                "source": path,
            })
    return updates


def _index_updates(docs_dir: Path):
    updates = []
    for section, label in _INDEX_SECTIONS.items():
        index = docs_dir / section / "index.md"
        if not index.exists():
            continue
        meta, _ = _front_matter(index)
        for entry in meta.get("entries", []):
            published = _as_date(entry.get("date") or entry.get("label"))
            if not published:
                continue
            source = docs_dir / (unquote(entry["url"]).rstrip("/") + ".md")
            words, minutes = _count(source.read_text(encoding="utf-8")) if source.exists() else (0, None)
            updates.append({
                "date": published,
                "label": label,
                "title": entry["title"],
                "url": entry["url"],
                "section": section,
                "excerpt": entry.get("description", ""),
                "minutes": minutes,
                "words": words,
                "source": source if source.exists() else None,
            })
    return updates


_CN = "〇一二三四五六七八九"


def _cn_num(n):
    if n < 10:
        return _CN[n]
    tens, ones = divmod(n, 10)
    return ("" if tens == 1 else _CN[tens]) + "十" + (_CN[ones] if ones else "")


def _cn_date(d):
    return "".join(_CN[int(c)] for c in str(d.year)) + f"年{_cn_num(d.month)}月{_cn_num(d.day)}日"


def _place(places, day):
    """那一天我住在哪：places 里 since 不晚于当天的最后一项。"""
    current = None
    for place in places:
        if _as_date(place["since"]) <= day:
            current = place
    return current or (places[0] if places else None)


def _daylight(lat, day):
    """当地当天的昼长，写成「9 时 41 分」。"""
    n = day.timetuple().tm_yday
    decl = math.radians(23.44) * math.sin(2 * math.pi * (284 + n) / 365)
    phi = math.radians(lat)
    cos_h = (math.sin(math.radians(-0.833)) - math.sin(phi) * math.sin(decl)) / (math.cos(phi) * math.cos(decl))
    minutes = round(2 * math.degrees(math.acos(max(-1, min(1, cos_h)))) * 4)
    return f"{minutes // 60} 时 {minutes % 60:02d} 分"


_FIRST_IMAGE = re.compile(r"!\[[^\]]*\]\(([^)\s]+)\)")
_R0, _PER_YEAR = 250, 230  # 螺旋的起始半径，和每过一年向外走多远（像素）


def _thumb(docs_dir, item):
    """文章的第一张图，优先用 assets/images/thumbs/ 里的小图。"""
    source = item.get("source")
    match = _FIRST_IMAGE.search(source.read_text(encoding="utf-8")) if source else None
    if not match:
        return None
    image = (source.parent / match.group(1)).resolve()
    small = docs_dir / "assets" / "images" / "thumbs" / (image.stem + ".jpg")
    chosen = small if small.exists() else image
    return chosen.relative_to(docs_dir.resolve()).as_posix() if chosen.exists() else None


def _space(updates, docs_dir):
    """首页的空间：时间从原点沿螺旋向外走，一年转一圈，一月在正上方。

    所以同一个月份总在同一个方向，越新的文章离原点越远。
    返回螺旋线的路径和每年的起点；每篇文章得到坐标 x、y。
    """
    start = date(min(item["date"] for item in updates).year, 1, 1)

    def point(day, nudge=0):
        years = (day - start).days / 365.25
        angle = 2 * math.pi * (years % 1)
        radius = _R0 + _PER_YEAR * years + nudge
        return radius * math.sin(angle), -radius * math.cos(angle)

    nodes = []
    for item in sorted(updates, key=lambda i: i["date"]):
        item["thumb"] = _thumb(docs_dir, item) if item["section"] == "life" else None
        x, y = point(item["date"])
        width = min(230, 22 + sum(17 if ord(c) > 255 else 9.5 for c in item["title"]))
        height = (116 if item["thumb"] else 0) + (30 if width < 230 else 54)
        if item["thumb"]:
            width = max(width, 112)
        if item.get("songs"):
            width += 34
        nodes.append({"item": item, "x": x, "y": y, "w": width + 34, "h": height + 20})
    # 挤在一起的标签互相推开一点，直到不重叠
    for _ in range(800):
        moved = False
        for i, a in enumerate(nodes):
            for b in nodes[i + 1:]:
                dx = (a["x"] + a["w"] / 2) - (b["x"] + b["w"] / 2)
                dy = (a["y"] + a["h"] / 2) - (b["y"] + b["h"] / 2)
                overlap_x = (a["w"] + b["w"]) / 2 - abs(dx)
                overlap_y = (a["h"] + b["h"]) / 2 - abs(dy)
                if overlap_x <= 0 or overlap_y <= 0:
                    continue
                moved = True
                if overlap_x < overlap_y:
                    shift = overlap_x / 2 * (1 if dx >= 0 else -1)
                    a["x"] += shift
                    b["x"] -= shift
                else:
                    shift = overlap_y / 2 * (1 if dy >= 0 else -1)
                    a["y"] += shift
                    b["y"] -= shift
        if not moved:
            break
    for node in nodes:
        node["item"]["x"], node["item"]["y"] = round(node["x"]), round(node["y"])

    last = max(date.today(), max(item["date"] for item in updates))
    days = (last - start).days + 4
    path = " ".join("{:.0f},{:.0f}".format(*point(start + timedelta(days=d))) for d in range(0, days, 4))
    years = [{"year": year, "y": round(point(date(year, 1, 1))[1])} for year in range(start.year, last.year + 1)]
    reach = _R0 + _PER_YEAR * (days + 45) / 365.25
    return {"path": path, "years": years, "reach": round(reach), "inner": _R0}


_SONG_EMBED = re.compile(r"(?:<p>\s*)?(<iframe[^>]+(?:open\.spotify\.com|embed\.music\.apple\.com)[^>]*></iframe>)(?:\s*</p>)?")


def on_page_content(html, page, config, files):
    """文章里的歌统一包成「片尾曲」。"""
    return _SONG_EMBED.sub(r'<figure class="outro"><figcaption>片尾曲</figcaption>\1</figure>', html)


def on_page_context(context, page, config, nav):
    items = config.extra.get("_updates", [])
    url = unquote(page.url)
    for i, item in enumerate(items):
        if unquote(item["url"]) == url:
            page.meta["_date_zh"] = _cn_date(item["date"])
            page.meta["_entry"] = item
            page.meta["_newer"] = items[i - 1] if i > 0 else None
            page.meta["_older"] = items[i + 1] if i + 1 < len(items) else None
            break
    return context


def on_env(env, config, files):
    env.filters["sin_deg"] = lambda value: math.sin(math.radians(value))
    env.filters["cos_deg"] = lambda value: math.cos(math.radians(value))
    return env


def on_config(config):
    updates = _blog_updates(Path(config.docs_dir)) + _index_updates(Path(config.docs_dir))
    updates.sort(key=lambda item: item["date"], reverse=True)
    config.extra["recent_updates"] = updates[:3]
    config.extra["_updates"] = updates
    places = config.extra.get("places", [])
    for item in updates:
        place = _place(places, item["date"])
        if place:
            item["place"] = place["name"]
            item["daylight"] = _daylight(place["lat"], item["date"])
    config.extra["space"] = _space(updates, Path(config.docs_dir))
    config.extra["songs"] = _songs.collect(Path(config.docs_dir), updates)
    config.extra["here"] = places[-1] if places else None
    now_page = Path(config.docs_dir) / "now.md"
    config.extra["now"] = _front_matter(now_page)[0] if now_page.exists() else {}
    config.extra["stats"] = {
        "posts": len(updates),
        "words": sum(item["words"] for item in updates),
        "songs": len(config.extra["songs"]),
    }
    for item in updates:
        item["year"] = item["date"].year
        item["year_zh"] = "".join(_CN[int(c)] for c in str(item["year"]))
        item["day_zh"] = f"{_cn_num(item['date'].month)}月{_cn_num(item['date'].day)}日"
    years = {}
    for item in updates:
        years.setdefault(item["date"].year, {}).setdefault(item["date"].month, []).append(item)
    config.extra["almanac"] = [
        {
            "year": year,
            "months": [
                {"month": m, "entries": sorted(years[year].get(m, []), key=lambda i: i["date"])}
                for m in range(1, 13)
            ],
        }
        for year in sorted(years, reverse=True)
    ]
    return config
