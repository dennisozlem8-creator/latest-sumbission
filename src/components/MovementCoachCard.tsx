import type { GoniometerMeasurement } from "@/lib/goniometer";
import type { MovementCoachReport } from "@/lib/movement-coach";
import { nextSessionActions } from "@/lib/recovery-plan";

const TONE: Record<string, string> = {
  ok: "border-correct/30 bg-correct/10 text-correct",
  watch: "border-almost/35 bg-almost/10 text-almost",
  unusual: "border-alert/35 bg-alert/10 text-alert",
};

export function MovementCoachCard({
  report,
  selectedExercise,
  history = [],
  goal = 100,
}: {
  report: MovementCoachReport;
  selectedExercise: string;
  history?: GoniometerMeasurement[];
  goal?: number;
}) {
  const unusual = report.findings.filter((finding) => finding.severity === "unusual");
  const watches = report.findings.filter((finding) => finding.severity === "watch");
  const oks = report.findings.filter((finding) => finding.severity === "ok");
  const actions = nextSessionActions(report, history, selectedExercise, goal);

  return (
    <div className="mt-6 rounded-[1.35rem] bg-[#f7fbfe] px-4 py-4 ring-1 ring-[#4f90c6]/12 sm:px-5">
      <p className="text-sm font-semibold text-[#2f4a60]">Movement coach</p>
      <h3 className="rm-serif mt-1 text-xl font-semibold text-[#1b3348]">What the AI saw</h3>
      <p className="mt-2 text-sm text-body">{report.headline}</p>
      {report.progressNote && <p className="mt-2 text-sm text-body">{report.progressNote}</p>}
      <p className="mt-3 text-sm font-semibold text-foreground">Form score {report.formScore} / 100</p>

      <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
        <span className="rounded-full bg-surface-elevated px-3 py-1 text-foreground">
          Looks like {report.detectedExercise}
          {report.confidence !== "high" ? ` · ${report.confidence} confidence` : ""}
        </span>
        <span className="rounded-full bg-surface-elevated px-3 py-1 text-foreground">
          You selected {selectedExercise}
        </span>
        <span className="rounded-full bg-surface-elevated px-3 py-1 text-foreground">
          Tracking {report.trackingQuality}
        </span>
      </div>

      {unusual.length > 0 && (
        <div className="mt-5">
          <p className="text-sm font-semibold text-alert">Unusual on the recorded part</p>
          <ul className="mt-2 space-y-2">
            {unusual.map((finding) => (
              <li key={finding.id} className={`rounded-xl border px-3 py-3 ${TONE.unusual}`}>
                <p className="font-semibold">
                  {finding.title}
                  {finding.timeSec != null ? ` · ${finding.timeSec.toFixed(1)}s` : ""}
                </p>
                <p className="mt-1 text-sm text-body">{finding.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {watches.length > 0 && (
        <div className="mt-5">
          <p className="text-sm font-semibold text-almost">Form notes</p>
          <ul className="mt-2 space-y-2">
            {watches.map((finding) => (
              <li key={finding.id} className={`rounded-xl border px-3 py-3 ${TONE.watch}`}>
                <p className="font-semibold">
                  {finding.title}
                  {finding.timeSec != null ? ` · ${finding.timeSec.toFixed(1)}s` : ""}
                </p>
                <p className="mt-1 text-sm text-body">{finding.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {oks.length > 0 && (
        <ul className="mt-4 space-y-2">
          {oks.map((finding) => (
            <li key={finding.id} className={`rounded-xl border px-3 py-3 ${TONE.ok}`}>
              <p className="font-semibold">{finding.title}</p>
              <p className="mt-1 text-sm text-body">{finding.detail}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5">
        <p className="text-sm font-semibold text-foreground">Do this next</p>
        <ol className="mt-2 list-decimal space-y-3 pl-5 text-sm text-body">
          {actions.map((step) => (
            <li key={step.do}>
              <span className="font-semibold text-foreground">{step.do}</span>
              <span className="mt-1 block text-muted">{step.why}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-5">
        <p className="text-sm font-semibold text-foreground">Form cues for this exercise</p>
        <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm text-body">
          {report.feedback.map((cue) => (
            <li key={cue}>{cue}</li>
          ))}
        </ol>
      </div>

      <p className="mt-4 text-xs text-muted">
        On-device pose AI reads the three points for the joint you picked. This is coaching for your home program,
        not a diagnosis.
      </p>
    </div>
  );
}
