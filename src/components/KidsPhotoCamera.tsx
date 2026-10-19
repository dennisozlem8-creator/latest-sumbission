"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { kneeAngleDegrees, type Point } from "@/lib/goniometer";
import {
  detectVideoFrame,
  getPoseLandmarker,
  kidsJointLabels,
  stableAngle,
  type KidsJoint,
  type MovementSample,
} from "@/lib/pose-goniometer";

function attachVideoStream(video: HTMLVideoElement, stream: MediaStream) {
  if (video.srcObject !== stream) video.srcObject = stream;
  video.muted = true;
  video.autoplay = true;
  video.playsInline = true;
  video.setAttribute("playsinline", "true");
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
  if (!navigator.mediaDevices?.getUserMedia) throw new Error("unsupported");
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

export type KidsPhotoStatus = {
  cameraReady: boolean;
  marked: boolean;
  error: string;
};

type KidsPhotoCameraProps = {
  onAngle: (angle: number) => void;
  onStatus?: (status: KidsPhotoStatus) => void;
  joint?: KidsJoint;
  preferLeft?: boolean;
};

const DOTS = ["#e35d5d", "#3a7d62", "#4f90c6"];

export function KidsPhotoCamera({
  onAngle,
  onStatus,
  joint = "knee",
  preferLeft = false,
}: KidsPhotoCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraOnRef = useRef(false);
  const requestRef = useRef(0);
  const rafRef = useRef(0);
  const preferLeftRef = useRef(preferLeft);
  const liveAnglesRef = useRef<number[]>([]);
  const jointRef = useRef(joint);
  const onAngleRef = useRef(onAngle);
  const onStatusRef = useRef(onStatus);
  const fileRef = useRef<HTMLInputElement>(null);
  const markRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const [stillUrl, setStillUrl] = useState<string | null>(null);
  const [points, setPoints] = useState<Point[]>([]);

  preferLeftRef.current = preferLeft;
  jointRef.current = joint;
  onAngleRef.current = onAngle;
  onStatusRef.current = onStatus;

  const labels = kidsJointLabels(joint);
  const labelsRef = useRef(labels);
  labelsRef.current = labels;
  const markedAngle =
    points.length === 3 ? kneeAngleDegrees(points[0], points[1], points[2]) : null;

  useEffect(() => {
    onStatusRef.current?.({
      cameraReady,
      marked: markedAngle != null,
      error,
    });
  }, [cameraReady, markedAngle, error]);

  useEffect(() => {
    if (markedAngle != null) onAngleRef.current(markedAngle);
  }, [markedAngle]);

  useEffect(() => {
    if (stillUrl) return undefined;
    const requestId = ++requestRef.current;
    setError("");
    void (async () => {
      try {
        await getPoseLandmarker();
        const stream = await requestCameraStream();
        if (requestId !== requestRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        cameraOnRef.current = true;
        setCameraReady(true);
        const attach = () => {
          if (videoRef.current && streamRef.current) {
            attachVideoStream(videoRef.current, streamRef.current);
          }
        };
        attach();
        requestAnimationFrame(attach);
        rafRef.current = requestAnimationFrame(loopPose);
      } catch (caught) {
        if (requestId !== requestRef.current) return;
        cameraOnRef.current = false;
        setCameraReady(false);
        const name = caught instanceof DOMException ? caught.name : "";
        if (caught instanceof Error && caught.message === "unsupported") {
          setError("This browser cannot open a camera. Use a photo, or Chrome on a phone.");
        } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
          setError("No camera found. Use a photo, then tap the three points.");
        } else {
          setError("Camera was blocked. Tap Allow, or use a photo.");
        }
      }
    })();

    function loopPose() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !cameraOnRef.current) return;
      void getPoseLandmarker()
        .then((landmarker) => {
          if (!cameraOnRef.current || !video.videoWidth) {
            rafRef.current = requestAnimationFrame(loopPose);
            return;
          }
          const raw = detectVideoFrame(
            landmarker,
            video,
            performance.now(),
            preferLeftRef.current,
            0,
            jointRef.current
          );
          const sample = raw
            ? { ...raw, angle: stableAngle(liveAnglesRef.current, raw.angle) }
            : null;
          if (sample) onAngleRef.current(sample.angle);
          if (canvas) drawKidsPose(canvas, video, sample, labelsRef.current);
          rafRef.current = requestAnimationFrame(loopPose);
        })
        .catch(() => {
          rafRef.current = requestAnimationFrame(loopPose);
        });
    }

    return () => {
      requestRef.current += 1;
      cameraOnRef.current = false;
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [stillUrl]);

  function stopCamera() {
    cameraOnRef.current = false;
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraReady(false);
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  function captureFrame() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    stopCamera();
    setPoints([]);
    setStillUrl(canvas.toDataURL("image/jpeg", 0.9));
  }

  function onPhotoFile(file?: File) {
    if (!file) return;
    stopCamera();
    setPoints([]);
    setError("");
    setStillUrl(URL.createObjectURL(file));
  }

  function tapStill(event: MouseEvent<HTMLDivElement>) {
    if (points.length >= 3) return;
    const box = markRef.current?.getBoundingClientRect();
    if (!box || box.width === 0) return;
    const next = [
      ...points,
      { x: (event.clientX - box.left) / box.width, y: (event.clientY - box.top) / box.height },
    ];
    setPoints(next);
  }

  const pending = points.length < 3 ? labels[points.length] : null;

  return (
    <div>
      {!stillUrl && (
        <div className="relative overflow-hidden rounded-[1.25rem] bg-[#d8eefc]">
          <video
            ref={videoRef}
            className="h-52 w-full object-cover sm:h-60"
            playsInline
            muted
            autoPlay
          />
          <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
          {!cameraReady && !error && (
            <p className="absolute inset-0 flex items-center justify-center text-base font-medium text-[#243056]">
              Opening camera
            </p>
          )}
        </div>
      )}

      {stillUrl && (
        <div>
          <p className="mb-2 text-base font-medium text-[#243056]">
            {pending ? `Tap the ${pending.toLowerCase()} next.` : `Angle saved: ${markedAngle} deg.`}
          </p>
          <div ref={markRef} className="relative cursor-crosshair overflow-hidden rounded-[1.25rem]" onClick={tapStill}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={stillUrl} alt="Tap the three points on the joint." className="h-52 w-full object-cover sm:h-60" />
            <svg className="pointer-events-none absolute inset-0 h-full w-full">
              {points[0] && points[1] && (
                <line
                  x1={`${points[0].x * 100}%`}
                  y1={`${points[0].y * 100}%`}
                  x2={`${points[1].x * 100}%`}
                  y2={`${points[1].y * 100}%`}
                  stroke="#4d8ef0"
                  strokeWidth="4"
                />
              )}
              {points[1] && points[2] && (
                <line
                  x1={`${points[1].x * 100}%`}
                  y1={`${points[1].y * 100}%`}
                  x2={`${points[2].x * 100}%`}
                  y2={`${points[2].y * 100}%`}
                  stroke="#4d8ef0"
                  strokeWidth="4"
                />
              )}
              {points.map((point, index) => (
                <circle key={index} cx={`${point.x * 100}%`} cy={`${point.y * 100}%`} r="8" fill={DOTS[index]} />
              ))}
            </svg>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {labels.map((label, index) => (
              <span
                key={label}
                className={`rounded-full px-3 py-1 text-sm font-semibold ${
                  points[index] ? "bg-[#d8eefc] text-[#243056]" : "bg-[#f3f6fb] text-[#5b6685]"
                }`}
              >
                {index + 1}. {label}
              </span>
            ))}
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-[#5b6685]">{error}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        {cameraReady && !stillUrl && (
          <button type="button" onClick={captureFrame} className="kids-cta-magic kids-cta rounded-full px-4 py-2 text-sm">
            Capture photo
          </button>
        )}
        <button type="button" onClick={() => fileRef.current?.click()} className="kids-cta rounded-full px-4 py-2 text-sm">
          Use a photo
        </button>
        {stillUrl && (
          <button
            type="button"
            onClick={() => {
              setPoints([]);
              setStillUrl(null);
              setError("");
            }}
            className="kids-back"
          >
            Live camera
          </button>
        )}
        {stillUrl && points.length > 0 && (
          <button type="button" onClick={() => setPoints([])} className="kids-back">
            Reset points
          </button>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          onPhotoFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
    </div>
  );
}

function drawKidsPose(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  sample: MovementSample | null,
  labels: [string, string, string]
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = video.videoWidth || video.clientWidth;
  const h = video.videoHeight || video.clientHeight;
  if (!w || !h) return;
  canvas.width = w;
  canvas.height = h;
  ctx.clearRect(0, 0, w, h);
  if (!sample) return;
  const pts = [sample.hip, sample.knee, sample.ankle];
  ctx.strokeStyle = "#4d8ef0";
  ctx.lineWidth = Math.max(4, w / 180);
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(pts[0].x * w, pts[0].y * h);
  ctx.lineTo(pts[1].x * w, pts[1].y * h);
  ctx.lineTo(pts[2].x * w, pts[2].y * h);
  ctx.stroke();
  pts.forEach((point, index) => {
    ctx.fillStyle = DOTS[index];
    ctx.beginPath();
    ctx.arc(point.x * w, point.y * h, Math.max(7, w / 90), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = `700 ${Math.max(14, w / 28)}px system-ui, sans-serif`;
    ctx.fillText(labels[index], point.x * w + 12, point.y * h - 10);
  });
  ctx.fillStyle = "rgba(36, 48, 86, 0.82)";
  ctx.fillRect(16, 16, 150, 48);
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 ${Math.max(22, w / 22)}px system-ui, sans-serif`;
  ctx.fillText(`${sample.angle} deg`, 28, 48);
}
