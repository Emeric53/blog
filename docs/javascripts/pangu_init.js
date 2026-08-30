/* 盘古之白：自动在中日韩文字与西文/数字之间插入细间隔。
 * pangu.js 会自动跳过 <code>/<pre> 等，不会破坏代码；加空格是幂等的（重复执行不叠加）。
 *
 * 适配 MkDocs Material 即时加载（navigation.instant）：用全局 document$ 观察者，
 * 首次加载与每次翻页后都重新排版。
 *
 * 防抖 + 防重入：合并短时间内的多次触发，降低与某些“加空格/翻译”浏览器扩展
 * （它们靠 MutationObserver 不停改写文本）相互触发、反复闪烁的概率。
 */
function setupPangu() {
  if (typeof pangu !== "undefined") {
    pangu.spacingElementByClassName("md-content");
  }
}

var _panguTimer = null;
function schedulePangu() {
  if (_panguTimer) {
    clearTimeout(_panguTimer);
  }
  _panguTimer = setTimeout(function () {
    _panguTimer = null;
    setupPangu();
  }, 80);
}

if (typeof document$ !== "undefined" && document$.subscribe) {
  document$.subscribe(schedulePangu);
} else {
  // 兜底：未开启即时加载或拿不到 document$ 时
  document.addEventListener("DOMContentLoaded", schedulePangu);
}
