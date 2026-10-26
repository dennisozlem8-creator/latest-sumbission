"use client";

import Link from "next/link";
import { DashCard, DashIntro, DashLoop, DashRing, DashShell, DashStat } from "@/components/clinic/DashKit";
import { useAuth } from "@/components/AuthProvider";
import { DemoBanner } from "@/components/DemoBanner";
import { ReportActions } from "@/components/ReportActions";
import { calculateStreak } from "@/lib/streak";
import { summarizeCheckIn } from "@/lib/pre-briefing-questions";
import { clinicLocale, t, tf } from "@/lib/i18n";
import { loadMeasurements } from "@/lib/goniometer";
import { preExerciseSetup, progressSnapshot, setupStepText } from "@/lib/recovery-plan";
import { recoveryPassport } from "@/lib/recovery-passport";
import { RecoveryPassportCard } from "@/components/RecoveryPassportCard";
import { PhotoFrame } from "@/components/LandingMedia";
import { DailyPath } from "@/components/DailyPath";

export default function BriefingPage() {
  const { user } = useAuth();

  if (!user) return null;

  const locale = clinicLocale(user);
  const prescription = user.ptPrescription;
  const streak = calculateStreak(user);
  const lastSession = user.exerciseHistory[user.exerciseHistory.length - 1];
  const dayNum = user.exerciseHistory.length + 1;
  const checkInSummary = user.checkInAnswers ? summarizeCheckIn(user.checkInAnswers, locale) : null;
  const todayExercise = prescription?.exerciseName ?? "Heel Slide";
  const setup = preExerciseSetup(todayExercise).slice(0, 4);
  const clips = loadMeasurements(user.email);
  const progress = progressSnapshot(clips, user.targetRom || 100, locale);
  const passport = recoveryPassport(clips, { goal: user.targetRom || 100, sessionDays: user.sessionDays });
  const goal = user.targetRom || 100;

  return (
    <DashShell>
      <DemoBanner locale={locale} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(16rem,0.8fr)]">
        <div>
          <DashIntro
            kicker={`${t("recoveryDay", locale)} ${dayNum}`}
            title={t("todaysBriefing", locale)}
            text={tf("measureFirst", locale, { name: user.name.split(" ")[0] })}
          />
          <DashLoop />
          {checkInSummary ? (
            <p className="mt-4 rounded-[1.15rem] bg-[#e8f3fb] px-4 py-3 text-base text-[#1b3348]">
              {tf("checkInComplete", locale, { summary: checkInSummary })}
            </p>
          ) : null}
          <div className="mt-4 flex flex-col gap-2 sm:max-w-md">
            <Link href="/session" className="rm-btn rm-btn-brand h-14 w-full rounded-full text-base">
              {t("startSession", locale)}
            </Link>
            <Link href="/goniometer" className="rm-btn rm-btn-ghost h-12 w-full rounded-full">
              {t("navMeasure", locale)}
            </Link>
            <ReportActions locale={locale} />
          </div>
        </div>
        <PhotoFrame
          src="/images/landing-exercise.webp"
          alt=""
          className="min-h-[10rem] rounded-[1.5rem] lg:min-h-[12rem]"
          imgClassName="object-cover object-[center_20%]"
        />
      </div>

      <div className="mt-6">
        <RecoveryPassportCard passport={passport} locale={locale} />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <DashRing
          value={progress.latestPeak ?? 0}
          max={goal}
          label={t("rangeVsGoal", locale)}
          display={progress.latestPeak != null ? `${progress.latestPeak}°` : "—"}
          ofGoal={t("ofGoal", locale)}
        />
        <DashStat
          label={t("lastSessionMoves", locale)}
          value={`${lastSession?.exerciseIds.length ?? 0}`}
          hint={t("exercisesLoggedLast", locale)}
        />
        <DashStat label={t("streak", locale)} value={streak} hint={t("daysInARow", locale)} />
      </div>

      <DashCard className="mt-6 p-5 sm:p-6">
        <p className="text-sm font-semibold text-[#2f4a60]">{t("todaysExercise", locale)}</p>
        <h2 className="rm-serif mt-1 text-3xl font-semibold text-[#1b3348]">{todayExercise}</h2>
        <p className="mt-2 text-base text-[#2f4a60]">
          {prescription
            ? `${prescription.sets} × ${prescription.reps} ${t("reps", locale).toLowerCase()} · ${prescription.holdSeconds}s · ${prescription.targetAngle}°`
            : t("defaultSets", locale)}
        </p>
        {prescription?.notes ? (
          <p className="mt-4 rounded-[1.1rem] bg-[#e8f3fb] px-4 py-3 text-base text-[#1b3348]">
            {tf("fromClinician", locale, { notes: prescription.notes })}
          </p>
        ) : null}
      </DashCard>

      <div className="mt-6">
        <DailyPath locale={locale} prescription={prescription} showOther />
      </div>

      <DashCard className="mt-6 p-5 sm:p-6">
        <p className="text-sm font-semibold text-[#2f4a60]">{t("beforeYouExercise", locale)}</p>
        <h2 className="rm-serif mt-1 text-2xl font-semibold text-[#1b3348]">{t("doThisSetup", locale)}</h2>
        <ol className="mt-4 space-y-3">
          {setup.map((step, index) => {
            const copy = setupStepText(step, locale);
            return (
              <li key={step.title} className="flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e8f3fb] text-sm font-bold text-[#1b3348]">
                  {index + 1}
                </span>
                <div>
                  <p className="font-semibold text-[#1b3348]">{copy.title}</p>
                  <p className="mt-0.5 text-sm leading-6 text-[#2f4a60]">{copy.detail}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </DashCard>

      <p className="mt-6 text-center">
        <Link href="/library" className="text-sm font-semibold text-[#1b3348]">
          {t("viewLibrary", locale)} →
        </Link>
      </p>
    </DashShell>
  );
}
