"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import {
  getPreBriefingQuestions,
  optionLabel,
  questionText,
  summarizeCheckIn,
  type CheckInAnswers,
} from "@/lib/pre-briefing-questions";
import { todayDateString } from "@/lib/streak";
import { addNotification } from "@/lib/notifications";
import { careTeamEmails } from "@/lib/users";
import { clinicLocale, t, tf } from "@/lib/i18n";

export function PreBriefingFlow() {
  const { user, updateUser } = useAuth();
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<CheckInAnswers>({});
  const [highPain, setHighPain] = useState<number | null>(null);

  if (!user) return null;

  const locale = clinicLocale(user);
  const questions = getPreBriefingQuestions(user.injuryType);
  const current = questions[index];
  const progress = ((index + 1) / questions.length) * 100;

  function finish(finalAnswers: CheckInAnswers) {
    if (!user) return;
    const today = todayDateString();
    const summary = summarizeCheckIn(finalAnswers, locale);

    const pain = Number(finalAnswers.pain);
    const painToday = Number.isFinite(pain) ? pain : undefined;

    updateUser({
      lastCheckInDate: today,
      checkInAnswers: finalAnswers,
      painToday,
    });

    if (finalAnswers.swelling === "Noticeable" || finalAnswers.yesterday === "No / rest day") {
      for (const email of careTeamEmails(user)) {
        addNotification({
          toEmail: email,
          role: "doctor",
          title: "Daily check-in note",
          message: `${user.name}: ${summary}. Review the weekly update before the session.`,
        });
      }
    }

    if (painToday != null && painToday >= 7) {
      for (const email of careTeamEmails(user)) {
        addNotification({
          toEmail: email,
          role: "doctor",
          title: "High pain alert",
          message: `${user.name} reported pain level ${painToday}/10. Session blocked.`,
        });
      }
      setHighPain(painToday);
      return;
    }

    router.replace("/briefing");
  }

  function submitAnswer(value: string | number) {
    if (!current) return;
    const next = { ...answers, [current.id]: value };

    if (index < questions.length - 1) {
      setAnswers(next);
      setIndex((i) => i + 1);
    } else {
      finish(next);
    }
  }

  if (highPain != null) {
    return (
      <div className="mx-auto max-w-lg">
        <h2 className="rm-serif text-2xl font-semibold text-[#9a4f4f]">{t("highPain", locale)}</h2>
        <p className="mt-3 text-base leading-7 text-[#1b3348]">
          {highPain}/10. {t("restToday", locale)}
        </p>
        <Link href="/briefing" className="rm-btn rm-btn-brand mt-6 w-full rounded-full">
          {t("goToBriefing", locale)}
        </Link>
      </div>
    );
  }

  if (!current) return null;

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6 h-2 overflow-hidden rounded-full bg-[#e8f3fb]">
        <div
          className="h-full rounded-full bg-[#4f90c6] transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="text-sm font-semibold text-[#2f4a60]">
        {tf("dailyCheckIn", locale, { n: index + 1, total: questions.length })}
      </p>
      <h2 className="rm-serif mt-2 text-2xl font-semibold text-[#1b3348]">{questionText(current, locale)}</h2>

      {current.type === "scale" && (
        <div className="mt-8">
            <input
              type="range"
              min={1}
              max={5}
              value={Number(answers[current.id] ?? 3)}
              onChange={(e) =>
                setAnswers((prev) => ({ ...prev, [current.id]: Number(e.target.value) }))
              }
              className="w-full accent-brand"
            />
            <div className="mt-3 flex justify-between text-sm text-muted">
              <span>{t("scaleLow", locale)}</span>
              <span className="text-2xl font-bold text-brand-light">
                {answers[current.id] ?? 3}
              </span>
              <span>{t("scaleHigh", locale)}</span>
            </div>
            <button
              type="button"
              onClick={() => submitAnswer(Number(answers[current.id] ?? 3))}
              className="rm-btn rm-btn-brand mt-8 w-full rounded-full"
            >
              {t("continue", locale)}
            </button>
          </div>
        )}

        {current.type === "pain" && (
          <div className="mt-6">
            <p className="text-sm text-[#2f4a60]">{t("painScale", locale)}</p>
            <div className="mt-4 grid grid-cols-5 gap-3">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => submitAnswer(n)}
                  className={`flex min-h-[4.5rem] items-center justify-center rounded-[1.15rem] bg-white text-xl font-bold shadow-[0_10px_24px_rgba(27,51,72,0.06)] ring-1 ring-[#4f90c6]/12 ${
                    n <= 3 ? "text-[#3a7d62]" : n <= 6 ? "text-[#7a6548]" : "text-[#9a4f4f]"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}

        {current.type === "choice" && current.options && (
          <div className="mt-6 space-y-3">
            {current.options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => submitAnswer(option.value)}
                className="flex min-h-[4rem] w-full items-center rounded-[1.15rem] bg-[#f7fbfe] px-5 text-left text-base font-semibold text-[#1b3348] ring-1 ring-[#4f90c6]/12 transition hover:bg-[#e8f3fb]"
              >
                {optionLabel(option, locale)}
              </button>
            ))}
          </div>
        )}

      {index > 0 && (
        <button
          type="button"
          onClick={() => setIndex((i) => i - 1)}
          className="mt-6 text-sm font-medium text-brand-light hover:text-brand"
        >
          ← {t("previousQuestion", locale)}
        </button>
      )}
    </div>
  );
}
