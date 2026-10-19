import {
  EXERCISE_OPTIONS,
  measuredJointFromLabel,
  pointLabelsForJoint,
  type GoniometerMeasurement,
  type MeasuredJoint,
  type Point,
} from "./goniometer";
import { countAngleReps } from "./rep-counter";
import { summarizeMovement, type MovementSample } from "./pose-goniometer";

export type FindingSeverity = "ok" | "watch" | "unusual";

export type MovementFinding = {
  id: string;
  severity: FindingSeverity;
  title: string;
  detail: string;
  timeSec?: number;
};

export type MovementCoachReport = {
  detectedExercise: string;
  matchSelected: boolean;
  confidence: "low" | "medium" | "high";
  headline: string;
  findings: MovementFinding[];
  feedback: string[];
  unusualTimes: number[];
  trackingQuality: "good" | "fair" | "poor";
  formScore: number;
  /** Full bend-and-return cycles in the clip. A still photo is 0. */
  reps: number;
  progressNote: string | null;
};

type ExerciseId =
  | "Seated Knee Flexion"
  | "Standing Knee Flexion"
  | "Prone Knee Flexion"
  | "Heel Slide";

function avg(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function span(values: number[]) {
  if (values.length === 0) return 0;
  return Math.max(...values) - Math.min(...values);
}

function dist(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function kneeLineOffset(hip: Point, knee: Point, ankle: Point) {
  const dx = ankle.x - hip.x;
  const dy = ankle.y - hip.y;
  const length = Math.hypot(dx, dy);
  if (length < 0.02) return 0;
  return Math.abs((knee.x - hip.x) * dy - (knee.y - hip.y) * dx) / length;
}

function countFlexionReps(angles: number[]) {
  if (angles.length < 6) return 1;
  let reps = 0;
  let armed = false;
  const lo = Math.min(...angles);
  const hi = Math.max(...angles);
  const mid = lo + (hi - lo) * 0.45;
  for (let i = 1; i < angles.length; i++) {
    if (angles[i] < mid && angles[i - 1] >= mid) armed = true;
    if (armed && angles[i] > mid && angles[i - 1] <= mid) {
      reps += 1;
      armed = false;
    }
  }
  return Math.max(1, reps);
}

function inferExercise(samples: MovementSample[]): { exercise: ExerciseId; confidence: MovementCoachReport["confidence"] } {
  const hipY = samples.map((sample) => sample.hip.y);
  const ankleX = samples.map((sample) => sample.ankle.x);
  const ankleY = samples.map((sample) => sample.ankle.y);
  const angles = samples.map((sample) => sample.angle);
  const reach = samples.map((sample) => dist(sample.hip, sample.ankle));
  const shoulders = samples.filter((sample) => sample.shoulder);
  const bodyFlat = avg(
    shoulders.map((sample) => Math.abs((sample.shoulder?.y ?? sample.hip.y) - sample.hip.y))
  );
  const bodyLong = avg(
    shoulders.map((sample) => Math.abs((sample.shoulder?.x ?? sample.hip.x) - sample.hip.x))
  );

  const hipTravel = span(hipY);
  const ankleXTravel = span(ankleX);
  const ankleYTravel = span(ankleY);
  const reachTravel = span(reach);
  const meanAngle = avg(angles);

  const scores: Record<ExerciseId, number> = {
    "Prone Knee Flexion":
      (shoulders.length > 3 && bodyFlat < 0.14 && bodyLong > 0.12 ? 3 : 0) +
      (meanAngle < 150 ? 0.4 : 0),
    "Heel Slide":
      (reachTravel > 0.07 ? 2.2 : reachTravel * 12) +
      (ankleXTravel > ankleYTravel ? 1.2 : 0) +
      (hipTravel < 0.1 ? 0.6 : 0),
    "Standing Knee Flexion":
      (ankleYTravel > 0.07 ? 2 : ankleYTravel * 10) +
      (hipTravel < 0.11 ? 0.8 : 0) +
      (meanAngle > 125 ? 0.6 : 0),
    "Seated Knee Flexion":
      (meanAngle < 130 ? 1.8 : 0) +
      (ankleYTravel < 0.09 ? 1 : 0) +
      (hipTravel < 0.1 ? 0.7 : 0) +
      (reachTravel < 0.08 ? 0.4 : 0),
  };

  const ranked = (EXERCISE_OPTIONS as ExerciseId[])
    .slice()
    .sort((a, b) => scores[b] - scores[a]);
  const best = ranked[0];
  const second = ranked[1];
  const gap = scores[best] - scores[second];
  const confidence = gap > 1.6 ? "high" : gap > 0.7 ? "medium" : "low";
  return { exercise: best, confidence };
}

function trackingQuality(samples: MovementSample[], duration: number): MovementCoachReport["trackingQuality"] {
  const vis = avg(samples.map((sample) => sample.visibility ?? 0.5));
  const rate = duration > 0.4 ? samples.length / duration : samples.length;
  if (vis >= 0.55 && rate >= 6) return "good";
  if (vis >= 0.35 && rate >= 3) return "fair";
  return "poor";
}

function velocitySeries(samples: MovementSample[]) {
  const vels: { time: number; vel: number; step: number }[] = [];
  for (let i = 1; i < samples.length; i++) {
    const dt = Math.max(0.04, samples[i].time - samples[i - 1].time);
    const step = samples[i].angle - samples[i - 1].angle;
    vels.push({ time: samples[i].time, vel: step / dt, step });
  }
  return vels;
}

const EXERCISE_CUES: Record<ExerciseId, string[]> = {
  "Seated Knee Flexion": [
    "Sit tall. Slide the foot back under the chair without lifting the hip.",
    "Pause one second at the deepest bend you can do without sharp pain, then ease forward.",
    "Keep the thigh quiet on the seat so the motion stays in the knee.",
  ],
  "Standing Knee Flexion": [
    "Hold a chair or wall. Bend the heel toward the seat without leaning the trunk forward.",
    "Keep the thighs lined up. Do not hike the hip to fake more bend.",
    "Lower the foot slowly. The way down should last longer than the lift.",
  ],
  "Prone Knee Flexion": [
    "Lie on the stomach. Bend the heel toward the seat while the hip stays on the table.",
    "If the hip lifts, reduce the bend a little and try again with a slower count.",
    "Hold the end range briefly, then lower with control.",
  ],
  "Heel Slide": [
    "Lie on the back. Slide the heel toward the seat, keeping the heel on the surface.",
    "Do not let the knee fall in or out. Track the kneecap toward the ceiling.",
    "Straighten until the back of the knee is as close to the surface as it will go.",
  ],
};

function smoothSamples(samples: MovementSample[]): MovementSample[] {
  return samples.map((sample, index, all) => {
    if (index === 0 || index === all.length - 1) return sample;
    const trio = [all[index - 1].angle, sample.angle, all[index + 1].angle].sort((a, b) => a - b);
    return { ...sample, angle: trio[1] };
  });
}

function formScoreFor(findings: MovementFinding[], quality: MovementCoachReport["trackingQuality"]) {
  let score = 88;
  if (quality === "fair") score -= 8;
  if (quality === "poor") score -= 18;
  for (const finding of findings) {
    if (finding.severity === "unusual") score -= 14;
    if (finding.severity === "watch") score -= 6;
  }
  return Math.max(20, Math.min(99, score));
}

function progressNoteFor(history: GoniometerMeasurement[], peak: number) {
  const prior = history.filter((row) => row.source === "video" || row.minAngle != null);
  if (prior.length === 0) {
    return `This is the first saved motion clip. Peak ${peak}°. Record again in 1–2 days with the same camera spot.`;
  }
  const last = prior[prior.length - 1];
  const delta = peak - last.angle;
  if (delta >= 3) return `Peak is ${delta}° higher than the last clip (${last.angle}°). Keep the same slow count.`;
  if (delta <= -3) return `Peak is ${Math.abs(delta)}° lower than last time (${last.angle}°). Repeat yesterday’s setup before adding range.`;
  return `Peak is holding near ${last.angle}°. That is useful. Improve control before chasing more degrees.`;
}

const REGION_CUES: Record<Exclude<MeasuredJoint, "knee">, string[]> = {
  ankle: [
    "Turn sideways so the camera sees the knee, ankle, and toes.",
    "Move the foot. Keep the knee quiet unless the exercise asks it to bend.",
    "Stop if the motion is sharp. A smaller, slower bend still counts.",
  ],
  wrist: [
    "Turn sideways so the camera sees the shoulder, elbow, and wrist.",
    "Bend and straighten at the wrist. Keep the elbow from swinging through the motion.",
    "Stop if the motion is sharp. Save the angle you can hold without forcing it.",
  ],
  trunk: [
    "Turn sideways so the camera sees the shoulder, hip, and knee.",
    "Hinge from the hips. Keep the knees soft and the motion slow.",
    "Stop if pain is sharp or travels down the leg. A smaller bend still counts.",
  ],
};

function regionName(kind: MeasuredJoint) {
  if (kind === "trunk") return "lower back";
  return kind;
}

function pointPhrase(kind: MeasuredJoint) {
  const labels = pointLabelsForJoint(kind);
  return `${labels.hip.toLowerCase()}, ${labels.knee.toLowerCase()}, and ${labels.ankle.toLowerCase()}`;
}

function coachRegionMovement(
  samples: MovementSample[],
  selectedExercise: string,
  joint: string,
  history: GoniometerMeasurement[]
): MovementCoachReport | null {
  const analyzed = smoothSamples(samples);
  const summary = summarizeMovement(analyzed);
  if (!summary || analyzed.length < 4) return null;
  const kind = measuredJointFromLabel(joint);
  if (kind === "knee") return null;
  const name = regionName(kind);
  const points = pointPhrase(kind);
  const side = joint.toLowerCase().includes("left") ? "left" : "right";
  const quality = trackingQuality(analyzed, summary.duration);
  const findings: MovementFinding[] = [];
  const unusualTimes: number[] = [];
  const angles = analyzed.map((sample) => sample.angle);
  const vels = velocitySeries(analyzed);

  findings.push(
    quality === "poor"
      ? {
          id: "tracking",
          severity: "watch",
          title: `The camera lost the ${name} at times`,
          detail: `The ${points} dropped out of view. Step back, stay sideways, and keep those three points in the frame.`,
        }
      : {
          id: "tracking",
          severity: "ok",
          title: "The recorded part stayed in view",
          detail: `The ${side} ${points} were visible enough to measure this clip.`,
        }
  );

  if (summary.range < 12) {
    findings.push({
      id: "little-motion",
      severity: "watch",
      title: `Very little ${name} motion in this clip`,
      detail: `The angle only moved about ${summary.range}°. That can be a still pose, a stiff session, or the camera missing the bend.`,
    });
  }

  const jerks = vels.filter((row) => Math.abs(row.vel) > 220 || Math.abs(row.step) > 28);
  if (jerks.length >= 2) {
    unusualTimes.push(...jerks.slice(0, 4).map((row) => row.time));
    findings.push({
      id: "jerky",
      severity: jerks.length >= 4 ? "unusual" : "watch",
      title: "The motion looks jumpy",
      detail: `The angle jumped suddenly around ${jerks[0].time.toFixed(1)}s. Slow the middle of the movement.`,
      timeSec: jerks[0].time,
    });
  }

  return {
    detectedExercise: selectedExercise,
    matchSelected: true,
    confidence: quality === "good" ? "medium" : "low",
    headline: `This clip measures the ${side} ${name}. Peak ${summary.peak}°, range ${summary.range}°.`,
    findings,
    feedback: REGION_CUES[kind],
    unusualTimes: [...new Set(unusualTimes)].slice(0, 6),
    trackingQuality: quality,
    formScore: formScoreFor(findings, quality),
    reps: countAngleReps(angles),
    progressNote: progressNoteFor(history, summary.peak),
  };
}

function coachRegionPhoto(
  angle: number,
  selectedExercise: string,
  joint: string
): MovementCoachReport | null {
  const kind = measuredJointFromLabel(joint);
  if (kind === "knee") return null;
  const name = regionName(kind);
  const points = pointPhrase(kind);
  const side = joint.toLowerCase().includes("left") ? "left" : "right";
  return {
    detectedExercise: selectedExercise,
    matchSelected: true,
    confidence: "medium",
    headline: `Photo of the ${side} ${name} at ${angle}°. Record a short video if you want the motion, not just this still angle.`,
    findings: [
      {
        id: "photo-angle",
        severity: "ok",
        title: `Still-frame ${name} angle is ${angle}°`,
        detail: `Measured at the middle of the ${points}. A video shows whether the motion into and out of this angle is smooth.`,
      },
    ],
    feedback: REGION_CUES[kind],
    unusualTimes: [],
    trackingQuality: "good",
    formScore: 90,
    reps: 0,
    progressNote: null,
  };
}

export function coachMovement(
  samples: MovementSample[],
  selectedExercise: string,
  joint: string,
  goal = 100,
  history: GoniometerMeasurement[] = []
): MovementCoachReport | null {
  if (measuredJointFromLabel(joint) !== "knee") {
    return coachRegionMovement(samples, selectedExercise, joint, history);
  }
  const analyzed = smoothSamples(samples);
  const summary = summarizeMovement(analyzed);
  if (!summary || analyzed.length < 4) return null;

  const angles = analyzed.map((sample) => sample.angle);
  const inferred = inferExercise(analyzed);
  const exercise = (
    EXERCISE_OPTIONS.includes(selectedExercise as ExerciseId)
      ? selectedExercise
      : inferred.exercise
  ) as ExerciseId;
  const quality = trackingQuality(analyzed, summary.duration);
  const vels = velocitySeries(analyzed);
  const findings: MovementFinding[] = [];
  const unusualTimes: number[] = [];
  const side = joint.toLowerCase().includes("left") ? "left" : "right";

  if (quality === "poor") {
    findings.push({
      id: "tracking",
      severity: "watch",
      title: "The camera lost the leg at times",
      detail:
        "Hip, knee, or ankle dropped out of view. Stand farther back, stay sideways, and keep the whole leg in the frame.",
    });
  } else {
    findings.push({
      id: "tracking",
      severity: "ok",
      title: "The recorded part stayed in view",
      detail: `The ${side} hip, knee, and ankle were visible enough to measure this clip.`,
    });
  }

  if (summary.range < 12) {
    findings.push({
      id: "little-motion",
      severity: "watch",
      title: "Very little knee motion in this clip",
      detail: `The knee only moved about ${summary.range}°. That can be a still photo-like clip, a very stiff session, or the camera missing the bend.`,
    });
  }

  if (summary.min > 140 && summary.range >= 12) {
    findings.push({
      id: "limited-flexion",
      severity: "unusual",
      title: "The knee barely bent",
      detail: `The deepest angle was ${summary.min}°. For ${exercise}, we usually see a clearer bend. Stop if pain is sharp. If it is stiffness, try a slower, smaller slide and add a few degrees only if it stays comfortable.`,
    });
  } else if (summary.min > 115 && summary.range >= 12) {
    findings.push({
      id: "limited-flexion",
      severity: "watch",
      title: "Bend looks smaller than a full rep",
      detail: `Deepest angle was ${summary.min}°. That is still useful motion. Next rep, pause at the end and see if 5° more is comfortable.`,
    });
  }

  if (
    (exercise === "Heel Slide" || exercise === "Standing Knee Flexion") &&
    summary.peak < 150 &&
    summary.range >= 12
  ) {
    findings.push({
      id: "limited-extension",
      severity: summary.peak < 135 ? "unusual" : "watch",
      title: "The knee did not finish straight",
      detail: `The straightest angle was ${summary.peak}°. Try to ease the heel away until the knee flattens, without forcing it.`,
    });
  }

  if (summary.peak + 15 < goal && summary.range >= 12) {
    findings.push({
      id: "below-goal",
      severity: "watch",
      title: "This session is still short of your goal",
      detail: `Peak was ${summary.peak}°. Your goal is ${goal}°. Work toward it over days, not in one clip.`,
    });
  }

  const hipTravel = span(analyzed.map((sample) => sample.hip.y));
  if (hipTravel > 0.09 && summary.range >= 12) {
    findings.push({
      id: "hip-hike",
      severity: hipTravel > 0.16 ? "unusual" : "watch",
      title: "The hip is helping more than the knee",
      detail:
        "The hip moved a lot while the knee was bending. That often means the body is compensating. Keep the pelvis quiet and let the knee do the work.",
    });
  }

  const trunk = analyzed
    .filter((sample) => sample.shoulder)
    .map((sample) => (sample.shoulder?.x ?? 0) - sample.hip.x);
  if (trunk.length > 4 && span(trunk) > 0.12) {
    findings.push({
      id: "trunk-lean",
      severity: "watch",
      title: "The trunk leaned during the motion",
      detail:
        "The shoulder drifted relative to the hip. Hold a chair or keep the chest facing the same way so the knee stays the moving joint.",
    });
  }

  const oppositeHips = analyzed.filter((sample) => sample.oppositeHip);
  if (oppositeHips.length > 4) {
    const hike = span(oppositeHips.map((sample) => Math.abs(sample.hip.y - (sample.oppositeHip?.y ?? sample.hip.y))));
    if (hike > 0.1) {
      findings.push({
        id: "pelvis-tilt",
        severity: "watch",
        title: "The pelvis looks uneven",
        detail:
          "One hip sat higher than the other during the clip. Stand or lie more square to the camera, and avoid hiking the working side.",
      });
    }
  }

  const offsets = analyzed.map((sample) => kneeLineOffset(sample.hip, sample.knee, sample.ankle));
  if (avg(offsets) > 0.08) {
    findings.push({
      id: "alignment",
      severity: "watch",
      title: "The knee is not lining up with the hip and ankle",
      detail:
        "On a true side view the three points sit almost on one line. This can be a rotated camera, or the knee drifting in or out. Turn fully sideways and try again.",
    });
  }

  const jerks = vels.filter((row) => Math.abs(row.vel) > 220 || Math.abs(row.step) > 28);
  if (jerks.length >= 2) {
    const first = jerks[0];
    unusualTimes.push(...jerks.slice(0, 4).map((row) => row.time));
    findings.push({
      id: "jerky",
      severity: jerks.length >= 4 ? "unusual" : "watch",
      title: "The motion looks jumpy",
      detail: `The angle jumped suddenly around ${first.time.toFixed(1)}s. Slow the middle of the bend and avoid bouncing at the end.`,
      timeSec: first.time,
    });
  }

  let freeze = 0;
  let freezeStart = analyzed[0].time;
  for (let i = 1; i < analyzed.length; i++) {
    if (Math.abs(analyzed[i].angle - analyzed[i - 1].angle) < 2) {
      freeze += analyzed[i].time - analyzed[i - 1].time;
    } else {
      if (freeze > 1.8 && summary.duration > 3) {
        unusualTimes.push(freezeStart);
        findings.push({
          id: "freeze",
          severity: "watch",
          title: "The knee paused for a long time",
          detail: `Motion almost stopped near ${freezeStart.toFixed(1)}s. A short hold is fine. A long freeze can mean guarding or lost balance.`,
          timeSec: freezeStart,
        });
      }
      freeze = 0;
      freezeStart = analyzed[i].time;
    }
  }

  const signFlips = vels.filter((row, i) => i > 0 && row.vel * vels[i - 1].vel < 0 && Math.abs(row.vel) > 40).length;
  if (signFlips > 10 && summary.range < 25) {
    findings.push({
      id: "wobble",
      severity: "unusual",
      title: "The joint looks shaky",
      detail:
        "The angle wiggled back and forth without a clear bend. Rest, hold a support, and try one slow rep. If shaking is new or painful, stop and tell your clinician.",
    });
  }

  const reps = countFlexionReps(angles);
  const secondsPerRep = summary.duration / reps;
  if (secondsPerRep < 1.1 && summary.range >= 20) {
    findings.push({
      id: "too-fast",
      severity: "watch",
      title: "The reps look rushed",
      detail: `About ${reps} bend${reps === 1 ? "" : "s"} in ${summary.duration.toFixed(1)}s. Count 3 seconds down and 3 seconds back.`,
    });
  }

  const matchSelected = inferred.exercise === selectedExercise || inferred.confidence === "low";
  if (!matchSelected) {
    findings.push({
      id: "exercise-mismatch",
      severity: "watch",
      title: `This looks more like ${inferred.exercise}`,
      detail: `You selected ${selectedExercise}. The path of the hip, knee, and ankle is closer to ${inferred.exercise}. Change the exercise name if that is what you did, so the feedback matches.`,
    });
  } else {
    findings.push({
      id: "exercise-seen",
      severity: "ok",
      title: `This matches ${exercise}`,
      detail: `The ${side} knee bent and returned in a pattern that fits ${exercise}.`,
    });
  }

  const unusual = findings.filter((finding) => finding.severity === "unusual");
  const watches = findings.filter((finding) => finding.severity === "watch");
  const headline = unusual.length
    ? `The coach flagged ${unusual.length} unusual spot${unusual.length === 1 ? "" : "s"} in this ${exercise.toLowerCase()}.`
    : watches.length
      ? `The motion is readable. A few form notes can make the next ${exercise.toLowerCase()} cleaner.`
      : `This looks like a steady ${exercise.toLowerCase()} on the ${side} knee.`;

  const feedback = [
    ...EXERCISE_CUES[exercise],
    unusual.length
      ? "Do not chase a bigger number if pain is sharp, swollen, or new. Repeat the clip when the motion feels smoother."
      : "Save this session, then try one more slow rep with the cue that fits you best.",
  ];

  return {
    detectedExercise: inferred.exercise,
    matchSelected,
    confidence: inferred.confidence,
    headline,
    findings,
    feedback,
    unusualTimes: [...new Set(unusualTimes)].slice(0, 6),
    trackingQuality: quality,
    formScore: formScoreFor(findings, quality),
    reps: countAngleReps(angles),
    progressNote: progressNoteFor(history, summary.peak),
  };
}

export function coachPhotoPose(
  angle: number,
  hip: Point,
  knee: Point,
  ankle: Point,
  selectedExercise: string,
  joint: string
): MovementCoachReport {
  const region = coachRegionPhoto(angle, selectedExercise, joint);
  if (region) return region;
  const exercise = (
    EXERCISE_OPTIONS.includes(selectedExercise as ExerciseId)
      ? selectedExercise
      : "Seated Knee Flexion"
  ) as ExerciseId;
  const side = joint.toLowerCase().includes("left") ? "left" : "right";
  const findings: MovementFinding[] = [];
  const offset = kneeLineOffset(hip, knee, ankle);

  findings.push({
    id: "photo-angle",
    severity: angle < 50 || angle > 178 ? "watch" : "ok",
    title: `Still-frame knee angle is ${angle}°`,
    detail:
      angle > 165
        ? "The knee looks nearly straight in this photo."
        : angle < 80
          ? "The knee looks clearly bent in this photo."
          : "This is a mid-range still. A video shows whether the motion into and out of this angle is smooth.",
  });

  if (offset > 0.08) {
    findings.push({
      id: "photo-align",
      severity: "watch",
      title: "Hip, knee, and ankle are not stacked on a side-view line",
      detail:
        "Turn the camera so we see a true side of the leg. If the knee still sits far off the line, the joint may be drifting inward or outward.",
    });
  } else {
    findings.push({
      id: "photo-align",
      severity: "ok",
      title: "The three points line up",
      detail: `The ${side} hip, knee, and ankle sit on a clean side-view line.`,
    });
  }

  return {
    detectedExercise: selectedExercise,
    matchSelected: true,
    confidence: "medium",
    headline: `Photo of the ${side} knee at ${angle}°. Record a short video if you want motion and form notes.`,
    findings,
    feedback: EXERCISE_CUES[exercise],
    unusualTimes: [],
    trackingQuality: "good",
    formScore: offset > 0.08 ? 72 : 90,
    reps: 0,
    progressNote: null,
  };
}
