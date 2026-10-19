"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { useClinicLocale } from "./useClinicLocale";
import { loadUsers, isCareTeam, type UserRole } from "@/lib/users";
import { todayDateString } from "@/lib/streak";
import { t, tf } from "@/lib/i18n";

type AuthFormProps = {
  mode: "login" | "register";
  defaultRole?: UserRole;
};

export function AuthForm({ mode, defaultRole = "patient" }: AuthFormProps) {
  const { login, register } = useAuth();
  const router = useRouter();
  const { locale } = useClinicLocale();
  const role = defaultRole;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [doctorEmail, setDoctorEmail] = useState("");
  const [caregiverEmail, setCaregiverEmail] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [error, setError] = useState("");

  const roleWord =
    role === "doctor" ? t("clinicianRole", locale) : role === "caregiver" ? t("caregiverRole", locale) : t("patientRole", locale);
  const roleInSentence = locale === "es" ? roleWord.toLowerCase() : roleWord.toLowerCase();

  function routeAfterAuth(nextRole: UserRole, setupComplete?: boolean, lastCheckInDate?: string) {
    if (isCareTeam(nextRole)) {
      router.replace("/doctor");
      return;
    }
    if (!setupComplete) {
      router.replace("/onboarding");
      return;
    }
    router.replace(lastCheckInDate !== todayDateString() ? "/check-in" : "/briefing");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const result =
      mode === "login"
        ? login(email, password)
        : register({
            name,
            email,
            password,
            role,
            doctorEmail: doctorEmail || undefined,
            caregiverEmail: caregiverEmail || undefined,
            notificationsEnabled,
          });

    if (result) {
      setError(result);
      return;
    }

    if (mode === "login") {
      const found = loadUsers().find((u) => u.email === email.trim().toLowerCase());
      routeAfterAuth(found?.role ?? "patient", found?.setupComplete, found?.lastCheckInDate);
      return;
    }

    routeAfterAuth(role);
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1 className="rm-serif text-xl font-semibold sm:text-2xl">
        {mode === "login"
          ? tf("roleSignIn", locale, { role: roleWord })
          : tf("createRoleAccount", locale, { role: roleInSentence })}
      </h1>
      <p className="mt-1 text-sm leading-5 text-muted">
        {mode === "login"
          ? tf("typeEmailPassword", locale, { role: roleInSentence })
          : tf("chooseEmailPassword", locale, { role: roleInSentence })}
      </p>

      <div className="mt-4 space-y-3">
        {mode === "register" && (
          <div>
            <label htmlFor="name" className="mb-1 block text-sm text-muted">
              {t("fullName", locale)}
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-background px-4 py-2.5 outline-none focus:border-brand"
              required
            />
          </div>
        )}
        <div>
          <label htmlFor="email" className="mb-1 block text-sm text-muted">
            {t("email", locale)}
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-[var(--border)] bg-background px-4 py-2.5 outline-none focus:border-brand"
            required
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm text-muted">
            {t("password", locale)}
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-[var(--border)] bg-background px-4 py-2.5 outline-none focus:border-brand"
            required
            minLength={6}
          />
        </div>
        {mode === "register" && role === "patient" && (
          <>
            <div>
              <label htmlFor="doctorEmail" className="mb-1 block text-sm text-muted">
                {t("doctorEmailOptional", locale)}
              </label>
              <input
                id="doctorEmail"
                type="email"
                value={doctorEmail}
                onChange={(e) => setDoctorEmail(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-background px-4 py-2.5 outline-none focus:border-brand"
              />
            </div>
            <div>
              <label htmlFor="caregiverEmail" className="mb-1 block text-sm text-muted">
                {t("caregiverEmailOptional", locale)}
              </label>
              <input
                id="caregiverEmail"
                type="email"
                value={caregiverEmail}
                onChange={(e) => setCaregiverEmail(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-background px-4 py-2.5 outline-none focus:border-brand"
              />
            </div>
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={(e) => setNotificationsEnabled(e.target.checked)}
                className="accent-brand"
              />
              {t("dailyReminders", locale)}
            </label>
          </>
        )}
      </div>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-full bg-brand text-sm font-medium text-white transition hover:bg-brand-light"
      >
        {mode === "login"
          ? tf("signInAsRole", locale, { role: roleInSentence })
          : tf("createRoleAccountBtn", locale, { role: roleInSentence })}
      </button>
    </form>
  );
}
