"use client";

import { DashCard, DashIntro, DashPainMeter, DashShell } from "@/components/clinic/DashKit";
import { useAuth } from "@/components/AuthProvider";
import { addNotification } from "@/lib/notifications";
import { careTeamEmails } from "@/lib/users";
import { t } from "@/lib/i18n";

export default function PainCheckPage() {
  const { user, updateUser } = useAuth();

  if (!user) return null;

  const locale = user.language ?? "en";

  function selectPain(level: number) {
    if (!user) return;
    updateUser({ painToday: level });

    if (level >= 7) {
      for (const email of careTeamEmails(user)) {
        addNotification({
          toEmail: email,
          role: "doctor",
          title: "High pain alert",
          message: `${user.name} reported pain level ${level}/10. Session blocked.`,
        });
      }
      return;
    }

    window.location.href = "/session";
  }

  return (
    <DashShell nav={false} wide={false}>
      <DashIntro kicker="Before the session" title={t("beforeWeStart", locale)} text={t("painQuestion", locale)} />
      <p className="mt-2 text-sm text-[#2f4a60]">{t("painScale", locale)}</p>
      <DashCard className="mt-6 p-5 sm:p-6">
        <DashPainMeter value={user.painToday} />
      </DashCard>
      <div className="mt-6 grid grid-cols-5 gap-3">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => selectPain(n)}
            className={`flex min-h-[4.5rem] items-center justify-center rounded-[1.15rem] bg-white text-xl font-bold shadow-[0_10px_24px_rgba(27,51,72,0.06)] ring-1 ring-[#4f90c6]/12 transition hover:-translate-y-0.5 ${
              n <= 3 ? "text-[#3a7d62]" : n <= 6 ? "text-[#7a6548]" : "text-[#9a4f4f]"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      {user.painToday !== undefined && user.painToday >= 7 ? (
        <DashCard className="mt-8 p-6">
          <h2 className="text-lg font-bold text-[#9a4f4f]">{t("highPain", locale)}</h2>
          <p className="mt-2 text-base leading-7 text-[#1b3348]">{t("restToday", locale)}</p>
        </DashCard>
      ) : null}
      {user.painToday !== undefined && user.painToday < 7 ? (
        <p className="mt-8 text-center text-base font-semibold text-[#3a7d62]">
          {user.painToday}/10 — {t("okToExercise", locale)}
        </p>
      ) : null}
    </DashShell>
  );
}
