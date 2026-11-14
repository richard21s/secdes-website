(function () {
  var d = document;
  d.documentElement.classList.add("js");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Every page opens at its start, or at the section its link names (e.g. kontak.html#uji-coba).
     Browsers and the artifact viewer can otherwise carry the previous page's scroll position over. */
  try { if ("scrollRestoration" in history) history.scrollRestoration = "manual"; } catch (e) {}
  var touched = false;
  ["wheel", "touchstart", "keydown", "mousedown"].forEach(function (n) {
    window.addEventListener(n, function () { touched = true; }, { passive: true, once: true });
  });
  function hashTarget() {
    var id = "";
    try { id = decodeURIComponent(location.hash.slice(1)); } catch (e) {}
    return id ? d.getElementById(id) : null;
  }
  function toStart() {
    var t = hashTarget();
    if (t) { t.scrollIntoView({ block: "start" }); return; }
    window.scrollTo(0, 0);
    // When the viewer sizes the frame to the page and scrolls outside it, bring the page top into view there too.
    try { if (window.top !== window.self && d.body) d.body.scrollIntoView({ block: "start" }); } catch (e) {}
  }
  toStart();
  window.addEventListener("load", function () {
    if (!touched) toStart();
    setTimeout(function () { d.documentElement.classList.add("smooth"); }, 50);
  });
  window.addEventListener("pageshow", function (e) { if (e.persisted) toStart(); });
  var LABEL = { ok: "Aman", warn: "Perlu Dicek", bad: "Berbahaya" };
  function $(s, c) { return (c || d).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); }
  function statusEl(el, s) { el.className = "status " + s; el.innerHTML = '<i class="dot"></i>'; el.append(LABEL[s]); }

  /* Logo: the animated WebP plays once per page (intro), then the logo rests on its still final frame
     and switches to the idle state: a light sweep across the three bars. Each page gets a fresh copy of
     the animation, so the intro always starts from its first frame. The footer logo plays when it scrolls into view. */
  (function () {
    var logos = $$(".brand img");
    if (!logos.length) return;
    var STILL = "assets/secdes-logo-still.png", PLAY_MS = 5920;
    var original = logos[0].getAttribute("src");
    new Image().src = STILL;
    function idle(img) { img.onload = img.onerror = null; img.src = STILL; var b = img.closest(".brand"); if (b) b.classList.add("idle"); }
    function settle(img) { setTimeout(function () { idle(img); }, PLAY_MS); }
    var blob = null;
    function replay(img) {
      if (!blob) return;
      var url = URL.createObjectURL(blob);
      img.onerror = function () { img.onerror = null; img.src = original; settle(img); };
      img.onload = function () { img.onload = null; settle(img); setTimeout(function () { URL.revokeObjectURL(url); }, PLAY_MS + 1000); };
      img.src = url;
    }
    var fallback = function () { logos.forEach(function (img) { if (img.complete) settle(img); else img.addEventListener("load", function () { settle(img); }, { once: true }); }); };
    if (!window.fetch || !window.URL || !URL.createObjectURL) { fallback(); return; }
    fetch(original).then(function (r) { return r.ok ? r.blob() : null; }).then(function (b) {
      if (!b) { fallback(); return; }
      blob = b;
      var foot = $(".foot .brand img");
      logos.forEach(function (img) { if (img !== foot) replay(img); });
      if (foot && "IntersectionObserver" in window) {
        var seen = new IntersectionObserver(function (es) {
          if (es[0].isIntersecting) { replay(foot); seen.disconnect(); }
        }, { threshold: 0.6 });
        seen.observe(foot);
      } else if (foot) {
        replay(foot);
      }
    }).catch(fallback);
  })();

  /* Theme: light by default, the visitor's choice is remembered on this device. */
  var root = d.documentElement, themeBtn = $(".theme-btn");
  function isDark() { return root.getAttribute("data-sd-theme") === "dark"; }
  /* The theme must survive moving between pages. localStorage is not available everywhere (for example in a
     sandboxed viewer), so the choice is also kept in window.name (kept by the tab across page loads) and
     added as ?theme= to every internal link when it is followed. */
  function rememberTheme(t) {
    try { localStorage.setItem("secdes-theme", t); } catch (e) {}
    try { window.name = (window.name || "").replace(/\s*secdes-theme:(dark|light)/, "") + " secdes-theme:" + t; } catch (e) {}
  }
  rememberTheme(isDark() ? "dark" : "light");
  d.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a || a.target === "_blank") return;
    var href = a.getAttribute("href");
    if (!/^[\w-]+\.html([?#]|$)/.test(href)) return;
    var hash = "", i = href.indexOf("#");
    if (i > -1) { hash = href.slice(i); href = href.slice(0, i); }
    href = href.replace(/([?&])theme=(dark|light)&?/, "$1").replace(/[?&]$/, "");
    a.setAttribute("href", href + (href.indexOf("?") > -1 ? "&" : "?") + "theme=" + (isDark() ? "dark" : "light") + hash);
  }, true);
  function syncThemeBtn() { if (themeBtn) themeBtn.setAttribute("aria-label", isDark() ? "Ganti ke tema terang" : "Ganti ke tema gelap"); }
  syncThemeBtn();
  if (themeBtn) themeBtn.addEventListener("click", function () {
    var next = isDark() ? "light" : "dark";
    root.setAttribute("data-sd-theme", next);
    rememberTheme(next);
    syncThemeBtn();
    d.dispatchEvent(new CustomEvent("secdes-theme"));
  });

  /* Header and mobile menu */
  var head = $(".site-head"), menu = $(".menu-btn"), mnav = $("#mnav");
  function onScroll() { head.classList.toggle("solid", window.scrollY > 8); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  function setMenu(open) {
    head.classList.toggle("open", open);
    d.body.classList.toggle("menu-open", open);
    menu.setAttribute("aria-expanded", String(open));
    menu.setAttribute("aria-label", open ? "Tutup menu" : "Buka menu");
    if (open) setTimeout(function () { var first = $("a", mnav); if (first) first.focus({ preventScroll: true }); }, 280);
  }
  menu.addEventListener("click", function () { setMenu(!head.classList.contains("open")); });
  $$("a", mnav).forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
  d.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && head.classList.contains("open")) { setMenu(false); menu.focus(); }
  });
  window.addEventListener("resize", function () { if (window.innerWidth > 1000 && head.classList.contains("open")) setMenu(false); });

  /* Pricing: period switch updates every price card and its buy link. */
  var OFF = { 1: 0, 6: 10, 12: 20 };
  function juta(n) { return "Rp" + (Math.round(n * 100) / 100).toLocaleString("id-ID") + " juta"; }
  function applyPeriod(months) {
    $$("[data-price]").forEach(function (box) {
      if (box.tagName === "OPTION") return;
      var base = +box.dataset.price, off = OFF[months], mo = base * (100 - off) / 100;
      box.classList.toggle("no-disc", !off);
      $("[data-was]", box).textContent = juta(base);
      $("[data-off]", box).textContent = "Hemat " + off + "%";
      $("[data-now]", box).textContent = juta(mo);
      $("[data-bill]", box).textContent = months === 1 ? "ditagih bulanan, dapat dihentikan kapan saja" : "ditagih " + juta(mo * months) + " per " + months + " bulan";
    });
    $$("[data-buy]").forEach(function (a) { a.href = "beli.html#" + a.dataset.buy + "-" + months; });
  }
  $$('input[name="periode-tampil"]').forEach(function (r) {
    r.addEventListener("change", function () {
      var m = +r.value;
      $$('input[name="periode-tampil"][value="' + m + '"]').forEach(function (o) { o.checked = true; });
      applyPeriod(m);
    });
  });

  /* Reveal on scroll, count-up numbers, photo parallax */
  /* Reveal both ways. rootMargin is ignored when the page runs inside a cross-origin frame (the published
     viewer), so the decision uses how much of the item is visible and on which edge it is cut off:
     an item cut off at the bottom fades out while it is still partly on screen (scrolling up), and an item
     leaving through the top stays shown. */
  // Scrolling down: an item appears once NEED_IN px of its rest position is on screen. Scrolling up: it fades
  // out a little earlier, when less than NEED_OUT px is left. Direction comes from the item's rest position
  // (its box minus the current animation shift), so the animation itself never flips the state.
  var STEPS = [0, 0.005, 0.01];
  for (var s = 1; s <= 50; s++) STEPS.push(s / 50);
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      var el = e.target, b = e.boundingClientRect, r = e.intersectionRect;
      var ty = 0;
      try { var m = getComputedStyle(el).transform; if (m && m !== "none") ty = new DOMMatrixReadOnly(m).m42; } catch (x) {}
      var first = el._rest == null;
      var rest = b.top - ty, moved = first ? 0 : rest - el._rest;
      if (Math.abs(moved) < 1 && !first) return;   // only the animation moved, not the page
      el._rest = rest;
      var H = window.innerHeight;
      // On page load, anything already peeking above the fold shows at once, so visitors can see there is more below.
      var needIn = first ? Math.min(b.height * 0.1, 24) : Math.min(b.height * 0.3, 90, H * 0.12);
      var needOut = Math.min(b.height * 0.5, 170, H * 0.22);
      var vis = e.isIntersecting ? Math.min(b.height, r.height + Math.max(0, ty)) : 0;
      if (e.isIntersecting) el._cut = r.bottom < b.bottom - 1 ? "bottom" : r.top > b.top + 1 ? "top" : "none";
      if (moved > 0 && el._cut === "bottom" && vis < needOut) {
        el.classList.remove("in");
      } else if (moved <= 0 && e.isIntersecting && vis >= needIn) {
        el.classList.add("in");
        if (el.dataset.count && !el.dataset.counted) { el.dataset.counted = "1"; countUp(el); }
      }
    });
  }, { threshold: STEPS });
  $$(".rv, [data-count]").forEach(function (el) { io.observe(el); });
  function countUp(el) {
    var to = +el.dataset.count, node = el.firstChild, t0 = performance.now();
    if (reduce) { node.textContent = to; return; }
    (function tick(t) {
      var p = Math.min((t - t0) / 1400, 1);
      node.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  }
  var bgs = $$(".band .bg");
  if (bgs.length && !reduce) {
    window.addEventListener("scroll", function () {
      bgs.forEach(function (bg) {
        var r = bg.parentNode.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) return;
        bg.style.transform = "translateY(" + ((r.top + r.height / 2 - innerHeight / 2) * -0.08).toFixed(1) + "px)";
      });
    }, { passive: true });
  }

  /* Home: 3D globe. Arcs are illustrative, not real attack data. */
  var globeFire = function () {};
  var gEl = $("#globe");
  if (gEl && window.THREE) {
    try { initGlobe(gEl); } catch (e) { gEl.hidden = true; }
  }
  function initGlobe(el) {
    var T = THREE, R = 2, COLORS = { ok: 0x3ddc97, warn: 0xffb224, bad: 0xff5a4d };
    var renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);
    var scene = new T.Scene();
    var cam = new T.PerspectiveCamera(30, 1, 0.1, 100);
    cam.position.set(0, 0, 9);
    var g = new T.Group();
    scene.add(g);

    // Materials are kept so the globe can follow the light/dark theme.
    var mSphere = new T.MeshBasicMaterial({ color: 0x050d15 });
    var mDots = new T.PointsMaterial({ color: 0x8be4ff, size: 0.021, transparent: true, opacity: 0.9 });
    var mPin = new T.MeshBasicMaterial({ color: 0xffffff });
    g.add(new T.Mesh(new T.SphereGeometry(R, 72, 72), mSphere));
    // No wireframe grid: a plain sphere with dotted land reads cleaner.
    // Hologram continents: one glowing dot wherever the land/water mask says land.
    // SECDES_LAND is a 512x256 land bitmap packed as hex (assets/land.js, derived from three-globe's earth-water.png), so no image has to load.
    var LAND = window.SECDES_LAND;
    if (LAND) {
      var isLand = function (lat, lon) {
        var i = Math.min(255, Math.floor((90 - lat) / 180 * 256)) * 512 + Math.min(511, Math.floor((lon + 180) / 360 * 512));
        return parseInt(LAND.charAt(i >> 2), 16) >> (3 - (i & 3)) & 1;
      };
      var v = [];
      for (var lat = -58; lat <= 84; lat += 0.85) {
        var step = 0.85 / Math.max(0.2, Math.cos(lat * Math.PI / 180));
        for (var lon = -180; lon < 180; lon += step) {
          if (isLand(lat, lon)) { var p = pos(lat, lon, R * 1.004); v.push(p.x, p.y, p.z); }
        }
      }
      var geo = new T.BufferGeometry();
      geo.setAttribute("position", new T.Float32BufferAttribute(v, 3));
      g.add(new T.Points(geo, mDots));
    }
    var mGlow = new T.ShaderMaterial({
      uniforms: { c: { value: new T.Color(0x5cd1ff) }, k: { value: 1.0 } },
      vertexShader: "varying vec3 n; void main(){ n = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: "uniform vec3 c; uniform float k; varying vec3 n; void main(){ float i = pow(max(0.0, 0.6 - dot(n, vec3(0.0, 0.0, 1.0))), 4.0); gl_FragColor = vec4(c, clamp(i * k, 0.0, 1.0)); }",
      side: T.BackSide, transparent: true, depthWrite: false
    });
    scene.add(new T.Mesh(new T.SphereGeometry(R * 1.06, 72, 72), mGlow));

    function pos(lat, lon, r) {
      var phi = (90 - lat) * Math.PI / 180, th = (lon + 180) * Math.PI / 180;
      return new T.Vector3(-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th));
    }
    var home = pos(-6.2, 106.8, R);
    var pin = new T.Mesh(new T.SphereGeometry(0.03, 16, 16), mPin);
    pin.position.copy(home);
    g.add(pin);
    var ring = new T.Mesh(new T.RingGeometry(0.05, 0.062, 48), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, side: T.DoubleSide }));
    ring.position.copy(pos(-6.2, 106.8, R * 1.004));
    ring.lookAt(home.clone().multiplyScalar(3));
    g.add(ring);

    // Attack sources from many directions (illustrative).
    var SRC = [[55.7, 37.6], [6.5, 3.4], [-23.5, -46.6], [40.7, -74], [52.4, 4.9], [39.9, 116.4], [19, 72.8], [-33.9, 151.2], [35.7, 139.7], [30, 31.2], [1.3, 103.8], [51.5, -0.1], [-1.3, 36.8], [37.6, 127],
      [64.1, -21.9], [59.3, 18.1], [50.4, 30.5], [41, 28.9], [33.7, 73], [25.2, 55.3], [13.7, 100.5], [14.6, 121], [21, 105.8], [22.3, 114.2], [31.2, 121.5], [43.1, 131.9], [-37.8, 145], [-41.3, 174.8], [-6.2, 39.3],
      [-26.2, 28], [9.1, 7.4], [33.6, -7.6], [40.4, -3.7], [45.5, 9.2], [48.9, 2.3], [34, -118.2], [37.8, -122.4], [47.6, -122.3], [19.4, -99.1], [4.7, -74.1], [-12, -77], [-34.6, -58.4], [45.5, -73.6], [25.8, -80.2], [61.2, -149.9]];
    var arcs = [];
    // Only sources on the visible side of the planet, so every arc clearly ends on the Jakarta pin.
    var NEAR = SRC.filter(function (s) { return pos(s[0], s[1], R).angleTo(home) < 2.0; });
    function fire(status, instant) {
      var s = NEAR[Math.floor(Math.random() * NEAR.length)], a = pos(s[0], s[1], R);
      var mid = a.clone().normalize().add(home.clone().normalize()).normalize().multiplyScalar(R + a.distanceTo(home) * 0.38);
      var pts = new T.QuadraticBezierCurve3(a, mid, home).getPoints(80);
      var line = new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color: COLORS[status], transparent: true }));
      line.geometry.setDrawRange(0, instant ? 81 : 0);
      g.add(line);
      arcs.push({ line: line, t: instant ? 1 : 0, status: status });
      if (arcs.length > 22) { var old = arcs.shift(); g.remove(old.line); old.line.geometry.dispose(); old.line.material.dispose(); }
    }
    globeFire = fire;

    var base = -(106.8 + 90) * Math.PI / 180 + 0.42, drag = { x: 0, y: 0 }, last = null, pulse = 0, pulseColor = 0xffffff;
    function paint() {
      var dark = root.getAttribute("data-sd-theme") === "dark";
      mSphere.color.set(dark ? 0x0d1628 : 0xe6edf8);
      mDots.color.set(dark ? 0x7dd3fc : 0x1d4ed8); mDots.opacity = dark ? 0.9 : 1; mDots.size = dark ? 0.022 : 0.027;
      mPin.color.set(dark ? 0xffffff : 0x1d4ed8);
      mGlow.uniforms.c.value.set(dark ? 0x5cd1ff : 0x3b82f6); mGlow.uniforms.k.value = dark ? 0.8 : 1.6;
      pulseColor = dark ? 0xffffff : 0x1d4ed8;
      renderer.render(scene, cam);
    }
    d.addEventListener("secdes-theme", paint);
    el.addEventListener("pointerdown", function (e) { last = [e.clientX, e.clientY]; el.setPointerCapture(e.pointerId); });
    el.addEventListener("pointermove", function (e) {
      if (!last) return;
      drag.y += (e.clientX - last[0]) * 0.005;
      drag.x = Math.max(-0.6, Math.min(0.6, drag.x + (e.clientY - last[1]) * 0.004));
      last = [e.clientX, e.clientY];
    });
    ["pointerup", "pointercancel"].forEach(function (n) { el.addEventListener(n, function () { last = null; }); });

    function size() {
      var w = el.clientWidth, h = el.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
    }
    window.addEventListener("resize", size);
    size();

    var visible = true;
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(el);
    var t0 = performance.now();
    function frame(now) {
      if (!reduce) requestAnimationFrame(frame);
      if (!visible) return;
      var t = (now - t0) / 1000;
      g.rotation.y = base + Math.sin(t * 0.16) * 0.3 + drag.y;
      g.rotation.x = 0.16 + drag.x;
      arcs.forEach(function (a) {
        if (a.t < 1) {
          a.t = Math.min(1, a.t + 0.02);
          a.line.geometry.setDrawRange(0, Math.floor(a.t * 81));
          if (a.t === 1) { pulse = 1; pulseColor = COLORS[a.status]; }
        } else if (!reduce) {
          a.line.material.opacity = Math.max(0.12, a.line.material.opacity - 0.006);
        }
      });
      pulse = Math.max(0, pulse - 0.016);
      var sc = 1 + (1 - pulse) * 4;
      ring.scale.set(sc, sc, sc);
      ring.material.opacity = pulse;
      ring.material.color.set(pulseColor);
      renderer.render(scene, cam);
    }
    paint();
    ["bad", "ok", "warn", "ok", "bad", "warn"].forEach(function (s) { fire(s, true); });
    frame(t0);
    // Extra traffic between feed updates so attempts keep arriving from many directions.
    if (!reduce) setInterval(function () {
      if (!visible || d.hidden) return;
      var r = Math.random();
      fire(r < 0.45 ? "bad" : r < 0.75 ? "warn" : "ok");
    }, 650);
  }

  /* Home: activity feed (example data) */
  var feed = $("#feed");
  if (feed) {
    var pool = [
      ["Login karyawan dari jaringan kantor", "ok"], ["Satu sesi mengakses ribuan data nasabah", "bad"], ["Pemindaian port secara berurutan", "warn"],
      ["Pembayaran rutin ke vendor terdaftar", "ok"], ["Akses ke Akun Jebakan di portal admin", "bad"], ["Login dari lokasi yang belum dikenal", "warn"],
      ["Perintah database pada input formulir", "bad"], ["Akses API dari aplikasi resmi", "ok"]
    ], k = 0, min = 2 * 60 + 14;
    var add = function (animate) {
      var e = pool[k++ % pool.length];
      min += 1 + (k % 3);
      var li = d.createElement("li"), time = d.createElement("time"), txt = d.createElement("span"), st = d.createElement("span");
      time.textContent = String(Math.floor(min / 60) % 24).padStart(2, "0") + "." + String(min % 60).padStart(2, "0");
      txt.textContent = e[0];
      statusEl(st, e[1]);
      li.append(time, txt, st);
      if (animate) li.className = "new";
      feed.prepend(li);
      if (feed.children.length > 4) feed.lastElementChild.remove();
      if (animate) globeFire(e[1]);
    };
    for (var n = 0; n < 4; n++) add(false);
    if (!reduce) setInterval(function () { if (!d.hidden) add(true); }, 2800);
  }

  /* Produk: attack simulator */
  var simList = $("#sim-list");
  if (simList) {
    var A = [
      { a: "Aplikasi", n: "Injection", arti: "Penyisipan perintah berbahaya melalui formulir, URL, atau API.", tanda: "Input formulir berisi perintah database.", s: "bad", aksi: "Permintaan diblokir sebelum mencapai database.", m: "Upaya pengambilan data melalui formulir pengajuan terdeteksi. Permintaan telah diblokir." },
      { a: "Aplikasi", n: "Pemindaian celah", arti: "Upaya mencari kelemahan pada sistem.", tanda: "Banyak alamat dan port diakses secara berurutan.", s: "warn", aksi: "Sumber dipantau, dan status dinaikkan menjadi Berbahaya jika aktivitas berlanjut.", m: "Terdeteksi pihak yang sedang memetakan sistem Anda. Belum ada akses yang berhasil." },
      { a: "Aplikasi", n: "Program jahat", arti: "Pengunggahan file berbahaya ke server.", tanda: "File unggahan berisi skrip mencurigakan.", s: "bad", aksi: "File ditolak dan tidak disimpan.", m: "File berbahaya pada halaman unggah dokumen nasabah telah ditolak." },
      { a: "Akun", n: "Brute force", arti: "Upaya menebak kata sandi secara berulang.", tanda: "Ratusan login gagal dalam waktu singkat.", s: "bad", aksi: "Sumber percobaan diblokir.", m: "428 percobaan menebak kata sandi pada portal VPN telah dihentikan." },
      { a: "Akun", n: "Credential stuffing", arti: "Penggunaan kredensial yang bocor untuk mengakses banyak akun.", tanda: "Satu sumber mencoba masuk ke banyak akun.", s: "bad", aksi: "Sumber diblokir dan akun terkait ditandai.", m: "Kredensial yang bocor dicoba pada 37 akun. Pemilik akun perlu segera mengganti kata sandi." },
      { a: "Akun", n: "Pengambilalihan akun", arti: "Akun yang sah digunakan oleh pihak lain.", tanda: "Login dari perangkat baru pada pukul 02.14.", s: "warn", aksi: "Akses ditahan hingga pemilik akun melakukan verifikasi.", m: "Akun staf keuangan diakses dari perangkat baru. Menunggu verifikasi pemilik akun." },
      { a: "Akun", n: "Akun Jebakan", arti: "Percobaan akses ke akun tiruan yang sengaja dipasang.", tanda: "Login menggunakan Akun Jebakan.", s: "bad", aksi: "Alert prioritas tinggi dikirim ke tim keamanan.", m: "Akun yang tidak digunakan oleh siapa pun baru saja diakses. Ini merupakan indikasi kuat adanya penyusup." },
      { a: "Data", n: "Akses tanpa izin", arti: "Upaya membuka data pihak lain atau menu administrator.", tanda: "Satu pengguna mengakses ribuan data nasabah.", s: "bad", aksi: "Sesi dihentikan.", m: "Satu sesi mengakses ribuan data nasabah. Sesi telah dihentikan." },
      { a: "Data", n: "Pencurian data", arti: "Pengambilan data dalam jumlah besar.", tanda: "Unduhan massal atau pengiriman data ke alamat tidak dikenal.", s: "bad", aksi: "Pengambilan data dihentikan dan tim keamanan diberi notifikasi.", m: "Unduhan massal data nasabah dihentikan sebelum selesai." },
      { a: "Dana", n: "Pencurian dana", arti: "Pengiriman dana secara tidak sah.", tanda: "Transfer bernilai besar ke rekening baru, atau nominal yang dipecah menjadi beberapa transaksi.", s: "warn", aksi: "Transaksi ditahan sementara untuk diverifikasi.", m: "Transfer bernilai besar ke rekening baru ditahan. Menunggu persetujuan petugas berwenang." },
      { a: "Pembanding", n: "Aktivitas normal", arti: "Karyawan bekerja sesuai pola normal.", tanda: "Login dari perangkat dan lokasi yang terdaftar.", s: "ok", aksi: "Aktivitas diteruskan tanpa hambatan.", m: "Tidak diperlukan tindakan." }
    ];
    var btns = [], pkt = $("#pkt"), out = $(".sim-out");
    ["Aplikasi", "Akun", "Data", "Dana", "Pembanding"].forEach(function (area) {
      var grp = d.createElement("div"), cap = d.createElement("p"), row = d.createElement("div");
      cap.className = "kicker"; cap.textContent = area; row.className = "sim-btns";
      grp.append(cap, row);
      A.filter(function (x) { return x.a === area; }).forEach(function (x) {
        var b = d.createElement("button");
        b.type = "button"; b.textContent = x.n;
        b.addEventListener("click", function () { show(x, b); });
        btns.push(b); row.append(b); x.b = b;
      });
      simList.append(grp);
    });
    var show = function (x, b) {
      btns.forEach(function (y) { y.setAttribute("aria-pressed", String(y === b)); });
      $("#o-area").textContent = x.a;
      $("#o-name").textContent = x.n;
      $("#o-arti").textContent = x.arti;
      $("#o-tanda").textContent = x.tanda;
      $("#o-aksi").textContent = x.aksi;
      $("#o-msg").textContent = x.m;
      $("#o-msg").parentNode.className = "alert-msg " + x.s;
      statusEl($("#o-status"), x.s);
      $("#o-status").style.fontSize = "1rem";
      pkt.className = "pkt " + x.s;
      void pkt.offsetWidth;
      pkt.classList.add("go-" + x.s);
    };
    show(A[3], A[3].b);
  }

  /* Harga: readiness check */
  var quiz = $("#questions");
  if (quiz) {
    var Q = [
      // Highest impact first: stolen readable data (irreversible, every customer affected, UU PDP sanctions),
      // then direct financial loss, then attacks going unseen, then the usual entry points.
      { q: "Apakah data sensitif tetap tidak terbaca jika database berhasil dicuri?", p: "VaultDesk", w: "Kebocoran data nasabah tidak dapat ditarik kembali dan berdampak pada seluruh pelanggan. VaultDesk memastikan data yang dicuri tetap tidak dapat dibaca.", v: "Belum" },
      { q: "Apakah setiap transfer bernilai besar dikonfirmasi melalui saluran kedua?", p: "VerifyDesk", w: "Perintah transfer palsu menimbulkan kerugian dana secara langsung. VerifyDesk menahan transfer sampai keasliannya terkonfirmasi.", v: "Sudah" },
      { q: "Apakah tim dapat memantau seluruh percobaan serangan dalam satu dasbor?", p: "HandleDesk", w: "Tanpa pemantauan terpusat, percobaan serangan baru diketahui setelah berhasil. HandleDesk memberi setiap aktivitas status risiko yang jelas.", v: "Belum" },
      { q: "Apakah perusahaan mengetahui saat kredensial karyawan bocor?", p: "LeakDesk", w: "Kredensial yang bocor sering menjadi pintu masuk pertama. LeakDesk memberi tahu tim sebelum kredensial disalahgunakan.", v: "Belum" },
      { q: "Apakah perusahaan memiliki inventaris lengkap sistem yang terekspos ke internet?", p: "ExposureDesk", w: "Sistem yang terlupakan sering ditemukan penyerang lebih dulu. ExposureDesk memetakan seluruh sistem yang terekspos.", v: "Sudah" }
    ];
    Q.forEach(function (x, i) {
      var f = d.createElement("fieldset");
      f.innerHTML = '<legend><span class="q-text"></span></legend><div class="toggle">' + ["Sudah", "Belum"].map(function (v) {
        return '<label><input type="radio" id="q' + i + v + '" name="q' + i + '" value="' + v + '"' + (x.v === v ? " checked" : "") + "><span>" + v + "</span></label>";
      }).join("") + "</div>";
      $(".q-text", f).textContent = x.q;
      quiz.append(f);
    });
    var rate = function () {
      var miss = Q.filter(function (x, i) { return $('input[name="q' + i + '"]:checked', quiz).value === "Belum"; });
      var have = 5 - miss.length;
      $("#score").textContent = have + "/5";
      $("#meter").style.width = have * 20 + "%";
      $("#rec-name").textContent = miss.length ? miss[0].p : "Pengujian berkala";
      var recLink = $("#rec-link");
      if (recLink) {
        recLink.href = miss.length ? "produk-" + miss[0].p.toLowerCase() + ".html" : "kontak.html#uji-coba";
        recLink.firstChild.textContent = miss.length ? "Lihat " + miss[0].p + " " : "Ajukan Uji Coba ";
      }
      $("#rec-next").textContent = miss.length > 1 ? "Prioritas berikutnya: " + miss.slice(1).map(function (x) { return x.p; }).join(", ") + "." : "";
      $("#rec-why").textContent = miss.length ? miss[0].w : "Kontrol keamanan dasar Anda sudah memadai. Gunakan uji coba Akun Jebakan untuk memvalidasi efektivitasnya.";
    };
    quiz.addEventListener("change", rate);
    rate();
    var consult = $("#consult-link");
    if (consult) consult.addEventListener("click", function () {
      var miss = Q.filter(function (x, i) { return $('input[name="q' + i + '"]:checked', quiz).value === "Belum"; });
      if (window.SecDesChat) window.SecDesChat.consult({ score: (5 - miss.length) + "/5", missing: miss.map(function (x) { return x.p; }) });
    });
  }

  /* Beli: order summary with period discount (link format: beli.html#<product>-<months>) */
  var order = $("#order-form");
  if (order) {
    var sel = $("#o-produk"), sum = $("#summary");
    var picked = function (name) { return $('input[name="' + name + '"]:checked', order).value; };
    var parts = (location.hash || "").slice(1).split("-");
    if (parts[0] && $('option[value="' + parts[0] + '"]', sel)) sel.value = parts[0];
    var pr = parts[1] && $('input[name="periode"][value="' + parts[1] + '"]', order);
    if (pr) pr.checked = true;
    var update = function () {
      var o = sel.options[sel.selectedIndex], price = +o.dataset.price, months = +picked("periode");
      var off = OFF[months] || 0, mo = price * (100 - off) / 100;
      sum.style.setProperty("--acc", o.dataset.acc);
      $$("#s-icon [data-mark]").forEach(function (m) { m.hidden = m.dataset.mark !== o.value; });
      $("#s-name").textContent = o.textContent.split(" (")[0];
      $("#s-cat").textContent = o.dataset.cat;
      $("#s-price").innerHTML = off ? "<s>" + juta(price) + "</s>" : juta(price);
      $("#s-disc-label").textContent = "Diskon " + months + " bulan";
      $("#s-disc").textContent = off ? "−" + off + "%" : "Tidak ada";
      $("#s-month").textContent = juta(mo);
      $("#s-months").textContent = months + " bulan";
      $("#s-pasang").textContent = picked("pasang");
      $("#s-total").textContent = juta(mo * months);
      $("#s-link").href = "produk-" + o.value + ".html";
      try { history.replaceState(null, "", "#" + o.value + "-" + months); } catch (e) {}
    };
    order.addEventListener("change", update);
    update();
    simForm(order, "Kirim Pengajuan Pembelian", function () {
      var name = $("#s-name").textContent, months = $("#s-months").textContent;
      return {
        title: "Pengajuan pembelian diterima",
        lines: [
          ["Produk", name + ", " + months],
          ["Total", $("#s-total").textContent + " (" + $("#s-disc").textContent.replace("Tidak ada", "tanpa diskon").replace("−", "diskon ") + ", belum termasuk pajak)"],
          ["Nomor referensi", ref()],
          ["Langkah berikutnya", "Tim penjualan mengirimkan invoice dan jadwal implementasi ke " + order.elements.email.value + " dalam satu hari kerja."]
        ],
        again: "Ajukan pembelian lain"
      };
    });
  }

  /* Kontak: free trial (HandleDesk, via Akun Jebakan) or a product demo (any product) */
  var trial = $("#trial-form");
  if (trial) {
    var jenis = function () { return $('input[name="jenis"]:checked', trial).value; };
    var syncJenis = function () {
      var demo = jenis() === "demo";
      $("#demo-field").hidden = !demo;
      $("#trial-note").textContent = demo ? "Tim kami menyiapkan demo dan, bila diperlukan, proof of concept sesuai produk yang Anda pilih." : "Uji coba gratis tersedia untuk HandleDesk melalui Akun Jebakan.";
      var b = $('button[type="submit"]', trial); if (!b.disabled) b.firstChild.textContent = (demo ? "Jadwalkan Demo" : "Ajukan Uji Coba") + " ";
    };
    var wanted = "";
    try { wanted = new URLSearchParams(location.search).get("demo") || ""; } catch (e) {}
    var opt = wanted && $$("#produk-pilihan option").filter(function (o) { return o.value.toLowerCase() === wanted.toLowerCase(); })[0];
    if (opt) { $('input[name="jenis"][value="demo"]', trial).checked = true; opt.selected = true; }
    trial.addEventListener("change", syncJenis);
    syncJenis();
    simForm(trial, "Ajukan Uji Coba", function () {
      var demo = jenis() === "demo";
      return {
        title: demo ? "Permintaan demo diterima" : "Pengajuan uji coba diterima",
        lines: [
          ["Perusahaan", trial.elements.perusahaan.value],
          ["Jenis", demo ? "Demo " + trial.elements.produk.value : "Uji coba gratis 30 hari, HandleDesk (Akun Jebakan)"],
          ["Nomor referensi", ref()],
          ["Langkah berikutnya", demo ? "Tim SecDes menghubungi " + trial.elements.email.value + " dalam satu hari kerja untuk menjadwalkan demo." : "Tim SecDes menghubungi " + trial.elements.email.value + " dalam satu hari kerja untuk menjadwalkan pemasangan Akun Jebakan."]
        ],
        again: "Kirim pengajuan lain"
      };
    });
  }

  function ref() { return "SD-" + new Date().getFullYear() + "-" + String(Date.now()).slice(-5); }

  /* Simulated forms: field errors, a sending state, a confirmation, and a way back. Nothing is sent. */
  function simForm(form, label, summary) {
    form.noValidate = true;
    var btn = $('button[type="submit"]', form);
    var done = d.createElement("div");
    done.className = "form-done";
    done.hidden = true;
    done.setAttribute("role", "status");
    done.setAttribute("tabindex", "-1");
    form.parentNode.insertBefore(done, form.nextSibling);

    function message(el) {
      if (el.type === "checkbox") return el.checked ? "" : "Centang pernyataan ini untuk melanjutkan.";
      var v = el.value.trim();
      if (el.required && !v) return "Wajib diisi.";
      if (el.type === "email" && v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return "Gunakan format email yang valid, misalnya nama@perusahaan.co.id.";
      if (el.type === "tel" && v) {
        if (/[^\d\s+()-]/.test(v)) return "Nomor telepon hanya boleh berisi angka, spasi, tanda +, -, atau tanda kurung.";
        var digits = v.replace(/\D/g, "").length;
        if (digits < 8 || digits > 15) return "Nomor telepon terdiri dari 8–15 digit, misalnya (021) 5088 1200 atau +62 812 3456 7890.";
      }
      return "";
    }
    function show(el, msg) {
      var box = el.closest(".field, .consent") || el.parentNode;
      var err = $(".err", box);
      if (!msg) { box.classList.remove("invalid"); el.removeAttribute("aria-invalid"); if (err) err.remove(); return; }
      if (!err) { err = d.createElement("p"); err.className = "err"; err.id = (el.id || el.name) + "-err"; box.append(err); }
      err.textContent = msg;
      box.classList.add("invalid");
      el.setAttribute("aria-invalid", "true");
      el.setAttribute("aria-describedby", err.id);
    }
    var fields = $$("input[required], input[type=email], input[type=tel]", form);
    // Email and phone are checked as soon as the visitor leaves the field.
    fields.forEach(function (el) {
      if (el.type === "email" || el.type === "tel") el.addEventListener("blur", function () { if (el.value.trim()) show(el, message(el)); });
    });
    // Mark required fields and explain the marker once, before the first field.
    fields.forEach(function (el) {
      var lab = el.id && $('label[for="' + el.id + '"]', form);
      if (lab && el.type !== "checkbox" && !$(".req-mark", lab)) { var s = d.createElement("span"); s.className = "req-mark"; s.setAttribute("aria-hidden", "true"); s.textContent = " *"; lab.append(s); }
    });
    var hint = d.createElement("p");
    hint.className = "small req-note";
    hint.textContent = "Kolom bertanda * wajib diisi.";
    form.insertBefore(hint, form.firstChild);
    fields.forEach(function (el) {
      el.addEventListener(el.type === "checkbox" ? "change" : "input", function () {
        if (el.getAttribute("aria-invalid")) show(el, message(el));
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var first = null;
      fields.forEach(function (el) { var m = message(el); show(el, m); if (m && !first) first = el; });
      if (first) { first.focus(); return; }
      var sentLabel = btn.firstChild.textContent;
      btn.disabled = true;
      btn.classList.add("sending");
      btn.firstChild.textContent = "Mengirim… ";
      setTimeout(function () {
        var s = summary();
        done.innerHTML = '<p class="kicker">Pengajuan terkirim</p><h3></h3><dl class="kv"></dl><p class="small">Simpan nomor referensi ini untuk komunikasi selanjutnya dengan tim SecDes.</p><div><button type="button" class="btn"></button></div>';
        $("h3", done).textContent = s.title;
        s.lines.forEach(function (l) {
          var row = d.createElement("div"), dt = d.createElement("dt"), dd = d.createElement("dd");
          dt.textContent = l[0]; dd.textContent = l[1]; row.append(dt, dd); $("dl", done).append(row);
        });
        var again = $("button", done);
        again.textContent = s.again;
        again.addEventListener("click", function () {
          var keep = form.elements.produk && form.id === "order-form" ? form.elements.produk.value : null;
          form.reset();
          if (keep) form.elements.produk.value = keep;
          form.dispatchEvent(new Event("change", { bubbles: true }));
          done.hidden = true;
          form.hidden = false;
          (form.querySelector("input:not([type=radio]):not([type=checkbox]), select") || form).focus();
        });
        btn.disabled = false;
        btn.classList.remove("sending");
        btn.firstChild.textContent = sentLabel;
        form.hidden = true;
        done.hidden = false;
        done.focus();
      }, 900);
    });
  }
})();

/* Product screens: open in a zoom lightbox on the same page (as in the online catalogue), not a new tab. */
(function () {
  var d = document, links = d.querySelectorAll("a.device");
  if (!links.length) return;
  var box = d.createElement("div");
  box.className = "zoom"; box.hidden = true;
  box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true"); box.setAttribute("aria-label", "Tampilan aplikasi diperbesar");
  box.innerHTML = '<button type="button" class="zoom-close" aria-label="Tutup"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button><figure><img alt=""><figcaption></figcaption></figure>';
  d.body.appendChild(box);
  var img = box.querySelector("img"), cap = box.querySelector("figcaption"), btn = box.querySelector(".zoom-close"), from = null;
  function open(a) {
    var src = a.querySelector("img");
    from = a;
    img.src = a.getAttribute("href");
    img.alt = src ? src.alt : "";
    cap.textContent = src ? src.alt.replace(/:.*$/, "") : "";
    box.hidden = false;
    d.body.classList.add("zoom-open");
    btn.focus();
  }
  function close() { box.hidden = true; img.removeAttribute("src"); d.body.classList.remove("zoom-open"); if (from) from.focus(); }
  Array.prototype.forEach.call(links, function (a) {
    a.addEventListener("click", function (e) { e.preventDefault(); open(a); });
  });
  btn.addEventListener("click", close);
  box.addEventListener("click", function (e) { if (e.target !== img) close(); });
  d.addEventListener("keydown", function (e) { if (e.key === "Escape" && !box.hidden) close(); });
})();
