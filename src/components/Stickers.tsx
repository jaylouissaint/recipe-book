// SVG stand-ins for the stickers in the book. Decorative only.

type Props = { className?: string };

export function RollingPin({ className }: Props) {
  return (
    <svg aria-hidden viewBox="0 0 120 24" className={className}>
      <rect x="2" y="9" width="22" height="6" rx="3" fill="#a9d3cf" />
      <rect x="96" y="9" width="22" height="6" rx="3" fill="#a9d3cf" />
      <rect x="22" y="3" width="76" height="18" rx="5" fill="var(--tab-orange)" />
      <rect x="26" y="6" width="68" height="3" rx="1.5" fill="#fff" opacity="0.35" />
    </svg>
  );
}

export function WhiskAndSpoon({ className }: Props) {
  return (
    <svg aria-hidden viewBox="0 0 110 100" className={className}>
      {/* spoon */}
      <ellipse cx="62" cy="22" rx="11" ry="14" transform="rotate(35 62 22)" fill="#5f6aa8" />
      <path d="M55 32 L14 90" stroke="#5f6aa8" strokeWidth="6" strokeLinecap="round" />
      {/* whisk */}
      <g transform="rotate(-30 70 50)" fill="none" stroke="#8fc39a" strokeWidth="2">
        <path d="M70 6 C54 20, 58 44, 70 56 C82 44, 86 20, 70 6 Z" />
        <path d="M70 6 C62 22, 64 42, 70 56 C76 42, 78 22, 70 6" />
        <path d="M70 6 L70 56" />
      </g>
      <path d="M85 74 L96 92" stroke="var(--tab-orange)" strokeWidth="7" strokeLinecap="round" />
    </svg>
  );
}

export function PlateSetting({ className }: Props) {
  return (
    <svg aria-hidden viewBox="0 0 120 64" className={className}>
      {/* knife */}
      <rect x="6" y="4" width="7" height="56" rx="3.5" fill="#9a9a9a" />
      {/* plate */}
      <circle cx="54" cy="32" r="26" fill="var(--tab-mustard)" />
      <circle cx="54" cy="32" r="17" fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="2" />
      {/* fork and spoon */}
      <rect x="88" y="22" width="5" height="38" rx="2.5" fill="#9a9a9a" />
      <path d="M84 6 v14 a6 6 0 0 0 13 0 V6" fill="none" stroke="#9a9a9a" strokeWidth="3" />
      <rect x="106" y="24" width="5" height="36" rx="2.5" fill="#9a9a9a" />
      <ellipse cx="108.5" cy="15" rx="6" ry="10" fill="#9a9a9a" />
    </svg>
  );
}
