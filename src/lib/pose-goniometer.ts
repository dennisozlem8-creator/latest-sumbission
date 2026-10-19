import { kneeAngleDegrees, pointLabelsForJoint, type MeasuredJoint, type Point } from "./goniometer";

export type MovementSample = {
  time: number;
  angle: number;
  hip: Point;
  knee: Point;
  ankle: Point;
  side?: "left" | "right";
  oppositeHip?: Point;
  oppositeKnee?: Point;
  oppositeAnkle?: Point;
  shoulder?: Point;
  oppositeShoulder?: Point;
  visibility?: number;
};

export type MovementSummary = {
  peak: number;
  min: number;
  range: number;
  duration: number;
};

type PoseLandmark = {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
  presence?: number;
};

type PoseLandmarkerLike = {
  detectForVideo: (
    video: HTMLVideoElement,
    timestamp: number
  ) => { landmarks?: PoseLandmark[][]; worldLandmarks?: PoseLandmark[][] };
  close?: () => void;
};

function landmarkerOptions(runningMode: "VIDEO" | "IMAGE", delegate: "GPU" | "CPU") {
  return {
    baseOptions: { modelAssetPath: MODEL_URL, delegate },
    runningMode,
    numPoses: 1,
    minPoseDetectionConfidence: 0.45,
    minPosePresenceConfidence: 0.45,
    minTrackingConfidence: 0.45,
  };
}

const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task";

let landmarkerPromise: Promise<PoseLandmarkerLike> | null = null;

export function summarizeMovement(samples: MovementSample[]): MovementSummary | null {
  const refined = refineMovementSamples(samples);
  if (refined.length === 0) return null;
  const angles = refined.map((sample) => sample.angle).sort((a, b) => a - b);
  const min = angles[0];
  const peak = angles[angles.length - 1];
  return {
    peak,
    min,
    range: peak - min,
    duration: refined[refined.length - 1]?.time ?? 0,
  };
}

/** Drop shaky frames and one-frame spikes so the saved peak is a real position. */
export function refineMovementSamples(samples: MovementSample[]): MovementSample[] {
  const visible = samples.filter((sample) => (sample.visibility ?? 1) >= 0.4);
  const source = visible.length >= 4 ? visible : samples;
  if (source.length === 0) return [];
  const smoothed = source.map((sample, index) => {
    const window = source.slice(Math.max(0, index - 2), index + 3).map((item) => item.angle);
    window.sort((a, b) => a - b);
    return { ...sample, angle: window[Math.floor(window.length / 2)] };
  });
  const kept: MovementSample[] = [];
  for (const sample of smoothed) {
    const prev = kept[kept.length - 1];
    if (prev && sample.time - prev.time < 0.25 && Math.abs(sample.angle - prev.angle) > 35) continue;
    kept.push(sample);
  }
  return kept.length >= 4 ? kept : smoothed;
}

export function stableAngle(history: number[], next: number, window = 5) {
  history.push(next);
  if (history.length > window) history.splice(0, history.length - window);
  const sorted = [...history].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

export async function getPoseLandmarker(): Promise<PoseLandmarkerLike> {
  if (!landmarkerPromise) {
    landmarkerPromise = createLandmarker().catch((error) => {
      landmarkerPromise = null;
      throw error;
    });
  }
  return landmarkerPromise;
}

async function createLandmarker(): Promise<PoseLandmarkerLike> {
  const vision = await import("@mediapipe/tasks-vision");
  const fileset = await vision.FilesetResolver.forVisionTasks(WASM_URL);
  try {
    return await vision.PoseLandmarker.createFromOptions(fileset, landmarkerOptions("VIDEO", "GPU"));
  } catch {
    return vision.PoseLandmarker.createFromOptions(fileset, landmarkerOptions("VIDEO", "CPU"));
  }
}

function visibilityOf(landmark?: PoseLandmark) {
  if (!landmark) return 0;
  const visibility = landmark.visibility ?? 0;
  const presence = landmark.presence ?? 1;
  return Math.min(visibility, presence);
}

function imageDistance(a: PoseLandmark, b: PoseLandmark) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function segmentRatioLimits(joint: KidsJoint, strict: boolean): [number, number] {
  if (joint === "ankle") return strict ? [0.28, 3.6] : [0.18, 4.5];
  if (joint === "wrist") return strict ? [0.35, 2.8] : [0.2, 3.8];
  if (joint === "trunk") return strict ? [0.35, 2.8] : [0.2, 3.8];
  return strict ? [0.4, 2.5] : [0.22, 3.6];
}

function limbScore(
  landmarks: PoseLandmark[],
  ids: [number, number, number],
  strict: boolean,
  joint: KidsJoint = "knee"
) {
  const a = landmarks[ids[0]];
  const b = landmarks[ids[1]];
  const c = landmarks[ids[2]];
  if (!a || !b || !c) return -1;
  const vis = (visibilityOf(a) + visibilityOf(b) + visibilityOf(c)) / 3;
  const minJoint = strict ? 0.45 : 0.2;
  if (visibilityOf(b) < minJoint || vis < (strict ? 0.4 : 0.18)) return -1;
  const thigh = imageDistance(a, b);
  const shank = imageDistance(b, c);
  if (thigh < 0.015 || shank < 0.015) return -1;
  const ratio = thigh / shank;
  const [minRatio, maxRatio] = segmentRatioLimits(joint, strict);
  if (ratio < minRatio || ratio > maxRatio) return -1;
  return vis * 3 + Math.min(thigh + shank, 1.2);
}

function spatialLimits(joint: KidsJoint) {
  if (joint === "ankle") return { min: 0.08, max: 0.7, ratioMin: 0.28, ratioMax: 3.4 };
  if (joint === "wrist") return { min: 0.1, max: 0.55, ratioMin: 0.4, ratioMax: 2.6 };
  if (joint === "trunk") return { min: 0.18, max: 0.95, ratioMin: 0.4, ratioMax: 2.4 };
  return { min: 0.18, max: 0.85, ratioMin: 0.45, ratioMax: 2.2 };
}

function spatialAngle(a: PoseLandmark, b: PoseLandmark, c: PoseLandmark, joint: KidsJoint = "knee") {
  const ax = a.x - b.x;
  const ay = a.y - b.y;
  const az = (a.z ?? 0) - (b.z ?? 0);
  const bx = c.x - b.x;
  const by = c.y - b.y;
  const bz = (c.z ?? 0) - (b.z ?? 0);
  const magA = Math.hypot(ax, ay, az);
  const magB = Math.hypot(bx, by, bz);
  if (magA < 0.05 || magB < 0.05) return null;
  const limits = spatialLimits(joint);
  const ratio = magA / magB;
  if (ratio < limits.ratioMin || ratio > limits.ratioMax) return null;
  if (magA > limits.max || magB > limits.max || magA < limits.min || magB < limits.min) return null;
  const cos = Math.min(1, Math.max(-1, (ax * bx + ay * by + az * bz) / (magA * magB)));
  return Math.round((Math.acos(cos) * 180) / Math.PI);
}

export function sampleFromPose(
  landmarks: PoseLandmark[] | undefined,
  preferLeft: boolean,
  time: number,
  joint: KidsJoint = "knee",
  worldLandmarks?: PoseLandmark[]
): MovementSample | null {
  const needed = joint === "ankle" ? 33 : 17;
  if (!landmarks || landmarks.length < needed) return null;
  const triple = JOINT_TRIPLES[joint] ?? JOINT_TRIPLES.knee;
  const preferred = preferLeft ? triple.left : triple.right;
  const otherIds = preferLeft ? triple.right : triple.left;
  const preferredScore = limbScore(landmarks, preferred, true, joint);
  const otherScore = limbScore(landmarks, otherIds, true, joint);
  let pick = preferred;
  if (preferredScore < 0 && otherScore >= 0) pick = otherIds;
  else if (preferredScore >= 0 && otherScore > preferredScore + 1.25 && preferredScore < 1.4) pick = otherIds;
  else if (preferredScore < 0 && otherScore < 0) {
    const loosePreferred = limbScore(landmarks, preferred, false, joint);
    const looseOther = limbScore(landmarks, otherIds, false, joint);
    if (loosePreferred < 0 && looseOther < 0) return null;
    pick = loosePreferred >= looseOther ? preferred : otherIds;
  }
  const a = landmarks[pick[0]];
  const b = landmarks[pick[1]];
  const c = landmarks[pick[2]];
  if (!a || !b || !c) return null;

  const hipPoint = { x: a.x, y: a.y };
  const kneePoint = { x: b.x, y: b.y };
  const anklePoint = { x: c.x, y: c.y };
  const flat = kneeAngleDegrees(hipPoint, kneePoint, anklePoint);
  const worldA = worldLandmarks?.[pick[0]];
  const worldB = worldLandmarks?.[pick[1]];
  const worldC = worldLandmarks?.[pick[2]];
  const depth = worldA && worldB && worldC ? spatialAngle(worldA, worldB, worldC, joint) : null;
  const sideOn = imageDistance(a, b) + imageDistance(b, c) >= 0.22;
  const angle = depth == null || (sideOn && Math.abs(depth - flat) > 25) ? flat : depth;
  if (angle < 12) return null;
  if (joint === "knee" ? angle > 178 : angle > 180) return null;
  const other = pick === preferred ? otherIds : preferred;
  const leftSide = pick === triple.left;
  const sameShoulder = leftSide ? landmarks[11] : landmarks[12];
  const otherShoulder = leftSide ? landmarks[12] : landmarks[11];
  return {
    time,
    angle,
    hip: hipPoint,
    knee: kneePoint,
    ankle: anklePoint,
    side: leftSide ? "left" : "right",
    oppositeHip: asPoint(landmarks[other[0]]),
    oppositeKnee: asPoint(landmarks[other[1]]),
    oppositeAnkle: asPoint(landmarks[other[2]]),
    shoulder: asPoint(sameShoulder),
    oppositeShoulder: asPoint(otherShoulder),
    visibility: (visibilityOf(a) + visibilityOf(b) + visibilityOf(c)) / 3,
  };
}

function asPoint(landmark?: PoseLandmark): Point | undefined {
  if (!landmark || visibilityOf(landmark) < 0.2) return undefined;
  return { x: landmark.x, y: landmark.y };
}

export function detectVideoFrame(
  landmarker: PoseLandmarkerLike,
  video: HTMLVideoElement,
  timestamp: number,
  preferLeft: boolean,
  time: number,
  joint: KidsJoint = "knee"
): MovementSample | null {
  const result = landmarker.detectForVideo(video, timestamp);
  return sampleFromPose(result.landmarks?.[0], preferLeft, time, joint, result.worldLandmarks?.[0]);
}

function waitForMetadata(video: HTMLVideoElement, ms = 8000) {
  if (video.readyState >= 1) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const finish = (ok: boolean) => {
      video.removeEventListener("loadedmetadata", onReady);
      video.removeEventListener("error", onError);
      window.clearTimeout(timer);
      if (ok) resolve();
      else reject(new Error("Could not read that video."));
    };
    const onReady = () => finish(true);
    const onError = () => finish(false);
    const timer = window.setTimeout(() => finish(video.readyState >= 1), ms);
    video.addEventListener("loadedmetadata", onReady);
    video.addEventListener("error", onError);
  });
}

function prepareVideo(video: HTMLVideoElement) {
  video.muted = true;
  video.autoplay = false;
  video.playsInline = true;
  video.preload = "auto";
  video.setAttribute("playsinline", "true");
  video.setAttribute("webkit-playsinline", "true");
}

/**
 * Play the clip and sample pose on real frames.
 * Seeking MediaRecorder blobs often never fires `seeked`, which used to hang analysis.
 * Uses a fresh VIDEO landmarker so live-camera timestamps cannot poison this pass.
 */
export async function analyzeVideoElement(
  video: HTMLVideoElement,
  preferLeft: boolean,
  onProgress?: (pct: number) => void,
  joint: KidsJoint = "knee"
): Promise<MovementSample[]> {
  prepareVideo(video);
  // Start playback in the same tap when possible. Waiting for the model first
  // drops the user gesture and Safari then refuses to play.
  void video.play().catch(() => undefined);
  const [landmarker] = await Promise.all([createLandmarker(), waitForMetadata(video)]);
  const samples: MovementSample[] = [];
  let stamp = Math.max(1, Math.floor(performance.now()));
  const started = performance.now();
  const maxMs = 14000;

  const collect = () => {
    const wall = (performance.now() - started) / 1000;
    const time = Number.isFinite(video.currentTime) ? video.currentTime : wall;
    try {
      const sample = detectVideoFrame(
        landmarker,
        video,
        stamp,
        preferLeft,
        Number(time.toFixed(2)),
        joint
      );
      if (sample) samples.push(sample);
    } catch {
      /* keep going — one bad frame must not stop the clip */
    }
    stamp += 33;
    const duration = video.duration;
    if (Number.isFinite(duration) && duration > 0) {
      onProgress?.(Math.min(99, Math.round((Math.min(time, duration) / duration) * 100)));
    } else {
      onProgress?.(Math.min(99, Math.round((wall / 12) * 100)));
    }
  };

  try {
    if (video.ended || video.paused) {
      try {
        video.currentTime = 0;
      } catch {
        /* some recorded clips cannot seek */
      }
      await video.play().catch(() => undefined);
    }

    await new Promise<void>((resolve) => {
      let raf = 0;
      let last = 0;
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        cancelAnimationFrame(raf);
        window.clearTimeout(limit);
        video.removeEventListener("ended", finish);
        video.removeEventListener("error", finish);
        try {
          video.pause();
        } catch {
          /* ignore */
        }
        resolve();
      };
      const tick = () => {
        const now = performance.now();
        if (now - last >= 45) {
          last = now;
          if (video.readyState >= 2) collect();
        }
        const duration = video.duration;
        if (
          video.ended ||
          (Number.isFinite(duration) && duration > 0 && video.currentTime >= Math.min(duration - 0.04, 12))
        ) {
          collect();
          finish();
          return;
        }
        raf = requestAnimationFrame(tick);
      };
      const limit = window.setTimeout(finish, maxMs);
      video.addEventListener("ended", finish);
      video.addEventListener("error", finish);
      const play = video.play();
      raf = requestAnimationFrame(tick);
      if (play && typeof play.catch === "function") {
        void play.catch(() => undefined);
      }
    });
  } finally {
    try {
      landmarker.close?.();
    } catch {
      /* ignore */
    }
  }

  onProgress?.(100);
  return refineMovementSamples(samples);
}

export async function analyzeVideoUrl(
  url: string,
  preferLeft: boolean,
  onProgress?: (pct: number) => void,
  joint: KidsJoint = "knee"
): Promise<MovementSample[]> {
  const video = document.createElement("video");
  prepareVideo(video);
  video.src = url;
  video.style.cssText =
    "position:fixed;left:0;top:0;width:240px;height:180px;opacity:0.01;pointer-events:none;z-index:-1";
  document.body.appendChild(video);
  try {
    return await analyzeVideoElement(video, preferLeft, onProgress, joint);
  } finally {
    video.removeAttribute("src");
    video.load();
    video.remove();
  }
}

export type PhotoPoseResult = {
  angle: number;
  hip: Point;
  knee: Point;
  ankle: Point;
};

export type KidsJoint = MeasuredJoint;

export function kidsJointForArea(areaId: string): KidsJoint {
  if (areaId === "ankle") return "ankle";
  if (areaId === "wrist") return "wrist";
  if (areaId === "lower-back") return "trunk";
  return "knee";
}

export function kidsJointLabels(joint: KidsJoint): [string, string, string] {
  const labels = pointLabelsForJoint(joint);
  return [labels.hip, labels.knee, labels.ankle];
}

const JOINT_TRIPLES: Record<KidsJoint, { left: [number, number, number]; right: [number, number, number] }> = {
  knee: { left: [23, 25, 27], right: [24, 26, 28] },
  ankle: { left: [25, 27, 31], right: [26, 28, 32] },
  wrist: { left: [11, 13, 15], right: [12, 14, 16] },
  trunk: { left: [11, 23, 25], right: [12, 24, 26] },
};

async function createImageLandmarker() {
  const vision = await import("@mediapipe/tasks-vision");
  const fileset = await vision.FilesetResolver.forVisionTasks(WASM_URL);
  try {
    return await vision.PoseLandmarker.createFromOptions(fileset, landmarkerOptions("IMAGE", "GPU"));
  } catch {
    return vision.PoseLandmarker.createFromOptions(fileset, landmarkerOptions("IMAGE", "CPU"));
  }
}

export async function orientedImageUrl(file: Blob) {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return URL.createObjectURL(file);
    }
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    return URL.createObjectURL(blob ?? file);
  } catch {
    return URL.createObjectURL(file);
  }
}

export async function analyzeImageUrl(
  imageUrl: string,
  preferLeft: boolean,
  joint: KidsJoint = "knee"
): Promise<PhotoPoseResult | null> {
  const landmarker = await createImageLandmarker();
  try {
    const blob = await fetch(imageUrl).then((response) => response.blob());
    const bitmap = await createImageBitmap(blob, { imageOrientation: "from-image" });
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    const result = landmarker.detect(canvas);
    const sample = sampleFromPose(result.landmarks?.[0], preferLeft, 0, joint, result.worldLandmarks?.[0]);
    if (!sample) return null;
    return {
      angle: sample.angle,
      hip: sample.hip,
      knee: sample.knee,
      ankle: sample.ankle,
    };
  } finally {
    landmarker.close();
  }
}

export function pickRecorderMime() {
  const types = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4",
  ];
  return types.find((type) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type));
}
