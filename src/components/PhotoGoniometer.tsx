"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  JOINT_OPTIONS,
  LANDMARK_ORDER,
  exercisesForJoint,
  measuredJointFromLabel,
  pointLabelsForJoint,
  type LandmarkId,
  type MeasuredJoint,
  type Point,
  deleteMeasurement,
  kneeAngleDegrees,
  loadMeasurements,
  nextLandmark,
  persistMeasurement,
  sameDayMotionGap,
  type GoniometerMeasurement,
} from "@/lib/goniometer";
import {
  analyzeImageUrl,
  analyzeVideoElement,
  analyzeVideoUrl,
  detectVideoFrame,
  getPoseLandmarker,
  orientedImageUrl,
  pickRecorderMime,
  poseIssue,
  readStillCanvases,
  refineMovementSamples,
  stableAngle,
  summarizeMovement,
  type MovementSample,
  type PhotoPoseResult,
  type PoseIssue,
} from "@/lib/pose-goniometer";
import { coachMovement, coachPhotoPose } from "@/lib/movement-coach";
import { GoniometerProgressChart } from "./GoniometerProgressChart";
import { MovementChart } from "./MovementChart";
import { MovementCoachCard } from "./MovementCoachCard";
import { useClinicLocale } from "./useClinicLocale";
import { t, tf, type CopyKey, type Locale } from "@/lib/i18n";

const POINT_COPY: Record<string, CopyKey> = {
  Hip: "hip",
  Knee: "knee",
  Ankle: "ankle",
  Shoulder: "shoulder",
  Elbow: "elbow",
  Wrist: "wrist",
  Toe: "toe",
  Finger: "finger",
};

function labelsFor(kind: MeasuredJoint, locale: Locale): Record<LandmarkId, string> {
  const names = pointLabelsForJoint(kind);
  return {
    hip: t(POINT_COPY[names.hip] ?? "hip", locale),
    knee: t(POINT_COPY[names.knee] ?? "knee", locale),
    ankle: t(POINT_COPY[names.ankle] ?? "ankle", locale),
  };
}

type Step = "upload" | "mark";

const DOT_COLOR: Record<LandmarkId, string> = {
  hip: "#60a5fa",
  knee: "#10b981",
  ankle: "#f59e0b",
};

const MAX_RECORD_SEC = 12;

function attachVideoStream(video: HTMLVideoElement, stream: MediaStream) {
  if (video.srcObject !== stream) {
    video.srcObject = stream;
  }
  video.muted = true;
  video.autoplay = true;
  video.playsInline = true;
  video.setAttribute("playsinline", "true");
  video.setAttribute("webkit-playsinline", "true");
  const play = () => {
    void video.play().catch(() => {
      requestAnimationFrame(() => {
        void video.play().catch(() => undefined);
      });
    });
  };
  if (video.readyState >= HTMLMediaElement.HAVE_METADATA) play();
  else video.addEventListener("loadedmetadata", play, { once: true });
}

async function requestCameraStream() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("unsupported");
  }
  const attempts: MediaStreamConstraints[] = [
    { audio: false, video: { facingMode: { ideal: "environment" } } },
    { audio: false, video: { facingMode: "user" } },
    { audio: false, video: true },
  ];
  let last: unknown;
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      last = error;
    }
  }
  throw last instanceof Error ? last : new Error("denied");
}

function contentBox(img: HTMLImageElement) {
  const rect = img.getBoundingClientRect();
  const scale = Math.min(rect.width / img.naturalWidth, rect.height / img.naturalHeight);
  const width = img.naturalWidth * scale;
  const height = img.naturalHeight * scale;
  return {
    left: rect.left + (rect.width - width) / 2,
    top: rect.top + (rect.height - height) / 2,
    width,
    height,
  };
}

function drawPose(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  sample: MovementSample | null,
  liveAngle: number | null
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = video.clientWidth;
  const h = video.clientHeight;
  if (!w || !h) return;
  canvas.width = w;
  canvas.height = h;
  ctx.clearRect(0, 0, w, h);
  if (!video.videoWidth) return;
  const scale = Math.min(w / video.videoWidth, h / video.videoHeight);
  const dw = video.videoWidth * scale;
  const dh = video.videoHeight * scale;
  const left = (w - dw) / 2;
  const top = (h - dh) / 2;
  if (sample) {
    const hx = left + sample.hip.x * dw;
    const hy = top + sample.hip.y * dh;
    const kx = left + sample.knee.x * dw;
    const ky = top + sample.knee.y * dh;
    const ax = left + sample.ankle.x * dw;
    const ay = top + sample.ankle.y * dh;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#60a5fa";
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(kx, ky);
    ctx.stroke();
    ctx.strokeStyle = "#f59e0b";
    ctx.beginPath();
    ctx.moveTo(kx, ky);
    ctx.lineTo(ax, ay);
    ctx.stroke();
    for (const [x, y, color] of [
      [hx, hy, "#60a5fa"],
      [kx, ky, "#10b981"],
      [ax, ay, "#f59e0b"],
    ] as const) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (liveAngle != null) {
    ctx.fillStyle = "rgba(27, 51, 72, 0.72)";
    ctx.fillRect(12, 12, 118, 42);
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 22px system-ui, sans-serif";
    ctx.fillText(`${liveAngle}°`, 24, 42);
  }
}

function MarkedJointPhoto({
  src,
  points,
  angle,
  labels,
  measuring,
  measuringLabel = "Measuring the knee on this photo…",
  imgClassName = "max-h-[28rem] w-full bg-background object-contain",
}: {
  src: string;
  points: Partial<Record<LandmarkId, Point>>;
  angle: number | null;
  labels: Record<LandmarkId, string>;
  measuring?: boolean;
  measuringLabel?: string;
  imgClassName?: string;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ left: 0, top: 0, width: 100, height: 100 });

  function sync() {
    const img = imgRef.current;
    const wrap = wrapRef.current;
    if (!img || !wrap || !img.naturalWidth) return;
    const wr = wrap.getBoundingClientRect();
    const content = contentBox(img);
    setBox({
      left: ((content.left - wr.left) / wr.width) * 100,
      top: ((content.top - wr.top) / wr.height) * 100,
      width: (content.width / wr.width) * 100,
      height: (content.height / wr.height) * 100,
    });
  }

  useEffect(() => {
    sync();
    const onResize = () => sync();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [src, points]);

  return (
    <div ref={wrapRef} className="relative overflow-hidden rounded-2xl bg-background">
      {/* Native img. next/image is named Image and crashes React 19 in this app. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={imgRef} src={src} alt="Side-view joint photo" className={imgClassName} onLoad={sync} />
      <svg
        className="pointer-events-none absolute"
        style={{
          left: `${box.left}%`,
          top: `${box.top}%`,
          width: `${box.width}%`,
          height: `${box.height}%`,
        }}
      >
        {points.hip && points.knee && (
          <line
            x1={`${points.hip.x * 100}%`}
            y1={`${points.hip.y * 100}%`}
            x2={`${points.knee.x * 100}%`}
            y2={`${points.knee.y * 100}%`}
            stroke="#60a5fa"
            strokeWidth="4"
            strokeLinecap="round"
          />
        )}
        {points.knee && points.ankle && (
          <line
            x1={`${points.knee.x * 100}%`}
            y1={`${points.knee.y * 100}%`}
            x2={`${points.ankle.x * 100}%`}
            y2={`${points.ankle.y * 100}%`}
            stroke="#f59e0b"
            strokeWidth="4"
            strokeLinecap="round"
          />
        )}
        {LANDMARK_ORDER.map(
          (id) =>
            points[id] && (
              <g key={id}>
                <circle cx={`${points[id]!.x * 100}%`} cy={`${points[id]!.y * 100}%`} r="9" fill={DOT_COLOR[id]} />
                <text
                  x={`${points[id]!.x * 100}%`}
                  y={`${Math.max(points[id]!.y * 100 - 4, 6)}%`}
                  textAnchor="middle"
                  fill="#ffffff"
                  stroke="#1b3348"
                  strokeWidth="3"
                  paintOrder="stroke"
                  fontSize="13"
                  fontWeight="700"
                >
                  {labels[id]}
                </text>
              </g>
            )
        )}
      </svg>
      {angle != null && !measuring && (
        <p className="absolute left-3 top-3 rounded-full bg-[#1b3348] px-3 py-1 text-lg font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.28)]">
          {angle}°
        </p>
      )}
      {measuring && (
        <div className="absolute inset-x-0 bottom-0 bg-[#1b3348]/90 px-4 py-3 text-center text-sm font-semibold text-white">
          {measuringLabel}
        </div>
      )}
    </div>
  );
}

export function PhotoGoniometer({
  userEmail,
  goal,
}: {
  userEmail: string;
  goal: number;
}) {
  const { locale } = useClinicLocale();
  const imgRef = useRef<HTMLImageElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoFileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playbackRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const videoUrlRef = useRef<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraOnRef = useRef(false);
  const cameraRequestRef = useRef(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const samplesRef = useRef<MovementSample[]>([]);
  const rafRef = useRef(0);
  const recordStartedRef = useRef(0);
  const recordingRef = useRef(false);
  const preferLeftRef = useRef(false);
  const jointRef = useRef(JOINT_OPTIONS[0]);
  const liveAnglesRef = useRef<number[]>([]);
  const [overlay, setOverlay] = useState({ left: 0, top: 0, width: 100, height: 100 });
  const [step, setStep] = useState<Step>("upload");
  const [liveCamera, setLiveCamera] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordSec, setRecordSec] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzePct, setAnalyzePct] = useState(0);
  const [cameraError, setCameraError] = useState("");
  const [trackerReady, setTrackerReady] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [points, setPoints] = useState<Partial<Record<LandmarkId, Point>>>({});
  const [samples, setSamples] = useState<MovementSample[]>([]);
  const [liveAngle, setLiveAngle] = useState<number | null>(null);
  const [exercise, setExercise] = useState(exercisesForJoint("knee")[0]);
  const [joint, setJoint] = useState(JOINT_OPTIONS[0]);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [photoAnalyzing, setPhotoAnalyzing] = useState(false);
  const [holdingStill, setHoldingStill] = useState(false);
  const [holdPass, setHoldPass] = useState<1 | 2>(1);
  const [videoReady, setVideoReady] = useState(false);
  const [rows, setRows] = useState<GoniometerMeasurement[]>([]);
  const analysisRef = useRef<HTMLElement>(null);

  const preferLeft = joint.toLowerCase().includes("left");
  const poseJoint = measuredJointFromLabel(joint);
  const exerciseOptions = exercisesForJoint(poseJoint);
  const landmarkLabels = labelsFor(poseJoint, locale);
  const pointList = `${landmarkLabels.hip}, ${landmarkLabels.knee}, and ${landmarkLabels.ankle}`;
  preferLeftRef.current = preferLeft;
  jointRef.current = joint;
  videoUrlRef.current = videoUrl;
  const movement = useMemo(() => summarizeMovement(samples), [samples]);
  const pending = nextLandmark(points);
  const photoAngle =
    points.hip && points.knee && points.ankle
      ? kneeAngleDegrees(points.hip, points.knee, points.ankle)
      : null;
  const videoCoach = useMemo(
    () => (samples.length >= 4 ? coachMovement(samples, exercise, joint, goal, rows) : null),
    [samples, exercise, joint, goal, rows]
  );
  const sensorGap = useMemo(() => {
    const angle = photoAngle ?? movement?.peak ?? null;
    if (angle == null) return null;
    return sameDayMotionGap(rows, joint, angle);
  }, [photoAngle, movement, rows, joint]);
  const photoCoach = useMemo(() => {
    if (photoAngle == null || !points.hip || !points.knee || !points.ankle) return null;
    return coachPhotoPose(photoAngle, points.hip, points.knee, points.ankle, exercise, joint);
  }, [photoAngle, points, exercise, joint]);

  useEffect(() => {
    setRows(loadMeasurements(userEmail));
  }, [userEmail]);

  useEffect(() => {
    return () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    };
  }, [photoUrl]);

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      recorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      cameraOnRef.current = false;
    };
  }, []);

  function bindVideo(el: HTMLVideoElement | null) {
    videoRef.current = el;
    if (el && streamRef.current && cameraOnRef.current) {
      attachVideoStream(el, streamRef.current);
    }
  }

  useEffect(() => {
    if (!liveCamera || !videoRef.current || !streamRef.current) return;
    attachVideoStream(videoRef.current, streamRef.current);
  }, [liveCamera]);

  useEffect(() => {
    const onResize = () => syncOverlay();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [photoUrl]);

  function syncOverlay() {
    const img = imgRef.current;
    const wrap = wrapRef.current;
    if (!img || !wrap || !img.naturalWidth) return;
    const wr = wrap.getBoundingClientRect();
    const box = contentBox(img);
    setOverlay({
      left: ((box.left - wr.left) / wr.width) * 100,
      top: ((box.top - wr.top) / wr.height) * 100,
      width: (box.width / wr.width) * 100,
      height: (box.height / wr.height) * 100,
    });
  }

  function stopTracks() {
    cameraRequestRef.current += 1;
    cameraOnRef.current = false;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setLiveCamera(false);
    recordingRef.current = false;
    setRecording(false);
  }

  function stopCamera() {
    cancelAnimationFrame(rafRef.current);
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    stopTracks();
  }

  async function warmupTracker() {
    try {
      await getPoseLandmarker();
      setTrackerReady(true);
    } catch {
      setTrackerReady(false);
    }
  }

  async function startCamera() {
    const requestId = ++cameraRequestRef.current;
    setCameraError("");
    setLiveCamera(true);
    void warmupTracker();
    try {
      const stream = await requestCameraStream();
      if (requestId !== cameraRequestRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      cameraOnRef.current = true;
      const attach = () => {
        if (videoRef.current && streamRef.current) {
          attachVideoStream(videoRef.current, streamRef.current);
        }
      };
      attach();
      requestAnimationFrame(attach);
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(loopPose);
    } catch (error) {
      if (requestId !== cameraRequestRef.current) return;
      cameraOnRef.current = false;
      setLiveCamera(false);
      const name = error instanceof DOMException ? error.name : "";
      if (error instanceof Error && error.message === "unsupported") {
        setCameraError("This browser cannot open a live camera. Choose a video from files.");
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setCameraError("No camera found on this device. Choose a video from files.");
      } else {
        setCameraError("Camera permission was blocked. Tap Allow, or choose a video.");
      }
    }
  }

  useEffect(() => {
    void startCamera();
    // Open the tool on the camera, not a wall of instructions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function loopPose() {
    const video = videoRef.current;
    const canvas = overlayRef.current;
    if (!video || !cameraOnRef.current) return;
    void getPoseLandmarker()
      .then((landmarker) => {
        if (!cameraOnRef.current || !video.videoWidth) {
          rafRef.current = requestAnimationFrame(loopPose);
          return;
        }
        const elapsed = recordingRef.current
          ? (performance.now() - recordStartedRef.current) / 1000
          : 0;
        const liveJoint = measuredJointFromLabel(jointRef.current);
        const sample = detectVideoFrame(
          landmarker,
          video,
          performance.now(),
          preferLeftRef.current,
          Number(elapsed.toFixed(2)),
          liveJoint
        );
        const usable = sample && poseIssue(sample, liveJoint, preferLeftRef.current) == null ? sample : null;
        const stable = usable
          ? { ...usable, angle: stableAngle(liveAnglesRef.current, usable.angle) }
          : null;
        if (stable && recordingRef.current) {
          samplesRef.current.push(stable);
        }
        if (stable) setLiveAngle(stable.angle);
        else setLiveAngle(null);
        if (canvas) drawPose(canvas, video, stable, stable?.angle ?? null);
        if (recordingRef.current) {
          const nextSec = Math.min(MAX_RECORD_SEC, Math.floor(elapsed));
          setRecordSec(nextSec);
          if (elapsed >= MAX_RECORD_SEC) {
            stopRecording();
            return;
          }
        }
        rafRef.current = requestAnimationFrame(loopPose);
      })
      .catch(() => {
        rafRef.current = requestAnimationFrame(loopPose);
      });
  }

  function startRecording() {
    const stream = streamRef.current;
    if (!stream) return;
    setCameraError("");
    samplesRef.current = [];
    liveAnglesRef.current = [];
    setSamples([]);
    setSaved(false);
    chunksRef.current = [];
    recordStartedRef.current = performance.now();
    setRecordSec(0);
    recordingRef.current = true;
    setRecording(true);
    const mime = pickRecorderMime();
    try {
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" });
        if (videoUrl) URL.revokeObjectURL(videoUrl);
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
        finishRecording();
      };
      recorder.start(200);
    } catch {
      setCameraError("This browser cannot record video. Choose a video from files.");
      setRecording(false);
    }
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(loopPose);
  }

  function stopRecording() {
    recordingRef.current = false;
    setRecording(false);
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  }

  function scrollToAnalysis() {
    window.setTimeout(() => {
      analysisRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }

  function finishRecording() {
    stopTracks();
    setVideoReady(true);
    setSaved(false);
    setSaveMessage("");
    setStep("upload");
  }

  async function runVideoAnalysis(url: string) {
    setAnalyzing(true);
    setAnalyzePct(1);
    setCameraError("");
    setSaveMessage("");
    setStep("upload");
    scrollToAnalysis();
    const liveSamples = samplesRef.current;
    if (liveSamples.length >= 3) {
      setSamples(refineMovementSamples(liveSamples));
    }
    const clip = playbackRef.current;
    if (clip) {
      clip.muted = true;
      clip.playsInline = true;
      clip.setAttribute("playsinline", "true");
      void clip.play().catch(() => undefined);
    }
    try {
      const found = clip
        ? await analyzeVideoElement(clip, preferLeft, setAnalyzePct, poseJoint)
        : await analyzeVideoUrl(url, preferLeft, setAnalyzePct, poseJoint);
      const result = found.length >= 4 ? found : refineMovementSamples(liveSamples);
      if (result.length < 4) {
        setCameraError(
          `Could not see the ${pointList.toLowerCase()} clearly. Record from the side, with those three points in view, then tap Analyze movement again.`
        );
        return;
      }
      setSamples(result);
      setCameraError("");
      scrollToAnalysis();
    } catch (error) {
      if (liveSamples.length >= 4) {
        setSamples(liveSamples);
        setCameraError("");
        scrollToAnalysis();
        return;
      }
      setCameraError(
        error instanceof Error
          ? error.message
          : "Could not analyze that video. Try again from the side."
      );
    } finally {
      setAnalyzing(false);
      setAnalyzePct(100);
    }
  }

  function retakeMessage(issue: PoseIssue) {
    if (issue === "hidden") return t("photoRetakeHidden", locale);
    if (issue === "tilt") return t("photoRetakeTilt", locale);
    if (issue === "front") return t("photoRetakeFront", locale);
    if (issue === "disagree") return t("photoRetakeAgree", locale);
    if (issue === "edge") return t("photoRetakeEdge", locale);
    if (issue === "wrong-side") return t("photoRetakeSide", locale);
    if (poseJoint === "ankle") return t("photoRetakeAnkle", locale);
    if (poseJoint === "wrist") return t("photoRetakeWrist", locale);
    if (poseJoint === "shoulder") return t("photoRetakeShoulder", locale);
    return t("photoRetakeSmall", locale);
  }

  function applyStill(found: PhotoPoseResult | null) {
    if (!found) {
      setPoints({});
      setCameraError(
        `Could not see the ${pointList.toLowerCase()} in that photo. Mark the points, or take another side-view shot.`
      );
      return;
    }
    if (found.issue) {
      setPoints({});
      setCameraError(retakeMessage(found.issue));
      return;
    }
    setPoints({ hip: found.hip, knee: found.knee, ankle: found.ankle });
    setCameraError("");
    scrollToAnalysis();
  }

  async function runPhotoAnalysis(url: string) {
    setPhotoAnalyzing(true);
    setCameraError("");
    setSaved(false);
    setSaveMessage("");
    try {
      applyStill(await analyzeImageUrl(url, preferLeft, poseJoint));
    } catch (error) {
      setPoints({});
      setCameraError(
        error instanceof Error
          ? error.message
          : "Could not analyze that photo. Mark the points by hand."
      );
    } finally {
      setPhotoAnalyzing(false);
    }
  }

  async function captureBurst(video: HTMLVideoElement) {
    const frames: HTMLCanvasElement[] = [];
    for (let index = 0; index < 5; index += 1) {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return frames;
      ctx.drawImage(video, 0, 0);
      frames.push(canvas);
      if (index < 4) await new Promise((resolve) => window.setTimeout(resolve, 200));
    }
    return frames;
  }

  async function captureStill() {
    const video = videoRef.current;
    if (!video?.videoWidth || holdingStill) {
      if (!video?.videoWidth) setCameraError("Wait for the camera picture to appear, then take the photo.");
      return;
    }
    setHoldingStill(true);
    setHoldPass(1);
    setCameraError("");
    try {
      const firstFrames = await captureBurst(video);
      if (firstFrames.length < 5) return;
      const first = await readStillCanvases(firstFrames, preferLeft, poseJoint);
      if (!first || first.issue) {
        const blob = await new Promise<Blob | null>((resolve) => firstFrames[firstFrames.length - 1]?.toBlob(resolve, "image/jpeg", 0.92));
        if (blob) {
          stopCamera();
          if (photoUrl) URL.revokeObjectURL(photoUrl);
          setPhotoUrl(URL.createObjectURL(blob));
        }
        setVideoReady(false);
        setPoints({});
        setSamples([]);
        setSaved(false);
        setSaveMessage("");
        setStep("upload");
        applyStill(first);
        return;
      }
      setHoldPass(2);
      await new Promise((resolve) => window.setTimeout(resolve, 700));
      const live = videoRef.current;
      if (!live?.videoWidth) return;
      const secondFrames = await captureBurst(live);
      if (secondFrames.length < 5) return;
      const second = await readStillCanvases(secondFrames, preferLeft, poseJoint);
      const blob = await new Promise<Blob | null>((resolve) => secondFrames[secondFrames.length - 1]?.toBlob(resolve, "image/jpeg", 0.92));
      if (!blob) return;
      stopCamera();
      if (photoUrl) URL.revokeObjectURL(photoUrl);
      setPhotoUrl(URL.createObjectURL(blob));
      setVideoReady(false);
      setPoints({});
      setSamples([]);
      setSaved(false);
      setSaveMessage("");
      setStep("upload");
      if (!second || second.issue) {
        applyStill(second);
        return;
      }
      if (Math.abs(first.angle - second.angle) > 5) {
        applyStill({ ...second, issue: "disagree" });
        return;
      }
      applyStill({ ...second, angle: Math.round((first.angle + second.angle) / 2), issue: null });
    } catch (error) {
      setPoints({});
      setCameraError(error instanceof Error ? error.message : "Could not analyze that photo. Mark the points by hand.");
    } finally {
      setHoldingStill(false);
      setHoldPass(1);
    }
  }

  async function onPhotoFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    const url = await orientedImageUrl(file);
    setPhotoUrl(url);
    setVideoReady(false);
    setPoints({});
    setSamples([]);
    setSaved(false);
    setSaveMessage("");
    setStep("upload");
    void runPhotoAnalysis(url);
  }

  function onVideoFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("video/")) return;
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setSamples([]);
    samplesRef.current = [];
    setSaved(false);
    setSaveMessage("");
    setVideoReady(true);
    setPhotoUrl(null);
    setPoints({});
    setStep("upload");
  }

  function handleClick(event: React.MouseEvent<HTMLImageElement>) {
    if (!pending || !imgRef.current) return;
    const box = contentBox(imgRef.current);
    const x = (event.clientX - box.left) / box.width;
    const y = (event.clientY - box.top) / box.height;
    if (x < 0 || y < 0 || x > 1 || y > 1) return;
    setPoints((prev) => ({ ...prev, [pending]: { x, y } }));
  }

  function videoSummaryForSave() {
    return movement ?? summarizeMovement(samplesRef.current);
  }

  async function savePhotoResult() {
    if (photoAngle == null) return;
    setSaving(true);
    setSaveMessage("");
    const result = await persistMeasurement({
      id: crypto.randomUUID(),
      userEmail,
      date: new Date().toISOString(),
      exercise,
      joint,
      angle: photoAngle,
      note: note.trim() || photoCoach?.headline || "",
      source: "photo",
      formScore: photoCoach?.formScore,
      flags: photoCoach?.findings.filter((f) => f.severity !== "ok").map((f) => f.id),
      nextAction: photoCoach?.progressNote ?? undefined,
      detectedExercise: photoCoach?.detectedExercise,
    });
    setRows(loadMeasurements(userEmail));
    setSaved(true);
    setSaveMessage(result.message);
    setSaving(false);
  }

  async function saveVideoResult() {
    const summary = videoSummaryForSave();
    if (!summary) {
      setSaveMessage("Send the video to analysis first, then save the numbers.");
      return;
    }
    setSaving(true);
    setSaveMessage("");
    if (!movement) setSamples(samplesRef.current);
    const result = await persistMeasurement({
      id: crypto.randomUUID(),
      userEmail,
      date: new Date().toISOString(),
      exercise,
      joint,
      angle: summary.peak,
      note: note.trim() || videoCoach?.headline || "",
      source: "video",
      minAngle: summary.min,
      range: summary.range,
      durationSec: Number(summary.duration.toFixed(1)),
      formScore: videoCoach?.formScore,
      reps: videoCoach?.reps,
      flags: videoCoach?.findings.filter((f) => f.severity !== "ok").map((f) => f.id),
      nextAction: videoCoach?.progressNote ?? undefined,
      detectedExercise: videoCoach?.detectedExercise,
    });
    setRows(loadMeasurements(userEmail));
    setSaved(true);
    setSaveMessage(result.message);
    setSaving(false);
  }

  function resetCapture() {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setPhotoUrl(null);
    setVideoUrl(null);
    setPoints({});
    setSamples([]);
    samplesRef.current = [];
    setNote("");
    setSaved(false);
    setSaveMessage("");
    setVideoReady(false);
    setLiveAngle(null);
    setCameraError("");
    setStep("upload");
  }

  const filtered = useMemo(
    () => rows.filter((row) => row.joint === joint),
    [rows, joint]
  );

  function chooseJoint(next: string) {
    setJoint(next);
    setPoints({});
    setSamples([]);
    samplesRef.current = [];
    liveAnglesRef.current = [];
    setLiveAngle(null);
    const options = exercisesForJoint(measuredJointFromLabel(next));
    setExercise((current) => (options.includes(current) ? current : options[0]));
  }

  return (
    <div className="space-y-6">
      {step === "upload" && (
        <section className="rm-card p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="rm-label">{t("exercise", locale)}</span>
              <select
                value={exercise}
                onChange={(e) => setExercise(e.target.value)}
                className="mt-2 w-full rounded-xl border border-[var(--border)] bg-background px-3 py-3"
              >
                {exerciseOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="rm-label">{t("joint", locale)}</span>
              <select
                value={joint}
                onChange={(e) => chooseJoint(e.target.value)}
                className="mt-2 w-full rounded-xl border border-[var(--border)] bg-background px-3 py-3"
              >
                {JOINT_OPTIONS.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
          </div>
          <p className="mt-3 text-sm text-muted">
            Side view. {t("photoGuide", locale)} The camera marks {pointList.toLowerCase()} — or you tap those three points.
          </p>

          <div className="relative mt-4 overflow-hidden rounded-2xl border border-[var(--border)] bg-black">
            <div className="relative">
              <video
                ref={bindVideo}
                autoPlay
                playsInline
                muted
                controls={false}
                className={liveCamera ? "max-h-80 w-full bg-black object-contain" : "hidden"}
              />
              <canvas
                ref={overlayRef}
                className={liveCamera ? "pointer-events-none absolute inset-0 h-full w-full" : "hidden"}
              />
              {liveCamera && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="h-[64%] w-[52%] rounded-[1.5rem] border-2 border-white/90 shadow-[0_0_0_999px_rgba(0,0,0,0.28)]" />
                  {holdingStill && (
                    <p className="absolute rounded-full bg-[#1b3348] px-4 py-2 text-sm font-semibold text-white">
                      {holdPass === 2 ? t("photoHoldAgain", locale) : t("photoHold", locale)}
                    </p>
                  )}
                </div>
              )}
            </div>
            {liveCamera ? (
              <div className="flex flex-col gap-3 bg-background p-3">
                {recording && (
                  <p className="text-center text-sm font-bold text-alert">
                    Recording {recordSec}s / {MAX_RECORD_SEC}s
                    {liveAngle != null ? ` · ${liveAngle}°` : ""}
                  </p>
                )}
                <div className="flex flex-col gap-3 sm:flex-row">
                  {recording ? (
                    <button type="button" className="rm-btn rm-btn-primary flex-1" onClick={stopRecording}>
                      {t("stopRecording", locale)}
                    </button>
                  ) : (
                    <>
                      <button type="button" className="rm-btn rm-btn-primary flex-1" onClick={startRecording}>
                        {t("recordMovement", locale)}
                      </button>
                      <button
                        type="button"
                        className="rm-btn rm-btn-brand flex-1 disabled:opacity-40"
                        disabled={holdingStill}
                        onClick={() => void captureStill()}
                      >
                        {holdingStill ? (holdPass === 2 ? t("photoHoldAgain", locale) : t("photoHold", locale)) : t("takePhoto", locale)}
                      </button>
                    </>
                  )}
                  <button type="button" className="rm-btn rm-btn-ghost flex-1" onClick={stopCamera}>
                    {t("closeCamera", locale)}
                  </button>
                </div>
                {trackerReady && (
                  <p className="text-center text-xs text-muted">
                    Movement tracker ready — lines appear when {pointList.toLowerCase()} are in view
                  </p>
                )}
              </div>
            ) : photoUrl ? (
              <MarkedJointPhoto
                src={photoUrl}
                points={points}
                angle={photoAngle}
                labels={landmarkLabels}
                measuring={photoAnalyzing}
                measuringLabel={t("measuringPhoto", locale)}
                imgClassName="max-h-80 w-full bg-background object-contain"
              />
            ) : videoUrl && videoReady ? (
              <video
                ref={playbackRef}
                src={videoUrl}
                controls
                playsInline
                muted
                className="max-h-80 w-full bg-black object-contain"
              />
            ) : videoUrl && analyzing ? (
              <div className="flex h-40 flex-col items-center justify-center gap-2 bg-background px-6 text-sm text-muted">
                <p>Watching the video and measuring the {joint.toLowerCase()}…</p>
                <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-surface-elevated">
                  <div className="h-full bg-brand" style={{ width: `${analyzePct}%` }} />
                </div>
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center bg-background px-6 text-center text-sm text-muted">
                Opening camera…
              </div>
            )}
          </div>

          {cameraError && (
            <p className="mt-3 text-sm text-alert">{cameraError}</p>
          )}

          {analyzing && liveCamera && (
            <p className="mt-3 text-sm text-muted">Watching the video and measuring the {joint.toLowerCase()}… {analyzePct}%</p>
          )}

          <div className="mt-5 flex flex-col gap-3">
            {!liveCamera && (
              <button
                type="button"
                className="rm-btn rm-btn-brand w-full"
                onClick={() => void startCamera()}
              >
                {t("openCamera", locale)}
              </button>
            )}
            <button
              type="button"
              className="rm-btn rm-btn-primary w-full"
              onClick={() => videoFileRef.current?.click()}
            >
              {t("chooseVideo", locale)}
            </button>
            <div className="relative">
              <div className="rm-btn rm-btn-ghost pointer-events-none w-full">
                {t("stillPhotoInstead", locale)}
              </div>
              <input
                type="file"
                accept="image/jpeg,image/png,image/*"
                className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                aria-label={t("stillPhotoInstead", locale)}
                onChange={(e) => {
                  onPhotoFile(e.target.files?.[0]);
                  window.setTimeout(() => {
                    e.target.value = "";
                  }, 500);
                }}
              />
            </div>
            <button
              type="button"
              className="text-sm font-medium text-brand-light"
              onClick={() => fileRef.current?.click()}
            >
              {t("choosePhoto", locale)}
            </button>
          </div>

          {photoUrl && (
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                className="rm-btn rm-btn-ghost flex-1"
                onClick={() => {
                  if (photoUrl) URL.revokeObjectURL(photoUrl);
                  setPhotoUrl(null);
                  setPoints({});
                  setSaveMessage("");
                }}
              >
                Retake
              </button>
              <button
                type="button"
                className="rm-btn rm-btn-ghost flex-1"
                onClick={() => setStep("mark")}
              >
                Mark points by hand
              </button>
            </div>
          )}

          {analyzing && (
            <div className="mt-4 rounded-2xl border border-[var(--border)] bg-background px-4 py-4">
              <p className="font-semibold">Analyzing your video… {analyzePct}%</p>
              <p className="mt-1 text-sm text-muted">
                Measuring the {joint.toLowerCase()} and checking the motion.
              </p>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-elevated">
                <div className="h-full bg-brand transition-[width]" style={{ width: `${analyzePct}%` }} />
              </div>
            </div>
          )}

          {videoReady && videoUrl && !liveCamera && (
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                className="rm-btn rm-btn-primary flex-1 disabled:opacity-40"
                disabled={analyzing}
                onClick={() => {
                  const url = videoUrlRef.current ?? videoUrl;
                  if (!url) {
                    setCameraError("The video is not ready yet. Record again, then tap Analyze movement.");
                    return;
                  }
                  void runVideoAnalysis(url);
                }}
              >
                {analyzing ? `${t("analyzing", locale)} ${analyzePct}%` : t("analyzeMovement", locale)}
              </button>
              <button
                type="button"
                className="rm-btn rm-btn-brand flex-1 disabled:opacity-40"
                disabled={saving}
                onClick={() => void saveVideoResult()}
              >
                {saving ? t("saving", locale) : saved ? t("savedToRecords", locale) : t("saveToRecords", locale)}
              </button>
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              onPhotoFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <input
            ref={videoFileRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              onVideoFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </section>
      )}

      {step === "mark" && photoUrl && (
        <section className="rm-card p-6">
          <p className="rm-label">Step 2</p>
          <h2 className="mt-1 text-xl font-bold">{t("markPoints", locale)}</h2>
          <p className="mt-2 rm-body">
            {pending
              ? tf("tapNext", locale, { landmark: landmarkLabels[pending].toLowerCase() })
              : t("allThreeSet", locale)}
          </p>

          <ol className="mt-4 flex flex-wrap gap-2">
            {LANDMARK_ORDER.map((id) => (
              <li
                key={id}
                className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                  points[id]
                    ? "bg-correct/15 text-correct"
                    : pending === id
                      ? "bg-brand/20 text-brand-light"
                      : "bg-background text-muted"
                }`}
              >
                {landmarkLabels[id]}
              </li>
            ))}
          </ol>

          <div
            ref={wrapRef}
            className="relative mt-5 overflow-hidden rounded-2xl border border-[var(--border)] bg-background"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={photoUrl}
              alt={`Mark ${pointList.toLowerCase()}`}
              className="max-h-[28rem] w-full cursor-crosshair object-contain"
              onClick={handleClick}
              onLoad={syncOverlay}
            />
            <svg
              className="pointer-events-none absolute"
              style={{
                left: `${overlay.left}%`,
                top: `${overlay.top}%`,
                width: `${overlay.width}%`,
                height: `${overlay.height}%`,
              }}
            >
              {points.hip && points.knee && (
                <line
                  x1={`${points.hip.x * 100}%`}
                  y1={`${points.hip.y * 100}%`}
                  x2={`${points.knee.x * 100}%`}
                  y2={`${points.knee.y * 100}%`}
                  stroke="#60a5fa"
                  strokeWidth="3"
                />
              )}
              {points.knee && points.ankle && (
                <line
                  x1={`${points.knee.x * 100}%`}
                  y1={`${points.knee.y * 100}%`}
                  x2={`${points.ankle.x * 100}%`}
                  y2={`${points.ankle.y * 100}%`}
                  stroke="#f59e0b"
                  strokeWidth="3"
                />
              )}
              {LANDMARK_ORDER.map(
                (id) =>
                  points[id] && (
                    <g key={id}>
                      <circle
                        cx={`${points[id]!.x * 100}%`}
                        cy={`${points[id]!.y * 100}%`}
                        r="8"
                        fill={DOT_COLOR[id]}
                      />
                    </g>
                  )
              )}
            </svg>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              className="rm-btn rm-btn-ghost flex-1"
              onClick={() => setStep("upload")}
            >
              Back
            </button>
            <button
              type="button"
              className="rm-btn rm-btn-ghost flex-1"
              onClick={() => setPoints({})}
            >
              Reset points
            </button>
            <button
              type="button"
              className="rm-btn rm-btn-primary flex-1 disabled:opacity-40"
              disabled={photoAngle == null}
              onClick={() => {
                setStep("upload");
                scrollToAnalysis();
              }}
            >
              Show analysis
            </button>
          </div>
        </section>
      )}

      {(analyzing || photoAnalyzing || photoAngle != null || movement) && (
        <section ref={analysisRef} id="capture-analysis" className="rm-card p-6">
          <p className="rm-label">Analysis</p>
          {analyzing && !movement && (
            <>
              <h2 className="mt-1 text-xl font-bold">Reading this video</h2>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-elevated">
                <div className="h-full bg-brand transition-[width]" style={{ width: `${analyzePct}%` }} />
              </div>
            </>
          )}
          {photoAnalyzing && (
            <>
              <h2 className="mt-1 text-xl font-bold">Reading this photo</h2>
            </>
          )}
          {!photoAnalyzing && photoAngle != null && (
            <>
              <h2 className="mt-1 text-xl font-bold">Photo analysis</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{t("photoMarksHelp", locale)}</p>
              {photoUrl && (
                <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--border)]">
                  <MarkedJointPhoto
                    src={photoUrl}
                    points={points}
                    angle={photoAngle}
                    labels={landmarkLabels}
                  />
                </div>
              )}
              <p className="rm-display mt-4 text-correct">{photoAngle}°</p>
              {sensorGap && (
                <p className="mt-3 text-sm leading-6 text-alert">
                  {tf("photoSensorGap", locale, { motion: sensorGap.motion, gap: sensorGap.gap })}
                </p>
              )}
              {photoCoach && (
                <MovementCoachCard
                  report={photoCoach}
                  selectedExercise={exercise}
                  history={rows}
                  goal={goal}
                />
              )}
              {metaFields(exercise, setExercise, exerciseOptions, joint, chooseJoint, note, setNote)}
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button type="button" className="rm-btn rm-btn-ghost flex-1" onClick={() => setStep("mark")}>
                  Edit points
                </button>
                <button
                  type="button"
                  className="rm-btn rm-btn-brand flex-1 disabled:opacity-40"
                  disabled={saving || saved}
                  onClick={() => void savePhotoResult()}
                >
                  {saving ? t("saving", locale) : saved ? t("savedToRecords", locale) : t("saveToRecords", locale)}
                </button>
              </div>
            </>
          )}
          {!photoAnalyzing && movement && (
            <>
              <h2 className={`text-xl font-bold ${photoAngle != null ? "mt-8" : "mt-1"}`}>
                Video analysis
              </h2>
              <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl bg-background px-2 py-3">
                  <p className="rm-stat text-correct">{movement.peak}°</p>
                  <p className="rm-label mt-1">Peak</p>
                </div>
                <div className="rounded-xl bg-background px-2 py-3">
                  <p className="rm-stat">{movement.min}°</p>
                  <p className="rm-label mt-1">Min</p>
                </div>
                <div className="rounded-xl bg-background px-2 py-3">
                  <p className="rm-stat text-brand-light">{movement.range}°</p>
                  <p className="rm-label mt-1">Range</p>
                </div>
              </div>
              {sensorGap && photoAngle == null && (
                <p className="mt-3 text-sm leading-6 text-alert">
                  {tf("photoSensorGap", locale, { motion: sensorGap.motion, gap: sensorGap.gap })}
                </p>
              )}
              <div className="mt-4">
                <MovementChart
                  samples={samples}
                  goal={goal}
                  unusualTimes={videoCoach?.unusualTimes ?? []}
                />
              </div>
              {videoCoach && (
                <MovementCoachCard
                  report={videoCoach}
                  selectedExercise={exercise}
                  history={rows}
                  goal={goal}
                />
              )}
              {photoAngle == null && metaFields(exercise, setExercise, exerciseOptions, joint, chooseJoint, note, setNote)}
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button type="button" className="rm-btn rm-btn-ghost flex-1" onClick={resetCapture}>
                  Record again
                </button>
                <button
                  type="button"
                  className="rm-btn rm-btn-brand flex-1 disabled:opacity-40"
                  disabled={saving || saved}
                  onClick={() => void saveVideoResult()}
                >
                  {saving ? t("saving", locale) : saved ? t("savedToRecords", locale) : t("saveToRecords", locale)}
                </button>
              </div>
            </>
          )}
          {saveMessage && <p className="mt-3 text-sm text-muted">{saveMessage}</p>}
        </section>
      )}

      {saveMessage && !(photoAnalyzing || photoAngle != null || movement) && (
        <p className="text-sm text-muted">{saveMessage}</p>
      )}

      <section className="rm-card p-6">
        <h2 className="font-semibold">Progress graph</h2>
        <p className="mt-1 text-sm text-muted">
          {joint} · one point per saved session · dashed line is your goal
        </p>
        <div className="mt-4">
          <GoniometerProgressChart measurements={filtered} goal={goal} />
        </div>
        {filtered.length > 0 && (
          <ul className="mt-4 space-y-2">
            {filtered
              .slice()
              .reverse()
              .map((row) => (
                <li
                  key={row.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-background px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {row.angle}° · {row.exercise}
                      {row.source === "video"
                        ? " · video"
                        : row.source === "motion"
                          ? " · motion"
                          : row.source === "muscle"
                            ? " · muscle"
                            : ""}
                    </p>
                    <p className="text-muted">
                      {new Date(row.date).toLocaleString()}
                      {row.minAngle != null ? ` · min ${row.minAngle}°` : ""}
                      {row.range != null ? ` · range ${row.range}°` : ""}
                      {row.note ? ` · ${row.note}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="text-xs text-alert hover:underline"
                    onClick={() => {
                      deleteMeasurement(row.id);
                      setRows(loadMeasurements(userEmail));
                    }}
                  >
                    Remove
                  </button>
                </li>
              ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function metaFields(
  exercise: string,
  setExercise: (value: string) => void,
  exerciseOptions: string[],
  joint: string,
  setJoint: (value: string) => void,
  note: string,
  setNote: (value: string) => void
) {
  return (
    <>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="rm-label">Exercise</span>
          <select
            value={exercise}
            onChange={(e) => setExercise(e.target.value)}
            className="mt-2 w-full rounded-xl border border-[var(--border)] bg-background px-3 py-3"
          >
            {exerciseOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="rm-label">Joint</span>
          <select
            value={joint}
            onChange={(e) => setJoint(e.target.value)}
            className="mt-2 w-full rounded-xl border border-[var(--border)] bg-background px-3 py-3"
          >
            {JOINT_OPTIONS.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="mt-4 block text-sm">
        <span className="rm-label">Note (optional)</span>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Pain, swelling, or how it felt"
          className="mt-2 w-full rounded-xl border border-[var(--border)] bg-background px-3 py-3"
        />
      </label>
    </>
  );
}
