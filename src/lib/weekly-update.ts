import type { GoniometerMeasurement } from "./goniometer";
import type { Locale } from "./i18n";
import type { User } from "./users";

export type WeeklyStatus = "on-track" | "watch" | "quiet";

export type WeeklyPatientUpdate = {
  email: string;
  name: string;
  weekId: string;
  rangeLabel: string;
  priorRangeLabel: string;
  status: WeeklyStatus;
  statusLabel: string;
  headline: string;
  days: number;
  expectedDays: number;
  priorDays: number;
  clips: number;
  peak: number | null;
  priorPeak: number | null;
  peakChange: number | null;
  pain: number | null;
  priorPain: number | null;
  form: number | null;
  exercise: string | null;
  lines: string[];
};

const DAY = 24 * 60 * 60 * 1000;

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function inRange(iso: string | undefined, from: Date, to: Date) {
  if (!iso) return false;
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return false;
  return time >= from.getTime() && time <= to.getTime();
}

function dayKey(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDay(date: Date, locale: Locale) {
  return date.toLocaleDateString(locale === "es" ? "es" : "en", { month: "short", day: "numeric" });
}

function peakOf(rows: GoniometerMeasurement[]) {
  if (rows.length === 0) return null;
  return Math.max(...rows.map((row) => row.angle));
}

function latestPain(
  patient: User,
  from: Date,
  to: Date,
  preferCheckIn: boolean
) {
  const logged = patient.exerciseHistory
    .filter((row) => row.pain != null && inRange(row.completedAt, from, to))
    .sort((a, b) => a.completedAt.localeCompare(b.completedAt));
  const fromHistory = logged.length ? logged[logged.length - 1].pain ?? null : null;
  if (preferCheckIn && patient.painToday != null && inRange(patient.lastCheckInDate, from, to)) {
    return patient.painToday;
  }
  return fromHistory;
}

function activeDays(patient: User, rows: GoniometerMeasurement[], from: Date, to: Date) {
  const days = new Set<string>();
  for (const date of patient.activityDates) {
    if (inRange(date, from, to)) days.add(dayKey(date));
  }
  for (const row of patient.exerciseHistory) {
    if (inRange(row.completedAt, from, to)) days.add(dayKey(row.completedAt));
  }
  for (const row of rows) {
    if (inRange(row.date, from, to)) days.add(dayKey(row.date));
  }
  return days.size;
}

function checkInLine(patient: User, from: Date, to: Date, locale: Locale) {
  if (!patient.checkInAnswers || !inRange(patient.lastCheckInDate, from, to)) return null;
  const answers = patient.checkInAnswers;
  const bits = [
    answers.swelling != null ? (locale === "es" ? `hinchazón ${answers.swelling}` : `swelling ${answers.swelling}`) : null,
    answers["knee-stiffness"] != null
      ? locale === "es"
        ? `rigidez ${answers["knee-stiffness"]}`
        : `stiffness ${answers["knee-stiffness"]}`
      : null,
    answers["knee-giving-way"] != null
      ? locale === "es"
        ? `fallo ${answers["knee-giving-way"]}`
        : `giving way ${answers["knee-giving-way"]}`
      : null,
  ].filter(Boolean);
  if (bits.length === 0) return null;
  return locale === "es" ? `Registro de esta semana: ${bits.join(", ")}.` : `This week's check-in: ${bits.join(", ")}.`;
}

export function weeklyPatientUpdate(patient: User, rows: GoniometerMeasurement[], now = new Date(), locale: Locale = "en"): WeeklyPatientUpdate {
  const end = new Date(startOfDay(now).getTime() + DAY - 1);
  const weekStart = startOfDay(new Date(end.getTime() - 6 * DAY));
  const priorEnd = new Date(weekStart.getTime() - 1);
  const priorStart = startOfDay(new Date(priorEnd.getTime() - 6 * DAY));
  const thisRows = rows.filter((row) => inRange(row.date, weekStart, end));
  const priorRows = rows.filter((row) => inRange(row.date, priorStart, priorEnd));
  const peak = peakOf(thisRows);
  const priorPeak = peakOf(priorRows);
  const peakChange = peak != null && priorPeak != null ? peak - priorPeak : null;
  const days = activeDays(patient, rows, weekStart, end);
  const priorDays = activeDays(patient, rows, priorStart, priorEnd);
  const expectedDays = Math.min(7, Math.max(1, patient.sessionDays || 5));
  const pain = latestPain(patient, weekStart, end, true);
  const priorPain = latestPain(patient, priorStart, priorEnd, false);
  const formScores = thisRows.map((row) => row.formScore).filter((score): score is number => score != null);
  const form = formScores.length ? Math.max(...formScores) : null;
  const flags = [...new Set(thisRows.flatMap((row) => row.flags ?? []))];
  const es = locale === "es";

  let status: WeeklyStatus = "on-track";
  if (days === 0 && thisRows.length === 0) status = "quiet";
  else if (
    (peakChange != null && peakChange <= -5) ||
    (pain != null && pain >= 7) ||
    flags.length > 0 ||
    days < Math.ceil(expectedDays / 2)
  ) {
    status = "watch";
  }

  const statusLabel =
    status === "on-track" ? (es ? "En curso" : "On track") : status === "watch" ? (es ? "Revisar" : "Needs a look") : es ? "Semana en calma" : "Quiet week";

  let headline: string;
  if (status === "quiet" && priorPeak == null) {
    headline = es ? "Todavía no hay lecturas en casa." : "No home readings yet.";
  } else if (status === "quiet") {
    headline = es
      ? `Semana en calma. El último pico fue ${priorPeak}°.`
      : `Quiet week. The last peak was ${priorPeak}°.`;
  } else if (peakChange != null && peakChange >= 3) {
    headline = es ? `El pico subió ${peakChange}° desde la semana pasada.` : `Peak is up ${peakChange}° from last week.`;
  } else if (peakChange != null && peakChange <= -3) {
    headline = es
      ? `El pico bajó ${Math.abs(peakChange)}° desde la semana pasada.`
      : `Peak is down ${Math.abs(peakChange)}° from last week.`;
  } else if (peak != null) {
    headline = es ? `El pico se mantiene en ${peak}°.` : `Peak is holding at ${peak}°.`;
  } else {
    headline = es ? `${days} de ${expectedDays} días previstos.` : `${days} of ${expectedDays} planned days.`;
  }

  const lines: string[] = [];
  const clipWord = thisRows.length === 1 ? (es ? "lectura guardada" : "saved reading") : es ? "lecturas guardadas" : "saved readings";
  lines.push(
    es
      ? `${days} de ${expectedDays} días previstos. ${thisRows.length} ${clipWord}.`
      : `${days} of ${expectedDays} planned days. ${thisRows.length} ${clipWord}.`
  );
  if (peak != null) {
    lines.push(
      priorPeak != null
        ? es
          ? `Pico ${peak}°. La semana anterior fue ${priorPeak}°.`
          : `Peak ${peak}°. The week before was ${priorPeak}°.`
        : es
          ? `Pico ${peak}°. No hay una semana anterior para comparar.`
          : `Peak ${peak}°. There is no earlier week to compare.`
    );
  }
  if (pain != null) {
    lines.push(
      priorPain != null
        ? es
          ? `Dolor ${pain}/10. La semana anterior fue ${priorPain}/10.`
          : `Pain ${pain}/10. The week before was ${priorPain}/10.`
        : es
          ? `Dolor ${pain}/10.`
          : `Pain ${pain}/10.`
    );
  }
  if (form != null) {
    lines.push(es ? `Mejor puntaje de forma ${form}.` : `Best form score ${form}.`);
  }
  const checkIn = checkInLine(patient, weekStart, end, locale);
  if (checkIn) lines.push(checkIn);
  if (flags.length) {
    lines.push(es ? `Avisos: ${flags.join(", ")}.` : `Flags: ${flags.join(", ")}.`);
  }
  if (patient.ptPrescription?.exerciseName) {
    lines.push(
      es
        ? `Plan actual: ${patient.ptPrescription.exerciseName}.`
        : `Current plan: ${patient.ptPrescription.exerciseName}.`
    );
  }

  return {
    email: patient.email,
    name: patient.name,
    weekId: dayKey(weekStart.toISOString()),
    rangeLabel: `${formatDay(weekStart, locale)} – ${formatDay(end, locale)}`,
    priorRangeLabel: `${formatDay(priorStart, locale)} – ${formatDay(priorEnd, locale)}`,
    status,
    statusLabel,
    headline,
    days,
    expectedDays,
    priorDays,
    clips: thisRows.length,
    peak,
    priorPeak,
    peakChange,
    pain,
    priorPain,
    form,
    exercise: patient.ptPrescription?.exerciseName ?? null,
    lines,
  };
}
