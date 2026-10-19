import type { Locale } from "@/lib/i18n";
import { getAssessment, type Exercise } from "@/lib/assessments";
import { profileDoseFactor, profileReason, profileScoreDelta, type RecoveryProfile } from "@/lib/recovery-profile";

export type CoachDetail = {
  steps: string[];
  stopIf: string;
  equipment: string;
  minutes: number;
  easierId?: string;
  harderId?: string;
};

type CoachCopy = {
  en: { steps: string[]; stopIf: string; equipment: string };
  es: { steps: string[]; stopIf: string; equipment: string };
  minutes: number;
  easierId?: string;
  harderId?: string;
};

const catalog: Record<string, CoachCopy> = {
  "ankle-pumps": {
    minutes: 4,
    easierId: "calf-stretch",
    harderId: "heel-raises",
    en: {
      steps: ["Sit with the foot free.", "Point the toes, then pull them back.", "Move slowly. Rest if the ankle throbs."],
      stopIf: "Stop if pain jumps or the ankle gives way.",
      equipment: "Chair",
    },
    es: {
      steps: ["Siéntate con el pie libre.", "Apunta los dedos y luego tráelos hacia ti.", "Muévete lento. Descansa si el tobillo late."],
      stopIf: "Para si el dolor sube de golpe o el tobillo cede.",
      equipment: "Silla",
    },
  },
  "calf-stretch": {
    minutes: 4,
    easierId: "ankle-pumps",
    harderId: "heel-raises",
    en: {
      steps: ["Stand facing a wall, hands on it.", "Step one foot back and keep that heel down.", "Hold a gentle calf stretch, then switch sides."],
      stopIf: "Stop if you feel a sharp pull in the calf or heel.",
      equipment: "Wall",
    },
    es: {
      steps: ["De pie frente a una pared, manos apoyadas.", "Lleva un pie atrás y deja ese talón en el suelo.", "Sostén un estiramiento suave y cambia de lado."],
      stopIf: "Para si sientes un tirón agudo en la pantorrilla o el talón.",
      equipment: "Pared",
    },
  },
  "resistance-eversion": {
    minutes: 6,
    easierId: "ankle-pumps",
    harderId: "heel-raises",
    en: {
      steps: ["Loop a band around the forefoot.", "Turn the sole outward against the band.", "Return slowly. Keep the knee still."],
      stopIf: "Stop if the outer ankle pinches or the foot cramps.",
      equipment: "Light band",
    },
    es: {
      steps: ["Pasa una banda por el antepié.", "Gira la planta hacia afuera contra la banda.", "Vuelve lento. La rodilla quieta."],
      stopIf: "Para si el tobillo externo pincha o el pie se acalambra.",
      equipment: "Banda suave",
    },
  },
  "heel-raises": {
    minutes: 5,
    easierId: "ankle-pumps",
    harderId: "resistance-eversion",
    en: {
      steps: ["Hold a counter for balance.", "Rise onto the toes, then lower with control.", "Use both feet if one foot is unsteady."],
      stopIf: "Stop if the ankle rolls or the calf cramps.",
      equipment: "Counter",
    },
    es: {
      steps: ["Sujétate de una barra para el equilibrio.", "Súbete a las puntas y baja con control.", "Usa los dos pies si uno se siente inestable."],
      stopIf: "Para si el tobillo se tuerce o la pantorrilla se acalambra.",
      equipment: "Barra de apoyo",
    },
  },
  "heel-slides": {
    minutes: 5,
    easierId: "quad-sets",
    harderId: "mini-squats",
    en: {
      steps: ["Lie down or sit with the leg out.", "Slide the heel toward you until a gentle bend.", "Slide back out and rest the leg straight."],
      stopIf: "Stop if the knee locks, catches, or pain jumps.",
      equipment: "Bed or floor",
    },
    es: {
      steps: ["Acuéstate o siéntate con la pierna extendida.", "Desliza el talón hacia ti hasta una flexión suave.", "Vuelve a extender y deja la pierna recta."],
      stopIf: "Para si la rodilla se traba, engancha o el dolor sube.",
      equipment: "Cama o suelo",
    },
  },
  "quad-sets": {
    minutes: 4,
    easierId: "heel-slides",
    harderId: "straight-leg-raise",
    en: {
      steps: ["Leg straight. A towel under the knee is fine.", "Tighten the thigh and press the knee down.", "Hold, then fully relax before the next one."],
      stopIf: "Stop if you feel sharp pain at the kneecap.",
      equipment: "Towel, optional",
    },
    es: {
      steps: ["Pierna recta. Una toalla bajo la rodilla sirve.", "Aprieta el muslo y empuja la rodilla hacia abajo.", "Sostén y relaja del todo antes de la siguiente."],
      stopIf: "Para si hay dolor agudo en la rótula.",
      equipment: "Toalla, opcional",
    },
  },
  "mini-squats": {
    minutes: 6,
    easierId: "heel-slides",
    harderId: "straight-leg-raise",
    en: {
      steps: ["Hold a counter. Feet about hip-width.", "Bend a small amount, only where it stays comfortable.", "Stand back up. Knees track over the toes."],
      stopIf: "Stop if the knee shifts inward or pain is sharp.",
      equipment: "Counter",
    },
    es: {
      steps: ["Sujétate de una barra. Pies al ancho de la cadera.", "Flexiona poco, solo donde se sienta cómodo.", "Vuelve a subir. Las rodillas siguen los dedos."],
      stopIf: "Para si la rodilla se va hacia adentro o el dolor es agudo.",
      equipment: "Barra de apoyo",
    },
  },
  "straight-leg-raise": {
    minutes: 5,
    easierId: "quad-sets",
    harderId: "mini-squats",
    en: {
      steps: ["Lie down. Tighten the thigh first.", "Lift the straight leg a short way, then lower.", "The other knee can stay bent."],
      stopIf: "Stop if the back arches hard or the knee bends to cheat.",
      equipment: "Floor or bed",
    },
    es: {
      steps: ["Acuéstate. Aprieta el muslo primero.", "Levanta la pierna recta un poco y bájala.", "La otra rodilla puede quedar flexionada."],
      stopIf: "Para si la espalda se arquea mucho o la rodilla se dobla.",
      equipment: "Suelo o cama",
    },
  },
  "pelvic-tilt": {
    minutes: 4,
    easierId: "cat-cow",
    harderId: "bird-dog",
    en: {
      steps: ["Lie on your back, knees bent.", "Gently flatten the low back into the floor.", "Release. Keep the motion small."],
      stopIf: "Stop if pain travels down the leg.",
      equipment: "Floor",
    },
    es: {
      steps: ["Acuéstate boca arriba, rodillas flexionadas.", "Aplana con suavidad la zona lumbar contra el suelo.", "Suelta. El movimiento es pequeño."],
      stopIf: "Para si el dolor baja por la pierna.",
      equipment: "Suelo",
    },
  },
  "cat-cow": {
    minutes: 4,
    easierId: "pelvic-tilt",
    harderId: "bird-dog",
    en: {
      steps: ["On hands and knees.", "Round the back, then gently arch.", "Move with the breath. Stay in a small range."],
      stopIf: "Stop if pain travels down the leg or the wrists hurt.",
      equipment: "Floor",
    },
    es: {
      steps: ["Sobre manos y rodillas.", "Redondea la espalda y luego arquea con suavidad.", "Muévete con la respiración. Rango pequeño."],
      stopIf: "Para si el dolor baja por la pierna o duelen las muñecas.",
      equipment: "Suelo",
    },
  },
  "bird-dog": {
    minutes: 6,
    easierId: "pelvic-tilt",
    harderId: "side-bend-stretch",
    en: {
      steps: ["On hands and knees, brace the belly.", "Reach one arm and the opposite leg.", "Hold briefly, then switch. Hips stay level."],
      stopIf: "Stop if the low back pinches or you lose balance.",
      equipment: "Floor",
    },
    es: {
      steps: ["Sobre manos y rodillas, activa el abdomen.", "Estira un brazo y la pierna contraria.", "Sostén un momento y cambia. Cadera nivelada."],
      stopIf: "Para si la zona lumbar pincha o pierdes el equilibrio.",
      equipment: "Suelo",
    },
  },
  "side-bend-stretch": {
    minutes: 3,
    easierId: "pelvic-tilt",
    harderId: "bird-dog",
    en: {
      steps: ["Stand tall, one hand on the hip.", "Lean gently to the side.", "Return to center and switch."],
      stopIf: "Stop if pain shoots down the leg.",
      equipment: "None",
    },
    es: {
      steps: ["De pie, una mano en la cadera.", "Inclínate con suavidad hacia un lado.", "Vuelve al centro y cambia."],
      stopIf: "Para si el dolor dispara hacia la pierna.",
      equipment: "Ninguno",
    },
  },
  "wrist-circles": {
    minutes: 3,
    easierId: "prayer-stretch",
    harderId: "putty-squeeze",
    en: {
      steps: ["Elbow bent, hand relaxed.", "Make slow circles one way, then the other.", "Keep the circle small if it aches."],
      stopIf: "Stop if tingling increases in the fingers.",
      equipment: "None",
    },
    es: {
      steps: ["Codo flexionado, mano relajada.", "Círculos lentos hacia un lado y luego al otro.", "Haz el círculo pequeño si duele."],
      stopIf: "Para si aumenta el hormigueo en los dedos.",
      equipment: "Ninguno",
    },
  },
  "prayer-stretch": {
    minutes: 3,
    easierId: "wrist-circles",
    harderId: "flexor-stretch",
    en: {
      steps: ["Press the palms together in front of the chest.", "Lower the hands until a mild stretch.", "Hold, then bring the hands back up."],
      stopIf: "Stop if the wrist pinches or the fingers tingle more.",
      equipment: "None",
    },
    es: {
      steps: ["Junta las palmas frente al pecho.", "Baja las manos hasta un estiramiento leve.", "Sostén y vuelve a subir las manos."],
      stopIf: "Para si la muñeca pincha o aumenta el hormigueo.",
      equipment: "Ninguno",
    },
  },
  "flexor-stretch": {
    minutes: 3,
    easierId: "wrist-circles",
    harderId: "prayer-stretch",
    en: {
      steps: ["Arm straight, palm up.", "Gently draw the fingers back with the other hand.", "Hold, then switch arms."],
      stopIf: "Stop if pain is sharp at the inner elbow or wrist.",
      equipment: "None",
    },
    es: {
      steps: ["Brazo recto, palma hacia arriba.", "Lleva los dedos hacia atrás con la otra mano, con suavidad.", "Sostén y cambia de brazo."],
      stopIf: "Para si el dolor es agudo en la cara interna del codo o la muñeca.",
      equipment: "Ninguno",
    },
  },
  "putty-squeeze": {
    minutes: 5,
    easierId: "wrist-circles",
    harderId: "flexor-stretch",
    en: {
      steps: ["Hold a soft ball or putty.", "Squeeze, then open the hand all the way.", "Keep the wrist in a comfortable line."],
      stopIf: "Stop if grip pain or finger tingling gets worse.",
      equipment: "Soft ball",
    },
    es: {
      steps: ["Toma una pelota blanda o masilla.", "Aprieta y luego abre la mano del todo.", "Deja la muñeca en una línea cómoda."],
      stopIf: "Para si empeora el dolor al agarrar o el hormigueo.",
      equipment: "Pelota blanda",
    },
  },
  "shoulder-rolls": {
    minutes: 3,
    easierId: "neck-rotation",
    harderId: "bodyweight-squat",
    en: {
      steps: ["Sit or stand tall.", "Roll the shoulders up, back, and down.", "Then reverse the direction."],
      stopIf: "Stop if the shoulder pinches at the top.",
      equipment: "None",
    },
    es: {
      steps: ["Siéntate o ponte de pie, alto.", "Rueda los hombros arriba, atrás y abajo.", "Luego invierte la dirección."],
      stopIf: "Para si el hombro pincha arriba.",
      equipment: "Ninguno",
    },
  },
  "hip-flexor-stretch": {
    minutes: 4,
    easierId: "shoulder-rolls",
    harderId: "bodyweight-squat",
    en: {
      steps: ["Half-kneel, hold a chair if you need it.", "Tuck the pelvis and shift forward a little.", "You should feel the front of the hip, not the knee on the floor."],
      stopIf: "Stop if the kneeling knee hurts or the low back pinches.",
      equipment: "Chair, optional",
    },
    es: {
      steps: ["Media rodilla, sujétate de una silla si hace falta.", "Mete la pelvis y avanza un poco.", "Debes sentir el frente de la cadera, no la rodilla en el suelo."],
      stopIf: "Para si duele la rodilla apoyada o pincha la zona lumbar.",
      equipment: "Silla, opcional",
    },
  },
  "neck-rotation": {
    minutes: 3,
    easierId: "shoulder-rolls",
    harderId: "hip-flexor-stretch",
    en: {
      steps: ["Sit tall, shoulders down.", "Turn the head slowly to one side.", "Return to center, then the other side."],
      stopIf: "Stop if you feel dizziness, numbness, or a sharp catch.",
      equipment: "Chair",
    },
    es: {
      steps: ["Siéntate alto, hombros abajo.", "Gira la cabeza lento hacia un lado.", "Vuelve al centro y luego al otro lado."],
      stopIf: "Para si hay mareo, adormecimiento o un enganche agudo.",
      equipment: "Silla",
    },
  },
  "bodyweight-squat": {
    minutes: 6,
    easierId: "hip-flexor-stretch",
    harderId: "shoulder-rolls",
    en: {
      steps: ["Stand in front of a chair.", "Sit back until you lightly touch the chair.", "Stand up. Use your hands on the chair if you need them."],
      stopIf: "Stop if a joint feels unstable or pain is sharp.",
      equipment: "Chair",
    },
    es: {
      steps: ["De pie frente a una silla.", "Siéntate hacia atrás hasta rozar la silla.", "Levántate. Apoya las manos en la silla si lo necesitas."],
      stopIf: "Para si una articulación se siente inestable o el dolor es agudo.",
      equipment: "Silla",
    },
  },
};

export type RankedExercise = {
  exercise: Exercise;
  detail: CoachDetail;
  dose: string;
  reasons: string[];
  score: number;
  today: boolean;
  paused: boolean;
  prescribed: boolean;
};

function detailFor(id: string, locale: Locale): CoachDetail {
  const row = catalog[id];
  if (!row) {
    return {
      steps:
        locale === "es"
          ? ["Prepárate en una posición cómoda.", "Muévete solo en el rango que se siente seguro.", "Descansa entre series."]
          : ["Set up in a comfortable position.", "Move only through a range that feels safe.", "Rest between sets."],
      stopIf: locale === "es" ? "Para si el dolor se vuelve agudo." : "Stop if pain becomes sharp.",
      equipment: locale === "es" ? "Ninguno" : "None",
      minutes: 5,
    };
  }
  const copy = locale === "es" ? row.es : row.en;
  return {
    steps: copy.steps,
    stopIf: copy.stopIf,
    equipment: copy.equipment,
    minutes: row.minutes,
    easierId: row.easierId,
    harderId: row.harderId,
  };
}

function adjustDose(sets: string, pain: number, locale: Locale, factor = 1): string {
  const next = sets.replace(/(\d+)\s*(reps|rep)/i, (_, n: string) => {
    const count = Number(n);
    if (factor < 1) return `${Math.max(4, Math.round(count * factor))} reps`;
    if (pain <= 3) return `${count + 2} reps`;
    return `${count} reps`;
  });
  if (factor < 1) return `${next} · ${locale === "es" ? "dosis corta" : "shorter dose"}`;
  return next;
}

function buildReasons(
  locale: Locale,
  flags: { prescribed: boolean; gentle: boolean; strength: boolean; gap: boolean; fresh: boolean; pain: number; peak: number | null; goal: number }
): string[] {
  const es = locale === "es";
  const lines: string[] = [];
  if (flags.prescribed) lines.push(es ? "Tu clínico indicó este ejercicio." : "Your clinician prescribed this.");
  if (flags.pain >= 7 && flags.gentle) {
    lines.push(es ? `El dolor está en ${flags.pain}/10, así que hoy se queda suave.` : `Pain is ${flags.pain}/10, so today stays gentle.`);
  } else if (flags.pain <= 3 && flags.strength) {
    lines.push(es ? `El dolor está en ${flags.pain}/10, así que entra un ejercicio de fuerza.` : `Pain is ${flags.pain}/10, so a strength move is in today's list.`);
  } else if (flags.gap && flags.peak != null) {
    lines.push(
      es
        ? `El rango guardado es ${flags.peak}° y la meta es ${flags.goal}°.`
        : `Saved range is ${flags.peak}° and the goal is ${flags.goal}°.`
    );
  }
  if (lines.length < 2 && flags.fresh) {
    lines.push(es ? "Aún no está en tus sesiones guardadas." : "This is not in your saved sessions yet.");
  }
  if (lines.length === 0) {
    lines.push(es ? "Encaja con la zona que estás trabajando." : "It fits the joint you are working on.");
  }
  return lines.slice(0, 2);
}

export function rankExercises(input: {
  areaId: string;
  pain: number;
  latestPeak: number | null;
  goal: number;
  prescribedName?: string;
  previousIds: string[];
  locale: Locale;
  profile?: RecoveryProfile;
  swelling?: boolean;
}): RankedExercise[] {
  const assessment = getAssessment(input.areaId);
  if (!assessment) return [];

  const pain = Number.isFinite(input.pain) ? input.pain : 4;
  const goal = Math.max(1, input.goal || 90);
  const gap = input.latestPeak != null && input.latestPeak < goal * 0.9;
  const counts = input.previousIds.reduce<Record<string, number>>((acc, id) => {
    acc[id] = (acc[id] ?? 0) + 1;
    return acc;
  }, {});
  const sameName = (left: string, right?: string) => {
    const norm = (value: string) =>
      value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
        .replace(/s\b/g, "");
    if (!right) return false;
    const a = norm(left);
    const b = norm(right);
    return a === b || a.includes(b) || b.includes(a);
  };
  const prescribedName = input.prescribedName;

  const scored = assessment.exercises.map((exercise) => {
    const prescribed = sameName(exercise.name, prescribedName);
    const gentle = exercise.tags.includes("gentle") || exercise.tags.includes("mobility");
    const strength = exercise.tags.includes("strength") && !exercise.tags.includes("gentle");
    const times = counts[exercise.id] ?? 0;
    let score = 1;
    if (prescribed) score += 8;
    if (gap && (exercise.tags.includes("mobility") || exercise.tags.includes("gentle"))) score += 3;
    if (pain >= 7 && gentle) score += 4;
    if (pain >= 7 && strength) score -= 6;
    if (pain <= 3 && exercise.tags.includes("strength")) score += 3;
    if (pain > 3 && pain < 7 && gentle) score += 2;
    if (times === 0) score += 1;
    if (times >= 3 && !prescribed) score -= 2;
    score += profileScoreDelta(exercise.id, exercise.tags, input.areaId, input.profile, pain);
    const paused = pain >= 7 && strength && !prescribed;
    return { exercise, score, prescribed, gentle, strength, paused, times };
  });

  scored.sort((a, b) => {
    if (a.prescribed !== b.prescribed) return a.prescribed ? -1 : 1;
    return b.score - a.score || a.exercise.name.localeCompare(b.exercise.name);
  });

  const picked: typeof scored = [];
  const next = (match: (row: (typeof scored)[number]) => boolean) =>
    scored.find((row) => !row.paused && !picked.some((item) => item.exercise.id === row.exercise.id) && match(row));
  const prescribed = next((row) => row.prescribed);
  if (prescribed) picked.push(prescribed);
  const gentle = next((row) => row.exercise.tags.includes("gentle") || row.exercise.tags.includes("mobility"));
  if (gentle) picked.push(gentle);
  if (pain < 7) {
    const strength = next((row) => row.exercise.tags.includes("strength"));
    if (strength) picked.push(strength);
  }
  for (const row of scored) {
    if (picked.length >= 3) break;
    if (row.paused || picked.some((item) => item.exercise.id === row.exercise.id)) continue;
    picked.push(row);
  }
  const todayIds = new Set(picked.map((row) => row.exercise.id));
  const todayOrder = new Map(picked.map((row, index) => [row.exercise.id, index]));

  const ordered = [...scored].sort((a, b) => {
    const aToday = todayOrder.get(a.exercise.id);
    const bToday = todayOrder.get(b.exercise.id);
    if (aToday != null || bToday != null) return (aToday ?? 99) - (bToday ?? 99);
    return 0;
  });

  const factor = profileDoseFactor(input.profile, pain, Boolean(input.swelling));

  return ordered.map((row) => {
    const today = todayIds.has(row.exercise.id);
    const reasons = row.paused
      ? [input.locale === "es" ? `Dolor ${pain}/10. La fuerza espera.` : `Pain is ${pain}/10. Strength waits.`]
      : buildReasons(input.locale, {
          prescribed: row.prescribed,
          gentle: row.gentle,
          strength: row.strength,
          gap,
          fresh: row.times === 0,
          pain,
          peak: input.latestPeak,
          goal,
        });
    const fitted = profileReason(row.exercise.id, row.exercise.tags, input.areaId, input.profile, input.locale);
    if (fitted && !row.paused && !reasons.includes(fitted)) reasons.push(fitted);
    return {
      exercise: row.exercise,
      detail: detailFor(row.exercise.id, input.locale),
      dose: row.paused ? (input.locale === "es" ? "Pausa hoy" : "Pause today") : adjustDose(row.exercise.sets, pain, input.locale, factor),
      reasons: reasons.slice(0, 3),
      score: row.score,
      today,
      paused: row.paused && !today,
      prescribed: row.prescribed,
    };
  });
}
