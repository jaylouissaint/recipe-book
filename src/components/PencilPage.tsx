"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Page mode on the writing page (docs/DESIGN.md "Writing page"): write anywhere on ruled pages
// with the Apple Pencil (or a mouse, or a finger when turned on), adding pages as needed. The
// writing is kept as one picture, the recipe's handwritten page, with the pages one under the
// other; it isn't read into text.
//
// Strokes are kept in page units (PAGE) with the page they're on, so pages look the same at any
// size. Each page is its own canvas (Safari limits how big one canvas can be). On an iPad, fingers
// scroll and the Pencil draws: Safari reports the Pencil as a "stylus" touch, and only those
// touches are stopped from scrolling.

export type Stroke = { w: number; pts: number[]; p?: number }; // x, y, pressure (0–1) triples; page (0 if missing)

export const PAGE = { w: 800, h: 1120, line: 40, top: 80, left: 56, right: 28 };
const INK = "#7b3f61";
const RULE = "#ddd8dc";
const PAPER = "#fbf8f2";
const PEN_WIDTH = 2.6;
const ERASER = 14; // how near (in page units) the eraser has to come to a stroke
const MAX_PIXELS = 16_000_000; // the largest canvas Safari will make

const pageOf = (s: Stroke) => s.p ?? 0;

function drawSegment(ctx: CanvasRenderingContext2D, s: Stroke, i: number, dy = 0) {
  const p = s.pts;
  ctx.lineWidth = s.w * (0.4 + p[i + 2]);
  ctx.beginPath();
  if (i === 0) {
    ctx.moveTo(p[0], p[1] + dy);
    ctx.lineTo(p[0] + 0.01, p[1] + dy); // a dot
  } else {
    ctx.moveTo(p[i - 3], p[i - 2] + dy);
    ctx.lineTo(p[i], p[i + 1] + dy);
  }
  ctx.stroke();
}

function drawStroke(ctx: CanvasRenderingContext2D, s: Stroke, dy = 0) {
  for (let i = 0; i < s.pts.length; i += 3) drawSegment(ctx, s, i, dy);
}

function setInk(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = INK;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
}

function backgroundHeight(img: HTMLImageElement) {
  return (PAGE.w * img.naturalHeight) / img.naturalWidth;
}

// Paper and each page's rules from `top` to `top + height` (page units), then the saved page on top.
function paper(ctx: CanvasRenderingContext2D, top: number, height: number, background: HTMLImageElement | null) {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, PAGE.w, height);
  ctx.fillStyle = RULE;
  for (let page = Math.floor(top / PAGE.h); page * PAGE.h < top + height; page++) {
    for (let y = PAGE.top; y < PAGE.h - PAGE.line / 2; y += PAGE.line) {
      const at = page * PAGE.h + y - top;
      if (at >= 0 && at < height) ctx.fillRect(PAGE.left - 16, at, PAGE.w - PAGE.left - PAGE.right + 16, 1);
    }
  }
  if (background) ctx.drawImage(background, 0, -top, PAGE.w, backgroundHeight(background));
}

// Pages the saved handwritten page fills.
function backgroundPages(img: HTMLImageElement | null) {
  return img ? Math.max(1, Math.ceil(backgroundHeight(img) / PAGE.h - 0.01)) : 0;
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

// All the pages as one PNG, one under the other, cut off a couple of lines below the writing
// (never shorter than the saved page underneath, and at least 10 lines).
export async function pageImage(strokes: Stroke[], background: HTMLImageElement | null): Promise<Blob> {
  let bottom = 0;
  for (const s of strokes) for (let i = 1; i < s.pts.length; i += 3) bottom = Math.max(bottom, pageOf(s) * PAGE.h + s.pts[i]);
  const lastPage = Math.floor(bottom / PAGE.h);
  const ink = Math.min((lastPage + 1) * PAGE.h, Math.ceil((bottom + PAGE.line * 2) / PAGE.line) * PAGE.line);
  const height = Math.round(Math.max(background ? backgroundHeight(background) : 0, ink, PAGE.top + PAGE.line * 10));
  const scale = Math.min(2, Math.floor(Math.sqrt(MAX_PIXELS / (PAGE.w * height)) * 10) / 10);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(PAGE.w * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("The handwritten page couldn't be saved.");
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  paper(ctx, 0, height, background);
  setInk(ctx);
  strokes.forEach((s) => drawStroke(ctx, s, pageOf(s) * PAGE.h));
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
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [fingerDraws, setFingerDraws] = useState(false);
  const [under, setUnder] = useState<HTMLImageElement | null>(null);
  const [added, setAdded] = useState(1); // pages showing, at least
  const latest = useRef(strokes);
  latest.current = strokes;

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

  // Enough pages for the writing and the saved page, plus any added by hand.
  const needed = Math.max(1, backgroundPages(under), ...strokes.map((s) => pageOf(s) + 1));
  const pages = Math.max(added, needed);

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-1 mb-3 md:top-16 navside:md:top-0 flex flex-wrap items-center gap-2 bg-paper/95 px-1 py-2 font-sans backdrop-blur">
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
        <button type="button" onClick={() => onChange(strokes.slice(0, -1))} disabled={!strokes.length} className={`${TOOL} text-accent`}>
          Undo
        </button>
        <button
          type="button"
          disabled={!strokes.length && !background}
          onClick={() => {
            if (!confirm("Clear all the pages?")) return;
            onChange([]);
            setAdded(1);
            if (background) onClearBackground();
          }}
          className={`${TOOL} text-accent`}
        >
          Clear
        </button>
        <label className="ml-auto flex cursor-pointer items-center gap-2 text-[14px] text-muted">
          <input type="checkbox" checked={fingerDraws} onChange={(e) => setFingerDraws(e.target.checked)} className="size-4 accent-accent" />
          Draw with finger
        </label>
      </div>

      <div className="space-y-6">
        {Array.from({ length: pages }, (_, i) => (
          <div key={i}>
            {pages > 1 && <p className="mb-2 font-sans text-[13px] text-muted">Page {i + 1}</p>}
            <Sheet index={i} strokes={latest} version={strokes} under={under} tool={tool} fingerDraws={fingerDraws} onChange={onChange} />
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 font-sans">
        <button
          type="button"
          onClick={() => setAdded(pages + 1)}
          className="rounded-full bg-surface px-5 py-2.5 text-[15px] font-semibold text-accent shadow-card"
        >
          + Add a page
        </button>
        {pages > needed && (
          <button type="button" onClick={() => setAdded(pages - 1)} className="text-[14px] text-muted underline underline-offset-4">
            Remove the empty last page
          </button>
        )}
      </div>
    </div>
  );
}

// One page to write on.
function Sheet({
  index,
  strokes,
  version,
  under,
  tool,
  fingerDraws,
  onChange,
}: {
  index: number;
  strokes: React.RefObject<Stroke[]>; // always the latest, for drawing between renders
  version: Stroke[]; // changes whenever the strokes do, to repaint
  under: HTMLImageElement | null;
  tool: "pen" | "eraser";
  fingerDraws: boolean;
  onChange: (strokes: Stroke[]) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(0);
  const current = useRef<Stroke | null>(null);
  const fingers = useRef(fingerDraws);
  fingers.current = fingerDraws;

  const repaint = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const scale = canvas.width / PAGE.w;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    paper(ctx, index * PAGE.h, PAGE.h, under);
    setInk(ctx);
    for (const s of strokes.current) if (pageOf(s) === index) drawStroke(ctx, s);
    if (current.current) drawStroke(ctx, current.current);
  }, [index, strokes, under]);

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
  useEffect(repaint, [version, repaint]);

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
    const all = strokes.current;
    const left = all.filter((s) => pageOf(s) !== index || !nearStroke(s, x, y));
    if (left.length !== all.length) onChange(left);
  }

  function down(e: React.PointerEvent<HTMLCanvasElement>) {
    if (e.pointerType === "touch" && !fingerDraws) return; // a finger scrolls the page
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const [x, y, p] = at(e);
    if (tool === "eraser") return erase(x, y);
    current.current = { w: PEN_WIDTH, pts: [x, y, p], p: index };
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
    if (s) onChange([...strokes.current, s]);
  }

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      aria-label={`Handwritten page ${index + 1}. Write with the Apple Pencil or a mouse.`}
      // No text selection, loupe or callout when the Pencil rests on the page (Safari)
      className="block w-full rounded-sm shadow-[0_2px_12px_rgba(0,0,0,0.12)] select-none [-webkit-touch-callout:none]"
      style={{ aspectRatio: `${PAGE.w} / ${PAGE.h}`, touchAction: fingerDraws ? "none" : "pan-x pan-y pinch-zoom" }}
    />
  );
}
