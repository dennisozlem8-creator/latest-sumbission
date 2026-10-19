"use client";

import { useEffect, useRef, useState } from "react";
import { DashCard, DashIntro, DashRing, DashShell, DashStat } from "@/components/clinic/DashKit";
import { useAuth } from "@/components/AuthProvider";
import { calculateStreak, lastDaysActive } from "@/lib/streak";
import { coachStarterAnswer, getCoachResponse, type CoachStarter } from "@/lib/chat-bot";
import { t, type CopyKey } from "@/lib/i18n";
import { loadMeasurements } from "@/lib/goniometer";
import { progressSnapshot } from "@/lib/recovery-plan";
import { TodayPlan } from "@/components/ExerciseLibrary";
import { RecoveryProfileCard } from "@/components/RecoveryProfileCard";
import { planBrief } from "@/lib/recovery-profile";

type Message = { role: "user" | "assistant"; text: string };

export default function RecoverAIPage() {
  const { user } = useAuth();
  const [report, setReport] = useState("");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!user) return null;

  const locale = user.language ?? "en";
  const es = locale === "es";
  const prescription = user.ptPrescription;
  const streak = calculateStreak(user);
  const clips = loadMeasurements(user.email);
  const progress = progressSnapshot(clips, user.targetRom || 100);
  const brief = planBrief(user, locale, user.painToday ?? 3, progress.latestPeak, user.targetRom || 100);
  const greeting = es
    ? "Soy la guía de Recover AI. La lista de hoy usa tu edad, tu trabajo, la etapa, el historial, el dolor y el rango guardado. No es un diagnóstico."
    : "I'm the Recover AI guide. Today's list uses your age, work, stage, history, pain, and saved range. It is not a diagnosis.";
  const thread: Message[] = [{ role: "assistant", text: greeting }, ...messages];
  const week = lastDaysActive(user, 7);
  const weekPct = Math.round((week.filter((d) => d.active).length / 7) * 100);
  const currentRom = progress.latestPeak ?? user.baselineRom;
  const trajectoryPct = Math.min(
    100,
    Math.round(((currentRom - user.baselineRom) / Math.max(1, user.targetRom - user.baselineRom)) * 100)
  );

  function generateReport() {
    if (!user) return;
    const sessions = user.exerciseHistory.length;
    const prompt = `Patient completed ${sessions} sessions. Streak ${streak} days. ROM from ${user.baselineRom} to goal ${user.targetRom}. Pain ${user.painToday ?? 3}/10.`;
    const suffix = locale === "es" ? " Responde en español." : " recovery recommendation";
    setReport(getCoachResponse(prompt + suffix, user));
  }

  const starters: { key: CoachStarter; label: CopyKey }[] = [
    { key: "today", label: "coachQToday" },
    { key: "pain", label: "coachQPain" },
    { key: "score", label: "coachQScore" },
    { key: "clinic", label: "coachQClinic" },
  ];

  function askStarter(key: CoachStarter, label: string) {
    if (!user) return;
    const answer = coachStarterAnswer(key, user, locale, progress.latestPeak, progress.firstPeak);
    setMessages((prev) => [...prev, { role: "user", text: label }, { role: "assistant", text: answer }]);
  }

  function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;

    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");

    setTimeout(() => {
      if (!user) return;
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: getCoachResponse(text, user, { firstPeak: progress.firstPeak, latestPeak: progress.latestPeak }) },
      ]);
    }, 450);
  }

  return (
    <DashShell>
      <DashIntro
        kicker="Coach"
        title={t("recoverAI", locale)}
        text={
          es
            ? "La lista sigue la lesión, la edad, el trabajo, la etapa y el historial, junto con el dolor y el rango guardado. El sexo queda en el perfil. No hay un catálogo distinto por sexo. Esto es entrenamiento en casa, no un diagnóstico."
            : "The list follows the injury, age, work, stage, and history, along with pain and saved range. Sex stays on the profile. There is not a separate catalog by sex. This is home coaching, not a diagnosis."
        }
      />

      <div className="mt-6">
        <RecoveryProfileCard user={user} />
      </div>

      <section className="mt-6 rounded-[1.5rem] bg-white p-5 shadow-[0_14px_32px_rgba(27,51,72,0.07)] ring-1 ring-[#4f90c6]/12 sm:p-6">
        <h2 className="rm-serif text-2xl font-semibold text-[#1b3348]">{es ? "Por qué esta lista" : "Why this list"}</h2>
        <ul className="mt-3 space-y-2">
          {brief.map((line) => (
            <li key={line} className="text-sm leading-6 text-[#2f4a60]">
              {line}
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-6">
        <TodayPlan user={user} />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <DashRing value={weekPct} max={100} label="Active days this week" display={`${weekPct}%`} />
        <DashRing value={currentRom} max={user.targetRom || 100} label="Range vs goal" display={`${currentRom}°`} />
        <DashStat
          label="Change"
          value={progress.change == null ? "—" : `${progress.change > 0 ? "+" : ""}${progress.change}°`}
          hint="Since first saved clip"
        />
        <DashStat label="Streak" value={streak} hint="Days in a row" />
      </div>

        <DashCard className="mt-6 px-5 py-5">
          <div className="mb-2 flex justify-between text-sm">
            <span className="font-semibold text-[#2f4a60]">Recovery trajectory</span>
            <span className="font-semibold tabular-nums text-[#1b3348]">{trajectoryPct}%</span>
          </div>
          <div className="rm-trajectory">
            <div className="rm-trajectory-fill" style={{ width: `${trajectoryPct}%` }} />
          </div>
          <div className="mt-2 flex justify-between text-sm text-[#2f4a60]">
            <span>Start {user.baselineRom}°</span>
            <span>Goal {user.targetRom}°</span>
          </div>
        </DashCard>

        <DashCard className="mt-6 overflow-hidden">
          <div className="border-b border-[#e8f3fb] px-5 py-4">
            <h2 className="rm-serif text-2xl font-semibold text-[#1b3348]">Chat with RecoverAI</h2>
            <p className="mt-1 text-sm text-[#2f4a60]">Rehab coaching on this device — no API key needed.</p>
          </div>
          <div className="flex flex-wrap gap-2 border-b border-[#e8f3fb] px-4 py-4">
            {starters.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => askStarter(item.key, t(item.label, locale))}
                className="rounded-full bg-[#e8f3fb] px-3 py-1.5 text-left text-sm font-semibold text-[#1b3348]"
              >
                {t(item.label, locale)}
              </button>
            ))}
          </div>
          <div className="max-h-72 space-y-3 overflow-y-auto p-4">
            {thread.map((msg, i) => (
              <div
                key={i}
                className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user" ? "ml-auto bg-[#4f90c6] text-white" : "bg-[#f7fbfe] text-[#1b3348]"
                }`}
              >
                {msg.text}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          <form onSubmit={sendMessage} className="flex gap-2 border-t border-[#e8f3fb] p-4">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about pain, exercises, or range…"
              className="flex-1 rounded-xl border border-[#4f90c6]/20 bg-[#f7fbfe] px-4 py-3 text-sm outline-none focus:border-[#4f90c6]"
            />
            <button type="submit" className="rm-btn rm-btn-brand h-11 min-h-0 shrink-0 rounded-full px-5 text-sm">
              Send
            </button>
          </form>
        </DashCard>

        <button type="button" onClick={generateReport} className="rm-btn rm-btn-brand mt-6 w-full rounded-full">
          {t("getReport", locale)}
        </button>

        {report && (
          <DashCard className="mt-6 p-6">
            <h2 className="font-semibold text-[#1b3348]">{t("aiAnalysis", locale)}</h2>
            <p className="mt-3 text-base leading-7 text-[#2f4a60]">{report}</p>
          </DashCard>
        )}

        <DashCard className="mt-6 p-6">
          <h2 className="rm-serif text-2xl font-semibold text-[#1b3348]">{t("todaysPrescription", locale)}</h2>
          <p className="mt-2 text-xl font-semibold text-[#1b3348]">
            {prescription?.exerciseName ?? "Resistance Band Extension"}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              `${prescription?.sets ?? 3} Sets`,
              `${prescription?.reps ?? 10} Reps`,
              `${prescription?.holdSeconds ?? 12}s Hold`,
              `${prescription?.targetAngle ?? user.targetRom}° Target`,
            ].map((pill) => (
              <span
                key={pill}
                className="rounded-full bg-[#e8f3fb] px-3 py-2 text-center text-sm font-semibold text-[#1b3348]"
              >
                {pill}
              </span>
            ))}
          </div>
        </DashCard>
    </DashShell>
  );
}
