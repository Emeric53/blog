# Nullspace

梁梦磊的个人博客：生活、阅读、技术，以及一些尚未成为结论的东西。

## 本地预览

```bash
pixi run start
```

## 构建

```bash
pixi run build
```

推送到 `main` 后，GitHub Actions 会构建并部署到 GitHub Pages。

## 平时会改的地方

| 想做的事 | 改哪里 |
|---|---|
| 写文章 | `docs/monthly/posts/`、`docs/life/posts/`、`docs/technology/` |
| 更新「此刻」 | `docs/now.md` 开头的几行 |
| 搬家了 | `mkdocs.yml` 的 `places` 末尾加一行，天空、时间和文章落款都会跟着走 |
| 加一首片尾曲 | 在文章里嵌入 Spotify 或 Apple Music 的歌，构建时自动收进 `data/songs.json` |
| 实时听歌 | 已接 Last.fm，账号和 key 在 `mkdocs.yml` 的 `listening`，读取逻辑在 `docs/javascripts/listening.js` |

首页是一片可以拖动、缩放的空间：时间从原点沿螺旋向外走，一年一圈，一月在正上方。
坐标在构建时由 `hooks/recent_updates.py` 算好，交互在 `docs/javascripts/space.js`，底色（此刻的天色）在 `docs/javascripts/sky.js`。
生活帖的小图放在 `docs/assets/images/thumbs/`，文件名和原图相同、后缀为 `.jpg`；没有小图时会直接用原图。

预览某个时刻的天色：网址后加 `?sky=18:30&cloud=90&wx=snow`。
