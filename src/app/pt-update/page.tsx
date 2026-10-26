"use client";

import { useState } from "react";
import Link from "next/link";
import { DashCard, DashIntro, DashShell, DashStat } from "@/components/clinic/DashKit";
import { useAuth } from "@/components/AuthProvider";
import { clinicLocale, t } from "@/lib/i18n";
import { isCareTeam, type MeasureMethod } from "@/lib/users";
import { calculateStreak } from "@/lib/streak";
import { loadMeasurements } from "@/lib/goniometer";
import { progressSnapshot } from "@/lib/recovery-plan";

export default function PTUpdatePage() {
  const { user, getPatientsForDoctor, setPatientPrescription } = useAuth();
  const [selectedEmail, setSelectedEmail] = useState("");
  const [exerciseName, setExerciseName] = useState("Resistance Band Extension");
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(10);
  const [hold, setHold] = useState(12);
  const [angle, setAngle] = useState(90);
  const [notes, setNotes] = useState("");
  const [method, setMethod] = useState<MeasureMethod>("camera");
  const [sent, setSent] = useState(false);

  const locale = clinicLocale(user);
  const patients = getPatientsForDoctor();
  const patient = patients.find((row) => row.email === selectedEmail);
  const clips = patient ? loadMeasurements(patient.email) : [];
  const progress = patient ? progressSnapshot(clips, patient.targetRom || 100, locale) : null;

  if (!isCareTeam(user?.role)) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <Link href="/" className="font-semibold text-[#1b3348]">
          {t("goHome", locale)}
        </Link>
      </div>
    );
  }

  function pushUpdate() {
    if (!selectedEmail) return;
    setPatientPrescription(selectedEmail, {
      exerciseName,
      sets,
      reps,
      holdSeconds: hold,
      targetAngle: angle,
      notes,
      method,
      updatedAt: new Date().toISOString(),
    });
    setSent(true);
  }

  return (
    <DashShell caregiver wide={false}>
      <DashIntro
        kicker={t("planKicker", locale)}
        title={t("planTitle", locale)}
        text={t("planText", locale)}
      />

      <select
        value={selectedEmail}
        onChange={(event) => setSelectedEmail(event.target.value)}
        className="mt-6 w-full rounded-[1.15rem] bg-white px-4 py-4 text-base shadow-[0_12px_28px_rgba(27,51,72,0.06)] ring-1 ring-[#4f90c6]/12"
      >
        <option value="">{t("selectPatient", locale)}</option>
        {patients.map((row) => (
          <option key={row.email} value={row.email}>
            {row.name}
          </option>
        ))}
      </select>

      {patient && progress && (
        <div className="mt-4 grid grid-cols-3 gap-3">
          <DashStat label={t("clipsShort", locale)} value={clips.length} />
          <DashStat label={t("latestPeak", locale)} value={progress.latestPeak != null ? `${progress.latestPeak}°` : "—"} />
          <DashStat label={t("streak", locale)} value={calculateStreak(patient)} />
        </div>
      )}

      <DashCard className="mt-6 space-y-4 p-6">
        <input
          value={exerciseName}
          onChange={(event) => setExerciseName(event.target.value)}
          className="w-full rounded-xl border border-[var(--border)] bg-[#f7fbfe] px-4 py-4 text-base"
          placeholder={t("exerciseNamePh", locale)}
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: t("setsLabel", locale), value: sets, set: setSets },
            { label: t("reps", locale), value: reps, set: setReps },
            { label: t("holdSeconds", locale), value: hold, set: setHold },
            { label: t("angleLabel", locale), value: angle, set: setAngle },
          ].map((field) => (
            <div key={field.label}>
              <label className="mb-1 block text-sm font-semibold text-[#2f4a60]">{field.label}</label>
              <input
                type="number"
                value={field.value}
                onChange={(event) => field.set(Number(event.target.value))}
                className="w-full rounded-xl border border-[var(--border)] bg-[#f7fbfe] px-3 py-3 text-center text-lg font-bold"
              />
            </div>
          ))}
        </div>
        <label className="block text-sm font-semibold text-[#2f4a60]">
          {t("prescribedMethod", locale)}
          <select
            value={method}
            onChange={(event) => setMethod(event.target.value as MeasureMethod)}
            className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[#f7fbfe] px-4 py-4 text-base font-normal text-[#1b3348]"
          >
            <option value="camera">{t("methodCamera", locale)}</option>
            <option value="motion">{t("methodMotion", locale)}</option>
            <option value="muscle">{t("methodMuscle", locale)}</option>
          </select>
        </label>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          className="w-full rounded-xl border border-[var(--border)] bg-[#f7fbfe] px-4 py-4 text-base"
          placeholder={t("notesForPatient", locale)}
          rows={3}
        />
        <button type="button" onClick={pushUpdate} className="rm-btn rm-btn-brand w-full rounded-full">
          {t("pushToPatient", locale)}
        </button>
        {sent ? (
          <p className="text-center text-base font-semibold text-[#3a7d62]">{t("planSent", locale)}</p>
        ) : null}
      </DashCard>
    </DashShell>
  );
}
