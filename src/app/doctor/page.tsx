"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DashCard, DashEmpty, DashIntro, DashShell, DashStat } from "@/components/clinic/DashKit";
import { useAuth } from "@/components/AuthProvider";
import { getNotificationsForUser, markNotificationsRead } from "@/lib/notifications";
import { calculateStreak } from "@/lib/streak";
import { isCareTeam } from "@/lib/users";
import type { AppNotification } from "@/lib/notifications";
import { loadMeasurements } from "@/lib/goniometer";
import { doctorWatchLevel, progressSnapshot } from "@/lib/recovery-plan";
import { recoveryPassport } from "@/lib/recovery-passport";
import { GoniometerProgressChart } from "@/components/GoniometerProgressChart";
import { DemoBanner } from "@/components/DemoBanner";
import { clinicLocale, t } from "@/lib/i18n";
import { WeeklyUpdateCard } from "@/components/WeeklyUpdateCard";
import { ensureWeeklyUpdateNotice } from "@/lib/notifications";
import { weeklyPatientUpdate } from "@/lib/weekly-update";

export default function DoctorDashboardPage() {
  const { user, getPatientsForDoctor } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const patients = getPatientsForDoctor();
  const locale = clinicLocale(user);
  const weekly = isCareTeam(user?.role)
    ? patients.map((patient) => weeklyPatientUpdate(patient, loadMeasurements(patient.email), new Date(), locale))
    : [];

  useEffect(() => {
    if (!user || !isCareTeam(user.role)) return;
    const updates = getPatientsForDoctor().map((patient) =>
      weeklyPatientUpdate(patient, loadMeasurements(patient.email), new Date(), clinicLocale(user))
    );
    if (updates.length > 0) {
      ensureWeeklyUpdateNotice(
        user.email,
        updates[0].weekId,
        updates.map((update) => `${update.name}: ${update.headline}`).join(" ")
      );
    }
    setNotifications(getNotificationsForUser(user.email));
    markNotificationsRead(user.email);
  }, [user, getPatientsForDoctor]);

  if (!isCareTeam(user?.role)) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-[#2f4a60]">This page is for doctors and caregivers.</p>
        <Link href="/" className="font-semibold text-[#1b3348]">
          Go home
        </Link>
      </div>
    );
  }

  const attention = patients.filter((patient) => doctorWatchLevel(loadMeasurements(patient.email)).level !== "on-track").length;
  const clips = patients.reduce((sum, patient) => sum + loadMeasurements(patient.email).length, 0);

  return (
    <DashShell caregiver>
      <DemoBanner locale={locale} />
      <DashIntro
        kicker={user?.role === "caregiver" ? "Caregiver dashboard" : "Clinician dashboard"}
        title="Your patients"
        text="Review saved clips, form flags, and whether range is improving. Nothing here is invented."
        action={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Link href="/doctor/weekly" className="rm-btn h-12 min-h-0 rounded-full bg-[#2a332c] px-6 text-[#f7f3ea] hover:bg-[#3a4a3c]">
              This week
            </Link>
            <Link href="/pt-update" className="rm-btn rm-btn-ghost h-12 min-h-0 rounded-full px-6">
              Update plan
            </Link>
          </div>
        }
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <DashStat label="Patients" value={patients.length} hint="Linked to this account" />
        <DashStat label="Need a look" value={attention} hint="Watch or attention flags" />
        <DashStat label="Saved clips" value={clips} hint="Across the caseload" />
      </div>

      {weekly.length > 0 ? (
        <DashCard className="mt-6">
          <div className="flex items-end justify-between gap-3 px-5 pt-5 sm:px-6">
            <div>
              <h2 className="rm-serif text-2xl font-semibold text-[#1b3348]">This week</h2>
              <p className="mt-1 text-sm text-[#2f4a60]">{weekly[0].rangeLabel} · for doctors and caregivers on this account</p>
            </div>
            <Link href="/doctor/weekly" className="rm-btn h-11 min-h-0 shrink-0 rounded-full bg-[#2a332c] px-5 text-[#f7f3ea] hover:bg-[#3a4a3c]">
              This week
            </Link>
          </div>
          <div className="divide-y divide-[#e8f3fb]">
            {weekly.map((update) => (
              <WeeklyUpdateCard key={update.email} update={update} compact />
            ))}
          </div>
        </DashCard>
      ) : null}

      <DashCard className="mt-6">
        {patients.length === 0 ? (
          <DashEmpty
            title="No patients linked yet"
            text="When a patient signs in with your clinic email on file, they appear here."
            href="/"
            action="Go home"
          />
        ) : (
          <div className="divide-y divide-[#e8f3fb]">
            {patients.map((patient) => {
              const rows = loadMeasurements(patient.email);
              const watch = doctorWatchLevel(rows);
              const progress = progressSnapshot(rows, patient.targetRom || 100);
              const passport = recoveryPassport(rows, { goal: patient.targetRom || 100, sessionDays: patient.sessionDays });
              return (
                <article key={patient.email} className="grid gap-4 p-5 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] sm:p-6">
                  <div>
                    <p
                      className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
                        watch.level === "on-track" ? "bg-[#e7f1ea] text-[#2a7a58]" : "bg-[#f4efe4] text-[#7a6548]"
                      }`}
                    >
                      {watch.label}
                    </p>
                    <h3 className="rm-serif mt-2 text-2xl font-semibold text-[#1b3348]">{patient.name}</h3>
                    <p className="text-sm text-[#2f4a60]">{patient.email}</p>
                    <p className="mt-2 max-w-md text-sm leading-6 text-[#2f4a60]">{watch.detail}</p>
                    <div className="mt-4 flex flex-wrap gap-6">
                      <div>
                        <p className="rm-serif text-2xl font-semibold tabular-nums text-[#1b3348]">{calculateStreak(patient)}</p>
                        <p className="text-sm text-[#2f4a60]">Streak</p>
                      </div>
                      <div>
                        <p className="rm-serif text-2xl font-semibold tabular-nums text-[#1b3348]">
                          {progress.latestPeak != null ? `${progress.latestPeak}°` : "—"}
                        </p>
                        <p className="text-sm text-[#2f4a60]">Latest peak</p>
                      </div>
                      <div>
                        <p className="rm-serif text-2xl font-semibold tabular-nums text-[#1b3348]">
                          {passport.score != null ? passport.score : "—"}
                        </p>
                        <p className="text-sm text-[#2f4a60]">{t("passportScoreLabel", locale)}</p>
                      </div>
                      <div>
                        <p className="rm-serif text-2xl font-semibold tabular-nums text-[#1b3348]">{rows.length}</p>
                        <p className="text-sm text-[#2f4a60]">Clips</p>
                      </div>
                    </div>
                    <Link
                      href={`/doctor/patient?email=${encodeURIComponent(patient.email)}`}
                      className="rm-btn mt-4 inline-flex h-11 min-h-0 rounded-full bg-[#2a332c] px-5 text-[#f7f3ea] hover:bg-[#3a4a3c]"
                    >
                      {t("openChart", locale)}
                    </Link>
                  </div>
                  <div className="rounded-[1.15rem] bg-[#f7fbfe] p-3">
                    <GoniometerProgressChart measurements={rows} goal={patient.targetRom || 100} />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </DashCard>

      <DashCard className="mt-6 p-5 sm:p-6">
        <h2 className="rm-serif text-2xl font-semibold text-[#1b3348]">Daily notifications</h2>
        {notifications.length === 0 ? (
          <p className="mt-3 text-base text-[#2f4a60]">No notifications yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {notifications.slice(0, 10).map((note) => (
              <div key={note.id} className="rounded-[1.1rem] bg-[#f7fbfe] px-4 py-3">
                <p className="font-semibold text-[#1b3348]">{note.title}</p>
                <p className="mt-1 text-sm text-[#2f4a60]">{note.message}</p>
              </div>
            ))}
          </div>
        )}
      </DashCard>
    </DashShell>
  );
}
