"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { SafePicture } from "@/components/SafePicture";
import { useAuth } from "@/components/AuthProvider";
import { isCareTeam } from "@/lib/users";

export function DashShell({
  children,
  nav = true,
  caregiver = false,
  wide = true,
}: {
  children: ReactNode;
  nav?: boolean;
  caregiver?: boolean;
  wide?: boolean;
}) {
  const { user } = useAuth();
  const care = caregiver || isCareTeam(user?.role);
  return (
    <div className={`min-h-full overflow-x-hidden ${nav ? "pb-48 sm:pb-44" : "pb-12"} ${care ? "rm-glow-caregiver" : "rm-glow-patient"}`}>
      <Header linkHome variant={care ? "caregiver" : "patient"} />
      <main className={`mx-auto w-full px-4 pb-10 sm:px-6 ${wide ? "max-w-6xl" : "max-w-2xl"}`}>{children}</main>
      {nav ? <BottomNav /> : null}
    </div>
  );
}

export function DashIntro({
  kicker,
  title,
  text,
  action,
}: {
  kicker: string;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold leading-6 text-[#2f4a60] sm:text-base">{kicker}</p>
        <h1 className="rm-serif mt-1 text-3xl font-semibold leading-tight text-[#1b3348] sm:text-[2.35rem]">{title}</h1>
        <p className="mt-2 max-w-2xl text-base leading-7 text-[#1b3348] sm:text-lg sm:leading-8">{text}</p>
      </div>
      {action}
    </div>
  );
}

export function DashCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`overflow-hidden rounded-[1.5rem] bg-white shadow-[0_14px_32px_rgba(27,51,72,0.07)] ring-1 ring-[#4f90c6]/12 ${className}`}
    >
      {children}
    </section>
  );
}

export function DashStat({
  value,
  label,
  hint,
}: {
  value: string | number;
  label: string;
  hint?: string;
}) {
  return (
    <article className="rounded-[1.35rem] bg-white p-5 shadow-[0_12px_28px_rgba(27,51,72,0.06)] ring-1 ring-[#4f90c6]/12">
      <p className="text-sm font-semibold text-[#2f4a60]">{label}</p>
      <p className="rm-serif mt-1 text-4xl font-semibold tabular-nums leading-none text-[#1b3348]">{value}</p>
      {hint ? <p className="mt-2 text-sm leading-5 text-[#2f4a60]">{hint}</p> : null}
    </article>
  );
}

export function DashRing({
  value,
  max,
  label,
  display,
  ofGoal = "of goal",
}: {
  value: number;
  max: number;
  label: string;
  display: string;
  ofGoal?: string;
}) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100));
  const r = 36;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  return (
    <article className="flex items-center gap-4 rounded-[1.35rem] bg-white p-5 shadow-[0_12px_28px_rgba(27,51,72,0.06)] ring-1 ring-[#4f90c6]/12">
      <svg viewBox="0 0 88 88" className="h-20 w-20 shrink-0" role="img" aria-label={`${label} ${display}`}>
        <circle cx="44" cy="44" r={r} fill="none" stroke="#e8f3fb" strokeWidth="8" />
        <circle
          cx="44"
          cy="44"
          r={r}
          fill="none"
          stroke="#4f90c6"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          transform="rotate(-90 44 44)"
        />
        <text x="44" y="49" textAnchor="middle" fill="#1b3348" fontSize="14" fontWeight="700">
          {display}
        </text>
      </svg>
      <div>
        <p className="text-sm font-semibold text-[#2f4a60]">{label}</p>
        <p className="mt-0.5 text-base text-[#1b3348]">{Math.round(pct)}% {ofGoal}</p>
      </div>
    </article>
  );
}

export function DashSpark({
  values,
  label,
  unit = "",
}: {
  values: number[];
  label: string;
  unit?: string;
}) {
  const width = 320;
  const height = 88;
  if (values.length === 0) {
    return (
      <div className="rounded-[1.15rem] bg-[#f7fbfe] px-4 py-6 text-sm text-[#2f4a60]">
        No readings yet. {label} will draw here after the first save.
      </div>
    );
  }
  const max = Math.max(20, ...values);
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(1, values.length - 1)) * width;
      const y = height - 10 - (value / max) * (height - 20);
      return `${x},${y}`;
    })
    .join(" ");
  const area = `0,${height} ${points} ${width},${height}`;
  return (
    <div className="rounded-[1.15rem] bg-[#f7fbfe] px-3 py-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[#2f4a60]">{label}</p>
        <p className="text-sm font-semibold tabular-nums text-[#1b3348]">
          {values[values.length - 1]}
          {unit}
        </p>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-1 h-20 w-full" role="img" aria-label={label}>
        <polygon points={area} fill="#4f90c6" opacity="0.16" />
        <polyline fill="none" stroke="#4f90c6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={points} />
      </svg>
    </div>
  );
}

export function DashPhotoLink({
  href,
  src,
  kicker,
  title,
  text,
  action,
  imgClassName = "object-cover object-center",
  className = "",
}: {
  href: string;
  src: string;
  kicker: string;
  title: string;
  text: string;
  action?: string;
  imgClassName?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`group relative isolate block min-h-[14rem] overflow-hidden rounded-[1.35rem] shadow-[0_14px_32px_rgba(27,51,72,0.1)] ${className}`}
    >
      <SafePicture src={src} alt="" className={`absolute inset-0 h-full w-full ${imgClassName}`} />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#1b3348]/85 via-[#1b3348]/25 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-5">
        <p className="text-sm font-semibold text-white/85">{kicker}</p>
        <h3 className="rm-serif mt-0.5 text-xl font-semibold leading-tight sm:text-2xl">{title}</h3>
        <p className="mt-1 text-sm leading-5 text-white/90">{text}</p>
        {action ? (
          <span className="mt-4 inline-flex h-12 items-center rounded-full bg-white px-5 text-base font-semibold text-[#1b3348]">
            {action}
            <span aria-hidden className="ml-2">
              →
            </span>
          </span>
        ) : null}
      </div>
    </Link>
  );
}

export function DashEmpty({
  title,
  text,
  href,
  action,
}: {
  title: string;
  text: string;
  href: string;
  action: string;
}) {
  return (
    <div className="px-5 py-8 text-center sm:px-8">
      <p className="rm-serif text-xl font-semibold text-[#1b3348]">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-base leading-7 text-[#2f4a60]">{text}</p>
      <Link href={href} className="rm-btn rm-btn-brand mt-5 inline-flex h-11 min-h-0 rounded-full px-6">
        {action}
      </Link>
    </div>
  );
}

export function DashHeat({ days }: { days: { date: string; active: boolean }[] }) {
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {days.map((day) => (
        <div
          key={day.date}
          title={day.date}
          className={`aspect-square rounded-md ${day.active ? "bg-[#3a7d62]" : "bg-[#e8f3fb]"}`}
        />
      ))}
    </div>
  );
}

export function DashBars({
  values,
  labels,
  goal,
}: {
  values: number[];
  labels: string[];
  goal?: number;
}) {
  if (values.length === 0) {
    return <p className="text-base text-[#2f4a60]">Complete a session to draw this chart.</p>;
  }
  const max = Math.max(goal ?? 0, ...values, 1);
  return (
    <div className="relative flex h-48 items-end gap-2">
      {goal != null ? (
        <div
          className="pointer-events-none absolute inset-x-0 border-t border-dashed border-[#3a7d62]/70"
          style={{ bottom: `${(goal / max) * 100}%` }}
        />
      ) : null}
      {values.map((value, index) => (
        <div key={`${labels[index]}-${index}`} className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <div
            className="w-full rounded-t-lg bg-gradient-to-t from-[#3d7eb4] to-[#7eb3d9]"
            style={{ height: `${Math.max(6, (value / max) * 100)}%` }}
          />
          <span className="truncate text-xs font-medium text-[#2f4a60]">{labels[index]}</span>
        </div>
      ))}
    </div>
  );
}

export function DashLoop() {
  const steps = [
    { n: "01", label: "Measure" },
    { n: "02", label: "Coach" },
    { n: "03", label: "Report" },
    { n: "04", label: "Improve" },
  ];
  return (
    <ol className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {steps.map((step) => (
        <li
          key={step.label}
          className="flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-[0_8px_20px_rgba(27,51,72,0.06)] ring-1 ring-[#4f90c6]/12"
        >
          <span className="text-sm font-bold tabular-nums text-[#4f90c6]">{step.n}</span>
          <span className="text-sm font-semibold text-[#1b3348]">{step.label}</span>
        </li>
      ))}
    </ol>
  );
}

export function DashHero({
  src,
  kicker,
  title,
  text,
  imgClassName = "object-cover object-center",
}: {
  src: string;
  kicker: string;
  title: string;
  text?: string;
  imgClassName?: string;
}) {
  return (
    <div className="relative isolate min-h-[12rem] overflow-hidden rounded-[1.5rem] shadow-[0_14px_32px_rgba(27,51,72,0.1)] sm:min-h-[16rem]">
      <SafePicture src={src} alt="" className={`absolute inset-0 h-full w-full ${imgClassName}`} />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#1b3348]/88 via-[#1b3348]/28 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-7">
        <p className="text-sm font-semibold text-white/85">{kicker}</p>
        <h2 className="rm-serif mt-1 text-3xl font-semibold leading-tight sm:text-4xl">{title}</h2>
        {text ? <p className="mt-1 max-w-xl text-sm leading-6 text-white/90 sm:text-base">{text}</p> : null}
      </div>
    </div>
  );
}

export function DashPainMeter({ value, max = 10 }: { value: number | null | undefined; max?: number }) {
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full">
        {Array.from({ length: max }, (_, index) => {
          const n = index + 1;
          const tone = n <= 3 ? "bg-[#3a7d62]" : n <= 6 ? "bg-[#c4a15a]" : "bg-[#9a4f4f]";
          const on = value != null && n <= value;
          return <div key={n} className={`flex-1 ${tone} ${on ? "opacity-100" : "opacity-25"}`} />;
        })}
      </div>
      <div className="mt-2 flex justify-between text-sm font-semibold text-[#2f4a60]">
        <span>Low</span>
        <span>OK to move</span>
        <span>Rest today</span>
      </div>
      {value != null ? (
        <p className="rm-serif mt-3 text-4xl font-semibold tabular-nums text-[#1b3348]">{value}/{max}</p>
      ) : (
        <p className="mt-3 text-base text-[#2f4a60]">No score logged yet.</p>
      )}
    </div>
  );
}
