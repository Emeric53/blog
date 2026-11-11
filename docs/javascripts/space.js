/* 首页的空间：拖动平移，滚动或双指捏合缩放，方向键和 + − 0 也可以。
 * 位置会记在这次浏览里，从文章返回时还在原来的地方。 */
(function () {
  var home = document.querySelector(".home");
  var space = home && home.querySelector(".space");
  if (!space) return;
  var world = space.querySelector("[data-world]");
  var MIN = 0.35, MAX = 2.6;
  var start = Math.max(0.62, Math.min(1, innerWidth / 1100));
  var view = { x: 0, y: 0, s: start };
  try { view = JSON.parse(sessionStorage.getItem("null-space")) || view; } catch (e) {}

  function apply() {
    world.style.setProperty("--s", view.s.toFixed(4));
    world.style.transform = "translate3d(" + view.x.toFixed(1) + "px," + view.y.toFixed(1) + "px,0)";
    space.dataset.zoom = view.s < 0.5 ? "far" : view.s > 1.45 ? "near" : "mid";
    try { sessionStorage.setItem("null-space", JSON.stringify(view)); } catch (e) {}
  }
  // 以屏幕上的某一点为中心缩放（cx、cy 相对视口中心）
  function zoom(factor, cx, cy) {
    var next = Math.max(MIN, Math.min(MAX, view.s * factor));
    var k = next / view.s;
    view.x = cx - (cx - view.x) * k;
    view.y = cy - (cy - view.y) * k;
    view.s = next;
    apply();
  }
  var gliding = 0;
  function glide(fn, ms) {
    ms = ms || 400;
    world.style.setProperty("--glide", ms + "ms");
    world.classList.add("is-gliding");
    fn();
    clearTimeout(gliding);
    gliding = setTimeout(function () { world.classList.remove("is-gliding"); }, ms + 50);
  }
  function center(e) {
    var box = space.getBoundingClientRect();
    return [e.clientX - box.left - box.width / 2, e.clientY - box.top - box.height / 2];
  }

  // 拖动与捏合
  var pointers = new Map(), dragged = false, pinch = 0;
  space.addEventListener("pointerdown", function (e) {
    if (e.pointerType === "mouse") pointers.clear(); // 上一次按下后在窗口外松手，会留下一个没结束的指针
    if (!pointers.size) dragged = false;
    if (e.target.closest(".journal-masthead, .space__hud, .playing") || (e.pointerType === "mouse" && e.button !== 0)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    pinch = 0;
  });
  space.addEventListener("pointermove", function (e) {
    var last = pointers.get(e.pointerId);
    if (!last) return;
    if (e.pointerType === "mouse" && !e.buttons) return release(e);
    var dx = e.clientX - last.x, dy = e.clientY - last.y;
    if (!dragged && pointers.size === 1 && Math.abs(dx) + Math.abs(dy) < 5) return;
    if (!dragged) { dragged = true; space.classList.add("is-dragging"); space.setPointerCapture(e.pointerId); }
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      var p = Array.from(pointers.values());
      var distance = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
      var mid = center({ clientX: (p[0].x + p[1].x) / 2, clientY: (p[0].y + p[1].y) / 2 });
      if (pinch) zoom(distance / pinch, mid[0], mid[1]);
      pinch = distance;
    } else {
      view.x += dx;
      view.y += dy;
      apply();
    }
  });
  function release(e) {
    pointers.delete(e.pointerId);
    pinch = 0;
    if (!pointers.size) space.classList.remove("is-dragging");
  }
  space.addEventListener("pointerup", release);
  space.addEventListener("pointercancel", release);
  // 拖动结束时不要顺便点开文章
  space.addEventListener("click", function (e) {
    if (dragged) { e.preventDefault(); e.stopPropagation(); dragged = false; }
  }, true);

  space.addEventListener("wheel", function (e) {
    if (home.dataset.view !== "space" || e.target.closest(".playing__panel")) return;
    e.preventDefault();
    // 像地图一样：滚动就是缩放，以鼠标所在的位置为中心。捏合（浏览器报成 Ctrl+滚动）灵敏一些。
    var delta = e.deltaY * (e.deltaMode === 1 ? 16 : 1);
    var c = center(e);
    zoom(Math.exp(-delta * (e.ctrlKey ? 0.01 : 0.0022)), c[0], c[1]);
  }, { passive: false });
  space.addEventListener("dblclick", function (e) {
    if (e.target.closest("a, button, .journal-masthead")) return;
    var c = center(e);
    glide(function () { zoom(1.6, c[0], c[1]); });
  });

  document.addEventListener("keydown", function (e) {
    if (home.dataset.view !== "space" || e.metaKey || e.ctrlKey || e.altKey || /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    var step = 90, moves = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    if (moves[e.key]) { view.x += moves[e.key][0]; view.y += moves[e.key][1]; apply(); e.preventDefault(); }
    else if (e.key === "+" || e.key === "=") glide(function () { zoom(1.3, 0, 0); });
    else if (e.key === "-") glide(function () { zoom(1 / 1.3, 0, 0); });
    else if (e.key === "0") glide(function () { view = { x: 0, y: 0, s: start }; apply(); });
  });
  // 飞到某一篇文章：把它放到视野中间，并在底部显示它的摘要
  var nodes = Array.prototype.slice.call(world.querySelectorAll(".node")), picked = null;
  function visit(node, ms) {
    if (picked) picked.classList.remove("is-picked");
    picked = node;
    node.classList.add("is-picked");
    var link = node.querySelector("a");
    meta.textContent = link.dataset.meta;
    text.textContent = link.dataset.excerpt;
    bar.classList.add("is-on");
    glide(function () {
      view.s = Math.max(view.s, 1.15);
      view.x = -(parseFloat(node.style.getPropertyValue("--x")) + 70) * view.s;
      view.y = -(parseFloat(node.style.getPropertyValue("--y")) + 30) * view.s;
      apply();
    }, ms);
  }
  function candidates() {
    var filter = world.dataset.filter;
    return nodes.filter(function (n) { return !filter || n.classList.contains("node--" + filter); });
  }

  // 巡游：从最早的一篇开始，沿着时间一篇一篇飞过去；碰一下画面就停
  var tour = null, tourButton = space.querySelector('[data-space="tour"]');
  function stopTour() {
    if (!tour) return;
    clearInterval(tour.timer);
    tour = null;
    tourButton.textContent = "巡游";
  }
  function startTour() {
    var list = candidates(), index = 0;
    if (!list.length) return;
    tourButton.textContent = "停";
    function next() {
      if (index >= list.length) return stopTour();
      visit(list[index++], 1300);
    }
    tour = { timer: setInterval(next, 2600) };
    next();
  }
  ["pointerdown", "wheel", "keydown"].forEach(function (name) {
    (name === "keydown" ? document : space).addEventListener(name, function (e) {
      if (!(e.target.closest && e.target.closest('[data-space="tour"]'))) stopTour();
    }, { passive: true, capture: true });
  });

  space.querySelectorAll("[data-space]").forEach(function (button) {
    button.addEventListener("click", function () {
      var action = button.dataset.space;
      if (action === "tour") return tour ? stopTour() : startTour();
      if (action === "random") {
        var list = candidates().filter(function (n) { return n !== picked; });
        return list.length && visit(list[Math.floor(Math.random() * list.length)], 900);
      }
      glide(function () {
        if (action === "home") { view = { x: 0, y: 0, s: start }; apply(); }
        else zoom(action === "in" ? 1.35 : 1 / 1.35, 0, 0);
      });
    });
  });
  // 图例也是筛选：点「生活」只留生活帖，再点一次恢复
  space.querySelectorAll("[data-filter]").forEach(function (button) {
    button.addEventListener("click", function () {
      var on = world.dataset.filter !== button.dataset.filter;
      if (on) world.dataset.filter = button.dataset.filter; else delete world.dataset.filter;
      space.querySelectorAll("[data-filter]").forEach(function (b) { b.setAttribute("aria-pressed", on && b === button); });
    });
  });
  // 用 Tab 走到视野外的文章时，把它带到中间
  world.addEventListener("focusin", function (e) {
    var node = e.target.closest(".node");
    if (!node || !e.target.matches(":focus-visible")) return;
    var style = node.style;
    glide(function () {
      view.x = -parseFloat(style.getPropertyValue("--x")) * view.s;
      view.y = -parseFloat(style.getPropertyValue("--y")) * view.s;
      apply();
    });
  });

  // 悬停时在底部显示摘要
  var bar = space.querySelector(".almanac__readout"), meta = bar.querySelector("b"), text = bar.querySelector("span");
  world.querySelectorAll(".node a").forEach(function (link) {
    ["mouseenter", "focus"].forEach(function (name) {
      link.addEventListener(name, function () { meta.textContent = link.dataset.meta; text.textContent = link.dataset.excerpt; bar.classList.add("is-on"); });
    });
    ["mouseleave", "blur"].forEach(function (name) { link.addEventListener(name, function () { bar.classList.remove("is-on"); }); });
  });

  // 文章旁的小唱片：点一下试听 30 秒
  var audio = new Audio(), playing = null;
  function stop() { if (playing) playing.classList.remove("is-playing"); playing = null; }
  audio.addEventListener("ended", stop);
  audio.addEventListener("pause", stop);
  world.querySelectorAll(".node__song").forEach(function (disc) {
    disc.addEventListener("click", function () {
      if (playing === disc) return audio.pause();
      audio.pause();
      audio.src = disc.dataset.preview;
      audio.play().then(function () { playing = disc; disc.classList.add("is-playing"); }).catch(function () {});
    });
  });

  // 空间 / 年历
  function setView(name) {
    home.dataset.view = name;
    try { localStorage.setItem("null-view", name); } catch (e) {}
    if (name !== "space") audio.pause();
  }
  home.querySelectorAll("[data-view-set]").forEach(function (button) {
    button.addEventListener("click", function () { setView(button.dataset.viewSet); window.scrollTo(0, 0); });
  });
  var saved = null;
  try { saved = localStorage.getItem("null-view"); } catch (e) {}
  apply();
  setView(saved === "list" ? "list" : "space");
})();
