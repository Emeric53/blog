"""Build the homepage's recent-update list from published content."""

from datetime import date, datetime
from pathlib import Path
import re
from urllib.parse import unquote

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


def _minutes(text):
    body = _FRONT_MATTER.sub("", text, count=1)
    body = re.sub(r"```.*?```|`[^`]*`|<[^>]+>", " ", body, flags=re.S)
    cjk = len(re.findall(r"[一-鿿㐀-䶿]", body))
    words = len(re.findall(r"[A-Za-z0-9]+", body))
    return max(1, round(cjk / 350 + words / 220))


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
            updates.append({
                "date": published,
                "label": label,
                "title": title,
                "url": f"{section}/{meta.get('slug') or make_slug(title, '-')}/",
                "section": section,
                "excerpt": _excerpt(text),
                "minutes": _minutes(text),
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
            updates.append({
                "date": published,
                "label": label,
                "title": entry["title"],
                "url": entry["url"],
                "section": section,
                "excerpt": entry.get("description", ""),
                "minutes": None,
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


def on_page_context(context, page, config, nav):
    items = config.extra.get("_updates", [])
    url = unquote(page.url)
    for i, item in enumerate(items):
        if unquote(item["url"]) == url:
            page.meta["_date_zh"] = _cn_date(item["date"])
            page.meta["_newer"] = items[i - 1] if i > 0 else None
            page.meta["_older"] = items[i + 1] if i + 1 < len(items) else None
            break
    return context


def on_config(config):
    updates = _blog_updates(Path(config.docs_dir)) + _index_updates(Path(config.docs_dir))
    updates.sort(key=lambda item: item["date"], reverse=True)
    config.extra["recent_updates"] = updates[:3]
    config.extra["_updates"] = updates
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
