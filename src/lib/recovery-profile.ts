import type { Locale } from "./i18n";
import type { InjuryType, User } from "./users";

export type AgeBand = "under-18" | "18-39" | "40-64" | "65-plus";
export type Sex = "female" | "male" | "unspecified";
export type WorkSetting = "desk" | "standing" | "lifting" | "driving" | "sport" | "home";
export type InjuryStage = "new" | "rebuilding" | "returning";
export type HistoryFlag = "surgery" | "fall" | "sprain" | "bone";

export type RecoveryProfile = {
  ageBand?: AgeBand;
  sex?: Sex;
  work?: WorkSetting;
  stage?: InjuryStage;
  history?: HistoryFlag[];
};

export const AGE_BANDS: AgeBand[] = ["under-18", "18-39", "40-64", "65-plus"];
export const SEX_OPTIONS: Sex[] = ["female", "male", "unspecified"];
export const WORK_SETTINGS: WorkSetting[] = ["desk", "standing", "lifting", "driving", "sport", "home"];
export const INJURY_STAGES: InjuryStage[] = ["new", "rebuilding", "returning"];
export const HISTORY_FLAGS: HistoryFlag[] = ["surgery", "fall", "sprain", "bone"];

const SUPPORTED = new Set(["heel-slides", "quad-sets", "ankle-pumps", "wrist-circles", "pelvic-tilt", "shoulder-rolls", "prayer-stretch"]);
const FLOOR_HARD = new Set(["bird-dog", "cat-cow", "straight-leg-raise", "bodyweight-squat"]);

const WORK_BOOST: Record<WorkSetting, Record<string, string[]>> = {
  desk: {
    wrist: ["wrist-circles", "prayer-stretch", "flexor-stretch"],
    "lower-back": ["pelvic-tilt", "cat-cow"],
    knee: ["heel-slides", "quad-sets"],
    other: ["shoulder-rolls", "neck-rotation"],
  },
  standing: {
    ankle: ["ankle-pumps", "heel-raises", "calf-stretch"],
    knee: ["quad-sets", "mini-squats", "heel-slides"],
    "lower-back": ["pelvic-tilt", "bird-dog"],
  },
  lifting: {
    "lower-back": ["bird-dog", "pelvic-tilt"],
    knee: ["quad-sets", "mini-squats"],
    ankle: ["heel-raises", "resistance-eversion"],
  },
  driving: {
    "lower-back": ["pelvic-tilt", "cat-cow"],
    knee: ["heel-slides", "quad-sets"],
    other: ["hip-flexor-stretch", "neck-rotation"],
  },
  sport: {
    knee: ["mini-squats", "straight-leg-raise", "heel-slides"],
    ankle: ["resistance-eversion", "heel-raises"],
    wrist: ["putty-squeeze", "wrist-circles"],
  },
  home: {
    knee: ["heel-slides", "quad-sets"],
    "lower-back": ["pelvic-tilt"],
    ankle: ["ankle-pumps", "heel-raises"],
    other: ["bodyweight-squat", "hip-flexor-stretch"],
  },
};

const copy = {
  en: {
    age: { "under-18": "Under 18", "18-39": "18–39", "40-64": "40–64", "65-plus": "65 or older" },
    sex: { female: "Female", male: "Male", unspecified: "Prefer not to say" },
    work: {
      desk: "Desk and screens",
      standing: "On your feet",
      lifting: "Lifting and trades",
      driving: "Driving",
      sport: "Sport",
      home: "Home tasks",
    },
    workProblem: {
      desk: "Long sitting loads the neck, wrists, and low back.",
      standing: "Hours on your feet load the ankles, knees, and low back.",
      lifting: "Carrying and bending load the back and knees.",
      driving: "A vehicle seat loads the hips and low back.",
      sport: "The plan has to get you back to the activity, not only off the couch.",
      home: "The goal is getting up, carrying, and moving through the house.",
    },
    stage: { new: "New or flared", rebuilding: "Rebuilding", returning: "Returning to activity" },
    history: { surgery: "Recent surgery", fall: "A fall", sprain: "Repeat sprain", bone: "Bone health" },
    injury: { knee: "Knee", ankle: "Ankle", elbow: "Elbow", wrist: "Wrist", other: "Other joint" },
  },
  es: {
    age: { "under-18": "Menor de 18", "18-39": "18–39", "40-64": "40–64", "65-plus": "65 o más" },
    sex: { female: "Mujer", male: "Hombre", unspecified: "Prefiero no decirlo" },
    work: {
      desk: "Escritorio y pantallas",
      standing: "De pie",
      lifting: "Carga y oficios",
      driving: "Conducir",
      sport: "Deporte",
      home: "Tareas de casa",
    },
    workProblem: {
      desk: "Estar sentado carga el cuello, las muñecas y la zona lumbar.",
      standing: "Horas de pie cargan tobillos, rodillas y zona lumbar.",
      lifting: "Cargar y agacharse carga la espalda y las rodillas.",
      driving: "El asiento del vehículo carga las caderas y la zona lumbar.",
      sport: "El plan tiene que devolverte a la actividad, no solo al sofá.",
      home: "La meta es levantarse, cargar y moverse por la casa.",
    },
    stage: { new: "Nuevo o inflamado", rebuilding: "Reconstruyendo", returning: "Volviendo a la actividad" },
    history: { surgery: "Cirugía reciente", fall: "Una caída", sprain: "Esguince repetido", bone: "Salud ósea" },
    injury: { knee: "Rodilla", ankle: "Tobillo", elbow: "Codo", wrist: "Muñeca", other: "Otra zona" },
  },
} as const;

export function profileLabel(
  group: "age" | "sex" | "work" | "stage" | "history" | "injury",
  id: string,
  locale: Locale
) {
  const table = copy[locale][group] as Record<string, string>;
  return table[id] ?? id;
}

export function workProblem(work: WorkSetting, locale: Locale) {
  return copy[locale].workProblem[work];
}

const AGE_SET = new Set<string>(AGE_BANDS);
const SEX_SET = new Set<string>(SEX_OPTIONS);
const WORK_SET = new Set<string>(WORK_SETTINGS);
const STAGE_SET = new Set<string>(INJURY_STAGES);
const HISTORY_SET = new Set<string>(HISTORY_FLAGS);

export function parseRecoveryProfile(raw: unknown): RecoveryProfile | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const row = raw as Record<string, unknown>;
  const profile: RecoveryProfile = {};
  if (typeof row.ageBand === "string" && AGE_SET.has(row.ageBand)) profile.ageBand = row.ageBand as AgeBand;
  if (typeof row.sex === "string" && SEX_SET.has(row.sex)) profile.sex = row.sex as Sex;
  if (typeof row.work === "string" && WORK_SET.has(row.work)) profile.work = row.work as WorkSetting;
  if (typeof row.stage === "string" && STAGE_SET.has(row.stage)) profile.stage = row.stage as InjuryStage;
  if (Array.isArray(row.history)) {
    const history = row.history.filter((item): item is HistoryFlag => typeof item === "string" && HISTORY_SET.has(item));
    if (history.length) profile.history = [...new Set(history)];
  }
  if (!profile.ageBand && !profile.sex && !profile.work && !profile.stage && !profile.history?.length) return undefined;
  return profile;
}

export function profileScoreDelta(
  exerciseId: string,
  tags: string[],
  areaId: string,
  profile: RecoveryProfile | undefined,
  pain: number
) {
  if (!profile) return 0;
  let delta = 0;
  const strength = tags.includes("strength") && !tags.includes("gentle");
  const older = profile.ageBand === "65-plus";
  const younger = profile.ageBand === "under-18";
  const history = profile.history ?? [];
  const cautious = history.includes("surgery") || history.includes("fall") || history.includes("bone") || older;

  if (profile.work && (WORK_BOOST[profile.work][areaId] ?? []).includes(exerciseId)) delta += 3;
  if (older && SUPPORTED.has(exerciseId)) delta += 2;
  if (cautious && FLOOR_HARD.has(exerciseId)) delta -= 3;
  if (younger && strength && pain > 4) delta -= 2;
  if (profile.stage === "new" && strength) delta -= 4;
  if (profile.stage === "returning" && pain <= 4 && strength) delta += 2;
  if (history.includes("sprain") && areaId === "ankle" && (exerciseId === "resistance-eversion" || exerciseId === "heel-raises") && pain < 6) {
    delta += 3;
  }
  if (history.includes("sprain") && areaId === "knee" && (exerciseId === "quad-sets" || exerciseId === "heel-slides")) delta += 2;
  return delta;
}

export function profileDoseFactor(profile: RecoveryProfile | undefined, pain: number, swelling = false) {
  let factor = pain >= 7 || swelling ? 0.6 : 1;
  if (!profile) return factor;
  if (profile.ageBand === "65-plus" || profile.ageBand === "under-18") factor *= 0.8;
  if (profile.stage === "new") factor = Math.min(factor, 0.7);
  if ((profile.history ?? []).includes("surgery") || (profile.history ?? []).includes("fall")) factor = Math.min(factor, 0.75);
  return factor;
}

export function profileReason(
  exerciseId: string,
  tags: string[],
  areaId: string,
  profile: RecoveryProfile | undefined,
  locale: Locale
) {
  if (!profile) return null;
  const es = locale === "es";
  const history = profile.history ?? [];
  if (history.includes("sprain") && (exerciseId === "resistance-eversion" || exerciseId === "quad-sets" || exerciseId === "heel-slides")) {
    return es ? "Hay esguinces previos, así que entra el control antes que el rango." : "Past sprains, so control comes before more range.";
  }
  if (profile.work && (WORK_BOOST[profile.work][areaId] ?? []).includes(exerciseId)) {
    const work = profileLabel("work", profile.work, locale).toLowerCase();
    return es ? `Encaja con tu día: ${work}.` : `It fits your day: ${work}.`;
  }
  if (profile.ageBand === "65-plus" && SUPPORTED.has(exerciseId)) {
    return es ? "A esta edad se queda con apoyo, no en el suelo." : "At this age it stays supported, not on the floor.";
  }
  if (profile.stage === "new" && (tags.includes("gentle") || tags.includes("mobility"))) {
    return es ? "La lesión es nueva o está inflamada, así que hoy es suave." : "The injury is new or flared, so today stays gentle.";
  }
  if ((history.includes("surgery") || history.includes("fall")) && SUPPORTED.has(exerciseId)) {
    return es ? "Después de cirugía o una caída, el movimiento empieza apoyado." : "After surgery or a fall, the motion starts supported.";
  }
  return null;
}

export function planBrief(user: User, locale: Locale, pain: number, peak: number | null, goal: number) {
  const es = locale === "es";
  const profile = user.recoveryProfile;
  const lines: string[] = [];
  const injury = profileLabel("injury", user.injuryType, locale);
  if (!profile?.ageBand && !profile?.work && !profile?.stage) {
    lines.push(
      es
        ? "Agrega edad, trabajo e historial para que la lista siga tu día, no solo la articulación."
        : "Add age, work, and history so the list follows your day, not only the joint."
    );
  }
  if (profile?.stage) {
    lines.push(
      es
        ? `${injury}, etapa ${profileLabel("stage", profile.stage, locale).toLowerCase()}.`
        : `${injury}, stage ${profileLabel("stage", profile.stage, locale).toLowerCase()}.`
    );
  } else {
    lines.push(es ? `Zona: ${injury}.` : `Joint: ${injury}.`);
  }
  if (profile?.ageBand) {
    lines.push(es ? `Edad ${profileLabel("age", profile.ageBand, locale)}.` : `Age ${profileLabel("age", profile.ageBand, locale)}.`);
  }
  if (profile?.work) {
    lines.push(workProblem(profile.work, locale));
  }
  if (profile?.history?.length) {
    const names = profile.history.map((flag) => profileLabel("history", flag, locale).toLowerCase()).join(", ");
    lines.push(es ? `Historial en cuenta: ${names}.` : `History on file: ${names}.`);
  }
  lines.push(
    peak != null
      ? es
        ? `Dolor ${pain}/10. Pico guardado ${peak}° de una meta de ${goal}°.`
        : `Pain ${pain}/10. Saved peak ${peak}° of a ${goal}° goal.`
      : es
        ? `Dolor ${pain}/10. Aún no hay un pico guardado. La meta es ${goal}°.`
        : `Pain ${pain}/10. No saved peak yet. The goal is ${goal}°.`
  );
  if (profile?.sex && profile.sex !== "unspecified") {
    lines.push(
      es
        ? `Sexo en el perfil: ${profileLabel("sex", profile.sex, locale).toLowerCase()}. La lista sigue la lesión, la edad, el trabajo y el historial. No hay un catálogo distinto por sexo.`
        : `Sex on the profile: ${profileLabel("sex", profile.sex, locale).toLowerCase()}. The list follows injury, age, work, and history. There is not a separate catalog by sex.`
    );
  }
  const swelling = user.checkInAnswers?.swelling;
  if (typeof swelling === "string" && /noticeable|yes/i.test(swelling)) {
    lines.push(es ? "El registro de hoy marca hinchazón, así que la dosis baja." : "Today’s check-in marks swelling, so the dose stays short.");
  }
  return lines;
}

export function injuryLabel(injury: InjuryType, locale: Locale) {
  return profileLabel("injury", injury, locale);
}
