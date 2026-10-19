"use client";

import { useAuth } from "@/components/AuthProvider";
import { clinicLocale } from "@/lib/i18n";
import {
  AGE_BANDS,
  HISTORY_FLAGS,
  INJURY_STAGES,
  SEX_OPTIONS,
  WORK_SETTINGS,
  profileLabel,
  type AgeBand,
  type HistoryFlag,
  type InjuryStage,
  type RecoveryProfile,
  type Sex,
  type WorkSetting,
} from "@/lib/recovery-profile";
import type { User } from "@/lib/users";

function Chip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
        active ? "bg-[#1b3348] text-white" : "bg-white text-[#1b3348] ring-1 ring-[#4f90c6]/25"
      }`}
    >
      {label}
    </button>
  );
}

export function RecoveryProfileCard({ user }: { user: User }) {
  const { updateUser } = useAuth();
  const locale = clinicLocale(user);
  const es = locale === "es";
  const profile = user.recoveryProfile ?? {};

  function save(next: RecoveryProfile) {
    updateUser({ recoveryProfile: next });
  }

  function toggleHistory(flag: HistoryFlag) {
    const history = profile.history ?? [];
    save({
      ...profile,
      history: history.includes(flag) ? history.filter((item) => item !== flag) : [...history, flag],
    });
  }

  return (
    <section className="rounded-[1.5rem] bg-white p-5 shadow-[0_14px_32px_rgba(27,51,72,0.07)] ring-1 ring-[#4f90c6]/12 sm:p-6">
      <h2 className="rm-serif text-2xl font-semibold text-[#1b3348]">{es ? "Tu perfil" : "Your profile"}</h2>
      <p className="mt-1 text-sm leading-6 text-[#2f4a60]">
        {es
          ? "La lista de hoy usa esto junto con el dolor, el rango guardado y el plan del clínico. Se queda en este dispositivo."
          : "Today’s list uses this with your pain, saved range, and the clinician’s plan. It stays on this device."}
      </p>

      <div className="mt-4 space-y-4">
        <div>
          <p className="text-sm font-semibold text-[#1b3348]">{es ? "Edad" : "Age"}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {AGE_BANDS.map((band) => (
              <Chip
                key={band}
                active={profile.ageBand === band}
                label={profileLabel("age", band, locale)}
                onClick={() => save({ ...profile, ageBand: band as AgeBand })}
              />
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-[#1b3348]">{es ? "Sexo" : "Sex"}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {SEX_OPTIONS.map((sex) => (
              <Chip
                key={sex}
                active={profile.sex === sex}
                label={profileLabel("sex", sex, locale)}
                onClick={() => save({ ...profile, sex: sex as Sex })}
              />
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-[#1b3348]">{es ? "Dónde se carga el cuerpo" : "Where the day loads you"}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {WORK_SETTINGS.map((work) => (
              <Chip
                key={work}
                active={profile.work === work}
                label={profileLabel("work", work, locale)}
                onClick={() => save({ ...profile, work: work as WorkSetting })}
              />
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-[#1b3348]">{es ? "Etapa" : "Stage"}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {INJURY_STAGES.map((stage) => (
              <Chip
                key={stage}
                active={profile.stage === stage}
                label={profileLabel("stage", stage, locale)}
                onClick={() => save({ ...profile, stage: stage as InjuryStage })}
              />
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-[#1b3348]">{es ? "Historial" : "History"}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {HISTORY_FLAGS.map((flag) => (
              <Chip
                key={flag}
                active={(profile.history ?? []).includes(flag)}
                label={profileLabel("history", flag, locale)}
                onClick={() => toggleHistory(flag)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
