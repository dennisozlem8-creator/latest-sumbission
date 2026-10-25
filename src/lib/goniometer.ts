export const GONIOMETER_KEY = "revive-motion-goniometer";

export type LandmarkId = "hip" | "knee" | "ankle";

export type Point = {
  x: number;
  y: number;
};

export type GoniometerMeasurement = {
  id: string;
  userEmail: string;
  date: string;
  exercise: string;
  joint: string;
  angle: number;
  note: string;
  source?: "photo" | "video" | "motion" | "muscle";
  minAngle?: number;
  range?: number;
  durationSec?: number;
  formScore?: number;
  reps?: number;
  flags?: string[];
  nextAction?: string;
  detectedExercise?: string;
};

export const LANDMARK_ORDER: LandmarkId[] = ["hip", "knee", "ankle"];

export const LANDMARK_LABELS: Record<LandmarkId, string> = {
  hip: "Hip",
  knee: "Knee",
  ankle: "Ankle",
};

/** Joints the photo and video tool can measure. Same set as the body-area sensors. */
export type MeasuredJoint = "knee" | "ankle" | "wrist" | "trunk";

export const EXERCISE_OPTIONS = [
  "Seated Knee Flexion",
  "Standing Knee Flexion",
  "Prone Knee Flexion",
  "Heel Slide",
];

export const JOINT_OPTIONS = [
  "Knee (Right)",
  "Knee (Left)",
  "Ankle (Right)",
  "Ankle (Left)",
  "Lower back (Right)",
  "Lower back (Left)",
  "Wrist (Right)",
  "Wrist (Left)",
];

export function measuredJointFromLabel(label: string): MeasuredJoint {
  const text = label.toLowerCase();
  if (text.includes("ankle")) return "ankle";
  if (text.includes("wrist")) return "wrist";
  if (text.includes("back") || text.includes("trunk")) return "trunk";
  return "knee";
}

/** Proximal, joint, and distal names. Stored in the hip / knee / ankle point slots. */
export function pointLabelsForJoint(joint: MeasuredJoint): Record<LandmarkId, string> {
  if (joint === "ankle") return { hip: "Knee", knee: "Ankle", ankle: "Toe" };
  if (joint === "wrist") return { hip: "Elbow", knee: "Wrist", ankle: "Finger" };
  if (joint === "trunk") return { hip: "Shoulder", knee: "Hip", ankle: "Knee" };
  return LANDMARK_LABELS;
}

export function exercisesForJoint(joint: MeasuredJoint): string[] {
  if (joint === "ankle") return ["Ankle pumps", "Seated ankle bend", "Standing calf raise"];
  if (joint === "wrist") return ["Wrist flexion", "Wrist extension"];
  if (joint === "trunk") return ["Forward bend", "Return to stand"];
  return [...EXERCISE_OPTIONS];
}

export function nextLandmark(points: Partial<Record<LandmarkId, Point>>): LandmarkId | null {
  return LANDMARK_ORDER.find((id) => !points[id]) ?? null;
}

/** Interior angle at the knee using the hip–knee and ankle–knee vectors. */
export function kneeAngleDegrees(hip: Point, knee: Point, ankle: Point): number {
  const ax = hip.x - knee.x;
  const ay = hip.y - knee.y;
  const bx = ankle.x - knee.x;
  const by = ankle.y - knee.y;
  const magA = Math.hypot(ax, ay);
  const magB = Math.hypot(bx, by);
  if (magA === 0 || magB === 0) return 0;
  const cos = Math.min(1, Math.max(-1, (ax * bx + ay * by) / (magA * magB)));
  return Math.round((Math.acos(cos) * 180) / Math.PI);
}

export function loadAllMeasurements(): GoniometerMeasurement[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(GONIOMETER_KEY) ?? "[]") as GoniometerMeasurement[];
  } catch {
    return [];
  }
}

function localDay(iso: string) {
  const date = new Date(iso);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/** Today's Bluetooth reading for the same joint, when it disagrees with the photo by more than 15°. */
export function sameDayMotionGap(rows: GoniometerMeasurement[], jointLabel: string, angle: number, now = new Date()) {
  const today = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  const joint = measuredJointFromLabel(jointLabel);
  const motions = rows.filter(
    (row) => row.source === "motion" && row.date && localDay(row.date) === today && measuredJointFromLabel(row.joint) === joint
  );
  const latest = motions[motions.length - 1];
  if (!latest) return null;
  const gap = Math.abs(latest.angle - angle);
  if (gap <= 15) return null;
  return { motion: latest.angle, gap };
}

export function loadMeasurements(userEmail: string): GoniometerMeasurement[] {
  return loadAllMeasurements()
    .filter((row) => row.userEmail === userEmail)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function saveMeasurement(row: GoniometerMeasurement) {
  const all = (() => {
    try {
      return JSON.parse(localStorage.getItem(GONIOMETER_KEY) ?? "[]") as GoniometerMeasurement[];
    } catch {
      return [];
    }
  })();
  all.push(row);
  localStorage.setItem(GONIOMETER_KEY, JSON.stringify(all));
}

export type PersistResult = {
  local: true;
  cloud: boolean;
  message: string;
};

/** Always writes to this device. Also tries the clinic database when Supabase is configured. */
export async function persistMeasurement(row: GoniometerMeasurement): Promise<PersistResult> {
  saveMeasurement(row);
  try {
    const { getSupabaseEnv } = await import("./supabase/env");
    if (!getSupabaseEnv()) {
      return {
        local: true,
        cloud: false,
        message: "Saved on this device. Connect a clinic database later to also store it in the cloud.",
      };
    }
    const { createClient } = await import("./supabase/client");
    const client = createClient();
    const { error } = await (
      client as unknown as {
        from: (table: string) => {
          insert: (value: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
        };
      }
    )
      .from("goniometer_measurements")
      .insert({
        id: row.id,
        user_email: row.userEmail,
        measured_at: row.date,
        exercise: row.exercise,
        joint: row.joint,
        angle: row.angle,
        note: row.note,
        source: row.source ?? null,
        min_angle: row.minAngle ?? null,
        range: row.range ?? null,
        duration_sec: row.durationSec ?? null,
        form_score: row.formScore ?? null,
        flags: row.flags ?? null,
        next_action: row.nextAction ?? null,
        detected_exercise: row.detectedExercise ?? null,
      });
    if (error) {
      return {
        local: true,
        cloud: false,
        message: `Saved on this device. Cloud save skipped (${error.message}).`,
      };
    }
    return {
      local: true,
      cloud: true,
      message: "Saved on this device and sent to the clinic database.",
    };
  } catch (error) {
    return {
      local: true,
      cloud: false,
      message:
        error instanceof Error
          ? `Saved on this device. Cloud save skipped (${error.message}).`
          : "Saved on this device. Cloud save skipped.",
    };
  }
}

export function deleteMeasurement(id: string) {
  try {
    const all = JSON.parse(localStorage.getItem(GONIOMETER_KEY) ?? "[]") as GoniometerMeasurement[];
    localStorage.setItem(
      GONIOMETER_KEY,
      JSON.stringify(all.filter((row) => row.id !== id))
    );
  } catch {
    /* ignore */
  }
}
