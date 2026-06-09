"use client";
import { useEffect, useRef } from "react";

const STOPS = [
  { t: 0,    r: 15,  g: 23,  b: 42  },  // preto-ardósia
  { t: 0.35, r: 120, g: 53,  b: 15  },  // âmbar escuro
  { t: 0.65, r: 217, g: 119, b: 6   },  // âmbar/dourado
  { t: 1,    r: 251, g: 191, b: 36  },  // dourado brilhante
];

function gradColor(t: number): [number, number, number] {
  let i = 0;
  while (i < STOPS.length - 2 && STOPS[i + 1].t < t) i++;
  const a = STOPS[i], b = STOPS[i + 1];
  const s = b.t === a.t ? 0 : (t - a.t) / (b.t - a.t);
  return [
    Math.round(a.r + (b.r - a.r) * s),
    Math.round(a.g + (b.g - a.g) * s),
    Math.round(a.b + (b.b - a.b) * s),
  ];
}

interface Particle {
  x: number; y: number;
  tx: number; ty: number;
  vx: number; vy: number;
  size: number;
  r: number; g: number; b: number;
}

export default function ParticleText() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const cvRef   = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current!;
    const cv   = cvRef.current!;
    const ctx  = cv.getContext("2d")!;

    let raf       = 0;
    let pts: Particle[] = [];
    let mx        = -9999, my = -9999;
    let hovering  = false;
    let dissolve  = 1;
    let intro     = true;
    let firstBuild = true;
    let fontSize  = 110;
    let lineGap   = 140;

    // ── Sample text pixels & create particles ─────────────────────
    function buildCanvas(scatterStart: boolean) {
      const W = wrap.offsetWidth || 520;

      // Bigger font sizes than original (was 60/72/96)
      fontSize = W >= 768 ? 130 : W >= 640 ? 104 : 82;
      lineGap  = fontSize * 1.26;
      const H  = Math.round(lineGap * 2 + fontSize * 0.5);

      cv.width  = W;
      cv.height = H;

      const off = document.createElement("canvas");
      off.width = W; off.height = H;
      const oc  = off.getContext("2d")!;
      oc.font         = `900 ${fontSize}px Orbitron, monospace`;
      oc.fillStyle    = "#fff";
      oc.textAlign    = "center";
      oc.textBaseline = "middle";
      oc.fillText("MEMORY", W / 2, H / 2 - lineGap / 2);
      oc.fillText("DAY",    W / 2, H / 2 + lineGap / 2);

      const { data } = oc.getImageData(0, 0, W, H);
      const GAP = 4;
      pts = [];

      for (let y = 0; y < H; y += GAP) {
        for (let x = 0; x < W; x += GAP) {
          if (data[(y * W + x) * 4 + 3] > 100) {
            const [r, g, b] = gradColor(x / W);
            let sx = x, sy = y, svx = 0, svy = 0;

            if (scatterStart) {
              const angle = Math.random() * Math.PI * 2;
              const dist  = 60 + Math.random() * Math.max(W, H) * 0.65;
              sx  = W / 2 + Math.cos(angle) * dist;
              sy  = H / 2 + Math.sin(angle) * dist;
              svx = (Math.random() - 0.5) * 5;
              svy = (Math.random() - 0.5) * 5;
            }

            pts.push({ x: sx, y: sy, tx: x, ty: y, vx: svx, vy: svy, size: 1.4 + Math.random() * 0.9, r, g, b });
          }
        }
      }
    }

    // ── Render gradient text via canvas (solid state) ─────────────
    function drawText(alpha: number) {
      if (alpha <= 0.01) return;
      const W = cv.width, H = cv.height;
      const grad = ctx.createLinearGradient(0, 0, W, 0);
      grad.addColorStop(0,    "#0f172a");
      grad.addColorStop(0.35, "#78350f");
      grad.addColorStop(0.65, "#d97706");
      grad.addColorStop(1,    "#fbbf24");

      ctx.save();
      ctx.globalAlpha  = alpha;
      ctx.font         = `900 ${fontSize}px Orbitron, monospace`;
      ctx.fillStyle    = grad;
      ctx.textAlign    = "center";
      ctx.textBaseline = "middle";
      // Glow dourado suave
      ctx.shadowBlur  = 22;
      ctx.shadowColor = `rgba(217,119,6,${0.45 * alpha})`;
      ctx.fillText("MEMORY", W / 2, H / 2 - lineGap / 2);
      ctx.shadowColor = `rgba(251,191,36,${0.45 * alpha})`;
      ctx.fillText("DAY",    W / 2, H / 2 + lineGap / 2);
      // Sharp layer on top
      ctx.shadowBlur  = 0;
      ctx.fillText("MEMORY", W / 2, H / 2 - lineGap / 2);
      ctx.fillText("DAY",    W / 2, H / 2 + lineGap / 2);
      ctx.restore();
    }

    // ── Main loop ─────────────────────────────────────────────────
    function animate() {
      ctx.clearRect(0, 0, cv.width, cv.height);

      // ─ Dissolve state machine ─
      if (intro) {
        dissolve = 1; // particles fully visible during intro
        let done = true;
        for (const p of pts) {
          if (Math.hypot(p.x - p.tx, p.y - p.ty) > 3 || Math.hypot(p.vx, p.vy) > 0.3) {
            done = false; break;
          }
        }
        if (done) intro = false;
      } else {
        const spd = 0.055;
        if (hovering) dissolve = Math.min(1, dissolve + spd * 2.2);
        else          dissolve = Math.max(0, dissolve - spd);
      }

      // ─ Solid text (fades out as dissolve → 1) ─
      drawText(1 - dissolve);

      // ─ Particles (fade in as dissolve → 1) ─
      if (dissolve > 0.01) {
        const REPEL_R = 110, REPEL_F = 10;
        const ATTRACT = intro ? 0.036 : 0.052;
        const DAMP    = intro ? 0.81  : 0.78;

        for (const p of pts) {
          if (!intro && hovering) {
            const dx = p.x - mx, dy = p.y - my;
            const d  = Math.hypot(dx, dy);
            if (d < REPEL_R && d > 0.5) {
              const f = Math.pow(1 - d / REPEL_R, 1.7) * REPEL_F;
              p.vx += (dx / d) * f;
              p.vy += (dy / d) * f;
            }
          }

          p.vx += (p.tx - p.x) * ATTRACT;
          p.vy += (p.ty - p.y) * ATTRACT;
          p.vx *= DAMP;
          p.vy *= DAMP;
          p.x  += p.vx;
          p.y  += p.vy;

          const spd = Math.hypot(p.vx, p.vy);
          ctx.globalAlpha = dissolve * 0.92;
          // Glow dourado para partículas escuras, própria cor para as douradas
          const glowR = p.r < 80 ? 217 : p.r;
          const glowG = p.r < 80 ? 119 : p.g;
          const glowB = p.r < 80 ? 6   : p.b;
          ctx.shadowBlur  = 8;
          ctx.shadowColor = `rgba(${glowR},${glowG},${glowB},0.55)`;
          ctx.fillStyle   = `rgb(${p.r},${p.g},${p.b})`;

          if (spd < 0.38) {
            ctx.fillRect(p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
          } else {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * (1 + Math.min(spd * 0.07, 0.5)), 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Circuit traces between nearby settled particles
        ctx.shadowBlur = 0;
        ctx.lineWidth  = 0.5;
        for (let i = 0; i < pts.length; i += 3) {
          const p = pts[i];
          if (Math.hypot(p.vx, p.vy) > 0.5) continue;
          ctx.strokeStyle = `rgb(${p.r},${p.g},${p.b})`;
          for (let j = i + 1; j < Math.min(i + 12, pts.length); j++) {
            const q = pts[j];
            if (Math.hypot(q.vx, q.vy) > 0.5) continue;
            const d = Math.hypot(p.x - q.x, p.y - q.y);
            if (d < 13) {
              ctx.globalAlpha = dissolve * (1 - d / 13) * 0.25;
              ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
            }
          }
        }

        ctx.globalAlpha = 1;
        ctx.shadowBlur  = 0;
      }

      raf = requestAnimationFrame(animate);
    }

    // ── Events ────────────────────────────────────────────────────
    const onEnter = () => { if (!intro) hovering = true; };
    const onLeave = () => { hovering = false; mx = -9999; my = -9999; };
    const onMove  = (e: MouseEvent) => {
      const r = cv.getBoundingClientRect();
      mx = (e.clientX - r.left) * (cv.width  / r.width);
      my = (e.clientY - r.top)  * (cv.height / r.height);
    };

    wrap.addEventListener("mouseenter", onEnter);
    wrap.addEventListener("mouseleave", onLeave);
    window.addEventListener("mousemove", onMove);

    // Resize: skip during intro or before first build
    const ro = new ResizeObserver(() => {
      if (firstBuild || intro) return;
      cancelAnimationFrame(raf);
      buildCanvas(false);
      dissolve = 0;
      raf = requestAnimationFrame(animate);
    });
    ro.observe(wrap);

    // Start intro after fonts are ready
    document.fonts.ready.then(() => {
      firstBuild = false;
      buildCanvas(true);
      intro    = true;
      dissolve = 1;
      raf = requestAnimationFrame(animate);
    });

    return () => {
      cancelAnimationFrame(raf);
      wrap.removeEventListener("mouseenter", onEnter);
      wrap.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("mousemove", onMove);
      ro.disconnect();
    };
  }, []);

  return (
    <div ref={wrapRef} className="w-full select-none cursor-default">
      <canvas ref={cvRef} className="block" style={{ width: "100%" }} />
    </div>
  );
}
