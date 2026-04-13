// Clickjacking 防護：偵測 iframe 嵌入並跳出
if (window.top !== window.self) {
  window.top.location = window.self.location;
}

// GitHub Pages SPA redirect restore
// Reads the encoded path from the query string (set by 404.html) and restores it
(function (l) {
  if (l.search[1] === '/') {
    var decoded = l.search
      .slice(1)
      .split('&')
      .map(function (s) {
        return s.replace(/~and~/g, '&');
      })
      .join('?');
    var target = l.pathname.slice(0, -1) + decoded + l.hash;
    // 路徑白名單驗證：防止開放重定向
    if (
      target.charAt(0) === '/' &&
      target.indexOf('://') === -1 &&
      target.indexOf('//') !== 0 &&
      target.indexOf('\\') === -1
    ) {
      window.history.replaceState(null, null, target);
    } else {
      window.history.replaceState(null, null, '/');
    }
  }
})(window.location);
