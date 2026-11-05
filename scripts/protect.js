/* Anti-copy protections. Configured from the editor's "Protect" tab (data/profile-data.js -> protection).
   Never active in the editor preview or on localhost/file:// (so you can't lock yourself out) unless you
   open the site with ?forceProtect=1 (all except the domain lock) or ?forceProtect=lock (everything). */
(function () {
  "use strict";
  var D = window.PROFILE_DATA || {}, P = D.protection;
  if (!P || !P.enabled) return;

  var self = document.currentScript, base = self && self.src ? self.src.replace(/protect\.js.*$/, "") : "scripts/";
  var q = location.search, force = /[?&]forceProtect=(1|lock)\b/.exec(q);
  var host = (location.hostname || "").toLowerCase();
  var local = /^(localhost|127\.\d+\.\d+\.\d+|\[::1\]|::1)$/.test(host) || location.protocol === "file:";
  var preview = /[?&]editorPreview=1\b/.test(q);
  var inOwnFrame = false;
  try { inOwnFrame = window.top !== window && window.top.location.origin === location.origin; } catch (e) { /* cross-origin parent */ }
  if (!force && (local || preview || inOwnFrame)) return;

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function screen(msg, link) {
    try { window.stop(); } catch (e) { /* ignore */ }
    window.__PROTECT_BLOCKED = true;
    document.documentElement.innerHTML = '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title></title></head>' +
      '<body style="margin:0;height:100vh;display:grid;place-items:center;background:#000;color:#6c7480;font:14px system-ui,sans-serif;text-align:center">' +
      '<div>' + esc(msg) + (link ? '<br><br><a target="_top" style="color:#8892a3" href="' + esc(link) + '">open the real site</a>' : "") + '</div></body>';
  }

  /* ---- 1. embedding: other sites can't show this page inside their own frame ---- */
  if (P.noFraming !== false && window.top !== window.self) {
    var sameOrigin = false;
    try { sameOrigin = window.top.location.origin === location.origin; } catch (e) { /* cross-origin */ }
    if (!sameOrigin) { screen("This page can't be shown inside another site.", location.href); return; }
  }

  /* ---- 2. domain lock: copies hosted anywhere else stop working ---- */
  var domains = (P.domains || []).map(function (d) { return String(d).toLowerCase().replace(/^[a-z]+:\/\//, "").replace(/[\/?#].*$/, "").replace(/:\d+$/, "").trim(); }).filter(Boolean);
  var lockOn = P.domainLock && domains.length && (!force || force[1] === "lock");
  if (lockOn) {
    var allowed = domains.some(function (d) { return host === d || host.slice(-(d.length + 1)) === "." + d; });
    if (!allowed) {
      if (P.lockUrl) { try { window.stop(); } catch (e) { /* ignore */ } location.replace(P.lockUrl); }
      else screen("This site isn't available here.");
      return;
    }
  }

  /* ---- 3. selection / dragging / right-click / inspect shortcuts ---- */
  if (P.noSelect !== false) {
    document.documentElement.classList.add("pe-noselect");
    var st = document.createElement("style");
    st.textContent = "html.pe-noselect,html.pe-noselect *{-webkit-user-select:none;user-select:none}html.pe-noselect img{-webkit-user-drag:none}html.pe-noselect input,html.pe-noselect textarea{-webkit-user-select:text;user-select:text}";
    (document.head || document.documentElement).appendChild(st);
    document.addEventListener("dragstart", function (e) { e.preventDefault(); }, true);
  }
  if (P.noContextMenu !== false) {
    document.addEventListener("contextmenu", function (e) { e.preventDefault(); }, true);
    document.addEventListener("keydown", function (e) {
      var c = e.ctrlKey || e.metaKey, code = e.code || "";
      var devKey = e.key === "F12" ||
        (c && e.shiftKey && /^Key[IJCK]$/.test(code)) ||
        (c && e.altKey && /^Key[IJCU]$/.test(code)) ||
        (c && (code === "KeyU" || code === "KeyS"));
      if (devKey) { e.preventDefault(); e.stopPropagation(); }
    }, true);
  }
  if (P.noCopy) {
    ["copy", "cut"].forEach(function (ev) { document.addEventListener(ev, function (e) { e.preventDefault(); }, true); });
  }

  /* ---- 4. developer-tools detection (self-hosted copy of disable-devtool) ---- */
  function trip(type) {
    if (P.onDetect === "redirect" && P.redirectUrl) { try { window.stop(); } catch (e) { /* ignore */ } location.replace(P.redirectUrl); return; }
    screen("Developer tools aren't allowed on this site.");
  }
  window.__protectTrip = trip;   // used for testing the reaction without opening real dev tools
  if (P.devtools !== false) {
    var s = document.createElement("script");
    s.src = base + "vendor/disable-devtool.min.js";
    s.onload = function () {
      if (typeof window.DisableDevtool !== "function") return;
      // detector ids: 0 regex, 1 dom id, 3 Date.toString, 4 Function.toString, 5 debugger, 6 timing probe, 7 eruda/vConsole
      var detectors = P.sensitivity === "relaxed" ? [0, 1, 3, 4, 5, 7] : [0, 1, 3, 4, 5, 6, 7];
      var cfg = {
        disableMenu: P.noContextMenu !== false,
        disableSelect: P.noSelect !== false,
        disableCopy: !!P.noCopy, disableCut: !!P.noCopy,
        interval: 300,
        detectors: detectors,
        ondevtoolopen: function (type) { trip(type); },
        ignore: function () { return P.desktopOnly !== false && window.matchMedia("(pointer: coarse)").matches; }
      };
      // owner bypass: open the site as  https://yoursite/?ddtk=YOUR_KEY  (only the key's md5 is stored)
      if (P.bypassMd5) { cfg.md5 = P.bypassMd5; cfg.tkName = "ddtk"; }
      window.__protectResult = window.DisableDevtool(cfg);
    };
    (document.head || document.documentElement).appendChild(s);
  }
})();
