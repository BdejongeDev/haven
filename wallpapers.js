// Drawn wallpapers (1920x1080). Each scene is an SVG generated in code.
var Wallpapers = (function () {
  var W = 1920, H = 1080;

  function rng(seed) {
    return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  }

  // A mountain ridge or dune as a closed path down to the bottom edge
  function ridge(seed, baseY, amp, freq, rough, step) {
    var r = rng(seed), p1 = r() * 6.28, p2 = r() * 6.28, p3 = r() * 6.28;
    var d = "M0," + H + " ", x, y, n = 0;
    step = step || 20;
    for (x = 0; x <= W + step; x += step) {
      n = n * 0.6 + (r() - 0.5) * rough;
      y = baseY - amp * (0.55 * Math.sin(x * freq + p1) + 0.3 * Math.sin(x * freq * 2.3 + p2) + 0.15 * Math.sin(x * freq * 5.1 + p3)) + n;
      d += "L" + x + "," + y.toFixed(1) + " ";
    }
    return d + "L" + (W + step) + "," + H + " Z";
  }

  function wave(seed, baseY, amp, freq) {
    var r = rng(seed), p = r() * 6.28, d = "M0," + H + " ", x, y;
    for (x = 0; x <= W + 20; x += 20) {
      y = baseY + amp * Math.sin(x * freq + p) + amp * 0.35 * Math.sin(x * freq * 2.7 + p * 2);
      d += "L" + x + "," + y.toFixed(1) + " ";
    }
    return d + "L" + (W + 20) + "," + H + " Z";
  }

  function lerp(a, b, t) {
    var A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
    var c = [16, 8, 0].map(function (s) { var x = (A >> s) & 255, y = (B >> s) & 255; return Math.round(x + (y - x) * t); });
    return "#" + c.map(function (v) { return ("0" + v.toString(16)).slice(-2); }).join("");
  }

  function sky(id, stops) {
    var s = '<linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1">';
    stops.forEach(function (c, i) { s += '<stop offset="' + (i / (stops.length - 1)) + '" stop-color="' + c + '"/>'; });
    return s + "</linearGradient>";
  }

  function stars(seed, count, maxY) {
    var r = rng(seed), s = "";
    for (var i = 0; i < count; i++) {
      var o = (0.25 + r() * 0.75).toFixed(2), rad = (r() < 0.08 ? 1.8 : 0.5 + r() * 0.9).toFixed(1);
      s += '<circle cx="' + (r() * W).toFixed(0) + '" cy="' + (r() * maxY).toFixed(0) + '" r="' + rad + '" fill="#fff" opacity="' + o + '"/>';
    }
    return s;
  }

  // Mountains: layers from far (light, hazy) to near (dark)
  function mountains(o) {
    var defs = sky("sky", o.sky), body = '<rect width="' + W + '" height="' + H + '" fill="url(#sky)"/>';
    if (o.stars) body += stars(7, 260, 620);
    if (o.sun) {
      defs += '<radialGradient id="glow"><stop offset="0" stop-color="' + o.sun.glow + '" stop-opacity=".9"/><stop offset="1" stop-color="' + o.sun.glow + '" stop-opacity="0"/></radialGradient>';
      body += '<circle cx="' + o.sun.x + '" cy="' + o.sun.y + '" r="' + o.sun.r * 6 + '" fill="url(#glow)"/>';
      body += '<circle cx="' + o.sun.x + '" cy="' + o.sun.y + '" r="' + o.sun.r + '" fill="' + o.sun.color + '"/>';
    }
    var n = o.layers.length;
    // Soft haze that fades smoothly from invisible to a hint of color
    defs += '<linearGradient id="hz" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + o.haze + '" stop-opacity="0"/><stop offset=".35" stop-color="' + o.haze + '" stop-opacity=".12"/><stop offset="1" stop-color="' + o.haze + '" stop-opacity=".04"/></linearGradient>';
    o.layers.forEach(function (c, i) {
      var t = i / (n - 1);
      var base = 560 + t * 400, amp = 170 - t * 90, freq = 0.0022 + t * 0.0012, rough = 16 - t * 12;
      defs += '<linearGradient id="m' + i + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + c + '"/><stop offset="1" stop-color="' + lerp(c, o.layers[n - 1], 0.35) + '"/></linearGradient>';
      body += '<path d="' + ridge(o.seed + i * 13, base, amp, freq, rough) + '" fill="url(#m' + i + ')"/>';
    });
    return svg(defs, body);
  }

  function svg(defs, body) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="xMidYMid slice" width="100%" height="100%"><defs>' + defs + "</defs>" + body + "</svg>";
  }

  var SCENES = {
    dawn: { name: "Dawn", draw: function () {
      return mountains({ seed: 11, sky: ["#14284f", "#3f679d", "#e9c79f", "#fde6b8"], sun: { x: 1300, y: 640, r: 60, color: "#fff0cc", glow: "#ffcf86" },
        layers: ["#93a7c2", "#6c84a6", "#4b6286", "#2f4366", "#1a2840"], haze: "#f5dcb8" }); } },
    day: { name: "Day", draw: function () {
      return mountains({ seed: 23, sky: ["#3f7fd1", "#7db3ea", "#cfe5f6"], sun: { x: 1020, y: 300, r: 46, color: "#fffbe8", glow: "#ffffff" },
        layers: ["#a9c3df", "#7fa3c4", "#55809f", "#2f5d6e", "#1b3d42"], haze: "#e8f2fb" }); } },
    sunset: { name: "Sunset", draw: function () {
      return mountains({ seed: 37, sky: ["#0d1b38", "#27497a", "#c97a3e", "#f3ac55", "#fde0a0"], sun: { x: 960, y: 660, r: 90, color: "#ffe2a6", glow: "#ffa040" },
        layers: ["#8c6040", "#6b4a34", "#4a3528", "#2e221d", "#16110f"], haze: "#ffb070" }); } },
    night: { name: "Night", draw: function () {
      return mountains({ seed: 41, sky: ["#030616", "#0b1638", "#1d2c5c"], stars: true, sun: { x: 1480, y: 230, r: 40, color: "#f2f0e6", glow: "#a9b8ff" },
        layers: ["#2a3766", "#1f2a52", "#161e3e", "#0e142b", "#070a18"], haze: "#5a6db0" }); } },
    ocean: { name: "Ocean", draw: function () {
      var defs = sky("sky", ["#5ba6cf", "#a6d3e6", "#f4e6cf"]), body = '<rect width="' + W + '" height="' + H + '" fill="url(#sky)"/>';
      defs += '<radialGradient id="glow"><stop offset="0" stop-color="#fff6dc" stop-opacity=".9"/><stop offset="1" stop-color="#fff6dc" stop-opacity="0"/></radialGradient>';
      body += '<circle cx="1450" cy="520" r="320" fill="url(#glow)"/><circle cx="1450" cy="520" r="54" fill="#fffaf0"/>';
      body += '<path d="' + ridge(5, 600, 60, 0.0016, 6) + '" fill="#7fa6b6" opacity=".7"/>';
      ["#4f9fb3", "#3a8aa1", "#27728a", "#175a70", "#0b3f52"].forEach(function (c, i) { body += '<path d="' + wave(60 + i, 640 + i * 95, 14 + i * 6, 0.004 - i * 0.0004) + '" fill="' + c + '"/>'; });
      return svg(defs, body); } },
    desert: { name: "Desert", draw: function () {
      var defs = sky("sky", ["#e98a5a", "#f6b98a", "#fde4c6"]), body = '<rect width="' + W + '" height="' + H + '" fill="url(#sky)"/>';
      body += '<circle cx="560" cy="420" r="70" fill="#fff1d6" opacity=".95"/>';
      ["#e8a77a", "#d98a5c", "#c06e45", "#9c5233", "#6f3622"].forEach(function (c, i) { body += '<path d="' + ridge(90 + i * 7, 640 + i * 90, 70 - i * 6, 0.0014 + i * 0.0002, 0, 24) + '" fill="' + c + '"/>'; });
      return svg(defs, body); } },
    graphite: { name: "Graphite", draw: function () {
      var defs = '<radialGradient id="g" cx=".3" cy=".2" r="1"><stop offset="0" stop-color="#3a3d45"/><stop offset=".6" stop-color="#17181c"/><stop offset="1" stop-color="#0b0b0d"/></radialGradient>';
      return svg(defs, '<rect width="' + W + '" height="' + H + '" fill="url(#g)"/>'); } }
  };

  // Unique ids every time, so two wallpapers on screen never borrow each other's gradients
  var cache = {}, uid = 0;
  function get(id) {
    if (!SCENES[id]) id = "night";
    if (!cache[id]) cache[id] = SCENES[id].draw();
    var n = "_" + (++uid);
    return cache[id].replace(/id="([^"]+)"/g, 'id="$1' + n + '"').replace(/url\(#([^)]+)\)/g, "url(#$1" + n + ")");
  }

  // Scene that matches the time of day
  function forTime(d) {
    var h = (d || new Date()).getHours();
    if (h >= 5 && h < 8) return "dawn";
    if (h >= 8 && h < 17) return "day";
    if (h >= 17 && h < 21) return "sunset";
    return "night";
  }

  return { scenes: SCENES, get: get, forTime: forTime, list: ["dawn", "day", "sunset", "night", "ocean", "desert", "graphite"] };
})();
