/* 在听：从 Last.fm 读我的听歌记录，每分钟刷新一次。
 * 页面上带下面这些属性的元素会被填上内容：
 *   data-lastfm-recent="8"            最近听的 8 首（<ol>）
 *   data-lastfm-artists="1month"      这段时间听得最多的歌手（<ol>），可选 7day / 1month / overall
 *   data-lastfm-albums="1month"       这段时间听得最多的专辑（<ol>），时间段同上
 *   data-lastfm-song                  最近一首的链接（<a>）
 *   data-lastfm-title                 最近一首的「歌名 — 歌手」，只填文字
 *   data-lastfm-state                 「正在听」或「最近在听」
 *   data-lastfm-total                 一共听了多少首
 * 外层带 data-lastfm 的容器在拿到数据前是隐藏的。 */
(function () {
  var config = window.NULL_LASTFM;
  if (!config || !config.user || !config.key) return;
  function call(method, extra) {
    return fetch("https://ws.audioscrobbler.com/2.0/?format=json&method=" + method + "&user=" +
      encodeURIComponent(config.user) + "&api_key=" + config.key + (extra || "")).then(function (r) { return r.json(); });
  }
  function each(selector, fn) { Array.prototype.forEach.call(document.querySelectorAll(selector), fn); }
  function el(tag, text, href) {
    var node = document.createElement(tag);
    node.textContent = text;
    if (href) node.href = href;
    return node;
  }
  function ago(seconds) {
    var minutes = Math.max(1, Math.round((Date.now() / 1000 - seconds) / 60));
    if (minutes < 60) return minutes + " 分钟前";
    if (minutes < 1440) return Math.round(minutes / 60) + " 小时前";
    return Math.round(minutes / 1440) + " 天前";
  }
  function reveal(node) {
    for (var box = node.closest("[data-lastfm]"); box; box = box.parentElement && box.parentElement.closest("[data-lastfm]")) box.hidden = false;
  }

  function recent() {
    var most = 1;
    each("[data-lastfm-recent]", function (list) { most = Math.max(most, +list.dataset.lastfmRecent + (+list.dataset.skip || 0)); });
    call("user.getrecenttracks", "&limit=" + most).then(function (data) {
      var tracks = [].concat(data.recenttracks.track || []);
      if (!tracks.length) return;
      var first = tracks[0], live = !!(first["@attr"] && first["@attr"].nowplaying);
      each("[data-lastfm-recent]", function (list) {
        list.textContent = "";
        var skip = +list.dataset.skip || 0;
        tracks.slice(skip, skip + +list.dataset.lastfmRecent).forEach(function (track) {
          var playing = track["@attr"] && track["@attr"].nowplaying;
          var item = document.createElement("li");
          if (playing) item.className = "is-playing";
          item.append(el("a", track.name, track.url), el("span", track.artist["#text"]), el("time", playing ? "正在播放" : ago(+track.date.uts)));
          list.append(item);
        });
        reveal(list);
      });
      each("[data-lastfm-song]", function (link) {
        link.textContent = first.name + " — " + first.artist["#text"];
        link.href = first.url;
        reveal(link);
      });
      each("[data-lastfm-title]", function (node) {
        node.textContent = first.name + " — " + first.artist["#text"];
        reveal(node);
      });
      each("[data-lastfm-state]", function (node) { node.textContent = live ? "正在听" : "最近在听 · " + ago(+first.date.uts); });
      each("[data-lastfm]", function (box) { box.classList.toggle("is-live", live); });
      each("[data-lastfm-total]", function (node) { node.textContent = (+data.recenttracks["@attr"].total).toLocaleString("en-US"); });
    }).catch(function () {});
  }

  each("[data-lastfm-artists]", function (list) {
    call("user.gettopartists", "&period=" + list.dataset.lastfmArtists + "&limit=" + (list.dataset.limit || 8)).then(function (data) {
      var artists = data.topartists.artist || [];
      if (!artists.length) return;
      var top = +artists[0].playcount;
      artists.forEach(function (artist) {
        var item = document.createElement("li");
        item.style.setProperty("--share", (+artist.playcount / top).toFixed(3));
        item.append(el("a", artist.name, artist.url), el("span", (+artist.playcount).toLocaleString("en-US")));
        list.append(item);
      });
      reveal(list);
    }).catch(function () {});
  });

  each("[data-lastfm-albums]", function (list) {
    call("user.gettopalbums", "&period=" + list.dataset.lastfmAlbums + "&limit=" + (list.dataset.limit || 6)).then(function (data) {
      var albums = data.topalbums.album || [];
      if (!albums.length) return;
      var top = +albums[0].playcount;
      albums.forEach(function (album) {
        var item = document.createElement("li");
        item.style.setProperty("--share", (+album.playcount / top).toFixed(3));
        var cover = document.createElement("img");
        cover.alt = "";
        cover.loading = "lazy";
        cover.src = (album.image[1] && album.image[1]["#text"]) || "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
        var link = el("a", "", album.url);
        link.append(el("b", album.name), el("small", album.artist.name));
        item.append(cover, link, el("span", (+album.playcount).toLocaleString("en-US")));
        list.append(item);
      });
      reveal(list);
    }).catch(function () {});
  });

  recent();
  setInterval(recent, 60000);
})();
