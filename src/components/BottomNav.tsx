"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { clinicLocale, t, type Locale } from "@/lib/i18n";
import { isCareTeam } from "@/lib/users";

const patientTabs = [
  { href: "/briefing", key: "navToday" as const, icon: HomeIcon },
  { href: "/goniometer", key: "navMeasure" as const, icon: MeasureIcon },
  { href: "/charts", key: "navProgress" as const, icon: ChartIcon },
  { href: "/recover-ai", key: "ai" as const, icon: CoachIcon },
];

const doctorTabs = [
  { href: "/doctor", key: "navPatients" as const, icon: CareIcon },
  { href: "/doctor/weekly", key: "week" as const, icon: ChartIcon },
  { href: "/pt-update", key: "navUpdate" as const, icon: PlanIcon },
  { href: "/recover-ai", key: "ai" as const, icon: CoachIcon },
];

const measurePaths = ["/goniometer", "/motion", "/muscle", "/heart"];

function matches(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function tabActive(pathname: string, href: string, care: boolean) {
  if (care && href === "/doctor") {
    return pathname === "/doctor" || pathname.startsWith("/doctor/patient");
  }
  if (!care && href === "/briefing") {
    return pathname === "/" || pathname === "/briefing" || pathname.startsWith("/briefing/");
  }
  if (!care && href === "/goniometer") {
    return measurePaths.some((path) => matches(pathname, path));
  }
  return matches(pathname, href);
}

function primaryAction(pathname: string, care: boolean, locale: Locale) {
  if (!care) {
    if (matches(pathname, "/session")) {
      return { href: "/goniometer", label: t("navMeasure", locale) };
    }
    return { href: "/pain-check", label: t("startSession", locale) };
  }
  if (matches(pathname, "/doctor/weekly")) {
    return { href: "/pt-update", label: t("navUpdate", locale) };
  }
  if (pathname === "/doctor" || pathname.startsWith("/doctor/patient")) {
    return { href: "/doctor/weekly", label: t("week", locale) };
  }
  return { href: "/doctor", label: t("navPatients", locale) };
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" strokeLinejoin="round" />
    </svg>
  );
}
function MeasureIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4 8h16v10H4V8Z" strokeLinejoin="round" />
      <path d="M9 8V5h6v3M8 13h2M12 13h.01M16 13h.01" strokeLinecap="round" />
    </svg>
  );
}
function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4 19h16M7 16V9M12 16V5M17 16v-6" strokeLinecap="round" />
    </svg>
  );
}
function CareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="9" cy="8" r="2.4" />
      <circle cx="16" cy="9" r="2" />
      <path d="M4.5 18.5c.6-2.6 2.6-4 5-4s4.4 1.4 5 4M14 14.6c1.6-.3 3.2.4 4.2 2.4" strokeLinecap="round" />
    </svg>
  );
}
function PlanIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M8 4h7l4 4v12H8V4Z" strokeLinejoin="round" />
      <path d="M15 4v4h4M10 13h6M10 17h4" strokeLinecap="round" />
    </svg>
  );
}
function CoachIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M5 12h14M12 5v14" strokeLinecap="round" />
      <circle cx="12" cy="12" r="8" />
    </svg>
  );
}

export function BottomNav() {
  const { user } = useAuth();
  const pathname = usePathname();
  const locale = clinicLocale(user);
  const care = isCareTeam(user?.role);
  const tabs = care ? doctorTabs : patientTabs;
  const primary = primaryAction(pathname, care, locale);

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-40 border-t pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_30px_rgba(27,51,72,0.08)] print:hidden ${
        care ? "border-[#2a332c] bg-[#2a332c] text-[#f7f3ea]" : "border-[var(--border)] bg-white"
      }`}
      aria-label={care ? t("navPatients", locale) : t("navToday", locale)}
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-3 py-2">
        <Link
          href={primary.href}
          className={`rm-btn h-14 w-full rounded-full text-base shadow-[0_8px_18px_rgba(27,51,72,0.16)] ${
            care ? "bg-[#f4efe6] text-[#2a332c] hover:bg-white" : "rm-btn-brand"
          }`}
        >
          {primary.label}
        </Link>
        <div className="flex items-stretch gap-1">
          {tabs.map((tab) => {
            const active = tabActive(pathname, tab.href, care);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-1.5 text-center text-xs font-semibold transition sm:text-sm ${
                  active
                    ? care
                      ? "bg-[#f4efe6] text-[#2a332c]"
                      : "bg-[#1b3348] text-white"
                    : care
                      ? "text-[#f7f3ea] hover:bg-white/10"
                      : "text-[#2f4a60] hover:bg-[#e8f3fb]"
                }`}
              >
                <Icon />
                <span className="leading-none">{t(tab.key, locale)}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
