import { useEffect, useRef, useState } from 'react';

// -----------------------------------------------------------------------------
// The hero: a small simulation of the project's own premise.
//
// A handful of thermals drift across a patch of ground. They are never drawn.
// Gliders cruise through, and one that flies into lift starts to circle; while
// it circles and climbs, the cells under it accumulate evidence and warm up on
// the same colour ramp the real heatmap uses. So the picture a visitor watches
// is the training loop itself: nothing marks where the lift is except the
// aircraft that found it.
//
// It is an illustration and says so in its caption — no real beacon is drawn.
//
// Colours are literal, not theme tokens, for the reason index.css gives for the
// real map: this panel is the ground seen from above and stays dark in either
// theme, and the glider colours are the map's own legend.
// -----------------------------------------------------------------------------

const CELL        = 14;     // px. The real grid is 50 m; here it is just a grid.
const CRUISE_V    = 46;     // px/s
const CIRCLE_V    = 30;     // px/s — with TURN_RATE, a ~15 px turn radius
const TURN_RATE   = 2.0;    // rad/s
const ENTER_LIFT  = 0.50;   // lift needed to start circling
const LEAVE_LIFT  = 0.20;   // below this the thermal is gone
const DECAY_S     = 20;     // evidence e-folding time: a patch fades ~40 s after its glider leaves
const DEPOSIT     = 0.17;   // evidence per second of circling in full lift. With
                            // DECAY_S this tops a long climb out near 0.8 and
                            // leaves a short one green — tune the two together,
                            // or every thermal saturates to the same red blob.
const TRAIL_LEN   = 64;
const PREWARM_S   = 55;     // simulated before the first frame, so it never opens blank
const GROUND      = '#0b1219';

const GOLD = '255,215,0';        // circling — matches .dot.yellow in the app
const SKY  = '140,200,255';      // cruising — matches .dot.blue

// Seeded, so the opening frame is the same composition on every load rather
// than occasionally an empty one.
function mulberry32(seed) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The app's own ramp (thermalColor in ThermalMap.jsx), a little more opaque
// because here it sits on flat dark ground instead of satellite imagery.
function heatColor(p) {
  if (p < 0.04) return null;
  const a = 0.16 + p * 0.74;
  if (p < 0.35) {
    const t = p / 0.35;
    return `rgba(20,${Math.round(120 + t * 135)},255,${a.toFixed(3)})`;
  }
  if (p < 0.65) {
    const t = (p - 0.35) / 0.30;
    return `rgba(${Math.round(20 + t * 235)},255,${Math.round(255 - t * 255)},${a.toFixed(3)})`;
  }
  const t = (p - 0.65) / 0.35;
  return `rgba(255,${Math.round(255 - t * 230)},0,${a.toFixed(3)})`;
}

function createSim(w, h) {
  const rand = mulberry32(20261116);
  const cols = Math.ceil(w / CELL);
  const rows = Math.ceil(h / CELL);
  // px/s — thermals drift downwind. Slow on purpose: a circling glider drifts
  // with its thermal, so a fast wind smears every patch into a streak.
  const wind = { x: 2.6, y: 1.0 };

  const spawnThermal = (anywhere) => ({
    // After the first batch, new thermals are born toward the upwind side so
    // they cross the panel instead of leaving at once.
    x:    anywhere ? rand() * w : rand() * w * 0.75 - w * 0.1,
    y:    anywhere ? rand() * h : rand() * h * 0.9,
    r:    34 + rand() * 30,
    s:    0.75 + rand() * 0.35,
    age:  anywhere ? rand() * 30 : 0,
    life: 45 + rand() * 50,
  });

  const nThermals = Math.max(3, Math.min(8, Math.round((w * h) / 62000)));
  const nGliders  = Math.max(4, Math.min(10, Math.round(w / 135)));

  const thermals = Array.from({ length: nThermals }, () => spawnThermal(true));
  const gliders  = Array.from({ length: nGliders }, () => ({
    x: rand() * w, y: rand() * h,
    hdg: rand() * Math.PI * 2,
    mode: 'cruise', turn: 1, tCircle: 0, maxCircle: 0, cool: rand() * 3,
    trail: [], trailT: 0,
  }));

  return { w, h, cols, rows, wind, rand, thermals, gliders, spawnThermal,
           evidence: new Float32Array(cols * rows) };
}

// Strength of a thermal over its life: it builds, holds, and dies away.
function envelope(th) {
  const up   = Math.min(1, th.age / 7);
  const down = Math.min(1, Math.max(0, (th.life - th.age) / 9));
  return th.s * up * down;
}

function liftAt(sim, x, y) {
  let lift = 0;
  for (const th of sim.thermals) {
    const dx = x - th.x, dy = y - th.y;
    lift += envelope(th) * Math.exp(-(dx * dx + dy * dy) / (2 * th.r * th.r));
  }
  return lift;
}

function deposit(sim, x, y, amount) {
  const { cols, rows, evidence } = sim;
  const cx = x / CELL, cy = y / CELL;
  const R = 2;
  for (let r = Math.max(0, Math.floor(cy - R)); r <= Math.min(rows - 1, Math.ceil(cy + R)); r++) {
    for (let c = Math.max(0, Math.floor(cx - R)); c <= Math.min(cols - 1, Math.ceil(cx + R)); c++) {
      const dx = c + 0.5 - cx, dy = r + 0.5 - cy;
      evidence[r * cols + c] += amount * Math.exp(-(dx * dx + dy * dy) / 2.2);
    }
  }
}

function step(sim, dt) {
  const { w, h, wind, rand, thermals, gliders, evidence } = sim;

  for (let i = 0; i < thermals.length; i++) {
    const th = thermals[i];
    th.age += dt;
    th.x += wind.x * dt;
    th.y += wind.y * dt;
    const gone = th.age > th.life || th.x > w + th.r * 2 || th.y > h + th.r * 2;
    if (gone) thermals[i] = sim.spawnThermal(false);
  }

  const decay = Math.exp(-dt / DECAY_S);
  for (let i = 0; i < evidence.length; i++) evidence[i] *= decay;

  for (const g of gliders) {
    const lift = liftAt(sim, g.x, g.y);

    if (g.mode === 'cruise') {
      g.cool -= dt;
      g.hdg += (rand() - 0.5) * 0.9 * dt;
      g.x += Math.cos(g.hdg) * CRUISE_V * dt;
      g.y += Math.sin(g.hdg) * CRUISE_V * dt;

      if (lift > ENTER_LIFT && g.cool <= 0) {
        g.mode = 'circle';
        g.turn = rand() < 0.5 ? -1 : 1;
        g.tCircle = 0;
        g.maxCircle = 13 + rand() * 13;   // then it is at cloud base and leaves
      }

      // Off one edge, back in on the opposite one — as a new arrival, so the
      // trail must not draw a line across the whole panel.
      const m = 24;
      if (g.x < -m || g.x > w + m || g.y < -m || g.y > h + m) {
        g.x = g.x < -m ? w + m : g.x > w + m ? -m : g.x;
        g.y = g.y < -m ? h + m : g.y > h + m ? -m : g.y;
        g.trail.length = 0;
      }
    } else {
      g.tCircle += dt;
      g.hdg += g.turn * TURN_RATE * dt;

      // A pilot re-centres toward the stronger side of the turn; the gradient
      // of the lift field stands in for the seat of the pants.
      const e = 5;
      const gx = liftAt(sim, g.x + e, g.y) - liftAt(sim, g.x - e, g.y);
      const gy = liftAt(sim, g.x, g.y + e) - liftAt(sim, g.x, g.y - e);
      const gn = Math.hypot(gx, gy) || 1;

      g.x += (Math.cos(g.hdg) * CIRCLE_V + wind.x + (gx / gn) * 7) * dt;
      g.y += (Math.sin(g.hdg) * CIRCLE_V + wind.y + (gy / gn) * 7) * dt;

      // The label: circling and climbing. Only this writes to the grid.
      deposit(sim, g.x, g.y, lift * dt * DEPOSIT);

      if (lift < LEAVE_LIFT || g.tCircle > g.maxCircle) {
        g.mode = 'cruise';
        g.cool = 5 + rand() * 4;
      }
    }

    g.trailT += dt;
    if (g.trailT > 0.07) {
      g.trailT = 0;
      g.trail.push(g.x, g.y);
      if (g.trail.length > TRAIL_LEN * 2) g.trail.splice(0, 2);
    }
  }
}

function drawGlider(ctx, g) {
  const circling = g.mode === 'circle';
  ctx.save();
  ctx.translate(g.x, g.y);
  ctx.rotate(g.hdg);
  // Banked into the turn: the inside wing foreshortens.
  if (circling) ctx.transform(1, 0, 0.18 * g.turn, 0.86, 0, 0);
  ctx.lineCap = 'round';

  const airframe = (extra) => {
    ctx.lineWidth = 2.6 + extra;          // fuselage, nose toward +x
    ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(-10, 0); ctx.stroke();
    ctx.lineWidth = 2 + extra;            // the long thin wing
    ctx.beginPath(); ctx.moveTo(1.5, -14); ctx.lineTo(1.5, 14); ctx.stroke();
    ctx.lineWidth = 1.7 + extra;          // tailplane
    ctx.beginPath(); ctx.moveTo(-10, -4); ctx.lineTo(-10, 4); ctx.stroke();
  };

  // A dark keyline first: a gold glider over a yellow cell is otherwise the
  // one place on the panel where the aircraft disappears.
  ctx.strokeStyle = 'rgba(6,10,15,0.85)';
  airframe(2.6);
  ctx.strokeStyle = `rgb(${circling ? GOLD : SKY})`;
  airframe(0);
  ctx.restore();
}

function render(ctx, sim, reveal) {
  const { w, h, cols, rows, evidence, thermals, gliders } = sim;

  ctx.fillStyle = GROUND;
  ctx.fillRect(0, 0, w, h);

  // Cells, each inset by a pixel so the grid shows through the heat.
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const e = evidence[r * cols + c];
      if (e < 0.018) continue;
      const colour = heatColor(1 - Math.exp(-e * 1.15));
      if (!colour) continue;
      ctx.fillStyle = colour;
      ctx.fillRect(c * CELL + 0.5, r * CELL + 0.5, CELL - 1, CELL - 1);
    }
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let c = 1; c < cols; c++) { ctx.moveTo(c * CELL, 0); ctx.lineTo(c * CELL, h); }
  for (let r = 1; r < rows; r++) { ctx.moveTo(0, r * CELL); ctx.lineTo(w, r * CELL); }
  ctx.stroke();

  if (reveal) {
    ctx.save();
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 1.2;
    for (const th of thermals) {
      const env = envelope(th);
      if (env < 0.05) continue;
      ctx.strokeStyle = `rgba(255,255,255,${(0.15 + env * 0.5).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(th.x, th.y, th.r * 1.15, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  for (const g of gliders) {
    const t = g.trail;
    const n = t.length / 2;
    if (n < 2) continue;
    const rgb = g.mode === 'circle' ? GOLD : SKY;
    ctx.lineWidth = 1.4;
    for (let i = 1; i < n; i++) {
      ctx.strokeStyle = `rgba(${rgb},${((i / n) * 0.8).toFixed(3)})`;
      ctx.beginPath();
      ctx.moveTo(t[(i - 1) * 2], t[(i - 1) * 2 + 1]);
      ctx.lineTo(t[i * 2], t[i * 2 + 1]);
      ctx.stroke();
    }
  }

  for (const g of gliders) drawGlider(ctx, g);
}

export default function ThermalField({ t }) {
  const wrapRef   = useRef(null);
  const canvasRef = useRef(null);
  const simRef    = useRef(null);
  const drawRef   = useRef(() => {});

  const [reveal, setReveal] = useState(false);
  // Someone who asked the OS for less motion gets the opening frame held still,
  // with Play there if they want it. Everyone else gets Pause.
  const [playing, setPlaying] = useState(
    () => !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
  const revealRef  = useRef(reveal);
  const playingRef = useRef(playing);
  revealRef.current  = reveal;
  playingRef.current = playing;

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let raf = 0;
    let last = 0;
    let visible = true;

    const build = () => {
      const { width, height } = wrap.getBoundingClientRect();
      if (width < 10 || height < 10) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width  = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const sim = createSim(width, height);
      for (let i = 0; i < PREWARM_S * 20; i++) step(sim, 0.05);
      simRef.current = sim;
      render(ctx, sim, revealRef.current);
    };

    drawRef.current = () => {
      if (simRef.current) render(ctx, simRef.current, revealRef.current);
    };

    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      if (!simRef.current || !playingRef.current || !visible) { last = now; return; }
      // Clamped: a tab coming back from the background must not fast-forward
      // the gliders across the panel in one step.
      const dt = Math.min(0.05, (now - last) / 1000 || 0);
      last = now;
      step(simRef.current, dt);
      render(ctx, simRef.current, revealRef.current);
    };

    build();
    raf = requestAnimationFrame(frame);

    // Rebuilt on a width change only. A phone's URL bar collapsing changes the
    // height on every scroll, and rebuilding on that would restart the scene
    // under the reader's thumb.
    let builtW = wrap.getBoundingClientRect().width;
    const ro = new ResizeObserver(() => {
      const wNow = wrap.getBoundingClientRect().width;
      if (Math.abs(wNow - builtW) < 2) return;
      builtW = wNow;
      build();
    });
    ro.observe(wrap);

    const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    io.observe(wrap);

    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); };
  }, []);

  // While paused nothing repaints on its own, so the toggle has to.
  useEffect(() => { drawRef.current(); }, [reveal]);

  return (
    <div className="field" ref={wrapRef}>
      <canvas ref={canvasRef} className="field-canvas" role="img" aria-label={t('simAlt')} />

      <div className="field-controls">
        <button type="button" className="field-btn" aria-pressed={reveal}
                onClick={() => setReveal(v => !v)}>
          {reveal ? t('simHide') : t('simReveal')}
        </button>
        <button type="button" className="field-btn" onClick={() => setPlaying(v => !v)}>
          {playing ? t('simPause') : t('simPlay')}
        </button>
      </div>

      <ul className="field-key">
        <li><span className="key-glyph gold" aria-hidden="true" />{t('simCircling')}</li>
        <li><span className="key-glyph sky" aria-hidden="true" />{t('simCruising')}</li>
        <li className="key-scale">
          <span>{t('simScale')}</span>
          <span className="key-ramp" aria-hidden="true" />
          <span className="key-ends">{t('low')} → {t('high')}</span>
        </li>
      </ul>
    </div>
  );
}
