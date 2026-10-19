"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { DashCard, DashEmpty, DashIntro, DashShell } from "@/components/clinic/DashKit";
import { DemoBanner } from "@/components/DemoBanner";
import { WeeklyUpdateCard } from "@/components/WeeklyUpdateCard";
import { useAuth } from "@/components/AuthProvider";
import { loadMeasurements } from "@/lib/goniometer";
import { clinicLocale } from "@/lib/i18n";
import { ensureWeeklyUpdateNotice } from "@/lib/notifications";
import { isCareTeam } from "@/lib/users";
import { weeklyPatientUpdate } from "@/lib/weekly-update";

function WeeklyUpdates() {
  const { user, getPatientsForDoctor } = useAuth();
  const params = useSearchParams();
  const focus = (params.get("email") ?? "").toLowerCase();
  const patients = getPatientsForDoctor();
  const locale = clinicLocale(user);
  const updates = useMemo(
    () => patients.map((patient) => weeklyPatientUpdate(patient, loadMeasurements(patient.email), new Date(), locale)),
    [patients, locale]
  );
  const shown = focus ? updates.filter((update) => update.email.toLowerCase() === focus) : updates;

  useEffect(() => {
    if (!user || updates.length === 0) return;
    const message = updates.map((update) => `${update.name}: ${update.headline}`).join(" ");
    ensureWeeklyUpdateNotice(user.email, updates[0].weekId, message);
  }, [user, updates]);

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

  const roleLabel = user?.role === "caregiver" ? "Caregiver" : "Clinician";

  return (
    <DashShell caregiver>
      <DemoBanner locale={locale} />
      <DashIntro
        kicker={`${roleLabel} · past 7 days`}
        title="Weekly patient updates"
        text="Each note uses the readings saved on this device. It compares the past 7 days with the 7 days before that."
        action={
          <button type="button" onClick={() => window.print()} className="rm-btn rm-btn-ghost h-11 min-h-0 rounded-full px-6">
            Print this week
          </button>
        }
      />

      <DashCard className="mt-6">
        {shown.length === 0 ? (
          <DashEmpty
            title={focus ? "Patient not on this account" : "No patients linked yet"}
            text="A patient shows up here when their account lists this doctor or caregiver email."
            href="/doctor"
            action="Back to patients"
          />
        ) : (
          <div className="divide-y divide-[#e8f3fb]">
            {shown.map((update) => (
              <WeeklyUpdateCard key={update.email} update={update} />
            ))}
          </div>
        )}
      </DashCard>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row print:hidden">
        <Link href="/doctor" className="rm-btn rm-btn-ghost flex-1 rounded-full text-center">
          All patients
        </Link>
        <Link href="/pt-update" className="rm-btn rm-btn-brand flex-1 rounded-full text-center">
          Push exercise update
        </Link>
      </div>
    </DashShell>
  );
}

export default function WeeklyUpdatesPage() {
  return (
    <Suspense fallback={<div className="flex min-h-full items-center justify-center text-[#2f4a60]">Loading this week…</div>}>
      <WeeklyUpdates />
    </Suspense>
  );
}
