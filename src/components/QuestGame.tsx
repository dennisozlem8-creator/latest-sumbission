"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Exercise } from "@/lib/assessments";
import { getExerciseMedia, getKidsExerciseImage } from "@/lib/exercise-media";
import { persistMeasurement } from "@/lib/goniometer";
import { BLUETOOTH_MPU_BAUD, connectWiredMpu, mpuUsbHelp, mpuUsbSupported, requestUsbMpuPort, type MpuConnection } from "@/lib/mpu-sensor";
import { createRepCounter } from "@/lib/rep-counter";
import { useAuth } from "./AuthProvider";
import { getFeedbackState } from "@/lib/feedback";
import { completeKidsQuestLocal } from "@/lib/kids-progress";
import { kidsJointForArea, kidsJointLabels, type KidsJoint } from "@/lib/pose-goniometer";
import { KidsIcon } from "./KidsIcon";
import { KidsPhotoCamera, type KidsPhotoStatus } from "./KidsPhotoCamera";
import { SafePicture } from "./SafePicture";
import { useMyoWare } from "./MyoWareProvider";
import type { KidsIconName } from "@/lib/kids-icons";

type MeasureId = "photo" | "motion" | "muscle";

type QuestGameProps = {
  exercise: Exercise;
  areaId?: string;
  onComplete: () => void;
  onQuestComplete?: (questId: string) => void;
  targetAngle?: number;
  avatarIcon?: KidsIconName;
};

const feedbackKidsLabel = {
  correct: "Nice form. Rep counted.",
  almost: "A little more bend.",
  alert: "Match the picture. Do the stretch.",
  idle: "The bots ask. You stretch.",
};

const measures: { id: MeasureId; kicker: string; name: string; line: string; image: string }[] = [
  {
    id: "photo",
    kicker: "Photo Goniometer",
    name: "Photo",
    line: "Live camera, or tap three points on a photo.",
    image: "/images/landing-photo-goniometer.png?v=2",
  },
  {
    id: "motion",
    kicker: "MPU-6050",
    name: "Motion",
    line: "Bluetooth motion sensor. Bend and return. The bots count each rep.",
    image: "/images/landing-mpu.png?v=8",
  },
  {
    id: "muscle",
    kicker: "MyoWare 2.0",
    name: "Muscle",
    line: "Flex. Wireless pads, or practice.",
    image: "/images/landing-myoware.png?v=6",
  },
];

export function QuestGame({
  exercise,
  areaId = "knee",
  onComplete,
  onQuestComplete,
  targetAngle = 90,
  avatarIcon = "hero",
}: QuestGameProps) {
  const media = getExerciseMedia(exercise.id, exercise.name);
  const kidsImage = getKidsExerciseImage(exercise.id, exercise.name);
  const { user, completeQuest } = useAuth();
  const muscle = useMyoWare();
  const joint: KidsJoint = kidsJointForArea(areaId);
  const jointLabel = kidsJointLabels(joint).join(" · ");
  const [measure, setMeasure] = useState<MeasureId | null>(null);
  const [motionReady, setMotionReady] = useState(false);
  const [motionConnecting, setMotionConnecting] = useState(false);
  const [motionError, setMotionError] = useState("");
  const [motionManual, setMotionManual] = useState(false);
  const [musclePractice, setMusclePractice] = useState(false);
  const [photoStatus, setPhotoStatus] = useState<KidsPhotoStatus>({
    cameraReady: false,
    marked: false,
    error: "",
  });
  const [recording, setRecording] = useState(false);
  const [reps, setReps] = useState(0);
  const [angle, setAngle] = useState(0);
  const [effort, setEffort] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const historyRef = useRef<number[]>([]);
  const peakRef = useRef(0);
  const savedRef = useRef(false);
  const motionConnection = useRef<MpuConnection | null>(null);
  const angleCounter = useRef(createRepCounter());
  const effortCounter = useRef(createRepCounter({ minTravel: 18 }));
  const recordingRef = useRef(false);
  const measureRef = useRef<MeasureId | null>(null);
  measureRef.current = measure;

  function pushLive(value: number) {
    setHistory((prev) => {
      const next = [...prev.slice(-47), value];
      historyRef.current = next;
      return next;
    });
  }

  const target = media.kidsQuest.reps;
  const done = reps >= target;
  const firstName = user?.name.split(" ")[0] ?? "friend";
  const feedback = getFeedbackState(angle, targetAngle);
  const photoReady = measure === "photo" && (photoStatus.cameraReady || photoStatus.marked);
  const muscleReady = measure === "muscle" && (muscle.connected || musclePractice);
  const ready =
    measure === "photo" ? photoReady : measure === "motion" ? motionReady : muscleReady;
  const photoNeedsTaps = measure === "photo" && photoStatus.marked && !photoStatus.cameraReady;
  const manualCount =
    photoNeedsTaps || motionManual || (measure === "muscle" && musclePractice && !muscle.connected);
  recordingRef.current = recording;

  const finishQuest = useCallback(
    (nextAngle: number, countedReps: number) => {
      if (savedRef.current) return;
      savedRef.current = true;
      completeKidsQuestLocal(exercise.id, 50);
      if (user) completeQuest(exercise.id, 50);
      onQuestComplete?.(exercise.id);
      const kind = measureRef.current;
      const peak = peakRef.current || nextAngle;
      void persistMeasurement({
        id: crypto.randomUUID(),
        userEmail: user?.email ?? "kids-guest",
        date: new Date().toISOString(),
        exercise: exercise.name,
        joint: jointLabel,
        angle: Math.round(peak),
        reps: countedReps,
        note: `Kids Quest ${kind ?? "stretch"}`,
        source: kind === "motion" ? "motion" : kind === "muscle" ? "muscle" : "photo",
        minAngle: historyRef.current.length ? Math.min(...historyRef.current) : undefined,
        range: historyRef.current.length
          ? Math.max(...historyRef.current) - Math.min(...historyRef.current)
          : undefined,
      });
      setRecording(false);
    },
    [completeQuest, exercise.id, exercise.name, jointLabel, onQuestComplete, user]
  );

  const addRep = useCallback(
    (sample: number) => {
      setReps((current) => {
        const updated = current + 1;
        if (updated >= target) finishQuest(sample, updated);
        return updated;
      });
    },
    [finishQuest, target]
  );

  useEffect(() => {
    return () => {
      motionConnection.current?.disconnect();
      motionConnection.current = null;
    };
  }, []);

  useEffect(() => {
    if (!recording || done || measure !== "muscle" || !muscle.connected || muscle.emg == null) return;
    setEffort(muscle.emg);
    pushLive(muscle.emg);
    if (effortCounter.current.push(muscle.emg)) addRep(peakRef.current || targetAngle);
  }, [recording, done, measure, muscle.connected, muscle.emg, addRep, targetAngle]);

  function handlePhotoAngle(next: number) {
    setAngle(next);
    peakRef.current = Math.max(peakRef.current, next);
    pushLive(next);
    if (!recordingRef.current || done || photoNeedsTaps) return;
    if (angleCounter.current.push(next)) addRep(next);
  }

  function countManualRep() {
    addRep(peakRef.current || angle || targetAngle);
  }

  async function connectMotion() {
    setMotionError("");
    if (!mpuUsbSupported()) {
      setMotionError(mpuUsbHelp());
      setMotionManual(true);
      setMotionReady(true);
      return;
    }
    setMotionConnecting(true);
    try {
      const port = await requestUsbMpuPort();
      const connection = await connectWiredMpu({
        port,
        baudRate: BLUETOOTH_MPU_BAUD,
        onAngle: (next) => {
          setMotionReady(true);
          setMotionManual(false);
          setAngle(next);
          peakRef.current = Math.max(peakRef.current, next);
          pushLive(next);
          if (recordingRef.current && angleCounter.current.push(next)) addRep(next);
        },
        onDisconnect: () => {
          motionConnection.current = null;
          setMotionReady(false);
        },
      });
      motionConnection.current = connection;
      setMotionReady(true);
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      setMotionError(
        name === "NotFoundError" || name === "AbortError"
          ? "No Bluetooth device was chosen. Pair the HC-05, then pick HC-05."
          : err instanceof Error
            ? err.message
            : "Could not open Bluetooth."
      );
    } finally {
      setMotionConnecting(false);
    }
  }

  function startStretch() {
    angleCounter.current.reset();
    effortCounter.current.reset();
    peakRef.current = photoStatus.marked ? angle : 0;
    savedRef.current = false;
    setReps(0);
    setHistory([]);
    historyRef.current = [];
    setRecording(true);
    if (measure === "muscle" && muscle.connected) muscle.startRecording();
  }

  function speech() {
    if (!measure) return "The bots ask. You stretch. Pick photo, motion, or muscle.";
    if (done) return `Great work, ${firstName}. Stretch complete.`;
    if (measure === "photo") {
      if (!photoReady) return `Tap ${jointLabel.toLowerCase()}, or wait for the camera.`;
      if (!recording) return photoStatus.marked ? "Photo angle is ready. Start stretching." : "Stand where the camera can see the stretch.";
      if (photoNeedsTaps) return "Do the stretch. Tap Count this stretch each time.";
      if (feedback === "correct") return `Rep ${reps} counted.`;
      return "Match the picture. Do the stretch.";
    }
    if (measure === "motion") {
      if (motionConnecting) return "Finding the motion sensor.";
      if (!motionReady) return "Connect the MPU-6050 to begin.";
      if (!recording) return `Ready. Do ${exercise.name}.`;
      return motionManual ? "Count each stretch you finish." : "Bend and come back. The bots count that rep.";
    }
    if (muscle.connecting) return "Looking for MyoWare.";
    if (!muscleReady) return "Connect MyoWare, or practice without the sensor.";
    if (!recording) return `Ready. Do ${exercise.name}.`;
    return muscle.connected ? "Flex and let go. The bots count that rep." : "Do the stretch, then tap Count this stretch.";
  }

  const active = measures.find((item) => item.id === measure);
  const liveValue = measure === "muscle" ? effort : angle;
  const liveUnit = measure === "muscle" ? "" : "°";

  return (
    <div className="kids-glass overflow-hidden p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <KidsIcon name={avatarIcon} size={56} />
        <p className="text-base font-medium leading-snug text-[#243056] sm:text-lg">{speech()}</p>
      </div>

      {!measure && (
        <div className="mt-5">
          <h3 className="kids-title-ink text-2xl">Ways to measure</h3>
          <p className="mt-1 text-base text-[#5b6685]">Photo, motion, or muscle. Same stretch. The bots show the live number.</p>
          <div className="mt-4 grid gap-3">
            {measures.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setMeasure(item.id)}
                className="kids-zone flex overflow-hidden text-left"
              >
                <SafePicture
                  src={item.image}
                  alt=""
                  width={240}
                  height={160}
                  className="h-24 w-28 shrink-0 object-cover"
                />
                <span className="flex flex-1 flex-col justify-center px-4 py-3">
                  <span className="text-sm font-semibold text-[#5b6685]">{item.kicker}</span>
                  <span className="kids-title-ink text-xl leading-tight">{item.name}</span>
                  <span className="mt-0.5 text-sm text-[#5b6685]">{item.line}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {measure && (
        <>
          <button
            type="button"
            onClick={() => {
              setRecording(false);
              setMeasure(null);
              setMotionReady(false);
              setMusclePractice(false);
              setReps(0);
              setAngle(0);
              setEffort(0);
              setHistory([]);
              savedRef.current = false;
            }}
            className="kids-back mt-4"
          >
            Ways to measure
          </button>

          <h3 className="kids-title-ink mt-4 text-center text-2xl">{media.kidsQuest.title}</h3>
          <p className="mt-1 text-center text-base text-[#5b6685]">{media.kidsQuest.story}</p>

          <div className="mt-5">
            {measure === "photo" ? (
              <KidsPhotoCamera
                joint={joint}
                onAngle={handlePhotoAngle}
                onStatus={setPhotoStatus}
              />
            ) : (
              <div className="relative overflow-hidden rounded-[1.25rem]">
                <SafePicture
                  src={kidsImage}
                  alt={exercise.name}
                  width={800}
                  height={480}
                  className="h-44 w-full object-cover sm:h-52"
                />
                {ready && (
                  <p className="absolute right-3 top-3 rounded-full bg-[#243056]/90 px-3 py-1 text-sm font-semibold text-white">
                    {liveValue}
                    {liveUnit}
                  </p>
                )}
              </div>
            )}
          </div>

          {measure === "motion" && (
            <div className="mt-4 flex items-center justify-between rounded-[1.15rem] bg-[#eef5fa] px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-[#5b6685]">MPU-6050</p>
                <p className="text-base text-[#243056]">
                  {motionConnecting
                    ? "Connecting"
                    : motionManual
                      ? "Count each stretch on this device."
                      : motionReady
                        ? recording
                          ? "Live angle"
                          : "Bluetooth motion sensor ready"
                        : "Pair the Bluetooth motion sensor"}
                </p>
                {motionError ? <p className="mt-1 text-sm text-[#5b6685]">{motionError}</p> : null}
              </div>
              {!motionReady && (
                <button
                  type="button"
                  disabled={motionConnecting}
                  onClick={connectMotion}
                  className="kids-cta rounded-full px-5 py-2.5 text-base disabled:opacity-60"
                >
                  {motionConnecting ? "Connecting" : "Connect"}
                </button>
              )}
            </div>
          )}

          {measure === "muscle" && (
            <div className="mt-4 rounded-[1.15rem] bg-[#eef5fa] px-4 py-3">
              <p className="text-sm font-semibold text-[#5b6685]">MyoWare 2.0</p>
              <p className="mt-0.5 text-base text-[#243056]">
                {muscle.connecting
                  ? "Looking for MyoWare"
                  : muscle.connected
                    ? muscle.emg != null
                      ? `${muscle.deviceName || "MyoWare"} · effort ${muscle.emg}`
                      : "Connected. Flex the muscle under the pads."
                    : musclePractice
                      ? "Practice mode. Flex with the picture."
                      : "Ask a grown-up to connect the wireless pads."}
              </p>
              {muscle.error && <p className="mt-1 text-sm text-[#5b6685]">{muscle.error}</p>}
              {!muscle.connected && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={muscle.connecting}
                    onClick={() => void muscle.connectBluetooth()}
                    className="kids-cta rounded-full px-4 py-2 text-sm disabled:opacity-60"
                  >
                    Wireless
                  </button>
                  {!musclePractice && (
                    <button
                      type="button"
                      onClick={() => setMusclePractice(true)}
                      className="kids-back"
                    >
                      Practice without sensor
                    </button>
                  )}
                </div>
              )}
              {!muscle.connected && !muscle.connecting && !musclePractice && (
                <p className="mt-2 text-sm text-[#5b6685]">
                  Chrome on a computer for the real sensor. Practice works on this device.
                </p>
              )}
            </div>
          )}

          {ready && (
            <div className="mt-5 grid grid-cols-2 gap-3 text-center">
              <div className="rounded-[1.15rem] bg-[#eef5fa] py-4">
                <p className="text-3xl font-semibold tabular-nums text-[#243056]">
                  {liveValue}
                  {liveUnit}
                </p>
                <p className="mt-1 text-sm text-[#5b6685]">
                  {measure === "muscle" ? "Effort" : `Angle · ${targetAngle}°`}
                </p>
              </div>
              <div className="rounded-[1.15rem] bg-[#eef5fa] py-4">
                <p className="text-3xl font-semibold tabular-nums text-[#243056]">
                  {reps}/{target}
                </p>
                <p className="mt-1 text-sm text-[#5b6685]">Reps</p>
              </div>
            </div>
          )}

          {ready && history.length > 1 && (
            <KidsSparkline values={history} label={measure === "muscle" ? "Live effort" : "Live angle"} />
          )}

          {ready && recording && !done && (
            <>
              <p className="mt-4 text-center text-base font-semibold text-[#243056]">
                {manualCount
                  ? "Do the stretch, then tap Count this stretch."
                  : measure === "muscle"
                    ? "Flex and let go. That is one rep."
                    : feedbackKidsLabel[feedback]}
              </p>
              <div className="rm-xp-track mt-3 rounded-full">
                <div className="rm-xp-fill rounded-full" style={{ width: `${Math.min(100, (reps / target) * 100)}%` }} />
              </div>
              {manualCount ? (
                <button type="button" onClick={countManualRep} className="kids-cta mt-4 w-full rounded-full py-4 text-xl">
                  Count this stretch
                </button>
              ) : (
                <p className="mt-3 text-center text-base font-medium text-[#5b6685]">Bend and come back. Keep going.</p>
              )}
            </>
          )}

          {ready && done && (
            <div className="mt-6 text-center">
              <p className="kids-title-ink text-2xl">Stretch. Squat. Score.</p>
              <p className="mt-1 text-base text-[#5b6685]">
                Peak {Math.round(peakRef.current || liveValue)}
                {liveUnit}. {media.kidsQuest.reward}. Plus 50 stars.
              </p>
              <button
                type="button"
                onClick={() => {
                  if (measure === "muscle" && muscle.recording) {
                    muscle.stopAndSave(user?.email ?? "kids-guest");
                  }
                  onComplete();
                }}
                className="kids-cta mt-4 rounded-full px-8 py-3 text-lg"
              >
                Continue
              </button>
            </div>
          )}

          {ready && !recording && !done && (
            <button type="button" onClick={startStretch} className="kids-cta mt-6 w-full rounded-full py-4 text-xl">
              Start stretching
            </button>
          )}

          {active && (
            <p className="mt-4 text-center text-sm text-[#5b6685]">
              {active.kicker}. {jointLabel}. {active.line}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function KidsSparkline({ values, label }: { values: number[]; label: string }) {
  const width = 280;
  const height = 72;
  const max = Math.max(20, ...values);
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(1, values.length - 1)) * width;
      const y = height - 8 - (value / max) * (height - 16);
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <div className="mt-3 rounded-[1.15rem] bg-[#eef5fa] px-3 py-2">
      <p className="text-sm font-semibold text-[#5b6685]">{label}</p>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-1 h-16 w-full" role="img" aria-label={label}>
        <polyline fill="none" stroke="#4d8ef0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={points} />
      </svg>
    </div>
  );
}
