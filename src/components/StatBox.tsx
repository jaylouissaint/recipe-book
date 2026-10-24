// Servings / Prep time / Cook time box with the mauve header strip.

function minutes(n: number | null) {
  return n == null ? "" : `${n} min`;
}

export default function StatBox({
  servings,
  prepMin,
  cookMin,
}: {
  servings: number | null;
  prepMin: number | null;
  cookMin: number | null;
}) {
  const cells = [
    { label: "Servings", value: servings ?? "" },
    { label: "Prep time", value: minutes(prepMin) },
    { label: "Cook time", value: minutes(cookMin) },
  ];
  return (
    <dl className="grid w-full max-w-72 shrink-0 grid-cols-3 border border-mauve">
      {cells.map((c, i) => (
        <div key={c.label} className={i > 0 ? "border-l border-mauve" : ""}>
          <dt className="label-caps bg-mauve px-1 py-0.5 text-center !text-[0.55rem] !text-white">
            {c.label}
          </dt>
          <dd className="px-2 text-center font-hand text-xl leading-8 text-ink">{c.value}</dd>
        </div>
      ))}
    </dl>
  );
}
