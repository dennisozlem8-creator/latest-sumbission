"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { useClinicLocale } from "./useClinicLocale";
import { t } from "@/lib/i18n";

export function TryDemoButton({
  role = "patient",
  className,
}: {
  role?: "patient" | "doctor" | "caregiver";
  className?: string;
}) {
  const { enterDemo } = useAuth();
  const router = useRouter();
  const { locale } = useClinicLocale();

  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        enterDemo(role);
        router.replace(role === "patient" ? "/briefing" : role === "caregiver" ? "/doctor/weekly" : "/doctor");
      }}
    >
      {role === "doctor" ? t("tryClinicianDemo", locale) : role === "caregiver" ? t("tryCaregiverDemo", locale) : t("tryDemo", locale)}
    </button>
  );
}
