"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import { DashCard, DashEmpty, DashIntro, DashShell, DashStat } from "@/components/clinic/DashKit";
import { useAuth } from "@/components/AuthProvider";
import { GoniometerProgressChart } from "@/components/GoniometerProgressChart";
import { ProgressInsight } from "@/components/ProgressInsight";
import { loadMeasurements } from "@/lib/goniometer";
import { doctorWatchLevel } from "@/lib/recovery-plan";
import { recoveryPassport } from "@/lib/recovery-passport";
import { RecoveryPassportCard } from "@/components/RecoveryPassportCard";
import { isCareTeam } from "@/lib/users";
import { clinicLocale, t } from "@/lib/i18n";
import { WeeklyUpdateCard } from "@/components/WeeklyUpdateCard";
import { weeklyPatientUpdate } from "@/lib/weekly-update";

function PatientMovementView() {
  const { user, getPatientsForDoctor } = useAuth();
  const params = useSearchParams();
  const email = (params.get("email") ?? "").toLowerCase();
  const patient = getPatientsForDoctor().find((row) => row.email.toLowerCase() === email);
  const rows = useMemo(() => (email ? loadMeasurements(email) : []), [email]);
  const watch = doctorWatchLevel(rows);
  const goal = patient?.targetRom || 100;
  const locale = clinicLocale(user);
  const passport = recoveryPassport(rows, { goal, sessionDays: patient?.sessionDays });

  if (!isCareTeam(user?.role)) {
    return (
      <div className="flex min-h-full items-center justify-center p-6">
        <Link href="/" className="font-semibold text-[#1b3348]">
          Go home
        </Link>
      </div>
    );
  }

  if (!patient) {
    return (
      <DashShell caregiver>
        <DashEmpty title="Patient not found" text="That email is not on your caseload." href="/doctor" action="Back to patients" />
      </DashShell>
    );
  }

  return (
    <DashShell caregiver wide>
      <DashIntro
        kicker="Movement review"
        title={patient.name}
        text={`${patient.email}. ${watch.detail}`}
      />
      <p
        className={`mt-4 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
          watch.level === "on-track" ? "bg-[#e7f1ea] text-[#2a7a58]" : "bg-[#f4efe4] text-[#7a6548]"
        }`}
      >
        {watch.label}
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <DashStat label="Clips" value={rows.length} />
        <DashStat label="Latest peak" value={rows.length ? `${rows[rows.length - 1].angle}°` : "—"} />
        <DashStat label={t("passportScoreLabel", locale)} value={passport.score != null ? passport.score : "—"} />
      </div>

      <DashCard className="mt-6">
        <WeeklyUpdateCard update={weeklyPatientUpdate(patient, rows, new Date(), locale)} />
      </DashCard>

      <div className="mt-6">
        <RecoveryPassportCard passport={passport} locale={locale} />
      </div>

      <div className="mt-6 space-y-4">
        <ProgressInsight rows={rows} goal={goal} />
        <DashCard className="p-5 sm:p-6">
          <h2 className="rm-serif text-2xl font-semibold text-[#1b3348]">Peak angle over time</h2>
          <div className="mt-4">
            <GoniometerProgressChart measurements={rows} goal={goal} />
          </div>
        </DashCard>
        <DashCard>
          {rows.length === 0 ? (
            <DashEmpty
              title="No clips yet"
              text="When this patient saves a Photo Goniometer, motion, or muscle reading, it shows here."
              href="/pt-update"
              action="Send a plan"
            />
          ) : (
            <div className="p-5 sm:p-6">
              <h2 className="rm-serif text-2xl font-semibold text-[#1b3348]">Saved clips</h2>
              <ul className="mt-4 space-y-2">
                {rows
                  .slice()
                  .reverse()
                  .map((row) => (
                    <li key={row.id} className="rounded-[1.1rem] bg-[#f7fbfe] px-4 py-3">
                      <p className="font-semibold text-[#1b3348]">
                        {row.angle}° · {row.exercise}
                        {row.formScore != null ? ` · form ${row.formScore}` : ""}
                        {row.reps != null ? ` · ${row.reps} reps` : ""}
                        {row.source === "video"
                          ? " · video"
                          : row.source === "motion"
                            ? " · motion"
                            : row.source === "muscle"
                              ? " · muscle"
                              : " · photo"}
                      </p>
                      <p className="text-sm text-[#2f4a60]">
                        {new Date(row.date).toLocaleString()}
                        {row.minAngle != null ? ` · min ${row.minAngle}°` : ""}
                        {row.range != null ? ` · range ${row.range}°` : ""}
                      </p>
                      {row.nextAction ? <p className="mt-1 text-sm text-[#1b3348]">{row.nextAction}</p> : null}
                      {row.flags && row.flags.length > 0 ? (
                        <p className="mt-1 text-sm text-[#7a6548]">Flags: {row.flags.join(", ")}</p>
                      ) : null}
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </DashCard>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link href="/pt-update" className="rm-btn rm-btn-brand flex-1 rounded-full text-center">
          Push exercise update
        </Link>
        <Link href="/doctor" className="rm-btn rm-btn-ghost flex-1 rounded-full text-center">
          All patients
        </Link>
      </div>
    </DashShell>
  );
}

export default function DoctorPatientPage() {
  return (
    <Suspense fallback={<div className="flex min-h-full items-center justify-center text-[#2f4a60]">Loading patient…</div>}>
      <PatientMovementView />
    </Suspense>
  );
}
