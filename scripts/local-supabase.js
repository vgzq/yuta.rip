/* Local data layer. The page asks for profile / links / tracks; this answers from
   window.PROFILE_DATA (data/profile-data.js, written by the editor). */
(function () {
  var D = window.PROFILE_DATA || { profile: {}, links: [], tracks: [] };
  var ID = "local-profile";
  window.__galleryTilt = ((D.profile || {}).gallery_tilt == null ? 60 : Number((D.profile || {}).gallery_tilt)) / 100;   // gallery card tilt strength
  var VZ = D.visualizer || {};
  window.__waveColor = (VZ.custom && /^#[0-9a-f]{6}$/i.test(String(VZ.color || ""))) ? VZ.color : "";   // bottom sound-wave color
  window.__keepDiscordLink = !(D.discord && D.discord.rowLink === false);   // keep a Discord link in the icon row even when the Discord card is on

  // Local file paths are always relative to this page: "/assets/pfp.png" and "./assets/pfp.png" become
  // "assets/pfp.png", so they keep working when the site lives in a sub-folder (GitHub project pages).
  function localPath(u) {
    u = String(u == null ? "" : u).trim();
    if (!u || /^([a-z][a-z0-9+.\-]*:|\/\/)/i.test(u)) return u;
    return u.replace(/^(\.?\/)+/, "");
  }

  function profileRow() {
    var p = Object.assign({}, D.profile || {});
    ["avatar_url", "favicon_url", "gallery_image_1_url", "gallery_image_2_url", "front_page_image_url"].forEach(function (k) { if (p[k]) p[k] = localPath(p[k]); });
    var c = D.clock, d = D.discord;
    if (c) {
      p.clock_module_enabled = !!c.enabled;
      if (c.timeZone) p.clock_timezone = c.timeZone;
      p.clock_city = c.city || "";
      p.clock_hour12 = c.hour12 !== false;
    }
    if (d) {
      var id = String(d.id || "").trim();
      p.discord_module_enabled = !!d.enabled && !!id;
      p.discord_profile_url = id ? "https://discord.com/users/" + id : "";
      p.discord_fallback_name = d.fallbackName || "";
      p.discord_fallback_username = d.fallbackUsername || "";
      p.discord_fallback_avatar = localPath(d.fallbackAvatar || "");
    }
    p.layout = p.layout || "multi-page";
    p.username = p.username || "me";
    return Object.assign({ id: ID }, p);
  }

  function listRows(name) {
    // array order is the display order (position is always rewritten from it)
    return (D[name] || []).map(function (r, i) {
      var row = Object.assign({}, r, { profile_id: ID, position: i });
      if (row.audio_url) row.audio_url = localPath(row.audio_url);
      return row;
    });
  }

  function rowsFor(table) {
    if (table === "profiles") return [profileRow()];
    if (table === "links") return listRows("links");
    if (table === "tracks") return listRows("tracks");
    return [];
  }

  function Query(table) { this.table = table; this.filters = []; }
  Query.prototype.select = function () { return this; };
  Query.prototype.eq = function (col, val) { this.filters.push([col, val]); return this; };
  Query.prototype.order = function () { return this; };
  Query.prototype._rows = function () {
    var rows = rowsFor(this.table);
    this.filters.forEach(function (f) {
      if (f[0] === "id") rows = rows.filter(function (r) { return r.id === f[1]; });
    });
    return rows;
  };
  Query.prototype.maybeSingle = function () {
    return Promise.resolve({ data: this._rows()[0] || null, error: null });
  };
  Query.prototype.then = function (res, rej) {
    return Promise.resolve({ data: this._rows(), error: null }).then(res, rej);
  };

  window.supabase = {
    createClient: function () { return { from: function (t) { return new Query(t); } }; }
  };
  // used by the editor's live preview (?editorPreview=1)
  window.__previewRows = function () {
    return { profile: profileRow(), links: listRows("links"), tracks: listRows("tracks") };
  };
})();
