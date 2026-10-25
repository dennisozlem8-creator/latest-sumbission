import Link from "next/link";
import type { WeeklyPatientUpdate } from "@/lib/weekly-update";

export function WeeklyUpdateCard({
  update,
  compact = false,
}: {
  update: WeeklyPatientUpdate;
  compact?: boolean;
}) {
  const change =
    update.peakChange == null ? "—" : update.peakChange > 0 ? `+${update.peakChange}°` : `${update.peakChange}°`;

  return (
    <article className="p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <p
          className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
            update.status === "on-track"
              ? "bg-[#e7f1ea] text-[#2a7a58]"
              : update.status === "watch"
                ? "bg-[#f4efe4] text-[#7a6548]"
                : "bg-[#e8f3fb] text-[#1b3348]"
          }`}
        >
          {update.statusLabel}
        </p>
        <p className="text-sm text-[#2f4a60]">{update.rangeLabel}</p>
      </div>
      <h3 className="rm-serif mt-2 text-2xl font-semibold text-[#1b3348]">{update.name}</h3>
      <p className="mt-1 text-base leading-7 text-[#1b3348]">{update.headline}</p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Days", value: `${update.days}/${update.expectedDays}` },
          { label: "Peak", value: update.peak != null ? `${update.peak}°` : "—" },
          { label: "Vs last week", value: change },
          { label: "Pain", value: update.pain != null ? `${update.pain}/10` : "—" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-[1.1rem] bg-[#f7fbfe] px-3 py-3">
            <p className="rm-serif text-2xl font-semibold tabular-nums text-[#1b3348]">{stat.value}</p>
            <p className="text-sm text-[#2f4a60]">{stat.label}</p>
          </div>
        ))}
      </div>
      {compact ? null : (
        <ul className="mt-4 space-y-1.5 text-sm leading-6 text-[#2f4a60]">
          {update.lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Link
          href={`/doctor/patient?email=${encodeURIComponent(update.email)}`}
          className="rm-btn h-12 min-h-0 flex-1 rounded-full bg-[#2a332c] px-5 text-[#f7f3ea] hover:bg-[#3a4a3c]"
        >
          Open chart
        </Link>
        <Link href="/pt-update" className="rm-btn rm-btn-ghost h-12 min-h-0 flex-1 rounded-full bg-white">
          Update plan
        </Link>
      </div>
    </article>
  );
}
