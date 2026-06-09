"use client";
import { useEffect, useRef } from "react";

// Traço estilo PCB: move-se apenas ortogonalmente (0°/90°/180°/270°)
// Cor: quase preto, opacidade baixa — contrasta com o fundo branco-gelo

interface Trace {
  x: number; y: number;
  cx: number; cy: number;          // posição atual da "cabeça"
  dir: 0 | 1 | 2 | 3;             // 0=direita 1=cima 2=esquerda 3=baixo
  segments: { x: number; y: number }[]; // pontos já desenhados
  speed: number;
  opacity: number;
  width: number;
  age: number;                     // frames desde criação
  maxAge: number;
}

const TRACE_COLOR = "#1e293b";     // quase preto
const PAD_COLOR   = "#334155";
const VIA_COLOR   = "#475569";

function newDir(current: 0|1|2|3): 0|1|2|3 {
  // Prefere virar 90° à esquerda ou direita; raramente continua reto; nunca inverte
  const opts: (0|1|2|3)[][] = [
    [1, 3, 0],   // vindo da dir → vira pra cima ou baixo (ou continua)
    [0, 2, 1],   // vindo de cima → vira dir ou esq (ou continua)
    [1, 3, 2],   // vindo da esq → vira pra cima ou baixo (ou continua)
    [0, 2, 3],   // vindo de baixo → vira dir ou esq (ou continua)
  ];
  const choices = opts[current];
  return choices[Math.floor(Math.random() * choices.length)] as 0|1|2|3;
}

function buildTrace(W: number, H: number): Trace {
  const edge = Math.floor(Math.random() * 4); // 0=left 1=top 2=right 3=bottom
  let x = 0, y = 0;
  let dir: 0|1|2|3 = 0;
  if (edge === 0) { x = 0;  y = Math.random() * H; dir = 0; }
  if (edge === 1) { x = Math.random() * W; y = 0; dir = 3; }
  if (edge === 2) { x = W;  y = Math.random() * H; dir = 2; }
  if (edge === 3) { x = Math.random() * W; y = H; dir = 1; }

  return {
    x, y, cx: x, cy: y, dir,
    segments: [{ x, y }],
    speed: 1.2 + Math.random() * 2.8,
    opacity: 0.06 + Math.random() * 0.09,
    width: Math.random() < 0.2 ? 1.5 : 1,
    age: 0,
    maxAge: 180 + Math.floor(Math.random() * 240),
  };
}

function stepLength() { return 40 + Math.random() * 80; }

export function CircuitBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;
    const traces: Trace[] = [];

    // Pads estáticos (círculos no fundo — como solda de componentes)
    let pads: { x: number; y: number; r: number; op: number }[] = [];

    function resize() {
      if (!canvas) return;
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
      // Regenera pads quando redimensiona
      pads = Array.from({ length: 60 }, () => ({
        x:  Math.random() * canvas.width,
        y:  Math.random() * canvas.height,
        r:  1.5 + Math.random() * 2.5,
        op: 0.04 + Math.random() * 0.06,
      }));
    }
    resize();
    window.addEventListener("resize", resize);

    // Inicia com algumas traces já em andamento
    for (let i = 0; i < 28; i++) {
      const t = buildTrace(canvas.width, canvas.height);
      t.age = Math.floor(Math.random() * t.maxAge * 0.6);
      traces.push(t);
    }

    // Estado interno de cada trace: posição alvo do segmento atual
    const targets: { tx: number; ty: number }[] = traces.map(() => ({ tx: 0, ty: 0 }));
    function computeTarget(t: Trace): { tx: number; ty: number } {
      const len = stepLength();
      const dxMap = [len, 0, -len, 0];
      const dyMap = [0, -len, 0, len];
      return { tx: t.cx + dxMap[t.dir], ty: t.cy + dyMap[t.dir] };
    }
    traces.forEach((t, i) => { targets[i] = computeTarget(t); });

    function drawStaticPads() {
      if (!ctx) return;
      for (const p of pads) {
        ctx.save();
        ctx.globalAlpha = p.op;
        ctx.fillStyle = PAD_COLOR;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    function drawTrace(t: Trace, fadeAlpha: number) {
      if (!ctx || t.segments.length < 2) return;
      ctx.save();
      ctx.globalAlpha = t.opacity * fadeAlpha;
      ctx.strokeStyle = TRACE_COLOR;
      ctx.lineWidth   = t.width;
      ctx.lineCap     = "square";

      ctx.beginPath();
      ctx.moveTo(t.segments[0].x, t.segments[0].y);
      for (let i = 1; i < t.segments.length; i++) {
        ctx.lineTo(t.segments[i].x, t.segments[i].y);
      }
      ctx.lineTo(t.cx, t.cy);
      ctx.stroke();

      // Pad (via) nos pontos de junção
      ctx.fillStyle = PAD_COLOR;
      for (const seg of t.segments) {
        ctx.beginPath();
        ctx.arc(seg.x, seg.y, t.width + 1.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Cabeça da trace — pequeno círculo mais escuro
      ctx.globalAlpha = Math.min(1, t.opacity * fadeAlpha * 1.8);
      ctx.fillStyle = TRACE_COLOR;
      ctx.beginPath();
      ctx.arc(t.cx, t.cy, t.width + 0.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    function animate() {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      drawStaticPads();

      for (let i = 0; i < traces.length; i++) {
        const t = traces[i];
        t.age++;

        // Fade in / fade out baseado na idade
        const fadeIn  = Math.min(1, t.age / 30);
        const fadeOut = Math.max(0, 1 - Math.max(0, t.age - (t.maxAge - 40)) / 40);
        const fadeAlpha = fadeIn * fadeOut;

        if (fadeAlpha <= 0) {
          // Reinicia a trace
          traces[i] = buildTrace(canvas.width, canvas.height);
          targets[i] = computeTarget(traces[i]);
          continue;
        }

        // Avança a cabeça em direção ao alvo
        const { tx, ty } = targets[i];
        const dx = tx - t.cx, dy = ty - t.cy;
        const dist = Math.hypot(dx, dy);

        if (dist <= t.speed) {
          // Chegou ao alvo — registra ponto de virada e escolhe novo segmento
          t.cx = tx; t.cy = ty;
          t.segments.push({ x: tx, y: ty });

          // Verifica se saiu da tela
          if (tx < -120 || tx > canvas.width + 120 || ty < -120 || ty > canvas.height + 120) {
            traces[i] = buildTrace(canvas.width, canvas.height);
            targets[i] = computeTarget(traces[i]);
            continue;
          }

          t.dir = newDir(t.dir);
          targets[i] = computeTarget(t);
        } else {
          t.cx += (dx / dist) * t.speed;
          t.cy += (dy / dist) * t.speed;
        }

        drawTrace(t, fadeAlpha);
      }

      raf = requestAnimationFrame(animate);
    }
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
