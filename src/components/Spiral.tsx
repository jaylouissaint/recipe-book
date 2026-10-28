// Wire binding: one ring repeated down the whole height of the page, however long it is.
// Decorative only.

const RING = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="18" viewBox="0 0 40 18">` +
    `<circle cx="30" cy="12" r="2.5" fill="#fbf8f2"/>` +
    `<path d="M30 12 C 22 3, 4 3, 4 10" stroke="#b9b9bd" stroke-width="3" fill="none" stroke-linecap="round"/>` +
    `<path d="M4 10 C 4 16, 18 17, 26 13" stroke="#b9b9bd" stroke-opacity="0.6" stroke-width="3" fill="none" stroke-linecap="round"/>` +
    `</svg>`,
);

// `ringHeight` scales the rings with the page (the book view); the writing page uses the default.
export default function Spiral({ className = "", ringHeight = 18 }: { className?: string; ringHeight?: number }) {
  return (
    <div
      aria-hidden
      className={`no-print pointer-events-none absolute ${className}`}
      style={{
        width: (ringHeight * 40) / 18,
        backgroundImage: `url("data:image/svg+xml,${RING}")`,
        backgroundRepeat: "repeat-y",
        backgroundSize: `${(ringHeight * 40) / 18}px ${ringHeight}px`,
      }}
    />
  );
}
