import type { Locale } from "./i18n";
import { rankExercises } from "./exercise-coach";
import type { User } from "./users";
import { getAssessment, type Exercise } from "./assessments";

export type SessionSummary = {
  angle: number;
  /** Reps counted while doing the exercises. */
  reps: number;
  /** Reps counted during the range test, before the exercise list. */
  testReps?: number;
  emg: number | null;
  hr: number | null;
  target: number;
};

const injuryToArea: Record<string, string> = {
  knee: "knee",
  ankle: "ankle",
  wrist: "wrist",
  elbow: "other",
  other: "other",
};

export function areaIdForInjury(injuryType: string) {
  return injuryToArea[injuryType] ?? "wrist";
}

export function getSessionRecommendations(
  areaId: string,
  user: Pick<User, "painToday" | "checkInAnswers" | "baselineRom" | "targetRom" | "ptPrescription" | "recoveryProfile">,
  sessionAngle: number,
  previousExerciseIds: string[] = [],
  locale: Locale = "en"
): Exercise[] {
  const assessment = getAssessment(areaId);
  if (!assessment) return [];

  let pain = user.painToday ?? 4;
  if (user.checkInAnswers?.swelling === "Noticeable") pain = Math.max(pain, 6);
  if (user.checkInAnswers?.energy && Number(user.checkInAnswers.energy) <= 2) {
    pain = Math.max(pain, 5);
  }

  const swelling =
    typeof user.checkInAnswers?.swelling === "string" && /noticeable|^yes\b/i.test(user.checkInAnswers.swelling.trim());
  const ranked = rankExercises({
    areaId,
    pain,
    latestPeak: sessionAngle,
    goal: user.targetRom || user.ptPrescription?.targetAngle || 90,
    prescribedName: user.ptPrescription?.exerciseName,
    previousIds: previousExerciseIds,
    locale,
    profile: user.recoveryProfile,
    swelling,
  });
  const today = ranked.filter((row) => row.today).map((row) => row.exercise);
  if (today.length >= 3) return today.slice(0, 3);

  const ids = new Set(today.map((exercise) => exercise.id));
  const fill = assessment.exercises.filter((exercise) => !ids.has(exercise.id)).slice(0, 3 - today.length);
  return [...today, ...fill];
}
