import type { Locale } from "@/lib/i18n";
import type { User } from "@/lib/users";

export type CoachStarter = "today" | "pain" | "score" | "clinic";

export function coachStarterAnswer(
  key: CoachStarter,
  user: User,
  locale: Locale,
  latestPeak: number | null,
  firstPeak: number | null = null
): string {
  const es = locale === "es";
  const name = user.name.split(" ")[0];
  const exercise = user.ptPrescription?.exerciseName ?? (es ? "el ejercicio prescrito" : "the prescribed exercise");
  const sets = user.ptPrescription?.sets ?? 3;
  const reps = user.ptPrescription?.reps ?? 10;
  const pain = user.painToday ?? 3;
  const goal = user.targetRom || 100;
  const peak = latestPeak != null ? `${latestPeak}°` : es ? "aún sin lectura" : "no reading yet";
  const from = firstPeak != null ? `${firstPeak}°` : `${user.baselineRom}°`;

  if (key === "today") {
    return es
      ? `${name}, hoy empieza con ${exercise}. ${sets} series de ${reps}. Usa solo el método que indicó tu clínico, luego comparte el informe.`
      : `${name}, start with ${exercise}. ${sets} sets of ${reps}. Use only the method your clinician prescribed, then share the report.`;
  }
  if (key === "pain") {
    return es
      ? pain >= 7
        ? `${name}, el dolor está en ${pain}/10. Hoy solo movimientos suaves. La fuerza espera. Para si el dolor se vuelve agudo.`
        : `${name}, el dolor está en ${pain}/10, así que el plan de hoy puede incluir fuerza después del movimiento suave. Para si el dolor se vuelve agudo.`
      : pain >= 7
        ? `${name}, pain is ${pain}/10. Today stays gentle. Strength waits. Stop if pain turns sharp.`
        : `${name}, pain is ${pain}/10, so today’s plan can include strength after the gentle move. Stop if pain turns sharp.`;
  }
  if (key === "score") {
    return es
      ? `${name}, 76 es el Pasaporte de recuperación de la muestra: sesiones de esta semana, rango hacia la meta y velocidad. No es un diagnóstico. El rango guardado pasó de ${from} a ${peak}. La meta es ${goal}°.`
      : `${name}, 76 is the sample Recovery Passport: sessions this week, range toward the goal, and velocity. It is not a diagnosis. Saved range moved from ${from} to ${peak}. The goal is ${goal}°.`;
  }
  return es
    ? `${name}, tu clínico abre el mismo Pasaporte. Ve ${exercise}, el dolor de hoy (${pain}/10) y el rango de ${from} a ${peak}, con meta de ${goal}°.`
    : `${name}, your clinician opens the same Passport. They see ${exercise}, today’s pain (${pain}/10), and range from ${from} to ${peak}, with a goal of ${goal}°.`;
}

const faq: { keywords: string[]; answer: string }[] = [
  {
    keywords: ["streak", "days in a row"],
    answer:
      "Your streak counts consecutive days you complete exercises or quests. Visit your Dashboard to see your current streak. Do at least one session each day to keep it going!",
  },
  {
    keywords: ["ankle", "sprain"],
    answer:
      "For ankle recovery, start with gentle ankle pumps and calf stretches. Avoid high-impact activity until pain decreases. If swelling persists, consult your physical therapist.",
  },
  {
    keywords: ["knee", "squat"],
    answer:
      "Knee exercises like heel slides and quad sets help restore range of motion. Mini squats can build strength once pain allows. Stop if you feel sharp pain.",
  },
  {
    keywords: ["back", "lower back", "spine"],
    answer:
      "Lower back care often includes pelvic tilts, cat-cow stretches, and core stability work like bird dogs. Avoid heavy lifting during acute pain.",
  },
  {
    keywords: ["wrist", "hand", "typing"],
    answer:
      "Wrist recovery benefits from gentle circles, flexor stretches, and grip strengthening. Take breaks from repetitive typing every 20–30 minutes.",
  },
  {
    keywords: ["elbow", "tennis"],
    answer:
      "Elbow rehab focuses on gradual loading and eccentric exercises. Use a brace during activity if recommended, and ice after sessions if swollen.",
  },
  {
    keywords: ["mpu", "6050", "uno", "elegoo", "motion sensor", "gyroscope", "accel", "i2c", "scan none"],
    answer:
      "No I2C means Bluetooth is open and the MPU-6050 did not answer. VCC to 3.3V, GND to GND, SCL to A5, SDA to A4. HC-05 TXD to pin 0, RXD to pin 1. Power the Uno from a phone charger. Chrome → Connect with Bluetooth → pick HC-05.",
  },
  {
    keywords: ["rom", "range of motion", "sensor", "heart", "bpm", "polar", "bluetooth"],
    answer:
      "For joint angle, use Photo Goniometer or the Bluetooth MPU-6050 (Motion page → Connect with Bluetooth → HC-05). For heart rate, pair a Bluetooth strap. Polar H9/H10, Wahoo TICKR, Coospo, and Magene work over Bluetooth. Apple Watch usually does not.",
  },
  {
    keywords: ["myoware", "myo ware", "emg", "muscle", "env", "wireless", "bluetooth"],
    answer:
      "Program the MyoWare Wireless Shield in Arduino IDE as ESP32 Dev Module with wireless-myoware.ino. Unplug the cable, snap it onto the muscle sensor, POWER SOURCE VBAT, POWER ON. Chrome → Muscle sensor → Connect with Bluetooth → MyoWareSensor1.",
  },
  {
    keywords: ["goniometer", "photo", "angle", "hip", "mark"],
    answer:
      "Open Photo Goniometer. Check the setup list first, then record a side-view video. The coach scores form, tells you the next sets to do, and saves a trend your doctor can review. A still photo still works. It is not a medical diagnosis.",
  },
  {
    keywords: ["pain", "hurt", "sore"],
    answer:
      "Mild soreness after exercises can be normal. Sharp or worsening pain is a sign to stop and rest. Rate your pain during assessments so we can adjust exercises.",
  },
  {
    keywords: ["how often", "frequency", "daily", "times per week"],
    answer:
      "Most rehab programs suggest exercises 3–5 days per week, or daily for gentle mobility work. Follow your recommended plan and keep your streak alive!",
  },
  {
    keywords: ["kids", "quest", "game"],
    answer:
      "Kids Quest turns stretches and reps into a colorful bot world. Open Kids Quest, pick a candy zone, and the bots count your physical therapy moves for XP.",
  },
  {
    keywords: ["doctor", "therapist", "provider"],
    answer:
      "Your doctor can monitor your progress on their dashboard when your accounts are linked. Doctors see patient streaks, sessions, and alerts on the caregiver dashboard.",
  },
  {
    keywords: ["shop", "brace", "device", "buy"],
    answer:
      "Visit the Shop from your home or dashboard to browse ankle, knee, lower back, and elbow braces designed for rehab with your Revive Motion sensor.",
  },
  {
    keywords: ["hello", "hi", "hey"],
    answer:
      "Hi! I'm the Revive Motion assistant. I can help with exercises, streaks, ROM tests, and recovery tips. What would you like to know?",
  },
  {
    keywords: ["help", "what can you"],
    answer:
      "I can answer questions about exercises, body areas (ankle, knee, back, wrist), ROM tests, streaks, kids quests, braces in the shop, and general recovery tips.",
  },
];

const fallback =
  "I'm not sure about that yet. Try asking about exercises, streaks, ROM tests, pain, or a body area like ankle or knee. For medical advice, please consult your physical therapist.";

export function getChatResponse(input: string): string {
  const message = input.toLowerCase().trim();
  if (!message) return "Type a question and I'll do my best to help!";

  for (const entry of faq) {
    if (entry.keywords.some((kw) => message.includes(kw))) {
      return entry.answer;
    }
  }

  return fallback;
}

export function getCoachResponse(
  input: string,
  user?: User | null,
  range?: { firstPeak: number | null; latestPeak: number | null }
): string {
  const message = input.toLowerCase().trim();
  if (!message) return "Tell me how you're feeling or what you'd like help with today.";

  const faqMatch = getChatResponse(input);
  if (faqMatch !== fallback) {
    if (user) {
      const first = user.name.split(" ")[0];
      return `${first}, ${faqMatch.charAt(0).toLowerCase()}${faqMatch.slice(1)}`;
    }
    return faqMatch;
  }

  if (user && (message.includes("report") || message.includes("recommendation") || message.includes("progress"))) {
    const sessions = user.exerciseHistory.length;
    const pain = user.painToday ?? 3;
    const romGap = user.targetRom - user.baselineRom;
    const first = user.name.split(" ")[0];

    if (pain >= 7) {
      return `${first}, your pain is elevated today (${pain}/10). Focus on gentle mobility only — skip strength work until pain drops below 5. Ice and rest between sessions.`;
    }
    if (sessions < 3) {
      return `${first}, you're building momentum with ${sessions} session${sessions !== 1 ? "s" : ""} so far. Stay consistent ${user.sessionDays} days per week in the ${user.sessionTime} — small daily wins add up toward your ${user.targetRom}° goal.`;
    }
    return `${first}, strong progress! You've logged ${sessions} sessions toward your ${user.injuryType} rehab. Baseline ${user.baselineRom}° → goal ${user.targetRom}° (${romGap}° to gain). Keep today's prescription and maintain your streak.`;
  }

  if (user && (message.includes("what should i do today") || message.includes("qué hago hoy") || message.includes("que hago hoy"))) {
    return coachStarterAnswer("today", user, message.includes("hoy") ? "es" : "en", range?.latestPeak ?? null, range?.firstPeak ?? null);
  }
  if (user && (message.includes("pain is high") || message.includes("dolor está alto") || message.includes("dolor esta alto"))) {
    return coachStarterAnswer("pain", user, message.includes("dolor") ? "es" : "en", range?.latestPeak ?? null, range?.firstPeak ?? null);
  }
  if (user && (message.includes("what does 76") || message.includes("significa 76"))) {
    return coachStarterAnswer("score", user, message.includes("significa") ? "es" : "en", range?.latestPeak ?? null, range?.firstPeak ?? null);
  }
  if (user && (message.includes("clinician see") || message.includes("verá mi clínico") || message.includes("vera mi clinico"))) {
    return coachStarterAnswer("clinic", user, message.includes("clínico") || message.includes("clinico") ? "es" : "en", range?.latestPeak ?? null, range?.firstPeak ?? null);
  }

  if (user && (message.includes("today") || message.includes("plan") || message.includes("exercise"))) {
    const rx = user.ptPrescription;
    const name = rx?.exerciseName ?? "your prescribed exercise";
    return `Today's focus: ${name}. Aim for ${rx?.sets ?? 3} sets × ${rx?.reps ?? 10} reps with ${rx?.holdSeconds ?? 12}s holds. Wear your sensor and stop if pain exceeds 6/10.`;
  }

  return fallback;
}
