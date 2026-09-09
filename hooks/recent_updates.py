"""Build the homepage's recent-update list from published content."""

from datetime import date, datetime
from pathlib import Path
import re

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
                "url": f"{section}/{make_slug(title, '-')}/",
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
            })
    return updates


def on_config(config):
    updates = _blog_updates(Path(config.docs_dir)) + _index_updates(Path(config.docs_dir))
    updates.sort(key=lambda item: item["date"], reverse=True)
    config.extra["recent_updates"] = updates[:3]
    return config
