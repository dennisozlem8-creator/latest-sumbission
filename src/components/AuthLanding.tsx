"use client";

import Link from "next/link";
import { ImpactBand } from "@/components/ImpactBand";
import { PassportBand } from "@/components/PassportBand";
import { MpuAnglePhoto, MyoWarePhoto, OverlayCard, PhonePreview, PhotoFrame, PhotoGoniometerPhoto } from "@/components/LandingMedia";
import { LandingHeader } from "@/components/LandingHeader";
import { Logo } from "@/components/Logo";
import { SessionStack } from "@/components/SessionStack";
import { TryDemoButton } from "@/components/TryDemoButton";
import { useClinicLocale } from "@/components/useClinicLocale";
import { SectionKicker } from "@/components/SectionKicker";
import { ExerciseFigure } from "@/components/ExerciseFigure";
import { t, tf } from "@/lib/i18n";

type AuthLandingProps = {
  mode: "login" | "register";
};

function SectionIntro({ kicker, title, text }: { kicker: string; title: string; text: string }) {
  return (
    <div className="max-w-3xl">
      <SectionKicker>{kicker}</SectionKicker>
      <h2 className="rm-serif mt-4 text-3xl font-semibold leading-tight text-[#1b3348] sm:text-[2.35rem]">{title}</h2>
      <p className="mt-2 max-w-2xl text-base leading-7 text-[#1b3348] sm:text-lg sm:leading-8">{text}</p>
    </div>
  );
}

export function AuthLanding({ mode }: AuthLandingProps) {
  const { locale } = useClinicLocale();
  const primaryCta = mode === "login" ? t("createAccount", locale) : t("signIn", locale);
  const primaryHref = mode === "login" ? "/register" : "/login";
  const cycle = [
    { n: "01", word: t("measure", locale), line: t("cycleMeasure", locale), color: "#9dc4b0" },
    { n: "02", word: t("coach", locale), line: t("cycleCoach", locale), color: "#7eb3d9" },
    { n: "03", word: t("reportWord", locale), line: t("cycleReport", locale), color: "#4f90c6" },
    { n: "04", word: t("improve", locale), line: t("cycleImprove", locale), color: "#3a7d62" },
  ] as const;
  const ways = [
    {
      title: t("wayPhotoTitle", locale),
      text: t("wayPhotoText", locale),
      photo: true,
    },
    {
      title: t("wayMotionTitle", locale),
      text: t("wayMotionText", locale),
      mpu: true,
    },
    {
      title: t("wayMuscleTitle", locale),
      text: t("wayMuscleText", locale),
      myoware: true,
    },
  ];

  return (
    <div className="min-h-full overflow-x-clip bg-background text-foreground">
      <a
        href="/login"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:shadow"
      >
        {t("skipToSignIn", locale)}
      </a>
      <LandingHeader mode={mode} />

      <main>
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute -left-28 top-0 h-64 w-64 rounded-full bg-[#4f90c6]/15 blur-3xl" />
          <div className="pointer-events-none absolute right-[-6rem] top-16 h-72 w-72 rounded-full bg-[#9dc4b0]/25 blur-3xl" />

          <div className="relative mx-auto grid w-full max-w-6xl items-center gap-5 px-4 pb-8 pt-5 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(18rem,0.95fr)] lg:gap-6 lg:pb-10 lg:pt-8">
            <div className="lg:col-start-1 lg:row-start-1">
              <p className="inline-flex items-center gap-2 rounded-full bg-[#1b3348] px-3 py-1.5 text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-white">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[#7eb3d9]" />
                {t("heroKicker", locale)}
              </p>
              <h1 className="rm-serif mt-4 max-w-3xl text-[1.85rem] font-semibold leading-[1.08] text-foreground sm:text-4xl lg:text-5xl">
                {t("heroTitle", locale)}
              </h1>
              <p className="mt-3 max-w-xl text-[0.95rem] leading-6 text-body sm:text-base sm:leading-7">
                {t("heroText", locale)}
              </p>
            </div>
            <PhotoFrame
              src="/images/landing-hero-face.jpg"
              alt={t("sameSessionPhone", locale)}
              imgClassName="object-cover object-[center_28%]"
              className="aspect-[4/3] rounded-[1.6rem] shadow-[0_18px_40px_rgba(27,51,72,0.12)] lg:col-start-2 lg:row-span-2 lg:row-start-1"
            >
              <div className="absolute bottom-3 right-3 w-[62%] max-w-[15.5rem] rounded-2xl bg-white p-3.5 shadow-[0_14px_32px_rgba(27,51,72,0.16)] sm:bottom-4 sm:right-4 sm:p-4">
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[#8aa0b3]">
                  {t("passportOverlayKicker", locale)}
                </p>
                <p className="rm-serif mt-1 text-[2.6rem] font-semibold leading-none text-[#1b3348] sm:text-5xl">76</p>
                <p className="mt-1 text-xs leading-4 text-[#5d7386] sm:text-sm">{t("passportOverlayNote", locale)}</p>
                <p className="mt-1 text-[0.68rem] leading-4 text-[#3d7eb4]">{t("scoreMeaning", locale)}</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e6eef5]" aria-hidden>
                  <div className="h-full w-[76%] rounded-full bg-[#4f90c6]" />
                </div>
              </div>
            </PhotoFrame>
            <div className="lg:col-start-1 lg:row-start-2">
              <p className="text-sm font-semibold text-[#3d7eb4]">{t("heroRoles", locale)}</p>
              <div className="mt-3 flex max-w-xl flex-col gap-2.5 sm:flex-row sm:items-stretch">
                <Link
                  href={primaryHref}
                  className="inline-flex h-14 items-center justify-center gap-2.5 rounded-full bg-brand px-8 text-[1.05rem] font-semibold text-white shadow-[0_10px_24px_rgba(79,144,198,0.28)] transition hover:bg-brand-light sm:h-auto sm:min-h-[5.5rem] sm:flex-1"
                >
                  {mode === "login" ? t("heroCreate", locale) : t("signIn", locale)}
                  <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
                    <rect x="4.25" y="4.25" width="15.5" height="15.5" rx="3" />
                    <path d="M12 8.5v7M8.5 12h7" strokeLinecap="round" />
                  </svg>
                </Link>
                <div className="flex flex-col gap-2 sm:w-[15.5rem]">
                  <TryDemoButton className="inline-flex h-11 items-center justify-center rounded-full border-2 border-[#4f90c6] bg-white px-5 text-sm font-semibold text-[#1b3348] transition hover:bg-[#e8f3fb] sm:flex-1" />
                  <TryDemoButton
                    role="doctor"
                    className="inline-flex h-11 items-center justify-center rounded-full border-2 border-[#4f90c6] bg-white px-5 text-sm font-semibold text-[#1b3348] transition hover:bg-[#e8f3fb] sm:flex-1"
                  />
                  <TryDemoButton
                    role="caregiver"
                    className="inline-flex h-11 items-center justify-center rounded-full border-2 border-[#4f90c6] bg-white px-5 text-sm font-semibold text-[#1b3348] transition hover:bg-[#e8f3fb] sm:flex-1"
                  />
                </div>
              </div>
              <ul className="mt-4 flex flex-wrap gap-2">
                {[t("heroPillCamera", locale), t("heroPillMotion", locale), t("heroPillMuscle", locale)].map((pill) => (
                  <li key={pill} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#5d7386] ring-1 ring-[#d5e4ef]">
                    {pill}
                  </li>
                ))}
              </ul>
              <p className="mt-2 max-w-xl text-sm leading-5 text-[#2f4a60]">{t("heroOneMethod", locale)}</p>
              <p className="mt-2 text-xs font-semibold text-[#5d7386]">{t("heroPillLanguage", locale)}</p>
              <Link href="/story" className="mt-3 inline-flex text-sm font-semibold text-[#1b3348] underline decoration-[#4f90c6]/50 underline-offset-4">
                {t("storyLink", locale)}
              </Link>
            </div>
          </div>
        </section>

        <ImpactBand locale={locale} />

        <PassportBand locale={locale} />

        <section id="how-it-works" className="scroll-mt-20 bg-[#1b3348] text-white">
          <div className="mx-auto grid w-full max-w-6xl items-start lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
            <div className="flex flex-col justify-center px-4 py-8 sm:px-6 lg:sticky lg:top-20 lg:self-start lg:px-8 lg:py-10">
              <SectionKicker tone="dark">{t("guidedOnDevice", locale)}</SectionKicker>
              <h2 className="rm-serif mt-4 text-3xl font-semibold leading-[1.1] sm:text-4xl">
                {t("sessionsAtHome", locale)}
              </h2>
              <p className="mt-3 max-w-md text-sm leading-6 text-white/80 sm:text-base">
                {t("sessionsAtHomeText", locale)}
              </p>
              <ol className="relative mt-6 space-y-4 border-l border-white/20 pl-5" aria-label="Measure, Coach, Report, Improve">
                {cycle.map((item) => (
                  <li key={item.word} className="relative">
                    <span
                      aria-hidden
                      className="absolute -left-[1.54rem] top-1.5 h-3 w-3 rounded-full ring-4 ring-[#1b3348]"
                      style={{ background: item.color }}
                    />
                    <p className="text-sm font-semibold">{item.word}</p>
                    <p className="text-sm leading-5 text-white/70">{item.line}</p>
                  </li>
                ))}
              </ol>
            </div>
            <div className="px-4 pb-6 sm:px-6 lg:px-8 lg:py-6">
              <SessionStack locale={locale} />
            </div>
          </div>
        </section>

        <section id="sensors" className="scroll-mt-20 bg-white">
          <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
            <SectionIntro
              kicker={t("methodKicker", locale)}
              title={t("methodTitle", locale)}
              text={t("methodText", locale)}
            />
            <div className="mt-5 grid gap-3 lg:grid-cols-3">
              {ways.map((item, index) => (
                <OverlayCard
                  key={item.title}
                  kicker={`0${index + 1}`}
                  title={item.title}
                  text={item.text}
                  media={
                    item.photo ? (
                      <PhotoGoniometerPhoto className="absolute inset-0 h-full w-full" />
                    ) : item.mpu ? (
                      <MpuAnglePhoto className="absolute inset-0 h-full w-full" />
                    ) : (
                      <MyoWarePhoto className="absolute inset-0 h-full w-full" />
                    )
                  }
                />
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="scroll-mt-20 bg-[#e8f3fb] py-6 lg:py-8">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <div className="overflow-hidden rounded-[1.75rem] bg-white/80 p-4 shadow-[0_16px_40px_rgba(27,51,72,0.06)] ring-1 ring-[#4f90c6]/12 sm:p-5">
              <SectionIntro
                kicker={t("whatYouUse", locale)}
                title={t("insideTheApp", locale)}
                text={t("insideTheAppText", locale)}
              />
              <p className="mt-2 text-sm font-bold text-[#3d7eb4] lg:hidden">{t("slideSideways", locale)}</p>
              <div className="mt-3 flex snap-x snap-mandatory items-stretch gap-3 overflow-x-auto pb-1 lg:grid lg:grid-cols-4 lg:overflow-visible">
                <div className="flex w-[78%] shrink-0 snap-start flex-col lg:w-auto">
                  <div className="mb-2 min-h-[4.75rem]">
                    <p className="text-xs font-extrabold text-[#4f90c6]">01</p>
                    <p className="text-base font-bold text-[#1b3348]">{t("screenQ1", locale)}</p>
                    <p className="text-sm leading-5 text-[#2f4a60]">{t("screenA1", locale)}</p>
                  </div>
                <PhonePreview title={t("previewBriefing", locale)}>
                  <div className="flex h-full flex-col">
                    <div className="relative h-24 shrink-0">
                      <PhotoFrame src="/images/landing-exercise.webp" alt="" className="absolute inset-0 h-full w-full" />
                      <span className="absolute left-2.5 top-2.5 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-[#1b3348]">
                        {t("previewToday", locale)}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col px-3 py-2.5">
                      <p className="text-xs font-semibold text-[#2f4a60]">{t("todaysPrescription", locale)}</p>
                      <p className="mt-0.5 text-base font-semibold leading-snug">{t("previewKneeExtension", locale)}</p>
                      <p className="mt-0.5 text-sm text-muted">{t("previewSetsPhoto", locale)}</p>
                      <div className="mt-auto flex items-center justify-between pt-2">
                        <span className="text-xs font-medium text-muted">{t("passportFeedsPhoto", locale)}</span>
                        <span className="rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white">{t("previewStart", locale)}</span>
                      </div>
                    </div>
                  </div>
                </PhonePreview>
                </div>
                <div className="flex w-[78%] shrink-0 snap-start flex-col lg:w-auto">
                  <div className="mb-2 min-h-[4.75rem]">
                    <p className="text-xs font-extrabold text-[#4f90c6]">02</p>
                    <p className="text-base font-bold text-[#1b3348]">{t("screenQ2", locale)}</p>
                    <p className="text-sm leading-5 text-[#2f4a60]">{t("screenA2", locale)}</p>
                  </div>
                <PhonePreview title={t("previewSession", locale)}>
                  <div className="flex h-full flex-col">
                    <div className="relative h-24 shrink-0">
                      <MpuAnglePhoto alt="" className="absolute inset-0 h-full w-full" imgClassName="object-cover object-[left_40%]" />
                      <span className="absolute left-2.5 top-2.5 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-[#1b3348]">
                        {t("previewLive", locale)}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col px-3 py-2.5">
                      <p className="rm-serif text-3xl font-semibold leading-none">78 deg</p>
                      <p className="mt-1 text-sm text-muted">{t("previewLiveMotion", locale)}</p>
                      <div className="mt-auto flex items-center gap-1.5 pt-2">
                        <span className="h-2 w-2 rounded-full bg-brand" />
                        <span className="h-2 w-2 rounded-full bg-brand" />
                        <span className="h-2 w-2 rounded-full bg-[#d7e8f6]" />
                        <span className="ml-auto text-xs font-medium text-muted">{tf("previewRepOf", locale, { n: 2, total: 3 })}</span>
                      </div>
                    </div>
                  </div>
                </PhonePreview>
                </div>
                <div className="flex w-[78%] shrink-0 snap-start flex-col lg:w-auto">
                  <div className="mb-2 min-h-[4.75rem]">
                    <p className="text-xs font-extrabold text-[#4f90c6]">03</p>
                    <p className="text-base font-bold text-[#1b3348]">{t("screenQ3", locale)}</p>
                    <p className="text-sm leading-5 text-[#2f4a60]">{t("screenA3", locale)}</p>
                  </div>
                  <PhonePreview title={t("previewPassport", locale)}>
                    <div className="flex h-full flex-col px-3 py-2.5">
                      <p className="text-xs font-semibold text-[#2f4a60]">{t("previewThisWeek", locale)}</p>
                      <p className="mt-0.5 text-base font-semibold">{t("previewPassport", locale)}</p>
                      <p className="rm-serif mt-2 text-4xl font-semibold leading-none tabular-nums">{t("previewPassportScore", locale)}</p>
                      <p className="mt-1 text-sm text-muted">{t("passportOf100", locale)}</p>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e8f3fb]">
                        <span className="block h-full w-[76%] rounded-full bg-[#4f90c6]" />
                      </div>
                      <p className="mt-2 text-sm font-semibold text-[#1b3348]">{t("previewVelocity", locale)}</p>
                      <p className="mt-auto pt-2 text-xs text-muted">{t("previewSharedClinician", locale)}</p>
                    </div>
                  </PhonePreview>
                </div>
                <div className="flex w-[78%] shrink-0 snap-start flex-col lg:w-auto">
                  <div className="mb-2 min-h-[4.75rem]">
                    <p className="text-xs font-extrabold text-[#4f90c6]">04</p>
                    <p className="text-base font-bold text-[#1b3348]">{t("screenQ4", locale)}</p>
                    <p className="text-sm leading-5 text-[#2f4a60]">{t("screenA4", locale)}</p>
                  </div>
                  <PhonePreview title={t("reportWord", locale)}>
                    <div className="flex h-full flex-col px-3 py-2.5">
                      <p className="text-xs font-semibold text-[#2f4a60]">{t("reportWord", locale)}</p>
                      <p className="rm-serif mt-1 text-4xl font-semibold leading-none">{t("previewPassportScore", locale)}</p>
                      <p className="mt-1 text-xs text-muted">{t("reportShared", locale)}</p>
                      <div className="mt-2 space-y-1.5">
                        <div className="flex items-center justify-between rounded-lg bg-[#f7fbfe] px-2.5 py-1.5">
                          <span className="text-xs font-medium text-muted">{t("previewKneeExtension", locale)}</span>
                          <span className="text-sm font-semibold">78 deg</span>
                        </div>
                        <div className="flex items-center justify-between rounded-lg bg-[#f7fbfe] px-2.5 py-1.5">
                          <span className="text-xs font-medium text-muted">{t("painBefore", locale)}</span>
                          <span className="text-sm font-semibold">2 / 10</span>
                        </div>
                        <div className="flex items-center justify-between rounded-lg bg-[#f7fbfe] px-2.5 py-1.5">
                          <span className="text-xs font-medium text-muted">{t("repsCompleted", locale)}</span>
                          <span className="text-sm font-semibold">{tf("previewRepOf", locale, { n: 2, total: 3 })}</span>
                        </div>
                      </div>
                      <p className="mt-auto pt-2 text-xs font-bold text-[#3a7d62]">{t("clinicianReady", locale)}</p>
                    </div>
                  </PhonePreview>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="library" className="scroll-mt-20 bg-[#e8f3fb]">
          <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
            <div className="overflow-hidden rounded-[1.75rem] bg-white shadow-[0_18px_40px_rgba(27,51,72,0.08)] ring-1 ring-[#4f90c6]/15">
              <div className="grid lg:grid-cols-[minmax(17rem,0.82fr)_minmax(0,1.18fr)]">
                <div className="border-b border-[#e8f3fb] p-6 sm:p-8 lg:border-b-0 lg:border-r">
                  <SectionKicker>{t("libraryKicker", locale)}</SectionKicker>
                  <h2 className="rm-serif mt-4 text-3xl font-semibold leading-tight text-[#1b3348] sm:text-[2.35rem]">
                    {t("libraryTitle", locale)}
                  </h2>
                  <p className="mt-3 text-base leading-7 text-[#2f4a60]">{t("libraryText", locale)}</p>
                  <ol className="mt-6 space-y-3">
                    {[t("libraryPoint1", locale), t("libraryPoint2", locale), t("libraryPoint3", locale)].map((line, index) => (
                      <li key={line} className="flex gap-3 text-sm leading-6 text-[#1b3348]">
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#e8f3fb] text-xs font-bold text-[#1b3348]">
                          {index + 1}
                        </span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ol>
                  <p className="mt-6 text-sm leading-6 text-[#2f4a60]">{t("librarySampleNote", locale)}</p>
                  <Link
                    href={primaryHref}
                    className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-brand px-6 text-base font-bold text-white"
                  >
                    {primaryCta}
                  </Link>
                </div>
                <div className="bg-[#f7fbfe] p-5 sm:p-7">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#4f90c6]">{t("librarySampleKicker", locale)}</p>
                      <p className="rm-serif mt-1 text-2xl font-semibold text-[#1b3348]">{t("librarySampleTitle", locale)}</p>
                    </div>
                    <p className="text-sm font-semibold text-[#2f4a60]">{t("librarySampleMeta", locale)}</p>
                  </div>
                  <div className="mt-4 overflow-hidden rounded-[1.25rem] bg-white ring-1 ring-[#4f90c6]/12">
                    {[
                      ["01", "heel-slides", t("librarySample1Name", locale), t("librarySample1Meta", locale), t("librarySample1Why", locale)],
                      ["02", "quad-sets", t("librarySample2Name", locale), t("librarySample2Meta", locale), t("librarySample2Why", locale)],
                      ["03", "mini-squats", t("librarySample3Name", locale), t("librarySample3Meta", locale), t("librarySample3Why", locale)],
                    ].map(([n, figure, name, meta, why], index) => (
                      <article
                        key={n}
                        className={`grid grid-cols-[5.5rem_1fr] items-center gap-3 p-3 sm:grid-cols-[7.5rem_1fr] sm:gap-4 sm:p-4 ${index > 0 ? "border-t border-[#e8f3fb]" : ""}`}
                      >
                        <div className="h-20 overflow-hidden rounded-xl bg-[#f4f9fc] sm:h-24">
                          <ExerciseFigure id={figure} title={name} className="h-full w-full" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                            <p className="text-xs font-bold tabular-nums text-[#4f90c6]">{n}</p>
                            <h3 className="rm-serif text-xl font-semibold leading-tight text-[#1b3348]">{name}</h3>
                          </div>
                          <p className="mt-1 text-sm font-semibold text-[#1b3348]">{meta}</p>
                          <p className="mt-1 text-sm leading-6 text-[#2f4a60]">{why}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#f7fbfe]">
          <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
            <div className="grid items-center overflow-hidden rounded-[1.75rem] bg-white shadow-[0_16px_36px_rgba(27,51,72,0.08)] lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
              <div className="p-6 sm:p-8">
                <SectionKicker>{t("kidsQuest", locale)}</SectionKicker>
                <h2 className="rm-serif mt-4 text-3xl font-semibold leading-tight text-[#1b3348] sm:text-[2.35rem]">
                  {t("kidsBandTitle", locale)}
                </h2>
                <div className="mt-5">
                  <Link href="/kids" className="inline-flex h-11 items-center justify-center rounded-full bg-brand px-5 text-sm font-bold text-white">
                    {t("open", locale)} {t("kidsQuest", locale)}
                  </Link>
                </div>
              </div>
              <PhotoFrame
                src="/images/landing-kids-meadow.jpg"
                alt={t("kidsQuest", locale)}
                imgClassName="object-cover object-center"
                className="min-h-[16rem] lg:min-h-[20rem]"
              />
            </div>
          </div>
        </section>
      </main>

      <section className="bg-[#1b3348] text-center text-white">
        <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
          <h2 className="rm-serif text-3xl font-semibold leading-tight sm:text-4xl">{t("closeLoopTitle", locale)}</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/80 sm:text-base">{t("closeLoopText", locale)}</p>
          <div className="mt-6 flex justify-center">
            <Link
              href={primaryHref}
              className="inline-flex h-12 min-w-[14rem] items-center justify-center rounded-full bg-brand px-8 text-base font-bold text-white shadow-[0_12px_28px_rgba(79,144,198,0.34)]"
            >
              {primaryCta}
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--border)] bg-[#f7fbfe]">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Logo size={36} showText={false} compact />
              <span className="font-semibold tracking-tight">Revive Motion</span>
            </div>
            <p className="mt-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-brand-light">
              Measure : Coach : Report : Improve
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm font-medium text-muted">
            <a href="#passport" className="hover:text-foreground">
              {t("passportNav", locale)}
            </a>
            <a href="#impact" className="hover:text-foreground">
              {t("impactNav", locale)}
            </a>
            <a href="#how-it-works" className="hover:text-foreground">
              {t("howItWorks", locale)}
            </a>
            <a href="#sensors" className="hover:text-foreground">
              {t("photoAndSensors", locale)}
            </a>
            <a href="#features" className="hover:text-foreground">
              {t("features", locale)}
            </a>
            <a href="#library" className="hover:text-foreground">
              {t("libraryNav", locale)}
            </a>
            <Link href="/kids" className="hover:text-foreground">
              {t("kidsQuest", locale)}
            </Link>
          </div>
          <Link href={primaryHref} className="inline-flex h-11 items-center justify-center rounded-full bg-brand px-5 text-sm font-bold text-white">
            {primaryCta}
          </Link>
        </div>
      </footer>
    </div>
  );
}
