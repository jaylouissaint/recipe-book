import { TAGS } from "@/lib/book";

// The row of circle checkboxes printed on every page. Checked tags get a hand-drawn ✗.
function Box({ checked }: { checked: boolean }) {
  return (
    <svg aria-hidden width="12" height="12" viewBox="0 0 12 12" className="shrink-0">
      <circle cx="6" cy="6" r="4.5" fill="none" stroke="var(--label)" strokeWidth="1" />
      {checked && (
        <path
          d="M2.2 2.6 C4.5 5, 7 7.6, 10 10.2 M9.6 2 C7.4 4.6, 4.8 7.4, 2.4 9.8"
          stroke="var(--ink)"
          strokeWidth="1.6"
          strokeLinecap="round"
          fill="none"
        />
      )}
    </svg>
  );
}

export default function TagRow({ tags }: { tags: string[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1" aria-label="Tags">
      {TAGS.map((t) => {
        const checked = tags.includes(t.id);
        return (
          <li key={t.id} className="flex items-center gap-1.5">
            <Box checked={checked} />
            <span className={`label-caps !text-[0.6rem] ${checked ? "!text-ink" : ""}`}>
              {t.label}
              {checked && <span className="sr-only"> (checked)</span>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
