(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var IS_TV = !!(window.tizen && tizen.application);

  /* ---------- Storage ---------- */
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem("haven." + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem("haven." + k, JSON.stringify(v)); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem("haven." + k); } catch (e) {} }
  };

  /* ---------- Settings ---------- */
  var DEFAULTS = { wallpaper: "auto", clockFont: "apple", hour12: false, greeting: true, units: "c", restStyle: "scenery", restAfter: 5, city: "Amsterdam", bootSound: true, screenSize: 100 };
  var cfg = merge(DEFAULTS, store.get("cfg", {}));
  function merge(a, b) { var o = {}, k; for (k in a) o[k] = a[k]; for (k in b) if (k in a) o[k] = b[k]; return o; }

  var CITIES = {
    "Amsterdam": [52.37, 4.90], "Rotterdam": [51.92, 4.48], "The Hague": [52.08, 4.30], "Utrecht": [52.09, 5.12],
    "Eindhoven": [51.44, 5.47], "Groningen": [53.22, 6.57], "Tilburg": [51.56, 5.09], "Almere": [52.37, 5.21],
    "Breda": [51.59, 4.78], "Nijmegen": [51.84, 5.86], "Arnhem": [51.98, 5.91], "Haarlem": [52.38, 4.64],
    "Zwolle": [52.52, 6.08], "Maastricht": [50.85, 5.69], "Leeuwarden": [53.20, 5.80], "Antwerp": [51.22, 4.40],
    "Ghent": [51.05, 3.72], "Brussels": [50.85, 4.35], "London": [51.51, -0.13], "Paris": [48.86, 2.35],
    "Berlin": [52.52, 13.40], "New York": [40.71, -74.01], "Los Angeles": [34.05, -118.24], "Chicago": [41.88, -87.63],
    "San Francisco": [37.77, -122.42], "Miami": [25.76, -80.19], "Toronto": [43.65, -79.38], "Sydney": [-33.87, 151.21]
  };

  /* ---------- Apps ---------- */
  // Logos in the logos folder. s = logo size as a percentage of the icon.
  var LOGOS = {
    "apple tv": { f: "appletv", bg: "linear-gradient(160deg,#3b3b40,#0c0c0e)", s: 58 },
    "netflix": { f: "netflix", bg: "#000", s: 50 },
    "youtube": { f: "youtube", bg: "#fff", s: 56 },
    "prime video": { f: "primevideo", bg: "linear-gradient(160deg,#1d2c38,#0b1218)", s: 76 },
    "amazon prime video": { f: "primevideo", bg: "linear-gradient(160deg,#1d2c38,#0b1218)", s: 76 },
    "spotify": { f: "spotify", bg: "#121212", s: 54 },
    "apple music": { f: "applemusic", bg: "linear-gradient(160deg,#fd5c76,#fa233b)", s: 50 },
    "plex": { f: "plex", bg: "#1f1f1f", s: 52 },
    "twitch": { f: "twitch", bg: "#9146ff", s: 48 },
    "hbo max": { f: "hbo", bg: "linear-gradient(160deg,#3a1a8c,#0b0630)", s: 60 },
    "hbo": { f: "hbo", bg: "#000", s: 60 },
    "max": { f: "max", bg: "#002be7", s: 66 },
    "ziggo go": { f: "ziggo", bg: "#f48c00", s: 62 },
    "ziggo": { f: "ziggo", bg: "#f48c00", s: 62 },
    "viaplay": { f: "viaplay", bg: "linear-gradient(160deg,#2a1240,#12061c)", s: 68 },
    "tidal": { f: "tidal", bg: "#000", s: 46 },
    "soundcloud": { f: "soundcloud", bg: "#ff5500", s: 62 },
    "dazn": { f: "dazn", bg: "#0c161c", s: 52 },
    "disney+": { f: "disneyplus", bg: "linear-gradient(160deg,#1b3a8f,#06123d)", s: 78 },
    "videoland": { f: "videoland", bg: "#0a0a0a", s: 92 },
    "npo start": { f: "npo", bg: "#ffffff", s: 70 },
    "npo": { f: "npo", bg: "#ffffff", s: 70 },
    "skyshowtime": { f: "skyshowtime", bg: "#ffffff", s: 82 },
    "kpn tv+": { f: "kpn", bg: "#ffffff", s: 66 },
    "kpn": { f: "kpn", bg: "#ffffff", s: 66 },
    "deezer": { f: "deezer", bg: "#000", s: 56 },
    "internet": { f: "samsunginternet", bg: "#ffffff", s: 70 },
    "samsung internet": { f: "samsunginternet", bg: "#ffffff", s: 70 },
    "smartthings": { f: "smartthings", bg: "linear-gradient(160deg,#15bfff,#0a7fd6)", s: 54 }
  };
  var LOGO_KEYS = Object.keys(LOGOS).sort(function (a, b) { return b.length - a.length; });

  // Only used for the preview in a desktop browser. On the TV, Haven reads your real installed apps.
  var DEMO_APPS = ["Apple TV", "Netflix", "YouTube", "Disney+", "Prime Video", "Videoland", "NPO Start", "HBO Max", "SkyShowtime",
    "Spotify", "Apple Music", "Ziggo GO", "KPN TV+", "Viaplay", "Plex", "Twitch", "DAZN", "TIDAL", "SoundCloud",
    "Deezer", "Internet", "SmartThings"];
  // Apps that are never shown
  var HIDDEN = ["crunchyroll"];
  var DEFAULT_FAVS = ["apple tv", "netflix", "youtube", "disney+", "prime video", "videoland", "npo start", "spotify"];

  var apps = [], favs = [], editMode = false;

  function matchKey(name) {
    var n = String(name).toLowerCase().replace(/\s+/g, " ").trim();
    for (var i = 0; i < LOGO_KEYS.length; i++) {
      var k = LOGO_KEYS[i];
      if (n === k || n.indexOf(k + " ") === 0) return k;
    }
    return null;
  }

  function loadApps(done) {
    if (IS_TV) {
      try {
        var me = "";
        try { me = tizen.application.getCurrentApplication().appInfo.id; } catch (e) {}
        tizen.application.getAppsInfo(function (list) {
          apps = list.filter(function (a) { return a.show !== false && a.id !== me && a.name && HIDDEN.indexOf(String(a.name).toLowerCase().trim()) < 0; })
                     .map(function (a) { return { id: a.id, name: a.name, icon: a.iconPath || null }; });
          sortApps(); done();
        }, function () { apps = []; done(); });
        return;
      } catch (e) {}
    }
    apps = DEMO_APPS.map(function (n, i) { return { id: "demo." + n, name: n, icon: null }; });
    sortApps(); done();
  }
  function sortApps() { apps.sort(function (a, b) { return a.name.localeCompare(b.name, "en"); }); }
  function appById(id) { for (var i = 0; i < apps.length; i++) if (apps[i].id === id) return apps[i]; return null; }

  function initFavs() {
    var saved = store.get("favs", null);
    if (saved) { favs = saved.filter(appById); return; }
    favs = [];
    DEFAULT_FAVS.forEach(function (key) {
      for (var i = 0; i < apps.length; i++) if (matchKey(apps[i].name) === key && favs.indexOf(apps[i].id) < 0) { favs.push(apps[i].id); break; }
    });
  }

  function hue(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return h; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function makeIcon(app) {
    var el = document.createElement("div");
    el.className = "ic";
    var L = LOGOS[matchKey(app.name)];
    function textTile(t, bg) { el.style.background = bg; el.innerHTML = '<span class="ict">' + esc(t) + "</span>"; }
    function letterTile() { var h = hue(app.name); textTile(app.name.charAt(0).toUpperCase(), "linear-gradient(160deg,hsl(" + h + ",55%,52%),hsl(" + ((h + 30) % 360) + ",60%,32%))"); el.querySelector(".ict").style.fontSize = "56px"; }
    if (L && L.f) {
      el.style.background = L.bg;
      var img = new Image(); img.src = "logos/" + L.f + ".svg"; img.alt = "";
      img.style.width = img.style.height = L.s + "%";
      el.appendChild(img);
    } else if (app.icon) {
      el.style.background = "rgba(255,255,255,.12)";
      var im = new Image(); im.className = "full"; im.alt = "";
      im.onerror = function () { el.innerHTML = ""; if (L && L.t) textTile(L.t, L.bg); else letterTile(); };
      im.src = app.icon;
      el.appendChild(im);
    } else if (L && L.t) {
      textTile(L.t, L.bg);
    } else {
      letterTile();
    }
    return el;
  }

  function launch(app) {
    if (IS_TV) {
      try { tizen.application.launch(app.id, null, function () { toast("Couldn't open " + app.name); }); }
      catch (e) { toast("Couldn't open " + app.name); }
    } else {
      toast(app.name + " opens on your TV. This is a preview.");
    }
  }

  /* ---------- Dock ---------- */
  var GRID_SVG = '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7.5" height="7.5" rx="2.2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2.2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2.2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2.2"/></svg>';

  function renderDock() {
    var dock = $("dock");
    dock.innerHTML = "";
    favs.slice(0, 9).forEach(function (id) {
      var app = appById(id); if (!app) return;
      dock.appendChild(slot(makeIcon(app), app.name, function () { launch(app); }));
    });
    var all = document.createElement("div");
    all.className = "ic allapps"; all.innerHTML = GRID_SVG;
    dock.appendChild(slot(all, "All Apps", function () { openView("apps"); }));
  }
  function slot(icon, name, act) {
    var s = document.createElement("div");
    s.className = "slot f";
    s.appendChild(icon);
    var n = document.createElement("div"); n.className = "name"; n.textContent = name;
    s.appendChild(n);
    s._act = act;
    return s;
  }

  /* ---------- All apps ---------- */
  var STAR = '<svg viewBox="0 0 24 24"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8z"/></svg>';

  function renderGrid() {
    var grid = $("grid");
    grid.innerHTML = "";
    apps.forEach(function (app) {
      var t = document.createElement("div");
      t.className = "tile f" + (favs.indexOf(app.id) >= 0 ? " fav" : "");
      t.appendChild(makeIcon(app));
      var st = document.createElement("div"); st.className = "star"; st.innerHTML = STAR; t.appendChild(st);
      var n = document.createElement("div"); n.className = "tname"; n.textContent = app.name; t.appendChild(n);
      t._act = function () {
        if (!editMode) { launch(app); return; }
        var i = favs.indexOf(app.id);
        if (i >= 0) favs.splice(i, 1);
        else if (favs.length >= 9) { toast("You can pick up to 9 favorites"); return; }
        else favs.push(app.id);
        t.classList.toggle("fav", i < 0);
        store.set("favs", favs);
        renderDock();
      };
      grid.appendChild(t);
    });
  }
  function setEdit(on) {
    editMode = on;
    $("apps").classList.toggle("editing", on);
    $("editBtn").classList.toggle("active", on);
    $("editBtn").textContent = on ? "Done" : "Edit Favorites";
    $("appsTitle").textContent = on ? "Edit Favorites" : "All Apps";
    $("appsHint").textContent = on ? "Press OK to add or remove an app from your dock (up to 9)." : "Select an app and press OK to open it.";
  }

  /* ---------- Settings screen ---------- */
  function cityOptions() { var o = Object.keys(CITIES).map(function (c) { return [c, c]; }); o.push(["", "Off"]); return o; }
  var WP_OPTIONS = [["auto", "Follows time of day"]].concat(Wallpapers.list.map(function (id) { return [id, Wallpapers.scenes[id].name]; }));
  var SETTINGS = [
    { key: "screenSize", label: "Screen Size", options: [[85, "85%"], [88, "88%"], [90, "90%"], [92, "92%"], [94, "94%"], [96, "96%"], [98, "98%"], [100, "100%"]] },
    { key: "wallpaper", label: "Wallpaper", options: WP_OPTIONS },
    { key: "clockFont", label: "Clock Style", options: [["apple", "Bold"], ["modern", "Thin"], ["classic", "Classic"], ["rounded", "Rounded"]], font: true },
    { key: "hour12", label: "Time Format", options: [[false, "24-hour"], [true, "12-hour"]] },
    { key: "greeting", label: "Greeting Above Clock", options: [[true, "On"], [false, "Off"]] },
    { key: "city", label: "Weather Location", options: cityOptions() },
    { key: "units", label: "Temperature", options: [["c", "Celsius (°C)"], ["f", "Fahrenheit (°F)"]] },
    { key: "restStyle", label: "Screen Saver", options: [["scenery", "Moving scenery"], ["clock", "Clock on black"]] },
    { key: "restAfter", label: "Start Screen Saver After", options: [[1, "1 minute"], [2, "2 minutes"], [5, "5 minutes"], [10, "10 minutes"], [20, "20 minutes"], [0, "Never"]] },
    { key: "bootSound", label: "Startup Sound", options: [[true, "On"], [false, "Off"]] },
    { label: "Edit Favorite Apps", action: function () { openView("apps"); setEdit(true); } },
    { label: "Preview Screen Saver", action: function () { showRest(); } },
    { label: "Reset All Settings", action: function () {
        cfg = merge(DEFAULTS, {}); store.del("cfg"); store.del("favs"); initFavs(); renderDock(); renderGrid(); applyCfg(true); renderSettings(); toast("All settings are reset");
      } }
  ];
  var FONT_WEIGHT = { apple: 600, modern: 300, classic: 400, rounded: 300 };
  var FONT_FAMILY = { apple: '"Inter Tight", sans-serif', classic: '"Instrument Serif", Georgia, serif', modern: '"Inter Tight", sans-serif', rounded: '"Nunito", sans-serif' };

  function renderSettings() {
    var list = $("setlist"), keep = list.querySelectorAll(".row"), focusIdx = -1, i;
    for (i = 0; i < keep.length; i++) if (keep[i] === focused) focusIdx = i;
    list.innerHTML = "";
    SETTINGS.forEach(function (s) {
      var r = document.createElement("div");
      r.className = "row f";
      var val = "";
      if (s.options) {
        var cur = optIndex(s), lab = s.options[cur][1];
        val = s.font ? '<span class="fontval" style="font-weight:' + FONT_WEIGHT[cfg[s.key]] + ';font-family:' + FONT_FAMILY[cfg[s.key]].replace(/"/g, "&quot;") + '">' + esc(lab) + " 9:41</span>" : esc(lab);
        r.innerHTML = "<span>" + esc(s.label) + '</span><span class="val"><span class="arr">‹</span>' + val + '<span class="arr">›</span></span>';
        r._act = function () { cycle(s, 1); };
        r._lr = function (d) { cycle(s, d); };
      } else {
        r.innerHTML = "<span>" + esc(s.label) + '</span><span class="val"><span class="arr">›</span></span>';
        r._act = s.action;
      }
      list.appendChild(r);
    });
    if (focusIdx >= 0) setFocus(list.querySelectorAll(".row")[focusIdx], true);
  }
  function optIndex(s) { for (var i = 0; i < s.options.length; i++) if (s.options[i][0] === cfg[s.key]) return i; return 0; }
  function cycle(s, d) {
    var i = (optIndex(s) + d + s.options.length) % s.options.length;
    cfg[s.key] = s.options[i][0];
    store.set("cfg", cfg);
    if (s.key === "units") wx = null;
    if (s.key === "hour12") lastMinute = -1;
    applyCfg(s.key === "city" || s.key === "units");
    if (s.key === "hour12") tick();
    renderSettings();
  }

  function applyCfg(refetchWeather) {
    document.body.className = "font-" + cfg.clockFont + (booting ? " booting" : "");
    $("greet").classList.toggle("hidden", !cfg.greeting);
    applyWallpaper();
    fit();
    resetIdle();
    if (refetchWeather) fetchWeather();
  }

  /* ---------- Wallpaper ---------- */
  var wpShown = "", wpUseA = true;
  function applyWallpaper() {
    var id = cfg.wallpaper === "auto" ? Wallpapers.forTime() : cfg.wallpaper;
    if (id === wpShown) return;
    wpShown = id;
    var next = $(wpUseA ? "wpB" : "wpA"), prev = $(wpUseA ? "wpA" : "wpB");
    next.innerHTML = Wallpapers.get(id);
    next.classList.add("on"); prev.classList.remove("on");
    wpUseA = !wpUseA;
  }

  /* ---------- Clock ---------- */
  var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var lastMinute = -1;

  function tick() {
    var d = new Date(), h = d.getHours(), m = d.getMinutes();
    if (m !== lastMinute) {
      lastMinute = m;
      var t = (cfg.hour12 ? (h % 12 || 12) : h) + ":" + ("0" + m).slice(-2);
      var date = DAYS[d.getDay()] + ", " + MONTHS[d.getMonth()] + " " + d.getDate();
      $("bigclock").textContent = t;
      $("rclock").textContent = t;
      $("date").textContent = date;
      $("rdate").textContent = date;
      $("greet").textContent = h < 5 ? "Good Night" : h < 12 ? "Good Morning" : h < 18 ? "Good Afternoon" : "Good Evening";
      if (cfg.wallpaper === "auto") applyWallpaper();
      if (restOn && cfg.restStyle === "clock") moveRestClock();
    }
    updTimer();
  }

  /* ---------- Weather (Open-Meteo: free, no account or API key needed) ---------- */
  var wx = store.get("wx", null);
  var WX_TEXT = { 0: "Clear", 1: "Mostly Clear", 2: "Partly Cloudy", 3: "Cloudy", 45: "Fog", 48: "Fog", 51: "Light Drizzle", 53: "Drizzle", 55: "Drizzle",
    56: "Freezing Drizzle", 57: "Freezing Drizzle", 61: "Light Rain", 63: "Rain", 65: "Heavy Rain", 66: "Freezing Rain", 67: "Freezing Rain", 71: "Light Snow", 73: "Snow", 75: "Heavy Snow",
    77: "Snow", 80: "Showers", 81: "Showers", 82: "Heavy Showers", 85: "Snow Showers", 86: "Snow Showers", 95: "Thunderstorm", 96: "Thunderstorm with Hail", 99: "Thunderstorm with Hail" };

  function wxKind(code, isDay) {
    if (code === 0 || code === 1) return isDay === 0 ? "moon" : "sun";
    if (code === 2) return isDay === 0 ? "cloud" : "partly";
    if (code === 3) return "cloud";
    if (code === 45 || code === 48) return "fog";
    if (code >= 71 && code <= 77 || code === 85 || code === 86) return "snow";
    if (code >= 95) return "storm";
    if (code >= 51) return "rain";
    return "cloud";
  }
  function wxIcon(kind) {
    var cloud = '<path d="M15 37h19a8 8 0 0 0 .6-16A11 11 0 0 0 13.5 23 7 7 0 0 0 15 37z"/>';
    var s = '<svg class="wxi" viewBox="0 0 48 48">';
    if (kind === "sun") s += '<g class="sun"><circle cx="24" cy="24" r="8"/><path d="M24 6v4M24 38v4M6 24h4M38 24h4M11.3 11.3l2.8 2.8M33.9 33.9l2.8 2.8M11.3 36.7l2.8-2.8M33.9 14.1l2.8-2.8"/></g>';
    else if (kind === "moon") s += '<path d="M33 30.5A12 12 0 0 1 19.5 15a12 12 0 1 0 13.5 15.5z" fill="#e8ecff" stroke="none"/>';
    else if (kind === "partly") s += '<g class="sun"><circle cx="18" cy="17" r="6"/><path d="M18 5v3M6 17h3M9.5 8.5l2 2M26.5 8.5l-2 2"/></g>' + cloud;
    else if (kind === "fog") s += '<path d="M10 18h28M6 25h36M10 32h28M14 39h20"/>';
    else if (kind === "rain") s += cloud.replace("37h19", "33h19").replace("7 7 0 0 0 15 37", "7 7 0 0 0 15 33") + '<path class="drop" d="M17 37l-2 5M25 37l-2 5M33 37l-2 5"/>';
    else if (kind === "snow") s += cloud.replace("37h19", "33h19").replace("7 7 0 0 0 15 37", "7 7 0 0 0 15 33") + '<g fill="#fff" stroke="none"><circle cx="17" cy="40" r="1.8"/><circle cx="24" cy="43" r="1.8"/><circle cx="31" cy="40" r="1.8"/></g>';
    else if (kind === "storm") s += cloud.replace("37h19", "33h19").replace("7 7 0 0 0 15 37", "7 7 0 0 0 15 33") + '<path class="bolt" d="M25 33l-4 6h5l-3 6"/>';
    else s += cloud;
    return s + "</svg>";
  }

  function fetchWeather() {
    var c = CITIES[cfg.city];
    if (!c) { renderWeather(); return; }
    var url = "https://api.open-meteo.com/v1/forecast?latitude=" + c[0] + "&longitude=" + c[1] +
      "&current=temperature_2m,weather_code,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=5" +
      (cfg.units === "f" ? "&temperature_unit=fahrenheit" : "");
    var x = new XMLHttpRequest();
    x.open("GET", url);
    x.timeout = 15000;
    x.onload = function () {
      try {
        var j = JSON.parse(x.responseText);
        wx = { city: cfg.city, units: cfg.units, t: Math.round(j.current.temperature_2m), code: j.current.weather_code, day: j.current.is_day, days: [] };
        for (var i = 1; i < j.daily.time.length && i <= 4; i++) {
          wx.days.push({ date: j.daily.time[i], code: j.daily.weather_code[i], max: Math.round(j.daily.temperature_2m_max[i]), min: Math.round(j.daily.temperature_2m_min[i]) });
        }
        store.set("wx", wx);
      } catch (e) {}
      renderWeather();
    };
    x.onerror = x.ontimeout = function () { renderWeather(true); };
    x.send();
  }

  function renderWeather(failed) {
    var el = $("weather");
    el.classList.toggle("hidden", !cfg.city);
    if (!cfg.city) { $("rmeta").textContent = ""; return; }
    if (!wx || wx.city !== cfg.city || (wx.units || "c") !== cfg.units) {
      el.innerHTML = '<div class="wx-head"><span>' + esc(cfg.city) + "</span></div>" +
        '<div class="wx-msg">' + (failed ? "No internet connection. Haven will try again soon." : "Loading weather…") + "</div>";
      $("rmeta").textContent = "";
      return;
    }
    var html = '<div class="wx-head"><span>' + esc(wx.city) + "</span><span>Now</span></div>" +
      '<div class="wx-now">' + wxIcon(wxKind(wx.code, wx.day)) + '<div><div class="wx-t">' + wx.t + '°</div><div class="wx-d">' + esc(WX_TEXT[wx.code] || "") + "</div></div></div>" +
      '<div class="wx-days">';
    wx.days.forEach(function (d) {
      var dd = new Date(d.date + "T12:00:00");
      html += '<div class="wx-day"><span>' + DAYS_SHORT[dd.getDay()] + "</span>" + wxIcon(wxKind(d.code, 1)) + "<b>" + d.max + "°</b><i>" + d.min + "°</i></div>";
    });
    el.innerHTML = html + "</div>";
    $("rmeta").textContent = wx.t + "° · " + (WX_TEXT[wx.code] || "") + " · " + wx.city;
  }

  /* ---------- Timer ---------- */
  var TIMER_MIN = [1, 3, 5, 10, 15, 20, 30, 45, 60];
  var timerEnd = 0;

  function renderTimerSheet() {
    var g = $("tgrid");
    g.innerHTML = "";
    TIMER_MIN.forEach(function (m) {
      var b = document.createElement("div");
      b.className = "tbtn f";
      b.innerHTML = m === 60 ? "1<small>hour</small>" : m + "<small>min</small>";
      b._act = function () { timerEnd = Date.now() + m * 60000; closeSheet(); updTimer(); toast("Timer set for " + (m === 60 ? "1 hour" : m === 1 ? "1 minute" : m + " minutes")); };
      g.appendChild(b);
    });
    if (timerEnd) {
      var s = document.createElement("div");
      s.className = "tbtn stop f"; s.textContent = "Stop Timer";
      s._act = function () { timerEnd = 0; closeSheet(); updTimer(); toast("Timer stopped"); };
      g.appendChild(s);
    }
  }
  function updTimer() {
    var label = "Timer", running = false;
    if (timerEnd) {
      var left = timerEnd - Date.now();
      if (left <= 0) { timerEnd = 0; ring(); }
      else {
        var sec = Math.ceil(left / 1000), h = Math.floor(sec / 3600), mm = Math.floor(sec % 3600 / 60), ss = sec % 60;
        label = (h ? h + ":" + ("0" + mm).slice(-2) : mm) + ":" + ("0" + ss).slice(-2);
        running = true;
      }
    }
    $("timerLabel").textContent = label;
    $("actTimer").classList.toggle("running", running);
  }

  var audio = null, beepInt = null, alarmStop = null;
  function ring() {
    hideRest();
    $("alarm").classList.add("on");
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      var beep = function () {
        [0, 0.22, 0.44].forEach(function (t) {
          var o = audio.createOscillator(), g = audio.createGain(), at = audio.currentTime + t;
          o.type = "sine"; o.frequency.value = 880;
          g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.35, at + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.18);
          o.connect(g); g.connect(audio.destination); o.start(at); o.stop(at + 0.2);
        });
      };
      beep(); beepInt = setInterval(beep, 1600);
    } catch (e) {}
    alarmStop = setTimeout(stopAlarm, 120000);
  }
  function stopAlarm() {
    clearInterval(beepInt); clearTimeout(alarmStop);
    $("alarm").classList.remove("on");
    resetIdle();
  }

  /* ---------- Screen saver ---------- */
  var REST_SCENES = ["dawn", "day", "sunset", "ocean", "desert", "night"];
  var restOn = false, restIdx = 0, restCycle = null, restUseA = true, restFlip = false, idleTimer = null;

  function showRest() {
    if (restOn || $("alarm").classList.contains("on")) return;
    restOn = true;
    var r = $("rest");
    r.className = "rest on " + cfg.restStyle;
    var info = $("restInfo");
    info.style.left = info.style.top = "";
    if (cfg.restStyle === "scenery") {
      restIdx = Math.max(0, REST_SCENES.indexOf(cfg.wallpaper === "auto" ? Wallpapers.forTime() : cfg.wallpaper));
      nextRestScene();
      restCycle = setInterval(function () { restIdx = (restIdx + 1) % REST_SCENES.length; nextRestScene(); }, 45000);
    } else {
      moveRestClock(true);
    }
  }
  function nextRestScene() {
    var next = $(restUseA ? "rA" : "rB"), prev = $(restUseA ? "rB" : "rA");
    next.innerHTML = Wallpapers.get(REST_SCENES[restIdx]);
    next.className = "rwp on " + (restFlip ? "kb2" : "kb");
    prev.classList.remove("on");
    setTimeout(function () { if (!prev.classList.contains("on")) prev.className = "rwp"; }, 1700);
    restUseA = !restUseA; restFlip = !restFlip;
  }
  function moveRestClock(now) {
    var info = $("restInfo");
    var place = function () {
      info.style.left = (140 + Math.random() * 760) + "px";
      info.style.top = (120 + Math.random() * 480) + "px";
      info.classList.remove("fading");
    };
    if (now) { place(); return; }
    info.classList.add("fading");
    setTimeout(place, 1200);
  }
  function hideRest() {
    if (!restOn) return;
    restOn = false;
    clearInterval(restCycle);
    $("rest").className = "rest";
    resetIdle();
  }
  function resetIdle() {
    clearTimeout(idleTimer);
    if (cfg.restAfter > 0) idleTimer = setTimeout(showRest, cfg.restAfter * 60000);
  }

  /* ---------- Screens ---------- */
  var current = "home", lastFocus = {};

  function openView(name) {
    if (focused) lastFocus[current] = focused;
    ["home", "apps", "settings"].forEach(function (v) { $(v).classList.toggle("on", v === name || v === "home"); });
    current = name;
    if (name !== "apps") setEdit(false);
    var target = lastFocus[name];
    if (!target || !document.body.contains(target)) target = layer().querySelector(".f");
    if (name !== "home") { var sc = layer().querySelector(".scroller"); if (sc) sc.scrollTop = 0; target = layer().querySelector(".scroller .f") || target; }
    setFocus(target);
  }
  function openSheet() { if (focused) lastFocus.home = focused; renderTimerSheet(); $("timerSheet").classList.add("on"); setFocus($("tgrid").querySelector(".f")); }
  function closeSheet() { $("timerSheet").classList.remove("on"); setFocus(lastFocus.home || $("actTimer")); }
  function sheetOpen() { return $("timerSheet").classList.contains("on"); }

  function layer() {
    if (sheetOpen()) return $("timerSheet");
    return $(current);
  }

  function goBack() {
    if (sheetOpen()) { closeSheet(); return; }
    if (current === "apps" && editMode) { setEdit(false); return; }
    if (current !== "home") { lastFocus[current] = focused; current = "home"; $("apps").classList.remove("on"); $("settings").classList.remove("on"); setFocus(lastFocus.home || $("dock").querySelector(".f")); return; }
    if (IS_TV) { try { tizen.application.getCurrentApplication().exit(); } catch (e) {} }
  }

  /* ---------- Focus and remote control navigation ---------- */
  var focused = null;

  function setFocus(el, silent) {
    if (!el) return;
    if (focused) focused.classList.remove("focus");
    focused = el;
    el.classList.add("focus");
    var sc = el.closest ? el.closest(".scroller") : null;
    if (sc) {
      var top = el.offsetTop, bottom = top + el.offsetHeight, pad = 60;
      var parent = el.offsetParent;
      while (parent && parent !== sc) { top += parent.offsetTop; bottom += parent.offsetTop; parent = parent.offsetParent; }
      if (top - pad < sc.scrollTop) sc.scrollTop = Math.max(0, top - pad);
      else if (bottom + pad > sc.scrollTop + sc.clientHeight) sc.scrollTop = bottom + pad - sc.clientHeight;
    }
  }

  function center(el) { var r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }

  function move(dx, dy) {
    var els = Array.prototype.slice.call(layer().querySelectorAll(".f"));
    if (!focused || els.indexOf(focused) < 0) { setFocus(els[0]); return; }
    var a = center(focused), best = null, bestScore = Infinity;
    els.forEach(function (e) {
      if (e === focused) return;
      var b = center(e), vx = b.x - a.x, vy = b.y - a.y;
      var prim = dx ? vx * dx : vy * dy;
      if (prim <= 5) return;
      var sec = dx ? Math.abs(vy) : Math.abs(vx);
      var score = prim + sec * 3;
      if (score < bestScore) { bestScore = score; best = e; }
    });
    if (best) setFocus(best);
  }

  function activate(el) {
    if (!el) return;
    if (el._act) { el._act(); return; }
    var a = el.getAttribute("data-act");
    if (a === "timer") openSheet();
    else if (a === "rest") showRest();
    else if (a === "settings") openView("settings");
    else if (a === "edit") setEdit(!editMode);
  }

  /* ---------- Startup animation ---------- */
  var booting = true, introTimer = null;
  function finishIntro() {
    if (!booting) return;
    booting = false;
    clearTimeout(introTimer);
    $("intro").classList.add("done");
    document.body.classList.remove("booting");
    document.body.classList.add("entering");
    setTimeout(function () { document.body.classList.remove("entering"); }, 2200);
  }
  // URL options for development and screenshots:
  //   ?nointro            skip the startup animation and sound
  //   ?screen=apps        open All Apps (also: settings, saver, timer)
  //   ?wallpaper=sunset   force a wallpaper (dawn, day, sunset, night, ocean, desert, graphite)
  var PARAMS = {};
  location.search.replace(/[?&]([^=&]+)(?:=([^&]*))?/g, function (m, k, v) { PARAMS[k] = v === undefined ? true : decodeURIComponent(v); });
  var SKIP_INTRO = !!PARAMS.nointro || !!PARAMS.screen;
  introTimer = setTimeout(finishIntro, SKIP_INTRO ? 0 : 3700);
  if (SKIP_INTRO) { document.getElementById("intro").style.display = "none"; }

  // Startup sound: a soft, warm chord generated in code (no audio file needed)
  function bootSound() {
    if (!cfg.bootSound) return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      var ctx = new AC();
      if (ctx.state === "suspended" && ctx.resume) ctx.resume();
      var now = ctx.currentTime + 0.05;

      var master = ctx.createGain(); master.gain.value = 0.5;
      var comp = ctx.createDynamicsCompressor();
      master.connect(comp); comp.connect(ctx.destination);

      // Echo for a sense of space
      var delay = ctx.createDelay(); delay.delayTime.value = 0.32;
      var fb = ctx.createGain(); fb.gain.value = 0.32;
      var wet = ctx.createGain(); wet.gain.value = 0.28;
      var damp = ctx.createBiquadFilter(); damp.type = "lowpass"; damp.frequency.value = 2600;
      master.connect(delay); delay.connect(damp); damp.connect(fb); fb.connect(delay); damp.connect(wet); wet.connect(comp);

      function tone(freq, start, dur, vol, type) {
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type || "sine"; o.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, start);
        g.gain.exponentialRampToValueAtTime(vol, start + 0.06);
        g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
        o.connect(g); g.connect(master);
        o.start(start); o.stop(start + dur + 0.05);
      }
      // Soft low tone underneath
      tone(130.81, now, 3.6, 0.10, "sine");
      tone(196.00, now + 0.05, 3.4, 0.06, "sine");
      // Rising Cmaj9 arpeggio that sounds like a glass bell
      [[261.63, 0.55], [329.63, 0.70], [392.00, 0.85], [493.88, 1.00], [587.33, 1.18]].forEach(function (n) {
        tone(n[0], now + n[1], 2.8, 0.09, "sine");
        tone(n[0] * 2, now + n[1], 1.6, 0.025, "triangle");
      });
      // Bright finish as the logo lights up
      tone(1046.5, now + 1.95, 2.2, 0.05, "sine");
      tone(1568.0, now + 2.0, 1.8, 0.02, "sine");
      setTimeout(function () { try { ctx.close(); } catch (e) {} }, 7000);
    } catch (e) {}
  }
  if (!SKIP_INTRO) bootSound();

  document.addEventListener("keydown", function (e) {
    var k = e.keyCode;
    resetIdle();
    if (booting) { finishIntro(); e.preventDefault(); return; }
    if ($("alarm").classList.contains("on")) { stopAlarm(); e.preventDefault(); return; }
    if (restOn) { hideRest(); e.preventDefault(); return; }
    if (k === 37 || k === 39) {
      if (focused && focused._lr && layer().contains(focused)) focused._lr(k === 39 ? 1 : -1);
      else move(k === 39 ? 1 : -1, 0);
    }
    else if (k === 38) move(0, -1);
    else if (k === 40) move(0, 1);
    else if (k === 13) activate(focused);
    else if (k === 10009 || k === 27) goBack();
    else return;
    e.preventDefault();
  });

  // Mouse support (handy for the desktop preview)
  document.addEventListener("mouseover", function (e) {
    var el = e.target.closest && e.target.closest(".f");
    if (el && layer().contains(el) && el !== focused) setFocus(el);
  });
  document.addEventListener("click", function (e) {
    resetIdle();
    if (booting) { finishIntro(); return; }
    if ($("alarm").classList.contains("on")) { stopAlarm(); return; }
    if (restOn) { hideRest(); return; }
    var el = e.target.closest && e.target.closest(".f");
    if (el && layer().contains(el)) { setFocus(el); activate(el); }
    else if (sheetOpen() && e.target === $("timerSheet")) closeSheet();
  });
  document.addEventListener("mousemove", resetIdle);

  /* ---------- Toast message ---------- */
  var toastTimer;
  function toast(msg) {
    var t = $("toast");
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2600);
  }

  /* ---------- Scale to the screen ---------- */
  function fit() {
    // Screen Size shrinks the picture a little for TVs that cut off the edges
    var s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080) * ((cfg.screenSize || 100) / 100);
    $("stage").style.transform = "translate(-50%,-50%) scale(" + s + ")";
  }
  window.addEventListener("resize", fit);
  window.addEventListener("load", fit);

  /* ---------- Start ---------- */
  fit();
  loadApps(function () {
    initFavs();
    renderDock();
    renderGrid();
    renderSettings();
    applyCfg(false);
    renderWeather();
    fetchWeather();
    setInterval(fetchWeather, 30 * 60000);
    tick();
    setInterval(tick, 1000);
    setFocus($("dock").querySelector(".f"));
    if (PARAMS.wallpaper && Wallpapers.scenes[PARAMS.wallpaper]) { cfg.wallpaper = PARAMS.wallpaper; applyWallpaper(); }
    if (PARAMS.screen === "apps" || PARAMS.screen === "settings") openView(PARAMS.screen);
    if (PARAMS.screen === "saver") setTimeout(showRest, 50);
    if (PARAMS.screen === "timer") openSheet();
  });

  // For testing in the preview
  window.Haven = { replayIntro: function () { location.reload(); }, showRest: showRest, ring: ring, cfg: function () { return cfg; } };
})();
