"use client";

import { useState } from "react";
import Link from "next/link";
import { TabRow } from "@/components/ui/TabRow";
import { useAuth } from "@/components/AuthProvider";
import { calculateStreak, lastDaysActive } from "@/lib/streak";
import { loadMeasurements } from "@/lib/goniometer";
import { GoniometerProgressChart } from "@/components/GoniometerProgressChart";
import { ProgressInsight } from "@/components/ProgressInsight";
import { DashBars, DashCard, DashHeat, DashIntro, DashPainMeter, DashShell, DashStat } from "@/components/clinic/DashKit";
import { DemoBanner } from "@/components/DemoBanner";
import { ReportActions } from "@/components/ReportActions";
import { clinicLocale, t, tf } from "@/lib/i18n";

type ChartTab = "rom" | "reps" | "pain" | "photo";

export default function ChartsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<ChartTab>("rom");

  if (!user) return null;

  const locale = clinicLocale(user);
  const clips = loadMeasurements(user.email);
  const ordered = clips.slice().sort((a, b) => a.date.localeCompare(b.date));
  const week = lastDaysActive(user, 7);
  const month = lastDaysActive(user, 28);
  const repsOn = (date: string) => {
    const fromSessions = user.exerciseHistory.reduce((sum, row) => {
      return row.completedAt.slice(0, 10) === date ? sum + (row.reps ?? 0) : sum;
    }, 0);
    const fromClips = clips.reduce((sum, row) => {
      return row.date.slice(0, 10) === date ? sum + (row.reps ?? 0) : sum;
    }, 0);
    return fromSessions + fromClips;
  };
  const weekReps = week.map((day) => repsOn(day.date));
  const streak = calculateStreak(user);

  return (
    <DashShell>
      <DemoBanner locale={locale} />
      <DashIntro
        kicker={t("reportKicker", locale)}
        title={t("progressCharts", locale)}
        text={tf("chartsIntro", locale, { n: ordered.length, streak })}
        action={<ReportActions locale={locale} />}
      />

      <Link href="/dashboard" className="rm-btn rm-btn-ghost mt-6 w-full rounded-full sm:w-auto">
        {t("dashboard", locale)}
      </Link>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <DashStat label={t("savedReadings", locale)} value={ordered.length} hint={t("photoMotionMuscle", locale)} />
        <DashStat label={t("thisWeek", locale)} value={week.filter((d) => d.active).length} hint={t("activeDays", locale)} />
        <DashStat label={t("streak", locale)} value={streak} hint={t("daysInARow", locale)} />
      </div>

      <div className="mt-6">
        <TabRow
          tabs={[
            { id: "rom" as const, label: t("romTab", locale) },
            { id: "reps" as const, label: t("repsTab", locale) },
            { id: "pain" as const, label: t("painTab", locale) },
            { id: "photo" as const, label: t("photoTab", locale) },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>

      {tab === "rom" && (
        <DashCard className="mt-6 p-5 sm:p-6">
          <h2 className="rm-serif text-2xl font-semibold text-[#1b3348]">{t("rangeOfMotion", locale)}</h2>
          <p className="mt-1 text-sm text-[#2f4a60]">{t("eachBarPeak", locale)}</p>
          <div className="mt-5">
            <DashBars
              values={ordered.map((row) => row.angle)}
              labels={ordered.map((row) =>
                new Date(row.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })
              )}
              goal={user.targetRom}
            />
          </div>
        </DashCard>
      )}

      {tab === "reps" && (
        <div className="mt-6 grid gap-3 lg:grid-cols-2">
          <DashCard className="p-5 sm:p-6">
            <h2 className="rm-serif text-2xl font-semibold text-[#1b3348]">{t("thisWeek", locale)}</h2>
            <p className="mt-1 text-sm text-[#2f4a60]">{t("aTallBar", locale)}</p>
            <div className="mt-5">
              <DashBars
                values={weekReps}
                labels={week.map((day) =>
                  new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, { weekday: "narrow" })
                )}
              />
            </div>
          </DashCard>
          <DashCard className="p-5 sm:p-6">
            <h2 className="rm-serif text-2xl font-semibold text-[#1b3348]">{t("last28Days", locale)}</h2>
            <p className="mt-1 text-sm text-[#2f4a60]">{t("greenIsActive", locale)}</p>
            <div className="mt-5">
              <DashHeat days={month} />
            </div>
          </DashCard>
        </div>
      )}

      {tab === "pain" && (
        <DashCard className="mt-6 p-5 sm:p-6">
          <h2 className="rm-serif text-2xl font-semibold text-[#1b3348]">{t("painToday", locale)}</h2>
          <p className="mt-1 text-sm text-[#2f4a60]">{t("painLogged", locale)}</p>
          <div className="mt-5">
            <DashPainMeter value={user.painToday} />
          </div>
          <Link href="/check-in" className="rm-btn rm-btn-brand mt-5 inline-flex h-11 min-h-0 rounded-full px-6">
            {t("openCheckIn", locale)}
          </Link>
        </DashCard>
      )}

      {tab === "photo" && (
        <div className="mt-6 space-y-4">
          <ProgressInsight rows={clips} goal={user.targetRom || 100} locale={locale} />
          <DashCard className="p-5 sm:p-6">
            <h2 className="rm-serif text-2xl font-semibold text-[#1b3348]">{t("peakOverTime", locale)}</h2>
            <div className="mt-4">
              <GoniometerProgressChart measurements={clips} goal={user.targetRom || 100} />
            </div>
            <Link href="/goniometer" className="rm-btn rm-btn-brand mt-6 inline-flex h-11 min-h-0 rounded-full px-6">
              {t("recordNewClip", locale)}
            </Link>
          </DashCard>
        </div>
      )}
    </DashShell>
  );
}
