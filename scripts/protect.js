/* Anti-copy protections, configured from the editor's "Protect" tab (data/profile-data.js -> protection).
   Active everywhere (live site, localhost, file://) EXCEPT inside the editor's own preview frame.
   Owner escape hatch: open the site with  ?ddtk=YOUR_KEY  (set on the Protect tab) to turn everything off.
   Diagnostics: open the site with  ?protectDebug=1  to see whether protection is running and why. */
(function () {
  "use strict";
  var D = window.PROFILE_DATA || {}, P = D.protection;
  var q = location.search, dbg = /[?&]protectDebug=1\b/.test(q);

  function status(msg) {
    window.__protectStatus = msg;
    if (!dbg) return;
    try { console.log("[protect] " + msg); } catch (e) { /* ignore */ }
    function show() {
      var el = document.getElementById("pe-debug");
      if (!el) { el = document.createElement("div"); el.id = "pe-debug"; el.style.cssText = "position:fixed;left:8px;bottom:8px;z-index:2147483647;max-width:80vw;padding:8px 10px;background:#111;color:#9fe;font:12px monospace;border:1px solid #345;border-radius:6px;white-space:pre-wrap"; document.documentElement.appendChild(el); }
      el.textContent = "protect: " + msg;
    }
    if (document.body) show(); else document.addEventListener("DOMContentLoaded", show);
  }

  if (!P || !P.enabled) { status("OFF - protection is not enabled in the published data. Turn it on in the editor's Protect tab, then publish again (and hard-refresh)."); return; }

  var self = document.currentScript, base = self && self.src ? self.src.replace(/protect\.js.*$/, "") : "scripts/";
  var force = /[?&]forceProtect=(1|lock)\b/.exec(q);
  var host = (location.hostname || "").toLowerCase();
  var isLocal = !host || /^(localhost|127\.\d+\.\d+\.\d+|\[::1\]|::1)$/.test(host) || location.protocol === "file:";
  var preview = /[?&]editorPreview=1\b/.test(q);
  var inOwnFrame = false;
  try { inOwnFrame = window.top !== window && window.top.location.origin === location.origin; } catch (e) { /* cross-origin parent */ }
  if (preview || inOwnFrame) { status("skipped - this is the editor's preview frame"); return; }

  var off = false;                                   // set when the owner bypass key matches
  function guard(fn) { return function (e) { if (off) return; return fn.call(this, e); }; }
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

  /* ---- 2. domain lock: copies hosted anywhere else stop working (local addresses always allowed) ---- */
  var domains = (P.domains || []).map(function (d) { return String(d).toLowerCase().replace(/^[a-z]+:\/\//, "").replace(/[\/?#].*$/, "").replace(/:\d+$/, "").trim(); }).filter(Boolean);
  if (P.domainLock && domains.length && (!isLocal || (force && force[1] === "lock"))) {
    var allowed = !force && isLocal ? true : domains.some(function (d) { return host === d || host.slice(-(d.length + 1)) === "." + d; });
    if (!allowed) {
      if (P.lockUrl) { try { window.stop(); } catch (e) { /* ignore */ } location.replace(P.lockUrl); }
      else screen("This site isn't available here.");
      return;
    }
  }

  /* ---- 3. selection / dragging / right-click / inspect shortcuts ---- */
  var styleEl = null;
  if (P.noSelect !== false) {
    document.documentElement.classList.add("pe-noselect");
    styleEl = document.createElement("style");
    styleEl.textContent = "html.pe-noselect,html.pe-noselect *{-webkit-user-select:none;user-select:none}html.pe-noselect img{-webkit-user-drag:none}html.pe-noselect input,html.pe-noselect textarea{-webkit-user-select:text;user-select:text}";
    (document.head || document.documentElement).appendChild(styleEl);
    document.addEventListener("dragstart", guard(function (e) { e.preventDefault(); }), true);
  }
  if (P.noContextMenu !== false) {
    var noMenu = guard(function (e) { e.preventDefault(); e.stopPropagation(); return false; });
    document.addEventListener("contextmenu", noMenu, true);
    window.addEventListener("contextmenu", noMenu, true);
    document.addEventListener("keydown", guard(function (e) {
      var c = e.ctrlKey || e.metaKey, code = e.code || "";
      var devKey = e.key === "F12" ||
        (c && e.shiftKey && /^Key[IJCK]$/.test(code)) ||
        (c && e.altKey && /^Key[IJCU]$/.test(code)) ||
        (c && (code === "KeyU" || code === "KeyS"));
      if (devKey) { e.preventDefault(); e.stopPropagation(); }
    }), true);
  }
  if (P.noCopy) {
    ["copy", "cut"].forEach(function (ev) { document.addEventListener(ev, guard(function (e) { e.preventDefault(); }), true); });
  }

  /* ---- 4. developer-tools detection ---- */
  function trip(type) {
    if (off) return;
    if (P.onDetect === "redirect" && P.redirectUrl) { try { window.stop(); } catch (e) { /* ignore */ } location.replace(P.redirectUrl); return; }
    screen("Developer tools aren't allowed on this site.");
  }
  window.__protectTrip = trip;   // used for testing the reaction without opening real dev tools
  var coarse = function () { return window.matchMedia && window.matchMedia("(pointer: coarse)").matches; };

  // extra check: a `debugger` statement is a no-op normally, but pauses the page while dev tools are open,
  // which shows up as a long delay. Catches dev tools even when they are undocked (separate window).
  function startDebuggerTrap() {
    var hits = 0;
    setInterval(function () {
      if (off || document.hidden || (P.desktopOnly !== false && coarse())) return;
      var t = performance.now();
      try { (function () { return false; }).constructor("debugger")(); } catch (e) { /* ignore */ }
      if (performance.now() - t > 120) { if (++hits >= 2) trip("debugger"); } else hits = 0;
    }, 400);
  }

  function startLibrary() {
    if (P.devtools === false || typeof window.DisableDevtool !== "function") return;
    // detector ids: 0 regex, 1 dom id, 3 Date.toString, 4 Function.toString, 5 debugger, 6 timing probe, 7 eruda/vConsole
    var detectors = P.sensitivity === "relaxed" ? [0, 1, 3, 4, 5, 7] : [0, 1, 3, 4, 5, 6, 7];
    window.__protectResult = window.DisableDevtool({
      disableMenu: P.noContextMenu !== false,
      disableSelect: P.noSelect !== false,
      disableCopy: !!P.noCopy, disableCut: !!P.noCopy,
      interval: 300,
      detectors: detectors,
      ondevtoolopen: function (type) { trip(type); },
      ignore: function () { return off || (P.desktopOnly !== false && coarse()); }
    });
  }

  function release() {
    off = true;
    document.documentElement.classList.remove("pe-noselect");
    if (styleEl && styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
    status("BYPASSED - owner key accepted, protection is off for this page view");
  }

  var keyMatch = /[?&]ddtk=([^&#]*)/.exec(q), key = keyMatch ? decodeURIComponent(keyMatch[1]) : "";
  var needLib = (P.devtools !== false) || (key && P.bypassMd5);
  status("ACTIVE on " + (host || "file") + (isLocal ? " (local address)" : "") + " - right-click " + (P.noContextMenu !== false ? "blocked" : "allowed") + ", dev-tools detection " + (P.devtools !== false ? (P.sensitivity || "normal") : "off") + (P.debuggerTrap ? " + debugger trap" : "") + (P.domainLock && domains.length ? ", domain lock on" : ""));

  if (P.debuggerTrap) startDebuggerTrap();

  if (needLib) {
    var s = document.createElement("script");
    s.src = base + "vendor/disable-devtool.min.js";
    s.onload = function () {
      if (key && P.bypassMd5 && typeof window.DisableDevtool === "function" && window.DisableDevtool.md5(key) === P.bypassMd5) { release(); return; }
      startLibrary();
    };
    s.onerror = function () { status("WARNING - could not load scripts/vendor/disable-devtool.min.js (upload the whole scripts folder). Right-click/shortcut blocking still works."); };
    (document.head || document.documentElement).appendChild(s);
  }
})();
