"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DashCard,
  DashHero,
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
  const [emg, setEmg] = useState(42);
  const [hr, setHr] = useState(72);
  const [recording, setRecording] = useState(false);
  const [motionReady, setMotionReady] = useState(false);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [signalSeen, setSignalSeen] = useState(false);
  const [wave, setWave] = useState<number[]>(() => Array(24).fill(0));
  const [emgWave, setEmgWave] = useState<number[]>(() => Array(24).fill(6));
  const [hrWave, setHrWave] = useState<number[]>(() => Array(24).fill(70));
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
          <p className="text-sm font-semibold text-[#3a7d62]">ROM test complete</p>
          <p className="rm-serif mt-1 text-5xl font-semibold tabular-nums text-[#1b3348]">{summary.angle}°</p>
          <p className="mt-2 text-base text-[#2f4a60]">Follow each exercise below in order.</p>
        </DashCard>
        <div className="mt-6">
          <ExerciseProgram
            exercises={exercises}
            method={method}
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

  return (
    <DashShell>
      <DashIntro
        kicker={t("liveSession", locale)}
        title={user.ptPrescription?.exerciseName ?? "ROM sensor test"}
        text={t("sessionIntro", locale)}
      />
      <div className="mt-5">
        <DashHero
          src="/images/landing-photo-goniometer.png?v=2"
          kicker="01 Measure"
          title={recording ? "Recording now" : "Ready to record"}
          text={
            recording
              ? "Hold the pose. End the test when the peak looks honest."
              : t("sessionReady", locale)
          }
        />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <DashRing value={angle} max={target} label="Live range vs goal" display={`${angle}°`} />
        <DashStat label={t("reps", locale)} value={`${reps}/${targetReps}`} hint={t("repCycleHint", locale)} />
        <DashStat
          label={muscle.connected ? t("muscleLive", locale) : t("muscleDemo", locale)}
          value={muscle.connected && muscle.emg != null ? muscle.emg : emg}
          hint={muscle.connected ? t("chartMuscle", locale) : t("muscleConnectHint", locale)}
        />
        <DashStat
          label={heart.connected ? t("heartLive", locale) : t("heartLabel", locale)}
          value={heart.connected && heart.bpm ? heart.bpm : hr}
          hint={heart.connected ? t("heartLiveHint", locale) : t("heartDemoHint", locale)}
        />
      </div>

      <div className="mt-6 space-y-4">
        {method === "camera" ? <PhotoMeasureCard /> : null}
        {method === "motion" ? (
          <MotionPanel
            compact
            live={recording}
            joint={kidsJointForArea(areaId)}
            onConnected={() => setMotionReady(true)}
            onAngle={noteAngle}
          />
        ) : null}
        {method === "muscle" ? <MyoWarePanel /> : null}
        <details className="rounded-[1.35rem] bg-white px-5 py-4 shadow-[0_12px_28px_rgba(27,51,72,0.06)] ring-1 ring-[#4f90c6]/12">
          <summary className="cursor-pointer text-sm font-semibold text-[#1b3348]">{t("otherTools", locale)}</summary>
          <div className="mt-4 space-y-4">
            {method !== "camera" ? <PhotoMeasureCard /> : null}
            {method !== "motion" ? (
              <MotionPanel
                compact
                live={recording}
                joint={kidsJointForArea(areaId)}
                onConnected={() => setMotionReady(true)}
                onAngle={noteAngle}
              />
            ) : null}
            {method !== "muscle" ? <MyoWarePanel /> : null}
            <HeartRatePanel compact hideWired />
          </div>
        </details>
        <FeedbackBox state={feedback} angle={angle} target={target} locale={locale} />

        <TestLiveCharts
          series={[
            {
              label: motionReady ? t("chartUsbMotion", locale) : t("chartLiveAngle", locale),
              values: wave,
              unit: "°",
              max: 100,
            },
            {
              label: muscle.connected ? t("chartMuscle", locale) : t("chartMuscleDemo", locale),
              values: muscle.connected && muscle.history.some((v) => v > 0) ? muscle.history : emgWave,
              max: 100,
            },
            {
              label: heart.connected ? "Heart rate (live)" : "Heart rate (demo)",
              values: heart.connected && heart.history.some((v) => v > 0) ? heart.history : hrWave,
              unit: " bpm",
              max: 160,
            },
          ]}
        />

        <PeakBarChart
          title="This test vs your plan"
          bars={[
            { label: motionReady ? t("chartUsbAngle", locale) : t("chartLiveAngle", locale), value: angle, goal: target },
            { label: "Baseline", value: user.baselineRom, goal: target },
            { label: "Goal", value: target },
          ]}
        />

        <DashCard className="px-5 py-4">
          <div className="mb-2 flex justify-between text-sm">
            <span className="font-semibold text-[#2f4a60]">ROM progress</span>
            <span className="font-semibold tabular-nums text-[#1b3348]">{romPct}%</span>
          </div>
          <div className="rm-trajectory">
            <div className="rm-trajectory-fill" style={{ width: `${romPct}%` }} />
          </div>
        </DashCard>

        {!recording ? (
          <button type="button" onClick={startRecording} className="rm-btn rm-btn-brand w-full rounded-full">
            {t("startRecording", locale)}
          </button>
        ) : (
          <div className="space-y-3">
            {!signalSeen ? (
              <button type="button" onClick={countManualRep} className="rm-btn rm-btn-ghost w-full rounded-full">
                {t("countRepBtn", locale)}
              </button>
            ) : null}
            <button type="button" onClick={finishRecording} className="rm-btn rm-btn-primary w-full rounded-full">
              End ROM test and start exercises
            </button>
          </div>
        )}
      </div>
    </DashShell>
  );
}
