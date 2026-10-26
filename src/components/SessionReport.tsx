"use client";

import Link from "next/link";
import type { Exercise } from "@/lib/assessments";
import { StatTile } from "./ui/StatTile";
import { useAuth } from "./AuthProvider";
import { calculateStreak } from "@/lib/streak";
import { getChatResponse } from "@/lib/chat-bot";
import type { SessionSummary } from "@/lib/session-results";
import { DashCard } from "@/components/clinic/DashKit";

type SessionReportProps = {
  summary: SessionSummary;
  exercises: Exercise[];
  completedIds: string[];
  onDone: () => void;
};

export function SessionReport({
  summary,
  exercises,
  completedIds,
  onDone,
}: SessionReportProps) {
  const { user } = useAuth();
  if (!user) return null;

  const completed = exercises.filter((e) => completedIds.includes(e.id));
  const compliance = Math.round((completed.length / exercises.length) * 100);
  const streak = calculateStreak(user);
  const romGain = Math.max(0, summary.angle - user.baselineRom);

  const reportText = getChatResponse(
    `Patient completed ${completed.length}/${exercises.length} exercises. Peak ROM ${summary.angle} degrees. Baseline ${user.baselineRom}. Goal ${user.targetRom}. Pain ${user.painToday ?? 3}/10. Streak ${streak} days. Give a short recovery report.`
  );

  return (
    <div className="space-y-6">
      <DashCard className="p-6 text-center">
        <p className="text-sm font-semibold text-[#2f4a60]">Session report</p>
        <h2 className="rm-serif mt-1 text-3xl font-semibold text-[#1b3348]">Today’s numbers</h2>
        <p className="mt-2 text-base text-[#2f4a60]">Great work finishing today’s program.</p>
      </DashCard>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile value={`${summary.angle}°`} label="Peak ROM" />
        <StatTile value={`+${romGain}°`} label="ROM gain" />
        <StatTile value={`${compliance}%`} label="Completed" />
        <StatTile value={streak} label="Streak" />
      </div>

      <DashCard className="p-6">
        <h3 className="rm-serif text-2xl font-semibold text-[#1b3348]">Exercises completed</h3>
        <ul className="mt-4 space-y-2">
          {completed.map((ex) => (
            <li
              key={ex.id}
              className="flex items-center gap-2 rounded-[1.1rem] bg-[#e7f1ea] px-4 py-3 text-sm text-[#2a7a58]"
            >
              <span className="font-semibold">{ex.name}</span>
              <span className="ml-auto text-[#2f4a60]">{ex.sets}</span>
            </li>
          ))}
        </ul>
        {completed.length < exercises.length && (
          <p className="mt-3 text-sm text-[#2f4a60]">
            {exercises.length - completed.length} exercise(s) skipped this session.
          </p>
        )}
      </DashCard>

      <DashCard className="p-6">
        <h3 className="rm-serif text-2xl font-semibold text-[#1b3348]">RecoverAI summary</h3>
        <p className="mt-3 leading-7 text-[#2f4a60]">{reportText}</p>
      </DashCard>

      <DashCard className="p-6">
        <h3 className="rm-serif text-2xl font-semibold text-[#1b3348]">Sensor stats</h3>
        <dl className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <dt className="text-sm font-semibold text-[#2f4a60]">Exercise reps</dt>
            <dd className="rm-serif text-2xl font-semibold tabular-nums text-[#1b3348]">
              {summary.reps}
              {summary.testReps ? (
                <span className="mt-1 block text-sm font-medium text-[#2f4a60]">{summary.testReps} in the range test</span>
              ) : null}
            </dd>
          </div>
          {summary.emg != null ? (
            <div>
              <dt className="text-sm font-semibold text-[#2f4a60]">EMG effort</dt>
              <dd className="rm-serif text-2xl font-semibold tabular-nums text-[#1b3348]">{summary.emg}%</dd>
            </div>
          ) : null}
          {summary.hr != null ? (
            <div>
              <dt className="text-sm font-semibold text-[#2f4a60]">Heart rate</dt>
              <dd className="rm-serif text-2xl font-semibold tabular-nums text-[#1b3348]">{summary.hr} BPM</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-sm font-semibold text-[#2f4a60]">Pain today</dt>
            <dd className="rm-serif text-2xl font-semibold tabular-nums text-[#1b3348]">{user.painToday ?? "—"}/10</dd>
          </div>
        </dl>
      </DashCard>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href="/charts" className="rm-btn rm-btn-ghost flex-1 rounded-full text-center">
          View charts
        </Link>
        <button type="button" onClick={onDone} className="rm-btn rm-btn-brand flex-1 rounded-full">
          Back to briefing
        </button>
      </div>
    </div>
  );
}
