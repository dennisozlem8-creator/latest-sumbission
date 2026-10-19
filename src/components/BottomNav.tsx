"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { clinicLocale, t } from "@/lib/i18n";
import { isCareTeam } from "@/lib/users";

const patientTabs = [
  { href: "/briefing", key: "home" as const, icon: HomeIcon },
  { href: "/charts", key: "charts" as const, icon: ChartIcon },
  { href: "/dashboard", key: "care" as const, icon: CareIcon },
  { href: "/recover-ai", key: "ai" as const, icon: CoachIcon },
];

const doctorTabs = [
  { href: "/doctor", key: "home" as const, icon: HomeIcon },
  { href: "/doctor/weekly", key: "week" as const, icon: ChartIcon },
  { href: "/pt-update", key: "care" as const, icon: CareIcon },
  { href: "/recover-ai", key: "ai" as const, icon: CoachIcon },
];

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" strokeLinejoin="round" />
    </svg>
  );
}
function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 19h16M7 16V9M12 16V5M17 16v-6" strokeLinecap="round" />
    </svg>
  );
}
function CareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="8" r="3" />
      <path d="M5 19c.8-3.2 3.5-5 7-5s6.2 1.8 7 5" strokeLinecap="round" />
    </svg>
  );
}
function CoachIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
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

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-40 border-t pb-[env(safe-area-inset-bottom)] print:hidden ${
        care
          ? "border-[#2a332c] bg-[#2a332c] text-[#f7f3ea]"
          : "border-[var(--border)] bg-white/95 backdrop-blur-md"
      }`}
    >
      <div className="mx-auto flex w-full max-w-lg items-stretch justify-between gap-1 px-1.5 py-1.5">
        {tabs.map((tab) => {
          const active = tab.href === "/doctor" ? pathname === "/doctor" : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-2xl px-1 py-2 text-center text-[11px] font-semibold transition ${
                active
                  ? care
                    ? "bg-[#f4efe6] text-[#2a332c]"
                    : "bg-[#e8f3fb] text-[#1b3348]"
                  : care
                    ? "text-[#f7f3ea]/80 hover:text-[#f7f3ea]"
                    : "text-[#2f4a60] hover:text-[#1b3348]"
              }`}
            >
              <Icon />
              <span>{t(tab.key, locale)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
