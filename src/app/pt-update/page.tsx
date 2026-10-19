"use client";

import { useState } from "react";
import Link from "next/link";
import { DashCard, DashIntro, DashShell, DashStat } from "@/components/clinic/DashKit";
import { useAuth } from "@/components/AuthProvider";
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

  const patients = getPatientsForDoctor();
  const patient = patients.find((row) => row.email === selectedEmail);
  const clips = patient ? loadMeasurements(patient.email) : [];
  const progress = patient ? progressSnapshot(clips, patient.targetRom || 100) : null;

  if (!isCareTeam(user?.role)) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <Link href="/" className="font-semibold text-[#1b3348]">
          Go home
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
        kicker="Care plan"
        title="Update the exercise plan"
        text="Push a new prescription. The patient sees it on the next briefing."
      />

      <select
        value={selectedEmail}
        onChange={(event) => setSelectedEmail(event.target.value)}
        className="mt-6 w-full rounded-[1.15rem] bg-white px-4 py-4 text-base shadow-[0_12px_28px_rgba(27,51,72,0.06)] ring-1 ring-[#4f90c6]/12"
      >
        <option value="">Select patient</option>
        {patients.map((row) => (
          <option key={row.email} value={row.email}>
            {row.name}
          </option>
        ))}
      </select>

      {patient && progress && (
        <div className="mt-4 grid grid-cols-3 gap-3">
          <DashStat label="Clips" value={clips.length} />
          <DashStat label="Latest peak" value={progress.latestPeak != null ? `${progress.latestPeak}°` : "—"} />
          <DashStat label="Streak" value={calculateStreak(patient)} />
        </div>
      )}

      <DashCard className="mt-6 space-y-4 p-6">
        <input
          value={exerciseName}
          onChange={(event) => setExerciseName(event.target.value)}
          className="w-full rounded-xl border border-[var(--border)] bg-[#f7fbfe] px-4 py-4 text-base"
          placeholder="Exercise name"
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Sets", value: sets, set: setSets },
            { label: "Reps", value: reps, set: setReps },
            { label: "Hold (s)", value: hold, set: setHold },
            { label: "Angle°", value: angle, set: setAngle },
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
          Prescribed method
          <select
            value={method}
            onChange={(event) => setMethod(event.target.value as MeasureMethod)}
            className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[#f7fbfe] px-4 py-4 text-base font-normal text-[#1b3348]"
          >
            <option value="camera">Phone or laptop camera</option>
            <option value="motion">Bluetooth motion sensor</option>
            <option value="muscle">Bluetooth muscle sensor</option>
          </select>
        </label>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          className="w-full rounded-xl border border-[var(--border)] bg-[#f7fbfe] px-4 py-4 text-base"
          placeholder="Notes for patient"
          rows={3}
        />
        <button type="button" onClick={pushUpdate} className="rm-btn rm-btn-brand w-full rounded-full">
          Push update to patient
        </button>
        {sent ? (
          <p className="text-center text-base font-semibold text-[#3a7d62]">
            Plan updated. The patient sees this on the next briefing.
          </p>
        ) : null}
      </DashCard>
    </DashShell>
  );
}
