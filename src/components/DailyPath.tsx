"use client";

import Link from "next/link";
import { DashPhotoLink } from "@/components/clinic/DashKit";
import { bodyAreas } from "@/lib/body-areas";
import { t, type Locale } from "@/lib/i18n";
import {
  MEASURE_METHODS,
  methodHref,
  methodImage,
  methodTextKey,
  methodTitleKey,
  prescribedMethod,
} from "@/lib/measure-method";
import type { PTPrescription } from "@/lib/users";

function StepLink({ href, step, title, text }: { href: string; step: string; title: string; text: string }) {
  return (
    <Link
      href={href}
      className="flex flex-1 flex-col justify-center rounded-[1.35rem] bg-white px-5 py-4 shadow-[0_14px_32px_rgba(27,51,72,0.07)] ring-1 ring-[#4f90c6]/12 transition hover:bg-[#f7fbfe]"
    >
      <p className="text-sm font-semibold text-[#4f90c6]">{step}</p>
      <p className="rm-serif mt-1 text-xl font-semibold text-[#1b3348]">{title}</p>
      <p className="mt-1 text-sm leading-5 text-[#2f4a60]">{text}</p>
    </Link>
  );
}

function ToolLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#1b3348] ring-1 ring-[#4f90c6]/25 transition hover:bg-[#e8f3fb]"
    >
      {label}
    </Link>
  );
}

export function DailyPath({
  locale,
  prescription,
  showOther = true,
}: {
  locale: Locale;
  prescription?: PTPrescription;
  showOther?: boolean;
}) {
  const method = prescribedMethod(prescription);
  const others = MEASURE_METHODS.filter((item) => item !== method);

  return (
    <section>
      <h2 className="rm-serif text-2xl font-semibold text-[#1b3348]">{t("dailyPathTitle", locale)}</h2>
      <p className="mt-1 text-base text-[#2f4a60]">{t("dailyPathText", locale)}</p>
      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(16rem,0.75fr)]">
        <DashPhotoLink
          href={methodHref[method]}
          src={methodImage[method]}
          kicker={`1 · ${t("stepMethod", locale)}`}
          title={t(methodTitleKey[method], locale)}
          text={t(methodTextKey[method], locale)}
          imgClassName={method === "motion" ? "object-cover object-[left_40%]" : "object-cover object-center"}
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <StepLink href="/pain-check" step={`2 · ${t("liveSession", locale)}`} title={t("stepSession", locale)} text={t("pathSessionText", locale)} />
          <StepLink href="/report" step={`3 · ${t("reportKicker", locale)}`} title={t("stepReport", locale)} text={t("stepReportText", locale)} />
        </div>
      </div>
      {showOther ? (
        <div className="mt-5">
          <p className="text-sm font-semibold text-[#2f4a60]">{t("otherTools", locale)}</p>
          <p className="mt-1 text-sm leading-6 text-[#2f4a60]">{t("otherToolsText", locale)}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {others.map((item) => (
              <ToolLink key={item} href={methodHref[item]} label={t(methodTitleKey[item], locale)} />
            ))}
            <ToolLink href="/heart" label={t("heartOptional", locale)} />
            <ToolLink href="/check-in" label={t("checkIn", locale)} />
            <ToolLink href="/charts" label={t("charts", locale)} />
            <ToolLink href="/library" label={t("exerciseLibrary", locale)} />
            <ToolLink href="/shop" label={t("shop", locale)} />
            {bodyAreas.map((area) => (
              <ToolLink key={area.id} href={`/${area.id}`} label={area.label} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
