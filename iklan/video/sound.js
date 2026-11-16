// Soundtrack for the SecDes spot (secdes-spot.mp3, 20 s: voice-over, music, sound effects).
// The video itself has no media element: every screen draws frames from a clock, so the audio
// follows that clock and is re-seeked whenever it drifts. Browsers only allow sound after a
// click, so sound starts off and a "Nyalakan suara" button turns it on.
//
// Default clock = the shared wall clock all mockup screens use ((Date.now() / 1000) % 20).
// Pages with their own player call SecdesSound.attach({ getT, isPlaying, mount, onChange }).
// On a page shown inside another page (the gallery cards) nothing is added, so the gallery's
// own button is the only one that plays.
(function () {
  "use strict";
  const L = 20;
  const base = new URL(".", document.currentScript.src);
  const audio = new Audio(new URL("secdes-spot.mp3", base).href);
  audio.preload = "auto";
  let on = false, getT = () => (Date.now() / 1000) % L, isPlaying = () => true, onChange = null, btn = null;

  const ICON_OFF = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="m23 9-6 6"/><path d="m17 9 6 6"/></svg>';
  const ICON_ON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/></svg>';

  function paint() {
    if (btn) {
      btn.innerHTML = (on ? ICON_ON : ICON_OFF) + "<span>" + (on ? "Matikan suara" : "Nyalakan suara") + "</span>";
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    }
    if (onChange) onChange(on);
  }
  function set(v) {
    on = v;
    if (!on) audio.pause();
    else { audio.currentTime = getT(); audio.play().catch(() => { on = false; paint(); }); }
    paint();
  }
  function tick() {
    if (on) {
      const t = getT();
      if (!isPlaying()) { if (!audio.paused) audio.pause(); }
      else {
        if (audio.paused) audio.play().catch(() => {});
        // keep within 0.15 s of the picture; skip the last/first moments around the loop point
        if (Math.abs(audio.currentTime - t) > 0.15 && t > 0.05 && t < L - 0.1) audio.currentTime = t;
        if (t < 0.05 && audio.currentTime > 1) audio.currentTime = 0;
      }
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  // When the tab is hidden the picture stops (no animation frames) but audio would play on:
  // pause it, and let tick() resume and re-sync it once the tab is visible again.
  document.addEventListener("visibilitychange", () => { if (document.hidden) audio.pause(); });

  function makeButton(mount) {
    btn = document.createElement("button");
    btn.type = "button";
    btn.className = "secdes-sound";
    btn.onclick = () => set(!on);
    if (!document.getElementById("secdes-sound-css")) {
      const st = document.createElement("style");
      st.id = "secdes-sound-css";
      // doubled class = higher specificity than host-page rules such as ".ctl button" / ".ctl span"
      st.textContent = ".secdes-sound.secdes-sound{display:inline-flex;align-items:center;gap:8px;width:auto;height:auto;flex:none;padding:9px 14px;border-radius:999px;" +
        "border:1px solid rgba(147,197,253,.45);background:rgba(11,22,38,.82);color:#fff;font:600 13px 'Plus Jakarta Sans',Arial,sans-serif;cursor:pointer;" +
        "white-space:nowrap;backdrop-filter:blur(6px)}" +
        ".secdes-sound.secdes-sound span{font:inherit;color:inherit;min-width:0;text-align:left}" +
        ".secdes-sound.secdes-sound:hover{background:#1d4ed8;border-color:#1d4ed8}.secdes-sound:focus-visible{outline:2px solid #60a5fa;outline-offset:2px}" +
        ".secdes-sound.float{position:fixed;right:18px;bottom:18px;z-index:2147483000}";
      document.head.appendChild(st);
    }
    if (mount) mount.appendChild(btn);
    else { btn.classList.add("float"); document.body.appendChild(btn); }
    paint();
  }

  window.SecdesSound = {
    audio, // exposed for checking sync from the console
    clock: () => getT(),
    // For pages with their own player or their own sound control.
    attach(opts = {}) {
      if (opts.getT) getT = opts.getT;
      if (opts.isPlaying) isPlaying = opts.isPlaying;
      if (opts.onChange) onChange = opts.onChange;
      if (btn) { btn.remove(); btn = null; }
      if (opts.mount !== false) makeButton(opts.mount || null);
      return { toggle: () => set(!on), set, isOn: () => on };
    },
  };

  // Stand-alone page (not inside the gallery): add the floating button right away.
  // A page that wants its own control sets data-sound="manual" on this script tag.
  // Frozen frames (?t=, used to render the stills for the paper) never get a button.
  const manual = document.currentScript.dataset.sound === "manual";
  const still = new URLSearchParams(location.search).has("t");
  if (!manual && !still && window.top === window) {
    if (document.body) makeButton(null);
    else addEventListener("DOMContentLoaded", () => makeButton(null));
  }
})();
