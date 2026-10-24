// Wire binding down the left edge of a page. Decorative only.

const RING_GAP = 18;
const RINGS = 60;

export default function Spiral() {
  return (
    <div
      aria-hidden
      className="no-print pointer-events-none absolute top-6 bottom-6 -left-5 hidden w-10 overflow-hidden md:block"
    >
      <svg width="40" height={RINGS * RING_GAP} viewBox={`0 0 40 ${RINGS * RING_GAP}`}>
        {Array.from({ length: RINGS }, (_, i) => {
          const y = i * RING_GAP + 9;
          return (
            <g key={i}>
              {/* punched hole in the paper */}
              <circle cx="30" cy={y + 3} r="2.5" fill="var(--desk)" />
              {/* the ring: back half is darker, front half lighter */}
              <path
                d={`M30 ${y + 3} C 22 ${y - 6}, 4 ${y - 6}, 4 ${y + 1}`}
                stroke="var(--ring)"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
              />
              <path
                d={`M4 ${y + 1} C 4 ${y + 7}, 18 ${y + 8}, 26 ${y + 4}`}
                stroke="var(--ring)"
                strokeOpacity="0.6"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
