"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DashCard,
  DashIntro,
  DashRing,
  DashShell,
  DashStat,
} from "@/components/clinic/DashKit";
import { FeedbackBox } from "@/components/ui/FeedbackBox";
import { ExerciseProgram } from "@/components/ExerciseProgram";
import { SessionReport } from "@/components/SessionReport";
import type { SessionSummary } from "@/lib/session-results";
import { useAuth } from "@/components/AuthProvider";
import { getFeedbackState } from "@/lib/feedback";
import { areaIdForInjury, getSessionRecommendations } from "@/lib/session-results";
import { t } from "@/lib/i18n";
import { PeakBarChart, TestLiveCharts } from "@/components/TestLiveCharts";
import { HeartRatePanel } from "@/components/HeartRatePanel";
import { MyoWarePanel } from "@/components/MyoWarePanel";
import { MotionPanel, PhotoMeasureCard } from "@/components/MotionPanel";
import { kidsJointForArea } from "@/lib/pose-goniometer";
import { useHeartRate } from "@/components/HeartRateProvider";
import { useMyoWare } from "@/components/MyoWareProvider";
import { prescribedMethod } from "@/lib/measure-method";
import { createRepCounter } from "@/lib/rep-counter";

type Phase = "recording" | "exercises" | "report";

export default function SessionPage() {
  const { user, saveExerciseHistory, getPreviousExerciseIds } = useAuth();
  const heart = useHeartRate();
  const muscle = useMyoWare();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("recording");
  const [angle, setAngle] = useState(0);
  const [reps, setReps] = useState(0);
  const [emg, setEmg] = useState<number | null>(null);
  const [hr, setHr] = useState<number | null>(null);
  const [recording, setRecording] = useState(false);
  const [motionReady, setMotionReady] = useState(false);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [signalSeen, setSignalSeen] = useState(false);
  const [wave, setWave] = useState<number[]>(() => Array(24).fill(0));
  const [emgWave, setEmgWave] = useState<number[]>(() => Array(24).fill(0));
  const [hrWave, setHrWave] = useState<number[]>(() => Array(24).fill(0));
  const savedRef = useRef(false);
  const angleCounter = useRef(createRepCounter());
  const effortCounter = useRef(createRepCounter({ minTravel: 18 }));

  const locale = user?.language ?? "en";
  const method = prescribedMethod(user?.ptPrescription);
  const target = user?.ptPrescription?.targetAngle ?? user?.targetRom ?? 90;
  const feedback = getFeedbackState(angle, target);
  const targetReps = user?.ptPrescription?.reps ?? 10;
  const romPct = Math.min(100, Math.round((angle / target) * 100));

  const areaId = user ? areaIdForInjury(user.injuryType) : "wrist";
  const exercises = useMemo(() => {
    if (!user || !summary) return [];
    return getSessionRecommendations(areaId, user, summary.angle, getPreviousExerciseIds(areaId), locale);
  }, [user, areaId, summary, getPreviousExerciseIds, locale]);

  useEffect(() => {
    if (!recording) return;
    const interval = setInterval(() => {
      if (heart.connected && heart.bpm) {
        setHr(heart.bpm);
        setHrWave((prev) => [...prev.slice(1), heart.bpm as number]);
      }
    }, 800);
    return () => clearInterval(interval);
  }, [recording, heart.connected, heart.bpm]);

  useEffect(() => {
    if (!recording || !muscle.connected || muscle.emg == null || method !== "muscle") return;
    setEmg(muscle.emg);
    setEmgWave((prev) => [...prev.slice(1), muscle.emg as number]);
    setSignalSeen(true);
    if (effortCounter.current.push(muscle.emg)) setReps((count) => count + 1);
  }, [recording, muscle.connected, muscle.emg, method]);

  useEffect(() => {
    if (phase !== "report" || !user || !summary || exercises.length === 0 || savedRef.current) {
      return;
    }
    saveExerciseHistory(areaId, completedIds.length ? completedIds : exercises.map((e) => e.id), {
      angle: summary.angle,
      reps: summary.reps,
      pain: user.painToday,
    });
    savedRef.current = true;
  }, [phase, user, summary, exercises, completedIds, areaId, saveExerciseHistory]);

  if (!user) return null;

  function noteAngle(next: number) {
    setAngle(next);
    setWave((prev) => [...prev.slice(1), next]);
    if (!recording || method === "muscle") return;
    setSignalSeen(true);
    if (angleCounter.current.push(next)) setReps((count) => count + 1);
  }

  function startRecording() {
    angleCounter.current.reset();
    effortCounter.current.reset();
    setSignalSeen(false);
    setReps(0);
    setRecording(true);
  }

  function countManualRep() {
    if (signalSeen) return;
    setReps((count) => count + 1);
  }

  function finishRecording() {
    setSummary({ angle, reps: 0, testReps: reps, emg, hr, target });
    setPhase("exercises");
  }

  if (phase === "exercises" && summary) {
    return (
      <DashShell wide={false}>
        <DashCard className="p-6 text-center">
          <p className="text-sm font-semibold text-[#3a7d62]">{t("sessionTestDone", locale)}</p>
          <p className="rm-serif mt-1 text-5xl font-semibold tabular-nums text-[#1b3348]">{summary.angle}°</p>
          <p className="mt-2 text-base text-[#2f4a60]">{t("sessionFollowExercises", locale)}</p>
        </DashCard>
        <div className="mt-6">
            <ExerciseProgram
            exercises={exercises}
            method={method}
            joint={kidsJointForArea(areaId)}
            onComplete={(ids, exerciseReps) => {
              setCompletedIds(ids);
              setSummary((prev) => (prev ? { ...prev, reps: exerciseReps } : prev));
              setPhase("report");
            }}
          />
        </div>
      </DashShell>
    );
  }

  if (phase === "report" && summary) {
    return (
      <DashShell wide={false}>
        <SessionReport
          summary={summary}
          exercises={exercises}
          completedIds={completedIds}
          onDone={() => router.push("/briefing")}
        />
      </DashShell>
    );
  }

  if ((user.painToday ?? 0) >= 7) {
    return (
      <DashShell wide={false}>
        <DashIntro kicker={t("liveSession", locale)} title={t("highPain", locale)} text={t("restToday", locale)} />
        <button type="button" onClick={() => router.push("/briefing")} className="rm-btn rm-btn-brand mt-6 w-full rounded-full">
          {t("goToBriefing", locale)}
        </button>
      </DashShell>
    );
  }

  const joint = kidsJointForArea(areaId);
  const chartSeries = [
    {
      label: motionReady ? t("chartUsbMotion", locale) : t("chartLiveAngle", locale),
      values: wave,
      unit: "°",
      max: 100,
    },
    ...(muscle.connected
      ? [
          {
            label: t("chartMuscle", locale),
            values: muscle.history.some((v) => v > 0) ? muscle.history : emgWave,
            max: 100,
          },
        ]
      : []),
    ...(heart.connected
      ? [
          {
            label: t("heartLive", locale),
            values: heart.history.some((v) => v > 0) ? heart.history : hrWave,
            unit: " bpm",
            max: 160,
          },
        ]
      : []),
  ];

  return (
    <DashShell>
      <DashIntro
        kicker={t("liveSession", locale)}
        title={user.ptPrescription?.exerciseName ?? t("liveSession", locale)}
        text={t("sessionReady", locale)}
      />

      <div className="mt-5">
        {!recording ? (
          <button type="button" onClick={startRecording} className="rm-btn rm-btn-brand h-14 w-full rounded-full text-base">
            {t("startRecording", locale)}
          </button>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <DashRing value={angle} max={target} label={t("sessionLiveRange", locale)} display={`${angle}°`} />
              <DashStat label={t("reps", locale)} value={`${reps}/${targetReps}`} hint={t("repCycleHint", locale)} />
            </div>
            <FeedbackBox state={feedback} angle={angle} target={target} locale={locale} />
            {!signalSeen ? (
              <button type="button" onClick={countManualRep} className="rm-btn rm-btn-ghost w-full rounded-full">
                {t("countRepBtn", locale)}
              </button>
            ) : null}
            <button type="button" onClick={finishRecording} className="rm-btn rm-btn-primary h-14 w-full rounded-full text-base">
              {t("sessionEndTest", locale)}
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 space-y-4">
        {method === "camera" ? <PhotoMeasureCard /> : null}
        {method === "motion" ? (
          <MotionPanel compact live={recording} joint={joint} onConnected={() => setMotionReady(true)} onAngle={noteAngle} />
        ) : null}
        {method === "muscle" ? <MyoWarePanel /> : null}
        <details className="rounded-[1.35rem] bg-white px-5 py-4 shadow-[0_12px_28px_rgba(27,51,72,0.06)] ring-1 ring-[#4f90c6]/12">
          <summary className="cursor-pointer text-base font-semibold text-[#1b3348]">{t("otherTools", locale)}</summary>
          <div className="mt-4 space-y-4">
            {method !== "camera" ? <PhotoMeasureCard /> : null}
            {method !== "motion" ? (
              <MotionPanel compact live={recording} joint={joint} onConnected={() => setMotionReady(true)} onAngle={noteAngle} />
            ) : null}
            {method !== "muscle" ? <MyoWarePanel /> : null}
            <HeartRatePanel compact hideWired />
            <TestLiveCharts series={chartSeries} />
            <PeakBarChart
              title={t("peakOverTime", locale)}
              bars={[
                { label: motionReady ? t("chartUsbAngle", locale) : t("chartLiveAngle", locale), value: angle, goal: target },
                { label: t("sessionBaseline", locale), value: user.baselineRom, goal: target },
                { label: t("target", locale), value: target },
              ]}
            />
            <DashCard className="px-5 py-4">
              <div className="mb-2 flex justify-between text-sm">
                <span className="font-semibold text-[#2f4a60]">{t("sessionLiveRange", locale)}</span>
                <span className="font-semibold tabular-nums text-[#1b3348]">{recording ? `${romPct}%` : "—"}</span>
              </div>
              <div className="rm-trajectory">
                <div className="rm-trajectory-fill" style={{ width: `${recording ? romPct : 0}%` }} />
              </div>
            </DashCard>
          </div>
        </details>
      </div>
    </DashShell>
  );
}
