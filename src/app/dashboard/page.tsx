"use client";

import Link from "next/link";
import {
  DashCard,
  DashEmpty,
  DashHeat,
  DashIntro,
  DashLoop,
  DashRing,
  DashShell,
  DashStat,
} from "@/components/clinic/DashKit";
import { useAuth } from "@/components/AuthProvider";
import { calculateStreak, getActivityDates, getLongestStreak, lastDaysActive } from "@/lib/streak";
import { ProgressInsight } from "@/components/ProgressInsight";
import { DemoBanner } from "@/components/DemoBanner";
import { ReportActions } from "@/components/ReportActions";
import { loadMeasurements } from "@/lib/goniometer";
import { preExerciseSetup, progressSnapshot, setupStepText } from "@/lib/recovery-plan";
import { recoveryPassport } from "@/lib/recovery-passport";
import { RecoveryPassportCard } from "@/components/RecoveryPassportCard";
import { clinicLocale, t, tf } from "@/lib/i18n";
import { DailyPath } from "@/components/DailyPath";

export default function DashboardPage() {
  const { user } = useAuth();

  if (!user || user.role !== "patient") {
    return (
      <div className="flex min-h-full items-center justify-center bg-background p-6">
        <Link href="/" className="font-semibold text-[#1b3348]">
          Go home
        </Link>
      </div>
    );
  }

  const locale = clinicLocale(user);
  const streak = calculateStreak(user);
  const longestStreak = getLongestStreak(user);
  const totalActiveDays = getActivityDates(user).length;
  const questsDone = Object.values(user.questProgress).filter(Boolean).length;
  const clips = loadMeasurements(user.email);
  const progress = progressSnapshot(clips, user.targetRom || 100, locale);
  const passport = recoveryPassport(clips, { goal: user.targetRom || 100, sessionDays: user.sessionDays });
  const todayExercise = user.ptPrescription?.exerciseName ?? "Heel Slide";
  const setup = preExerciseSetup(todayExercise).slice(0, 3);
  const heat = lastDaysActive(user, 28);
  const goal = user.targetRom || 100;

  return (
    <DashShell>
      <DemoBanner locale={locale} />
      <DashIntro
        kicker={t("yourDashboard", locale)}
        title={tf("todaysPlan", locale, { exercise: todayExercise })}
        text={t("dashboardText", locale)}
        action={
          <div className="flex w-full flex-col gap-2 sm:max-w-xs">
            <Link href="/pain-check" className="rm-btn rm-btn-brand h-14 min-h-0 w-full rounded-full text-base">
              {t("startSession", locale)}
            </Link>
            <Link href="/goniometer" className="rm-btn rm-btn-ghost h-12 min-h-0 w-full rounded-full">
              {t("navMeasure", locale)}
            </Link>
            <Link href="/briefing" className="rm-btn rm-btn-ghost h-12 min-h-0 w-full rounded-full">
              {t("goToBriefing", locale)}
            </Link>
            <ReportActions locale={locale} />
          </div>
        }
      />
      <DashLoop />

      <div className="mt-6">
        <RecoveryPassportCard passport={passport} locale={locale} />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <DashRing
          value={progress.latestPeak ?? 0}
          max={goal}
          label={t("rangeVsGoal", locale)}
          display={progress.latestPeak != null ? `${progress.latestPeak}°` : "—"}
          ofGoal={t("ofGoal", locale)}
        />
        <DashStat label={t("currentStreak", locale)} value={streak} hint={streak > 0 ? t("keepGoingToday", locale) : t("completeSessionToStart", locale)} />
        <DashStat label={t("longestStreak", locale)} value={longestStreak} hint={t("bestRun", locale)} />
        <DashStat label={t("activeDays", locale)} value={totalActiveDays} hint={tf("savedClips", locale, { n: clips.length })} />
      </div>

      <div className="mt-6">
        <DailyPath locale={locale} prescription={user.ptPrescription} showOther={false} />
      </div>

      <div className="mt-6">
        <ProgressInsight rows={clips} goal={goal} locale={locale} />
      </div>

      <div className="mt-6 grid gap-3 lg:grid-cols-2">
        <DashCard className="p-5 sm:p-6">
          <p className="text-sm font-semibold text-[#2f4a60]">{t("beforeYouRecord", locale)}</p>
          <h2 className="rm-serif mt-1 text-2xl font-semibold text-[#1b3348]">{t("setUpRecordSets", locale)}</h2>
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
        <DashCard className="p-5 sm:p-6">
          <p className="text-sm font-semibold text-[#2f4a60]">{t("last28Days", locale)}</p>
          <h2 className="rm-serif mt-1 text-2xl font-semibold text-[#1b3348]">{t("activeDays", locale)}</h2>
          <p className="mt-2 text-sm text-[#2f4a60]">{t("greenMeansSaved", locale)}</p>
          <div className="mt-4">
            <DashHeat days={heat} />
          </div>
        </DashCard>
      </div>

      <div className="mt-6 grid gap-3 lg:grid-cols-2">
        <DashCard>
          {user.exerciseHistory.length === 0 ? (
            <DashEmpty
              title={t("noSessionsYet", locale)}
              text={t("finishBriefingFirst", locale)}
              href="/briefing"
              action={t("openBriefing", locale)}
            />
          ) : (
            <div className="p-5 sm:p-6">
              <h2 className="rm-serif text-2xl font-semibold text-[#1b3348]">{t("recentSessions", locale)}</h2>
              <ul className="mt-4 space-y-2">
                {user.exerciseHistory
                  .slice(-5)
                  .reverse()
                  .map((record, i) => (
                    <li key={`${record.completedAt}-${i}`} className="rounded-[1.1rem] bg-[#f7fbfe] px-4 py-3">
                      <p className="font-semibold capitalize text-[#1b3348]">{record.areaId.replace("-", " ")}</p>
                      <p className="text-sm text-[#2f4a60]">{new Date(record.completedAt).toLocaleDateString()}</p>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </DashCard>
        <DashCard className="p-5 sm:p-6">
          <h2 className="rm-serif text-2xl font-semibold text-[#1b3348]">{t("kidsQuest", locale)}</h2>
          <p className="mt-2 text-base text-[#2f4a60]">
            {tf("stretchesDone", locale, { n: questsDone })}
          </p>
          <Link href="/kids" className="kids-cta mt-5 inline-flex h-11 min-h-0 rounded-full px-5 text-base">
            {t("continueKids", locale)}
          </Link>
        </DashCard>
      </div>
    </DashShell>
  );
}
