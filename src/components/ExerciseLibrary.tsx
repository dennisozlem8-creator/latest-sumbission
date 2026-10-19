"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DashCard } from "@/components/clinic/DashKit";
import { ExerciseFigure } from "@/components/ExerciseFigure";
import { assessments, type Exercise } from "@/lib/assessments";
import { rankExercises, type RankedExercise } from "@/lib/exercise-coach";
import { loadMeasurements } from "@/lib/goniometer";
import { clinicLocale, t, tf, type Locale } from "@/lib/i18n";
import { progressSnapshot } from "@/lib/recovery-plan";
import { areaIdForInjury } from "@/lib/session-results";
import type { User } from "@/lib/users";

const AREAS = ["knee", "ankle", "lower-back", "wrist", "other"] as const;
type TagFilter = "all" | Exercise["tags"][number];

const areaKey = {
  knee: "areaKnee",
  ankle: "areaAnkle",
  "lower-back": "areaBack",
  wrist: "areaWrist",
  other: "areaOther",
} as const;

const tagKey = {
  all: "libraryAll",
  gentle: "tagGentle",
  mobility: "tagMobility",
  strength: "tagStrength",
  stability: "tagStability",
} as const;

function useRanked(user: User, areaId: string) {
  const locale = clinicLocale(user);
  const clips = loadMeasurements(user.email);
  const progress = progressSnapshot(clips, user.targetRom || 100, locale);
  const previousIds = user.exerciseHistory.flatMap((row) => row.exerciseIds);
  const pain = user.painToday ?? 3;
  const goal = user.targetRom || 100;
  const swelling =
    typeof user.checkInAnswers?.swelling === "string" && /noticeable|^yes\b/i.test(user.checkInAnswers.swelling.trim());
  const ranked = rankExercises({
    areaId,
    pain,
    latestPeak: progress.latestPeak,
    goal,
    prescribedName: user.ptPrescription?.exerciseName,
    previousIds,
    locale,
    profile: user.recoveryProfile,
    swelling,
  });
  return { locale, pain, goal, peak: progress.latestPeak, ranked };
}

export function TodayPlan({ user }: { user: User }) {
  const areaId = areaIdForInjury(user.injuryType);
  const { locale, ranked } = useRanked(user, areaId);
  const today = ranked.filter((row) => row.today).slice(0, 3);
  const minutes = today.reduce((sum, row) => sum + row.detail.minutes, 0);

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="rm-serif text-2xl font-semibold text-[#1b3348]">{t("libraryToday", locale)}</h2>
          <p className="mt-1 text-sm text-[#2f4a60]">{t("libraryTodayText", locale)}</p>
        </div>
        <Link href="/library" className="text-sm font-semibold text-[#1b3348]">
          {t("libraryOpen", locale)} →
        </Link>
      </div>
      <p className="mt-3 text-sm font-semibold text-[#4f90c6]">
        {minutes} {t("libraryMin", locale)}
      </p>
      <div className="mt-3 grid gap-3">
        {today.map((row, index) => (
          <PlanRow key={row.exercise.id} row={row} index={index + 1} locale={locale} compact />
        ))}
      </div>
    </section>
  );
}

export function ExerciseLibrary({ user }: { user: User }) {
  const defaultArea = areaIdForInjury(user.injuryType);
  const [areaId, setAreaId] = useState(assessments[defaultArea] ? defaultArea : "knee");
  const [tag, setTag] = useState<TagFilter>("all");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [swaps, setSwaps] = useState<Record<string, string>>({});
  const { locale, pain, goal, peak, ranked } = useRanked(user, areaId);

  const byId = useMemo(() => new Map(ranked.map((row) => [row.exercise.id, row])), [ranked]);
  const today = ranked
    .filter((row) => row.today)
    .slice(0, 3)
    .map((row) => byId.get(swaps[row.exercise.id] ?? row.exercise.id) ?? row);
  const minutes = today.reduce((sum, row) => sum + row.detail.minutes, 0);
  const needle = query.trim().toLowerCase();
  const browse = ranked.filter((row) => {
    if (tag !== "all" && !row.exercise.tags.includes(tag)) return false;
    if (!needle) return true;
    return `${row.exercise.name} ${row.exercise.description}`.toLowerCase().includes(needle);
  });

  return (
    <div>
      <DashCard className="p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[#4f90c6]">{t("libraryToday", locale)}</p>
            <h2 className="rm-serif mt-1 text-3xl font-semibold text-[#1b3348]">
              {minutes} {t("libraryMin", locale)}
            </h2>
            <p className="mt-2 max-w-xl text-base leading-7 text-[#2f4a60]">
              {tf("libraryContext", locale, { pain, peak: peak != null ? `${peak}°` : "—", goal: `${goal}°` })}
            </p>
          </div>
          <Link href="/session" className="rm-btn rm-btn-brand inline-flex h-11 min-h-0 rounded-full px-5">
            {t("libraryStart", locale)}
          </Link>
        </div>
        <ol className="mt-5 space-y-3">
          {today.map((row, index) => (
            <li key={`${row.exercise.id}-${index}`}>
              <PlanRow
                row={row}
                index={index + 1}
                locale={locale}
                open={openId === row.exercise.id}
                onToggle={() => setOpenId((current) => (current === row.exercise.id ? null : row.exercise.id))}
                onSwap={(nextId) => {
                  const source = ranked.filter((item) => item.today)[index];
                  if (!source || !byId.has(nextId)) return;
                  setSwaps((current) => ({ ...current, [source.exercise.id]: nextId }));
                  setOpenId(nextId);
                }}
              />
            </li>
          ))}
        </ol>
      </DashCard>

      <div className="mt-6 flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {AREAS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setAreaId(id);
                setSwaps({});
                setOpenId(null);
              }}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                areaId === id ? "bg-[#1b3348] text-white" : "bg-white text-[#1b3348] ring-1 ring-[#4f90c6]/25"
              }`}
            >
              {t(areaKey[id], locale)}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("librarySearch", locale)}
            className="w-full rounded-full border border-[#4f90c6]/25 bg-white px-4 py-3 text-sm outline-none focus:border-[#4f90c6] sm:max-w-sm"
          />
          <div className="flex flex-wrap gap-2">
            {(["all", "gentle", "mobility", "strength", "stability"] as const).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setTag(id)}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                  tag === id ? "bg-[#4f90c6] text-white" : "bg-white text-[#1b3348] ring-1 ring-[#4f90c6]/25"
                }`}
              >
                {t(tagKey[id], locale)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {browse.length === 0 ? (
        <p className="mt-6 text-base text-[#2f4a60]">{t("libraryEmpty", locale)}</p>
      ) : (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {browse.map((row) => (
            <PlanRow
              key={row.exercise.id}
              row={row}
              locale={locale}
              open={openId === `browse-${row.exercise.id}`}
              onToggle={() =>
                setOpenId((current) => (current === `browse-${row.exercise.id}` ? null : `browse-${row.exercise.id}`))
              }
            />
          ))}
        </div>
      )}

      <p className="mt-6 text-sm leading-6 text-[#2f4a60]">{t("libraryDisclaimer", locale)}</p>
    </div>
  );
}

function PlanRow({
  row,
  index,
  locale,
  compact,
  open,
  onToggle,
  onSwap,
}: {
  row: RankedExercise;
  index?: number;
  locale: Locale;
  compact?: boolean;
  open?: boolean;
  onToggle?: () => void;
  onSwap?: (id: string) => void;
}) {
  const summary = (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {index != null ? <span className="text-sm font-bold text-[#4f90c6]">{index}</span> : null}
        <h3 className="rm-serif text-xl font-semibold text-[#1b3348]">{row.exercise.name}</h3>
        {row.prescribed ? (
          <span className="rounded-full bg-[#3a7d62] px-2 py-0.5 text-xs font-bold text-white">{t("prescribedByPt", locale)}</span>
        ) : null}
        {row.paused ? (
          <span className="rounded-full bg-[#e8f3fb] px-2 py-0.5 text-xs font-bold text-[#1b3348]">{t("libraryPaused", locale)}</span>
        ) : row.today && index == null ? (
          <span className="rounded-full bg-[#e8f3fb] px-2 py-0.5 text-xs font-bold text-[#1b3348]">{t("libraryOnToday", locale)}</span>
        ) : null}
      </div>
      <p className="mt-1 text-sm font-semibold text-[#1b3348]">
        {row.dose} · {row.detail.minutes} {t("libraryMin", locale)} · {row.detail.equipment}
      </p>
      <ul className="mt-2 space-y-1">
        {row.reasons.map((reason) => (
          <li key={reason} className="text-sm leading-6 text-[#2f4a60]">
            {reason}
          </li>
        ))}
      </ul>
      {onToggle ? (
        <span className="mt-2 inline-block text-sm font-semibold text-[#1b3348]">{open ? t("libraryHide", locale) : t("libraryShow", locale)}</span>
      ) : null}
    </>
  );

  return (
    <article className="overflow-hidden rounded-[1.2rem] bg-white ring-1 ring-[#4f90c6]/12">
      <div className="grid grid-cols-1 sm:grid-cols-[11.5rem_1fr] sm:min-h-36">
        <div className={`overflow-hidden bg-[#e8f3fb] ${compact ? "h-28" : open ? "h-52" : "h-40"} sm:h-full`}>
          <ExerciseFigure id={row.exercise.id} title={row.exercise.name} className="h-full w-full" />
        </div>
        <div className="min-w-0 p-4">
          {onToggle ? (
            <button type="button" onClick={onToggle} className="w-full text-left">
              {summary}
            </button>
          ) : (
            summary
          )}
          {open ? (
            <div className="mt-3 border-t border-[#e8f3fb] pt-3">
              <p className="text-sm font-semibold text-[#1b3348]">{t("librarySteps", locale)}</p>
              <ol className="mt-2 space-y-2">
                {row.detail.steps.map((step, stepIndex) => (
                  <li key={step} className="flex gap-2 text-sm leading-6 text-[#2f4a60]">
                    <span className="font-bold text-[#1b3348]">{stepIndex + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-sm font-semibold leading-6 text-[#1b3348]">{row.detail.stopIf}</p>
              {onSwap && (row.detail.easierId || row.detail.harderId) ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {row.detail.easierId ? (
                    <button type="button" onClick={() => onSwap(row.detail.easierId as string)} className="rounded-full bg-[#e8f3fb] px-3 py-1.5 text-sm font-semibold text-[#1b3348]">
                      {t("libraryEasier", locale)}
                    </button>
                  ) : null}
                  {row.detail.harderId ? (
                    <button type="button" onClick={() => onSwap(row.detail.harderId as string)} className="rounded-full bg-[#e8f3fb] px-3 py-1.5 text-sm font-semibold text-[#1b3348]">
                      {t("libraryHarder", locale)}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
