"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Page mode on the writing page (docs/DESIGN.md "Writing page"): write anywhere on a ruled page
// with the Apple Pencil (or a mouse, or a finger when turned on). The writing is kept as a
// picture, the recipe's handwritten page; it isn't read into text.
//
// Strokes are kept in page units (PAGE), so the page looks the same at any size. On an iPad,
// fingers scroll and the Pencil draws: Safari reports the Pencil as a "stylus" touch, and only
// those touches are stopped from scrolling.

export type Stroke = { w: number; pts: number[] }; // x, y, pressure (0–1) triples

export const PAGE = { w: 800, h: 1120, line: 40, top: 80, left: 56, right: 28 };
const INK = "#7b3f61";
const RULE = "#ddd8dc";
const PAPER = "#fbf8f2";
const PEN_WIDTH = 2.6;
const ERASER = 14; // how near (in page units) the eraser has to come to a stroke

function drawSegment(ctx: CanvasRenderingContext2D, s: Stroke, i: number) {
  const p = s.pts;
  ctx.lineWidth = s.w * (0.4 + p[i + 2]);
  ctx.beginPath();
  if (i === 0) {
    ctx.moveTo(p[0], p[1]);
    ctx.lineTo(p[0] + 0.01, p[1]); // a dot
  } else {
    ctx.moveTo(p[i - 3], p[i - 2]);
    ctx.lineTo(p[i], p[i + 1]);
  }
  ctx.stroke();
}

function drawStroke(ctx: CanvasRenderingContext2D, s: Stroke) {
  for (let i = 0; i < s.pts.length; i += 3) drawSegment(ctx, s, i);
}

// The page: paper, rules (or the saved page underneath), then the ink.
function paint(
  ctx: CanvasRenderingContext2D,
  scale: number,
  height: number,
  strokes: Stroke[],
  background: HTMLImageElement | null,
) {
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, PAGE.w, height);
  if (background) {
    ctx.drawImage(background, 0, 0, PAGE.w, (PAGE.w * background.naturalHeight) / background.naturalWidth);
  } else {
    ctx.fillStyle = RULE;
    for (let y = PAGE.top; y < height - PAGE.line / 2; y += PAGE.line)
      ctx.fillRect(PAGE.left - 16, y, PAGE.w - PAGE.left - PAGE.right + 16, 1);
  }
  ctx.strokeStyle = INK;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  strokes.forEach((s) => drawStroke(ctx, s));
}

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // so the saved page can be drawn into the new one
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("The handwritten page couldn't be loaded."));
    img.src = url;
  });
}

// The page as a PNG, cut off a couple of lines below the writing (never shorter than the saved
// page underneath, and at least 10 lines).
export async function pageImage(strokes: Stroke[], background: HTMLImageElement | null): Promise<Blob> {
  let bottom = 0;
  for (const s of strokes) for (let i = 1; i < s.pts.length; i += 3) bottom = Math.max(bottom, s.pts[i]);
  const under = background ? (PAGE.w * background.naturalHeight) / background.naturalWidth : 0;
  const ink = Math.ceil((bottom + PAGE.line * 2) / PAGE.line) * PAGE.line;
  const height = Math.round(Math.min(PAGE.h, Math.max(under, ink, PAGE.top + PAGE.line * 10)));
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = PAGE.w * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("The handwritten page couldn't be saved.");
  paint(ctx, scale, height, strokes, background);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("The handwritten page couldn't be saved."))), "image/png"),
  );
}

function nearStroke(s: Stroke, x: number, y: number) {
  for (let i = 0; i < s.pts.length; i += 3) {
    if (Math.hypot(s.pts[i] - x, s.pts[i + 1] - y) < ERASER) return true;
  }
  return false;
}

const TOOL = "rounded-full px-4 py-2 text-[14px] font-semibold disabled:opacity-40";

export default function PencilPage({
  strokes,
  onChange,
  background,
  onClearBackground,
}: {
  strokes: Stroke[];
  onChange: (strokes: Stroke[]) => void;
  background: string; // the saved handwritten page's address, when editing one
  onClearBackground: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [fingerDraws, setFingerDraws] = useState(false);
  const [under, setUnder] = useState<HTMLImageElement | null>(null);
  const [width, setWidth] = useState(0);
  const current = useRef<Stroke | null>(null);
  const latest = useRef(strokes);
  latest.current = strokes;
  const fingers = useRef(fingerDraws);
  fingers.current = fingerDraws;

  useEffect(() => {
    if (!background) return setUnder(null);
    let live = true;
    loadImage(background).then(
      (img) => live && setUnder(img),
      () => live && setUnder(null),
    );
    return () => {
      live = false;
    };
  }, [background]);

  const scale = useCallback(() => (canvasRef.current ? canvasRef.current.width / PAGE.w : 1), []);

  const repaint = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    paint(ctx, scale(), PAGE.h, current.current ? [...latest.current, current.current] : latest.current, under);
  }, [scale, under]);

  // The canvas follows the page's width, at the screen's pixel density.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !width) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(((width * PAGE.h) / PAGE.w) * dpr);
    repaint();
  }, [width, repaint]);
  useEffect(repaint, [strokes, repaint]);

  // The Pencil draws instead of scrolling; fingers scroll unless "Draw with finger" is on.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const stop = (e: TouchEvent) => {
      const stylus = Array.from(e.touches).some((t) => (t as Touch & { touchType?: string }).touchType === "stylus");
      if (stylus || fingers.current) e.preventDefault();
    };
    canvas.addEventListener("touchstart", stop, { passive: false });
    canvas.addEventListener("touchmove", stop, { passive: false });
    return () => {
      canvas.removeEventListener("touchstart", stop);
      canvas.removeEventListener("touchmove", stop);
    };
  }, []);

  function at(e: React.PointerEvent | PointerEvent) {
    const rect = canvasRef.current!.getBoundingClientRect();
    const pressure = e.pointerType === "pen" ? e.pressure || 0.5 : 0.5;
    return [((e.clientX - rect.left) * PAGE.w) / rect.width, ((e.clientY - rect.top) * PAGE.w) / rect.width, pressure];
  }

  function erase(x: number, y: number) {
    const left = latest.current.filter((s) => !nearStroke(s, x, y));
    if (left.length !== latest.current.length) onChange(left);
  }

  function down(e: React.PointerEvent<HTMLCanvasElement>) {
    if (e.pointerType === "touch" && !fingerDraws) return; // a finger scrolls the page
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const [x, y, p] = at(e);
    if (tool === "eraser") return erase(x, y);
    current.current = { w: PEN_WIDTH, pts: [x, y, p] };
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) drawSegment(ctx, current.current, 0);
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const events = e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent];
    for (const ev of events.length ? events : [e.nativeEvent]) {
      const [x, y, p] = at(ev);
      if (tool === "eraser") {
        erase(x, y);
        continue;
      }
      const s = current.current;
      if (!s) continue;
      s.pts.push(x, y, p);
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) drawSegment(ctx, s, s.pts.length - 3);
    }
  }

  function up() {
    const s = current.current;
    current.current = null;
    if (s) onChange([...latest.current, s]);
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2 font-sans">
        <div className="flex rounded-full bg-field p-1" role="radiogroup" aria-label="Tool">
          {(["pen", "eraser"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={tool === t}
              onClick={() => setTool(t)}
              className={`${TOOL} ${tool === t ? "bg-surface text-fg shadow-card" : "text-muted"}`}
            >
              {t === "pen" ? "Pen" : "Eraser"}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onChange(strokes.slice(0, -1))}
          disabled={!strokes.length}
          className={`${TOOL} text-accent`}
        >
          Undo
        </button>
        <button
          type="button"
          disabled={!strokes.length && !background}
          onClick={() => {
            if (!confirm("Clear the whole page?")) return;
            onChange([]);
            if (background) onClearBackground();
          }}
          className={`${TOOL} text-accent`}
        >
          Clear page
        </button>
        <label className="ml-auto flex cursor-pointer items-center gap-2 text-[14px] text-muted">
          <input
            type="checkbox"
            checked={fingerDraws}
            onChange={(e) => setFingerDraws(e.target.checked)}
            className="size-4 accent-accent"
          />
          Draw with finger
        </label>
      </div>
      <canvas
        ref={canvasRef}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        aria-label="Handwritten page. Write with the Apple Pencil or a mouse."
        className="block w-full rounded-sm shadow-[0_2px_12px_rgba(0,0,0,0.12)]"
        style={{
          aspectRatio: `${PAGE.w} / ${PAGE.h}`,
          touchAction: fingerDraws ? "none" : "pan-x pan-y pinch-zoom",
        }}
      />
    </div>
  );
}
