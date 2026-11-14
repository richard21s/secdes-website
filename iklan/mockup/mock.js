// Shared helpers for the SecDes photo mockups.
// A "stage" shows a crop of a real photo, scaled to fit the window. Screens are
// HTML layers (usually the videotron iframe) warped onto a 4-corner quad of the
// photo with a CSS matrix3d; "patches" redraw parts of the photo on top so that
// objects in front of a screen (lamp posts, pendants, chairs) stay in front.

const MOCK_T = new URLSearchParams(location.search).get('t');   // freeze frame for stills

function solve8(A, b) {
  const n = 8, M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((r, i) => r[n] / r[i]);
}

// matrix3d that maps the box (0,0)-(w,h) onto the quad [TL, TR, BR, BL]
function quadMatrix(w, h, q) {
  const src = [[0, 0], [w, 0], [w, h], [0, h]], A = [], b = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i], [X, Y] = q[i];
    A.push([x, y, 1, 0, 0, 0, -X * x, -X * y]); b.push(X);
    A.push([0, 0, 0, x, y, 1, -Y * x, -Y * y]); b.push(Y);
  }
  const h8 = solve8(A, b);
  return `matrix3d(${h8[0]},${h8[3]},0,${h8[6]},${h8[1]},${h8[4]},0,${h8[7]},0,0,1,0,${h8[2]},${h8[5]},0,1)`;
}

function makeStage({ photo, W, H, crop }) {
  const c = crop || { x: 0, y: 0, w: W, h: H };
  const stage = document.createElement('div');
  stage.className = 'stage';
  Object.assign(stage.style, { position: 'absolute', left: '50%', top: '50%', width: c.w + 'px', height: c.h + 'px', overflow: 'hidden', transformOrigin: '0 0', background: '#000' });
  const world = document.createElement('div');
  Object.assign(world.style, { position: 'absolute', left: -c.x + 'px', top: -c.y + 'px', width: W + 'px', height: H + 'px' });
  const img = document.createElement('img');
  img.src = photo; img.alt = '';
  Object.assign(img.style, { position: 'absolute', left: 0, top: 0, width: W + 'px', height: H + 'px' });
  world.appendChild(img); stage.appendChild(world);
  (document.getElementById('view') || document.body).appendChild(stage);
  const fit = () => {
    const host = document.getElementById('view') || document.body;
    const s = Math.min(host.clientWidth / c.w, host.clientHeight / c.h);
    stage.style.transform = `translate(${-c.w * s / 2}px,${-c.h * s / 2}px) scale(${s})`;
  };
  addEventListener('resize', fit); fit();
  return { stage, world, photo, W, H };
}

// A warped layer. `content` is either {src, fw, fh, ox} for an iframe (fw x fh frame,
// shifted left by ox to show only part of it) or {html} for static markup.
function addScreen(S, { quad, w, h, content, glow = 0, bright = 1 }) {
  const box = document.createElement('div');
  // No CSS filter here: a filter on a perspective (matrix3d) layer makes some Chrome/Edge GPUs
  // clip the layer's render surface, so parts of the screen text disappear. Dimming is done
  // with a black overlay instead, and will-change keeps the warped layer stable.
  Object.assign(box.style, { position: 'absolute', left: 0, top: 0, width: w + 'px', height: h + 'px', overflow: 'hidden', transformOrigin: '0 0', transform: quadMatrix(w, h, quad), willChange: 'transform', backfaceVisibility: 'hidden' });
  if (content.src) {
    const f = document.createElement('iframe');
    const sep = content.src.includes('?') ? '&' : '?';
    f.src = content.src + (MOCK_T !== null ? sep + 't=' + MOCK_T : '');
    f.setAttribute('scrolling', 'no'); f.setAttribute('tabindex', '-1');
    Object.assign(f.style, { position: 'absolute', left: -(content.ox || 0) + 'px', top: 0, width: (content.fw || w) + 'px', height: (content.fh || h) + 'px', border: 0, pointerEvents: 'none' });
    box.appendChild(f);
  } else {
    box.innerHTML = content.html;
  }
  if (bright < 1) {
    const d = document.createElement('div');
    Object.assign(d.style, { position: 'absolute', inset: 0, pointerEvents: 'none', background: `rgba(0,0,0,${1 - bright})` });
    box.appendChild(d);
  }
  if (glow) {
    const g = document.createElement('div');
    Object.assign(g.style, { position: 'absolute', inset: 0, pointerEvents: 'none', background: `linear-gradient(115deg, rgba(255,255,255,${glow}), transparent 40%)` });
    box.appendChild(g);
  }
  S.world.appendChild(box);
  return box;
}

// Redraw a rectangle of the original photo on top (for occluders).
function addPatch(S, [x, y, w, h], radius = 0) {
  const d = document.createElement('div');
  Object.assign(d.style, { position: 'absolute', left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px', overflow: 'hidden', borderRadius: radius + 'px' });
  const img = document.createElement('img');
  img.src = S.photo;
  Object.assign(img.style, { position: 'absolute', left: -x + 'px', top: -y + 'px', width: S.W + 'px', height: S.H + 'px' });
  d.appendChild(img); S.world.appendChild(d);
}

// Soft light spill from a screen onto its surroundings.
function addSpill(S, [x, y, w, h], color = 'rgba(59,130,246,.35)') {
  const d = document.createElement('div');
  Object.assign(d.style, { position: 'absolute', left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px', pointerEvents: 'none', mixBlendMode: 'screen', background: `radial-gradient(closest-side, ${color}, transparent)` });
  S.world.appendChild(d);
}

// Clone a rectangle of the photo from (x+dx, y+dy) onto (x, y) to hide an object.
function addClone(S, [x, y, w, h], dx, dy) {
  const d = document.createElement('div');
  Object.assign(d.style, { position: 'absolute', left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px', overflow: 'hidden' });
  const img = document.createElement('img');
  img.src = S.photo;
  Object.assign(img.style, { position: 'absolute', left: -(x + dx) + 'px', top: -(y + dy) + 'px', width: S.W + 'px', height: S.H + 'px' });
  d.appendChild(img); S.world.appendChild(d);
}
