/* Applies the custom colors from data/profile-data.js.
   The base page derives most colors from one theme color; these rules let each piece
   (bio, link icons, name gradient, clock, Discord text, track list) have its own color. */
(function () {
  var D = window.PROFILE_DATA || {};
  var css = [];
  var hex = /^#[0-9a-f]{3,8}$/i;
  function ok(c) { return typeof c === "string" && hex.test(c.trim()); }
  function mix(c, pct) { return "color-mix(in srgb," + c + " " + pct + "%,transparent)"; }

  /* ---------- bio + link icons ---------- */
  var s = D.style || {};
  if (s.custom) {
    if (ok(s.bioColor)) css.push("body{--bio-color:" + s.bioColor + "!important}");
    if (Number(s.bioSize) > 0) css.push("#bioEl{font-size:" + Number(s.bioSize) + "px!important}");
    if (ok(s.linkColor)) css.push(".social-icon{color:" + s.linkColor + "!important}");
    if (ok(s.hoverColor)) css.push(".social-icon:hover{color:" + s.hoverColor + "!important}");
  }

  /* ---------- text gradient (name gradient = this with 2 colors + animate) ---------- */
  var g = D.gradient;
  if (g && g.enabled && g.colors && g.colors.length >= 2) {
    var T = {
      name: "#nameEl", title: "#profileTitleEl", bio: "#bioEl",
      clock: ".clock-digital,.clock-zone", discord: ".discord-name,.discord-username",
      tracks: ".tracklist-heading,.track-number"
    };
    var t = g.targets || { name: true }, sel = [];
    Object.keys(T).forEach(function (k) { if (t[k]) sel.push(T[k]); });
    var colors = g.colors.filter(ok);
    if (sel.length && colors.length >= 2) {
      var ang = isFinite(g.angle) ? Number(g.angle) : 90;
      // animated gradients loop back to the first color so the motion is seamless
      var stops = colors.slice(); if (g.animate) stops.push(colors[0]);
      var rule = "background-image:linear-gradient(" + ang + "deg," + stops.join(",") + ")!important;" +
        "background-size:" + (g.animate ? "200% 100%" : "100% 100%") + "!important;" +
        "-webkit-background-clip:text!important;background-clip:text!important;" +
        "-webkit-text-fill-color:transparent!important;color:transparent!important;text-shadow:none!important;";
      if (!g.animate) rule += "background-position:0 0!important;";
      css.push(sel.join(",") + "{" + rule + "}");
      if (g.animate) {
        // the name already animates its own background-position (and its fade-in) in the base page,
        // so only the other targets need an animation of their own
        var others = sel.filter(function (x) { return x !== "#nameEl" && x !== "#profileTitleEl"; });
        if (others.length) css.push(others.join(",") + "{animation:tgShift 4s linear infinite!important}");
        css.push("@keyframes tgShift{from{background-position:0% 50%}to{background-position:200% 50%}}");
        // phones/narrow screens: the base page switches the name animation off there, so run ours
        var baseSel = sel.filter(function (x) { return x === "#nameEl" || x === "#profileTitleEl"; });
        if (baseSel.length) css.push("@media (max-width:900px),(pointer:coarse){" + baseSel.join(",") + "{animation:tgShift 4s linear infinite!important}}");
      }
    }
  }

  /* ---------- clock (same logic as the original standalone page) ---------- */
  var c = D.clock || {};
  if (ok(c.faceColor)) {
    css.push(".analog-clock{background:radial-gradient(circle at 50% 42%,rgba(255,255,255,.04),transparent 58%)," + c.faceColor + "!important}");
    css.push(".clock-center-dot{border-color:" + c.faceColor + "!important}");
  }
  if (ok(c.textColor)) {
    css.push(".clock-digital{color:" + c.textColor + "!important}");
    css.push(".analog-clock{border-color:" + mix(c.textColor, 24) + "!important}");
    css.push(".clock-tick{background:" + mix(c.textColor, 38) + "!important}.clock-tick.major{background:" + mix(c.textColor, 82) + "!important}");
  }
  var hand = ok(c.handColor) ? c.handColor : "#ffffff";
  if (ok(c.faceColor) || ok(c.handColor)) css.push(".clock-hour-hand,.clock-minute-hand{background:" + hand + "!important}");
  var zone = ok(c.zoneColor) ? c.zoneColor : (ok(c.secondaryColor) ? c.secondaryColor : null);
  if (zone) css.push(".clock-zone{color:" + zone + "!important}");
  if (ok(c.secondaryColor)) css.push(".clock-zone::before{color:" + c.secondaryColor + "!important}");
  if (ok(c.accentColor)) css.push(".clock-second-hand{background:" + c.accentColor + "!important}.clock-center-dot{background:" + c.accentColor + "!important}");

  /* ---------- Discord card text ---------- */
  var d = D.discord || {};
  if (d.customColors) {
    if (ok(d.nameColor)) css.push(".discord-name{color:" + d.nameColor + "!important}");
    if (ok(d.usernameColor)) css.push(".discord-username{color:" + d.usernameColor + "!important}");
  }

  /* ---------- track list ---------- */
  var tl = D.tracklist || {};
  if (tl.custom) {
    // specificity order: idle < hover/active < playing (all !important)
    if (ok(tl.idleColor)) css.push(".track-row{color:" + tl.idleColor + "!important}");
    if (ok(tl.activeColor)) css.push(".track-row:hover,.track-row.active{color:" + tl.activeColor + "!important}.track-row-progress-fill{background:" + tl.activeColor + "!important}");
    if (ok(tl.playingColor)) css.push(".track-row.active:not(.is-paused),.track-row.active:not(.is-paused) .track-number,.track-row.active:not(.is-paused) .track-row-icon{color:" + tl.playingColor + "!important}.track-row.active:not(.is-paused) .track-row-progress-fill{background:" + tl.playingColor + "!important}");
  }

  /* ---------- phone / narrow screens: slides must never overlap ----------
     The base page cross-fades the old and new slide over ~0.5s while both sit in the same spot.
     Here the old slide fades out fast and is hidden, and the new one fades in just after it. */
  css.push("@media (max-width:900px),(pointer:coarse){" +
    "body.layout-multi-page .profile-block.page-before,body.layout-multi-page .profile-block.page-after," +
    "body.layout-multi-page .modules-page.page-before,body.layout-multi-page .modules-page.page-after{" +
      "opacity:0!important;visibility:hidden!important;" +
      "transition:opacity 130ms ease,transform 420ms cubic-bezier(.16,1,.3,1),visibility 0s linear 130ms!important}" +
    "body.layout-multi-page .profile-block:not(.page-before):not(.page-after)," +
    "body.layout-multi-page .modules-page:not(.page-before):not(.page-after){" +
      "visibility:visible;" +
      "transition:opacity 240ms ease 140ms,transform 420ms cubic-bezier(.16,1,.3,1),visibility 0s linear 0s}" +
  "}");

  /* gallery cards: flat rendering (crisp edges while tilted) + steadier, smoother tilt response */
  css.push(".gallery-card{transform-style:flat!important;backface-visibility:hidden}" +
           ".gallery-card.is-tilting{transition:transform 90ms ease-out,border-color 120ms ease,box-shadow 120ms ease!important}" +
           ".gallery-card:hover{--tilt-scale:1}");

  if (css.length) {
    var el = document.createElement("style");
    el.id = "site-theme";
    el.textContent = css.join("\n");
    document.head.appendChild(el);
  }

  /* self-heal: shortly after any navigation input, make the page re-sync which slide is current */
  var healT = 0;
  function heal() { clearTimeout(healT); healT = setTimeout(function () { window.dispatchEvent(new Event("resize")); }, 900); }
  ["wheel", "touchend", "keydown", "click"].forEach(function (ev) { window.addEventListener(ev, heal, { passive: true, capture: true }); });
})();
