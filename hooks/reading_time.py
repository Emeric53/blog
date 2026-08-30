"""MkDocs 构建钩子：阅读信息 + 自动评论开关。

对"文章型"页面（非首页、非各级 index）做三件事：
1. 统计字数（中文按单字、英文按词），估算阅读时长。
2. 在第一个 <h1> 之后注入一行 meta 横条，并预留不蒜子/Vercount 的单页 PV 占位。
3. 自动把 page.meta['comments'] 置为 True，让 overrides/partials/comments.html 渲染评论区。

逐页可用 front matter 覆盖：
  comments: false        # 关闭该页评论
  hide_reading_time: true  # 关闭该页阅读信息横条
"""

import re

# 中文阅读速度（字/分钟）与英文阅读速度（词/分钟）
CJK_PER_MIN = 350
WORD_PER_MIN = 220

_CJK_RE = re.compile(r"[一-鿿㐀-䶿]")
_WORD_RE = re.compile(r"[A-Za-z0-9]+")
# 粗略剥离代码块、行内代码、HTML 标签，避免把代码计入字数
_FENCE_RE = re.compile(r"```.*?```", re.DOTALL)
_INLINE_CODE_RE = re.compile(r"`[^`]*`")
_HTML_TAG_RE = re.compile(r"<[^>]+>")


def _is_article(page) -> bool:
    """首页、任何 index.md，以及 blog 自动生成的归档/分类页都不算文章。"""
    if page.is_homepage:
        return False
    src = (page.file.src_uri or "").lower()
    if src.endswith("index.md"):
        return False
    # blog 插件生成的归档/分类/分页等虚拟页面
    if "/archive/" in src or "/category/" in src:
        return False
    return True


def _count(markdown: str):
    text = _FENCE_RE.sub(" ", markdown)
    text = _INLINE_CODE_RE.sub(" ", text)
    text = _HTML_TAG_RE.sub(" ", text)
    cjk = len(_CJK_RE.findall(text))
    words = len(_WORD_RE.findall(text))
    total = cjk + words
    minutes = cjk / CJK_PER_MIN + words / WORD_PER_MIN
    return total, max(1, round(minutes))


def on_page_markdown(markdown, page, config, files):
    """在 Markdown 阶段统计字数，存到 page.meta 供后续注入使用。"""
    if not _is_article(page):
        return markdown
    if page.meta.get("hide_reading_time"):
        return markdown
    total, minutes = _count(markdown)
    page.meta["_word_count"] = total
    page.meta["_read_minutes"] = minutes
    return markdown


def on_page_content(html, page, config, files):
    if not _is_article(page):
        return html

    # 默认给文章型页面开启评论（除非显式关闭）
    if "comments" not in page.meta:
        page.meta["comments"] = True

    if page.meta.get("hide_reading_time"):
        return html

    total = page.meta.get("_word_count")
    minutes = page.meta.get("_read_minutes")
    if not total:
        return html

    banner = (
        '<div class="reading-meta">'
        f'<span class="reading-meta__item">📝 {total} 字</span>'
        f'<span class="reading-meta__item">⏱ 约 {minutes} 分钟</span>'
        "</div>"
    )

    # 注入到第一个 </h1> 之后；若页面没有 h1 则放到最前面
    if "</h1>" in html:
        return html.replace("</h1>", "</h1>\n" + banner, 1)
    return banner + html
