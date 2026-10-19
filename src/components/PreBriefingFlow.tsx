"use client";

import { useState } from "react";
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

  if (!user) return null;

  const locale = clinicLocale(user);
  const questions = getPreBriefingQuestions(user.injuryType);
  const current = questions[index];
  const progress = ((index + 1) / questions.length) * 100;

  function finish(finalAnswers: CheckInAnswers) {
    if (!user) return;
    const today = todayDateString();
    const summary = summarizeCheckIn(finalAnswers, locale);

    updateUser({
      lastCheckInDate: today,
      checkInAnswers: finalAnswers,
      painToday: undefined,
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
