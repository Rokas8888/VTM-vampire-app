// Read-only display of active conditions — shown on character sheets
const SEVERITY_STYLE = {
  mild:     "border-yellow-800/60 text-yellow-500/80 bg-yellow-950/40",
  moderate: "border-orange-800/60 text-orange-400/90 bg-orange-950/40",
  severe:   "border-red-800/70   text-red-400         bg-red-950/50",
};

export default function ConditionBadges({ conditions = [] }) {
  if (conditions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {conditions.map((c) => (
        <span
          key={c.id}
          title={c.notes ?? c.severity}
          className={`text-xs px-2 py-0.5 rounded border font-gothic tracking-wide ${
            SEVERITY_STYLE[c.severity] ?? SEVERITY_STYLE.moderate
          }`}
        >
          {c.name}
        </span>
      ))}
    </div>
  );
}
