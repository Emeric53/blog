/* 天空：按我所在城市此刻的太阳高度和云量，算出全站顶部那片天的颜色。
 * 城市来自 mkdocs.yml 的 extra.places 最后一项；天气来自 open-meteo（免费，无需密钥）。
 * 预览用：网址后加 ?sky=18:30&cloud=90&wx=snow 可以看任意时刻和天气。 */
(function () {
  var here = window.NULL_HERE;
  if (!here) return;
  // 只把颜色写在用到它的元素上；写在 <html> 上会让整页样式重算，拖动时会卡
  var scopes = document.querySelectorAll(".sky, .journal-masthead");
  var RAD = Math.PI / 180;
  var params = new URLSearchParams(location.search);

  // 太阳位置（NOAA 低精度公式，误差远小于一度）
  function sun(time) {
    var days = time / 86400000 - 10957.5;
    var g = ((357.528 + 0.9856003 * days) % 360) * RAD;
    var lambda = (((280.46 + 0.9856474 * days) % 360) + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD;
    var eps = 23.439 * RAD;
    var ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda));
    var dec = Math.asin(Math.sin(eps) * Math.sin(lambda));
    var gmst = (18.697374558 + 24.06570982441908 * days) % 24;
    var hour = Math.atan2(Math.sin((gmst * 15 + here.lon) * RAD - ra), Math.cos((gmst * 15 + here.lon) * RAD - ra));
    var lat = here.lat * RAD;
    var elev = Math.asin(Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(hour));
    var az = Math.atan2(-Math.sin(hour), Math.tan(dec) * Math.cos(lat) - Math.sin(lat) * Math.cos(hour));
    return { elev: elev / RAD, az: (az / RAD + 360) % 360, hour: hour / RAD };
  }

  // 太阳高度 → 天顶、半空、地平线三种颜色
  var KEYS = [
    [-18, "070b1f", "0d1332", "191f45"],
    [-12, "0b1030", "1a1f4d", "2f2c66"],
    [-6, "1b2259", "4a3f86", "b47a92"],
    [-2, "2d3a7c", "8a78b8", "f0a488"],
    [0, "465aa0", "b3a0d0", "f6b98a"],
    [4, "5a82c8", "b4c1e6", "f7d8b2"],
    [10, "5593d8", "a6caee", "e6edf5"],
    [25, "3f86d6", "8fc0ee", "dcecf7"],
    [60, "2f78d0", "7fb6ec", "d3e8f8"]
  ];
  function rgb(hex) { return [0, 2, 4].map(function (i) { return parseInt(hex.substr(i, 2), 16); }); }
  function mix(a, b, t) { return a.map(function (v, i) { return v + (b[i] - v) * t; }); }
  function luma(c) { return (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255; }
  function css(c) { return "rgb(" + c.map(Math.round).join(" ") + ")"; }
  function palette(elev, cloud) {
    var i = 0;
    while (i < KEYS.length - 2 && elev > KEYS[i + 1][0]) i++;
    var a = KEYS[i], b = KEYS[i + 1];
    var t = Math.max(0, Math.min(1, (elev - a[0]) / (b[0] - a[0])));
    return [1, 2, 3].map(function (k) {
      var c = mix(rgb(a[k]), rgb(b[k]), t);
      var l = luma(c) * 255;
      // 云把颜色压向同亮度的灰，白天略微变暗
      var grey = [l * 0.93, l * 0.95, l * 1.0].map(function (v) { return v * (elev > 0 ? 0.9 : 1); });
      return mix(c, grey, cloud * 0.88);
    });
  }

  var WEATHER = { 0: "晴", 1: "晴", 2: "多云", 3: "阴", 45: "雾", 48: "雾" };
  function weatherName(code) {
    if (code in WEATHER) return WEATHER[code];
    if (code >= 95) return "雷雨";
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "雪";
    if (code >= 51) return "雨";
    return "";
  }
  var clock = new Intl.DateTimeFormat("zh-CN", { timeZone: here.tz, hour: "2-digit", minute: "2-digit", hour12: false });
  function localMinutes(time) {
    var parts = clock.format(time).split(":");
    return (parseInt(parts[0], 10) % 24) * 60 + parseInt(parts[1], 10);
  }
  function nextCrossing(from) {
    var up = sun(from).elev > -0.833;
    for (var m = 1; m <= 1440; m++) {
      if ((sun(from + m * 60000).elev > -0.833) !== up) return { rise: !up, time: from + m * 60000 };
    }
    return null;
  }

  var weather = { cloud: 0, code: 0, temp: null };
  var offset = 0; // 拖动时间轴时，相对「现在」的毫秒偏移
  if (params.get("sky")) {
    var want = params.get("sky").split(":");
    offset = ((+want[0] * 60 + (+want[1] || 0)) - localMinutes(Date.now())) * 60000;
  }

  function each(selector, fn) { Array.prototype.forEach.call(document.querySelectorAll(selector), fn); }
  function text(name, value) { each('[data-sky="' + name + '"]', function (el) { el.textContent = value; }); }

  function render() {
    var time = Date.now() + offset;
    var s = sun(time);
    var cloud = weather.cloud / 100;
    var c = palette(s.elev, cloud);
    function set(name, value) { Array.prototype.forEach.call(scopes, function (el) { el.style.setProperty(name, value); }); }
    set("--sky-top", css(c[0]));
    set("--sky-mid", css(c[1]));
    set("--sky-low", css(c[2]));
    var dark = luma(c[1]) < 0.52;
    set("--sky-ink", dark ? "#f3f0ff" : "#1b1a3d");
    set("--sky-ink-soft", dark ? "rgb(243 240 255 / .72)" : "rgb(27 26 61 / .7)");
    set("--sky-ink-line", dark ? "rgb(243 240 255 / .28)" : "rgb(27 26 61 / .22)");
    // 太阳：横向按时角（东在左、西在右），纵向按高度
    // 太阳和星星各占一个合成层，只改 transform / opacity，不触发重绘
    if (sunEl) {
      var box = sunEl.parentNode;
      var x = (50 + Math.max(-1, Math.min(1, s.hour / 115)) * 44) / 100 * box.clientWidth;
      var y = (s.elev >= 0 ? 100 - 86 * Math.sqrt(s.elev / 90) : 100 - s.elev * 2.5) / 100 * box.clientHeight;
      sunEl.style.transform = "translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px,0) translate(-50%,-50%)";
      sunEl.style.opacity = (Math.max(0, Math.min(1, (s.elev + 5) / 5)) * (1 - cloud * 0.82)).toFixed(3);
    }
    if (starEl) starEl.style.opacity = (Math.max(0, Math.min(1, (-s.elev - 5) / 8)) * (1 - cloud * 0.9)).toFixed(3);
    set("--sun-warm", Math.max(0, Math.min(1, 1 - s.elev / 14)).toFixed(3));

    text("time", clock.format(time));
    var next = nextCrossing(time);
    text("next-label", next && next.rise ? "日出" : "日落");
    text("next", next ? clock.format(next.time) : "—");
    var phase = s.elev > 6 ? "白天" : s.elev > -0.833 ? (s.hour < 0 ? "清晨" : "傍晚") : s.elev > -6 ? (s.hour < 0 ? "黎明" : "黄昏") : "夜里";
    text("phase", phase);
    var name = weatherName(weather.code);
    text("weather", weather.temp === null ? "" : name + " " + Math.round(weather.temp) + "°C");
    each("[data-sky-scrub]", function (el) { if (document.activeElement !== el || !offset) el.value = localMinutes(time); });
    each("[data-sky-reset]", function (el) { el.hidden = !offset; });
    precipitation(name);
  }

  // 星星画一次；雨雪只在首页的天空里下
  var canvas = document.querySelector("[data-sky-canvas]");
  var sunEl = document.querySelector(".sky__sun"), starEl = document.querySelector("[data-sky-stars]");
  var falling = null;
  function seeded(seed) { return function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }; }
  function stars() {
    var layer = document.querySelector("[data-sky-stars]");
    if (!layer) return;
    var random = seeded(20260722), dots = [];
    for (var i = 0; i < 90; i++) {
      var size = random() < 0.12 ? 2 : 1;
      dots.push((random() * 100).toFixed(2) + "vw " + (random() * 62).toFixed(2) + "vh 0 " + (size - 1) + "px rgb(255 255 255 / " + (0.35 + random() * 0.6).toFixed(2) + ")");
    }
    layer.style.boxShadow = dots.join(",");
  }
  function precipitation(name) {
    var kind = name === "雪" ? "snow" : name === "雨" || name === "雷雨" ? "rain" : null;
    if (!canvas || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!kind) { falling = null; canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height); return; }
    if (falling && falling.kind === kind) return;
    var random = seeded(7), flakes = [];
    for (var i = 0; i < (kind === "snow" ? 70 : 110); i++) flakes.push({ x: random(), y: random(), r: 0.6 + random() * 1.8, v: 0.5 + random() });
    var start = !falling;
    falling = { kind: kind, flakes: flakes };
    if (start) requestAnimationFrame(fall);
  }
  function fall() {
    if (!falling) return;
    var w = canvas.clientWidth, h = canvas.clientHeight, ratio = window.devicePixelRatio || 1;
    if (canvas.width !== w * ratio) { canvas.width = w * ratio; canvas.height = h * ratio; }
    var ctx = canvas.getContext("2d");
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, w, h);
    var snow = falling.kind === "snow";
    ctx.fillStyle = ctx.strokeStyle = snow ? "#fff" : getComputedStyle(canvas).color;
    ctx.globalAlpha = snow ? 0.9 : 0.35;
    falling.flakes.forEach(function (f) {
      f.y += (snow ? 0.0009 : 0.012) * f.v;
      f.x += snow ? Math.sin(f.y * 18 + f.r * 9) * 0.0004 : -0.0012;
      if (f.y > 1) { f.y = 0; }
      if (f.x < 0) { f.x += 1; }
      ctx.beginPath();
      if (snow) { ctx.arc(f.x * w, f.y * h, f.r, 0, 7); ctx.fill(); }
      else { ctx.moveTo(f.x * w, f.y * h); ctx.lineTo(f.x * w - 3, f.y * h + 14 * f.v); ctx.stroke(); }
    });
    if (canvas.getBoundingClientRect().bottom > 0) requestAnimationFrame(fall);
    else setTimeout(function () { requestAnimationFrame(fall); }, 600);
  }

  function loadWeather() {
    if (params.get("cloud") || params.get("wx")) {
      weather = { cloud: +params.get("cloud") || 0, code: { snow: 73, rain: 63 }[params.get("wx")] || (+params.get("cloud") >= 85 ? 3 : 0), temp: 2 };
      return render();
    }
    var key = "null-weather:" + here.lat + "," + here.lon, cached = null;
    try { cached = JSON.parse(sessionStorage.getItem(key)); } catch (e) {}
    if (cached && Date.now() - cached.at < 20 * 60000) { weather = cached; return render(); }
    fetch("https://api.open-meteo.com/v1/forecast?latitude=" + here.lat + "&longitude=" + here.lon + "&current=temperature_2m,cloud_cover,weather_code")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        weather = { cloud: data.current.cloud_cover, code: data.current.weather_code, temp: data.current.temperature_2m, at: Date.now() };
        try { sessionStorage.setItem(key, JSON.stringify(weather)); } catch (e) {}
        render();
      })
      .catch(function () {});
  }

  each("[data-sky-scrub]", function (el) {
    el.addEventListener("input", function () {
      offset = (el.value - localMinutes(Date.now())) * 60000;
      render();
    });
  });
  each("[data-sky-reset]", function (el) {
    el.addEventListener("click", function () { offset = 0; render(); });
  });

  stars();
  render();
  loadWeather();
  setInterval(render, 60000);
  window.addEventListener("resize", render);
})();
