const DATA = [
  { label: "On paper", hours: 9, max: 10, fill: "bg-ink" },
  { label: "On PlumbFlow", hours: 2, max: 10, fill: "bg-amber" },
];

/** Illustrative only: not a survey figure or a measured statistic. */
export function AdminHoursChart() {
  return (
    <figure className="rounded-xl border border-line bg-surface p-5">
      <figcaption>
        <h3 className="text-lg font-semibold">Admin hours in a week</h3>
        <p className="mt-1 text-[15px] text-slate">Illustrative example, not a survey result.</p>
      </figcaption>
      <div className="mt-6 flex flex-col gap-4">
        {DATA.map((row) => {
          const pct = (row.hours / row.max) * 100;
          return (
            <div key={row.label} className="grid grid-cols-[104px_1fr_64px] items-center gap-3">
              <span className="text-[15px] font-medium text-slate">{row.label}</span>
              <div className="h-9 w-full overflow-hidden rounded-r-lg bg-surface">
                <div
                  style={{ width: `${pct}%` }}
                  className={`h-full rounded-r-lg ${row.fill} transition-all duration-300`}
                />
              </div>
              <span className="tabular text-[15px] font-semibold text-ink">{row.hours} hrs</span>
            </div>
          );
        })}
      </div>
    </figure>
  );
}
