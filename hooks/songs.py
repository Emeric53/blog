"""片尾曲：收集文章里嵌入的 Spotify / Apple Music 歌曲。

歌名、歌手和封面只在第一次遇到某首歌时联网查询，结果存进 data/songs.json
并随仓库提交，所以平时构建（包括 CI）不需要联网。
"""

import json
import re
import ssl
import urllib.request
from pathlib import Path

try:
    import certifi
    _TLS = ssl.create_default_context(cafile=certifi.where())
except ImportError:
    _TLS = ssl.create_default_context()

_EMBED = re.compile(
    r"<iframe[^>]+src=\"https://(?:open\.spotify\.com/embed/(track|album)/([A-Za-z0-9]+)"
    r"|embed\.music\.apple\.com/([a-z]{2})/(album|song)/(?:[^/\"?]+/)?(\d+))[^\"]*\"[^>]*></iframe>"
)
_NEXT_DATA = re.compile(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', re.S)


def _get(url):
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=12, context=_TLS) as response:
        return response.read().decode("utf-8")


def _spotify(kind, ident):
    entity = json.loads(_NEXT_DATA.search(_get(f"https://open.spotify.com/embed/{kind}/{ident}")).group(1))
    entity = entity["props"]["pageProps"]["state"]["data"]["entity"]
    cover = json.loads(_get(f"https://open.spotify.com/oembed?url=https://open.spotify.com/{kind}/{ident}"))
    tint = (entity.get("visualIdentity") or {}).get("backgroundBase") or {}
    first = entity if kind == "track" else (entity.get("trackList") or [{}])[0]
    return {
        "title": entity.get("name") or entity.get("title"),
        "artist": "、".join(a["name"] for a in entity.get("artists", [])) or entity.get("subtitle", ""),
        "cover": cover.get("thumbnail_url", ""),
        "seconds": round(entity.get("duration", 0) / 1000) if kind == "track" else 0,
        "tint": "#{red:02x}{green:02x}{blue:02x}".format(**tint) if tint else "",
        "link": f"https://open.spotify.com/{kind}/{ident}",
        "preview": (first.get("audioPreview") or {}).get("url", ""),
    }


def _apple(country, ident):
    results = json.loads(_get(f"https://itunes.apple.com/lookup?id={ident}&country={country}&entity=song&limit=1"))["results"]
    result = results[0]
    return {
        "title": result.get("trackName") or result.get("collectionName"),
        "artist": result.get("artistName", ""),
        "cover": result.get("artworkUrl100", "").replace("100x100", "300x300"),
        "seconds": round(result.get("trackTimeMillis", 0) / 1000) if result.get("trackName") else 0,
        "tint": "",
        "link": result.get("trackViewUrl") or result.get("collectionViewUrl", ""),
        "preview": next((r["previewUrl"] for r in results if r.get("previewUrl")), ""),
    }


def collect(docs_dir: Path, updates):
    """给每篇带歌的文章配上歌曲信息；返回按时间倒序的曲目单。"""
    cache_path = docs_dir.parent / "data" / "songs.json"
    cache = json.loads(cache_path.read_text(encoding="utf-8")) if cache_path.exists() else {}
    changed = False
    songs = []
    for item in updates:
        source = item.get("source")
        if not source:
            continue
        for match in _EMBED.finditer(source.read_text(encoding="utf-8")):
            if match.group(1):
                kind, key = match.group(1), f"spotify:{match.group(1)}:{match.group(2)}"
            else:
                kind, key = match.group(4), f"apple:{match.group(3)}:{match.group(5)}"
            if key not in cache:
                try:
                    cache[key] = _spotify(kind, match.group(2)) if match.group(1) else _apple(match.group(3), match.group(5))
                    changed = True
                except Exception as error:  # 断网时跳过，下次构建再补
                    print(f"songs: 暂时查不到 {key}（{error}）")
                    continue
            song = dict(cache[key], kind="专辑" if kind == "album" else "单曲", post=item)
            if song["seconds"]:
                song["length"] = "{}:{:02d}".format(*divmod(song["seconds"], 60))
            songs.append(song)
            item.setdefault("songs", []).append(song)
    if changed:
        cache_path.parent.mkdir(exist_ok=True)
        cache_path.write_text(json.dumps(cache, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return songs
