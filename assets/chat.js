/* SecDes chat assistant: a rule-based guide that maps a company's problem to the right product.
   It runs entirely in the page (no data leaves the browser). The conversation is kept for this tab
   in sessionStorage so it survives moving between pages. */
(function () {
  "use strict";
  var d = document;
  var root = d.getElementById("chat");
  var dataEl = d.getElementById("secdes-data");
  if (!root || !dataEl) return;
  var P = JSON.parse(dataEl.textContent);
  var BY = {};
  P.forEach(function (p) { BY[p.slug] = p; });

  var fab = d.getElementById("chat-fab"), panel = d.getElementById("chat-panel"),
      log = d.getElementById("chat-log"), chips = d.getElementById("chat-chips"),
      form = d.getElementById("chat-form"), input = d.getElementById("chat-input"),
      closeBtn = d.getElementById("chat-close"), resetBtn = d.getElementById("chat-reset");
  var KEY = "secdes-chat-v1";
  var state = { open: false, msgs: [] };
  try { var saved = JSON.parse(sessionStorage.getItem(KEY) || "null"); if (saved && saved.msgs) state = saved; } catch (e) {}
  function save() { try { sessionStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

  /* Problems the assistant recognises. Keywords are matched against the visitor's own words. */
  var TOPICS = [
    { slug: "vaultdesk", chip: "Data nasabah harus tetap aman meski dicuri",
      kw: ["data", "nasabah", "nik", "rekening", "database", "enkripsi", "dicuri", "pdp", "pribadi", "sensitif", "kebocoran data", "tokenisasi", "basis data"],
      why: "Risiko terbesar Anda ada pada data sensitif. VaultDesk mengganti data seperti NIK dan nomor rekening dengan token, sehingga data yang berhasil dicuri tetap tidak dapat dibaca." },
    { slug: "verifydesk", chip: "Khawatir ada perintah transfer palsu",
      kw: ["transfer", "invoice", "tagihan", "pembayaran", "dana", "direktur", "ceo", "cfo", "penipuan", "fraud", "rekening tujuan", "bec", "palsu"],
      why: "Perintah transfer palsu adalah salah satu modus dengan kerugian langsung terbesar. VerifyDesk mewajibkan konfirmasi melalui saluran kedua sebelum transfer bernilai besar diproses." },
    { slug: "handledesk", chip: "Banyak percobaan login mencurigakan",
      kw: ["login", "serangan", "masuk", "brute", "akun", "phishing", "alert", "dasbor", "monitor", "pantau", "mencurigakan", "hacker", "peretas", "diserang", "bot", "injeksi", "sql"],
      why: "Anda membutuhkan satu tempat untuk melihat seluruh percobaan serangan. HandleDesk mendeteksi 10 jenis percobaan serangan dan memberi setiap aktivitas status Aman, Perlu Dicek, atau Berbahaya." },
    { slug: "leakdesk", chip: "Kata sandi karyawan mungkin bocor",
      kw: ["bocor", "kredensial", "password", "kata sandi", "sandi", "dark web", "karyawan", "email kantor", "akun karyawan", "leak"],
      why: "Kredensial yang bocor sering menjadi pintu masuk pertama. LeakDesk memantau kebocoran kata sandi karyawan dan memberi tahu tim sebelum kredensial tersebut disalahgunakan." },
    { slug: "exposuredesk", chip: "Tidak tahu sistem apa saja yang terekspos",
      kw: ["terekspos", "server", "subdomain", "port", "aset", "inventaris", "internet", "website lama", "celah", "kerentanan", "scan", "domain", "cloud"],
      why: "Sistem yang terlupakan sering ditemukan penyerang lebih dulu. ExposureDesk memetakan seluruh sistem perusahaan yang dapat diakses dari internet dan menandai yang berisiko." }
  ];
  var INFO = [
    { kw: ["harga", "biaya", "berapa", "diskon", "tarif", "budget", "anggaran"], reply: "price" },
    { kw: ["coba", "trial", "gratis", "uji coba", "jebakan"], reply: "trial" },
    { kw: ["demo", "presentasi", "proof of concept", "poc"], reply: "demo" },
    { kw: ["kontak", "hubungi", "sales", "penjualan", "telepon", "email", "orang"], reply: "contact" },
    { kw: ["halo", "hai", "hi", "pagi", "siang", "sore", "malam", "permisi"], reply: "hello" },
    { kw: ["bingung", "tidak tahu", "belum tahu", "pilih", "rekomendasi", "saran", "mana"], reply: "unsure" }
  ];
  var MAIN_CHIPS = TOPICS.map(function (t) { return t.chip; }).concat(["Belum tahu, bantu saya memilih", "Tanya harga dan uji coba"]);

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function productCard(slug) {
    var p = BY[slug];
    return '<div class="chat-prod" style="--acc:' + p.acc + '"><strong>' + esc(p.name) + '</strong><span>' + esc(p.short) +
      '</span><span class="chat-price">Mulai ' + esc(p.from) + '/bulan</span><span class="chat-acts"><a href="produk-' + slug + '.html">Lihat produk</a><a href="kontak.html?demo=' + esc(p.name) + '#uji-coba">Jadwalkan demo</a></span></div>';
  }
  function match(text) {
    var t = " " + text.toLowerCase() + " ", best = null, bestScore = 0;
    TOPICS.forEach(function (x) {
      var s = x.kw.reduce(function (n, k) { return n + (t.indexOf(k) > -1 ? 1 : 0); }, 0);
      if (s > bestScore) { best = x; bestScore = s; }
    });
    var info = null;
    INFO.forEach(function (x) { if (!info && x.kw.some(function (k) { return t.indexOf(k) > -1; })) info = x.reply; });
    return { topic: best, info: info };
  }

  function answer(text) {
    var chip = TOPICS.filter(function (t) { return t.chip === text; })[0];
    if (chip) return topicReply(chip);
    if (text === "Belum tahu, bantu saya memilih") return infoReply("unsure");
    if (text === "Tanya harga dan uji coba") return infoReply("price");
    if (text === "Ada masalah lain") return { html: "Silakan ceritakan masalah lainnya, atau pilih topik di bawah.", chips: MAIN_CHIPS };
    var m = match(text);
    if (m.topic && (!m.info || m.info === "unsure")) return topicReply(m.topic);
    if (m.info) return infoReply(m.info);
    if (m.topic) return topicReply(m.topic);
    return { html: "Maaf, saya belum dapat mengenali masalahnya. Coba jelaskan dengan kata lain, misalnya <em>\"banyak login gagal di aplikasi kami\"</em>, atau pilih salah satu topik di bawah.", chips: MAIN_CHIPS };
  }
  function topicReply(t) {
    return { html: esc(t.why) + productCard(t.slug), chips: ["Tanya harga dan uji coba", "Ada masalah lain"] };
  }
  function infoReply(kind) {
    if (kind === "price") return { html: "Setiap produk dibeli terpisah dan ditagih per bulan. Langganan 6 bulan hemat 10%, langganan 12 bulan hemat 20%. HandleDesk dapat dicoba gratis 30 hari melalui Akun Jebakan, dan kelima produk tersedia untuk demo. <a href=\"produk.html#harga\">Lihat seluruh harga</a>.", chips: ["Ada masalah lain"] };
    if (kind === "trial") return { html: "Uji coba gratis 30 hari tersedia untuk HandleDesk melalui Akun Jebakan: tanpa kartu kredit dan tanpa perubahan pada sistem inti. <a href=\"kontak.html#uji-coba\">Ajukan uji coba</a>.", chips: ["Ada masalah lain"] };
    if (kind === "demo") return { html: "Demo tersedia untuk kelima produk. Tim kami memperagakan produk dengan skenario organisasi Anda. <a href=\"kontak.html?demo=HandleDesk#uji-coba\">Jadwalkan demo</a>.", chips: ["Ada masalah lain"] };
    if (kind === "contact") return { html: "Tim penjualan dapat dihubungi melalui halaman <a href=\"kontak.html\">Kontak</a>. Kami merespons pada hari kerja yang sama.", chips: ["Ada masalah lain"] };
    if (kind === "hello") return { html: "Halo! Ceritakan masalah keamanan yang sedang dihadapi perusahaan Anda, dan saya bantu memilih produk yang sesuai.", chips: MAIN_CHIPS };
    return { html: "Tidak masalah. Pilih situasi yang paling mendekati kondisi perusahaan Anda, atau isi <a href=\"produk.html#cek\">cek kesiapan lima pertanyaan</a>.", chips: TOPICS.map(function (t) { return t.chip; }) };
  }

  function render() {
    log.innerHTML = state.msgs.map(function (m) {
      return '<div class="chat-msg ' + m.who + '">' + (m.who === "bot" ? m.html : esc(m.text)) + "</div>";
    }).join("");
    var last = state.msgs[state.msgs.length - 1];
    var list = last && last.chips ? last.chips : [];
    chips.innerHTML = list.map(function (c) { return '<button type="button">' + esc(c) + "</button>"; }).join("");
    log.scrollTop = log.scrollHeight;
  }
  function greet() {
    state.msgs = [{ who: "bot", html: "Halo, saya Asisten SecDes. Ceritakan masalah keamanan yang sedang dihadapi perusahaan Anda, dan saya bantu memilih produk yang paling sesuai.", chips: MAIN_CHIPS }];
  }
  var busy = false;
  function send(text, botReply) {
    text = String(text || "").trim();
    if (!text || busy) return;
    state.msgs.push({ who: "me", text: text });
    render();
    busy = true;
    log.insertAdjacentHTML("beforeend", '<div class="chat-msg bot typing" aria-label="Asisten sedang mengetik"><i></i><i></i><i></i></div>');
    log.scrollTop = log.scrollHeight;
    setTimeout(function () {
      var r = botReply || answer(text);
      state.msgs.push({ who: "bot", html: r.html, chips: r.chips });
      busy = false;
      render(); save();
    }, 650);
    save();
  }
  function setOpen(open, focus) {
    state.open = open;
    root.classList.toggle("open", open);
    fab.setAttribute("aria-expanded", String(open));
    fab.setAttribute("aria-label", open ? "Tutup asisten SecDes" : "Buka asisten SecDes");
    panel.hidden = !open;
    if (open) { render(); if (focus !== false) setTimeout(function () { input.focus({ preventScroll: true }); }, 60); }
    save();
  }

  fab.addEventListener("click", function () { setOpen(!state.open); });
  closeBtn.addEventListener("click", function () { setOpen(false); fab.focus(); });
  resetBtn.addEventListener("click", function () { greet(); render(); save(); input.focus(); });
  chips.addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) send(b.textContent); });
  form.addEventListener("submit", function (e) { e.preventDefault(); send(input.value); input.value = ""; });
  d.addEventListener("keydown", function (e) { if (e.key === "Escape" && state.open) { setOpen(false); fab.focus(); } });

  if (!state.msgs.length) greet();
  if (state.open) setOpen(true, false);

  /* Public hook: the readiness check opens the chat with its result. */
  window.SecDesChat = {
    open: function () { setOpen(true); },
    consult: function (result) {
      setOpen(true, false);
      var text = "Hasil cek kesiapan saya " + result.score + ". Area yang belum: " + (result.missing.length ? result.missing.join(", ") : "tidak ada") + ".";
      var reply;
      if (!result.missing.length) {
        reply = { html: "Kontrol dasar perusahaan Anda sudah lengkap. Langkah berikutnya adalah memvalidasi efektivitasnya: uji coba Akun Jebakan HandleDesk selama 30 hari menunjukkan siapa saja yang mencoba masuk. <a href=\"kontak.html#uji-coba\">Ajukan uji coba</a>.", chips: ["Ada masalah lain"] };
      } else {
        var first = TOPICS.filter(function (t) { return BY[t.slug].name === result.missing[0]; })[0];
        var rest = result.missing.slice(1);
        reply = { html: "Berdasarkan tingkat risikonya, prioritas pertama Anda adalah <strong>" + esc(result.missing[0]) + "</strong>. " + esc(first.why) + productCard(first.slug) +
          (rest.length ? '<p class="chat-next">Prioritas berikutnya: ' + esc(rest.join(", ")) + ". Kelima produk berdiri sendiri, sehingga dapat ditambahkan bertahap.</p>" : ""),
          chips: ["Tanya harga dan uji coba", "Ada masalah lain"] };
      }
      send(text, reply);
    }
  };
})();
