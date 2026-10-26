import type { InjuryType } from "./users";
import type { Locale } from "./i18n";
import { doingWellLabel } from "./i18n";

export type LocalizedText = { en: string; es: string };

export type PreBriefingQuestion = {
  id: string;
  text: LocalizedText;
  type: "scale" | "choice" | "pain";
  options?: { value: string; label: LocalizedText }[];
};

const choice = (value: string, en: string, es: string) => ({
  value,
  label: { en, es },
});

const commonQuestions: PreBriefingQuestion[] = [
  {
    id: "sleep",
    text: { en: "How did you sleep last night?", es: "¿Cómo dormiste anoche?" },
    type: "choice",
    options: [
      choice("Great — 7+ hours", "Great — 7+ hours", "Bien — 7 horas o más"),
      choice("OK — some rest", "OK — some rest", "Regular — algo de descanso"),
      choice("Poor — disrupted", "Poor — disrupted", "Mal — sueño interrumpido"),
    ],
  },
  {
    id: "energy",
    text: { en: "Energy level right now?", es: "¿Nivel de energía ahora?" },
    type: "scale",
  },
  {
    id: "medication",
    text: { en: "Did you take prescribed medication today?", es: "¿Tomaste el medicamento indicado hoy?" },
    type: "choice",
    options: [
      choice("Yes", "Yes", "Sí"),
      choice("No", "No", "No"),
      choice("Not prescribed", "Not prescribed", "No me lo recetaron"),
    ],
  },
  {
    id: "swelling",
    text: { en: "Any swelling since yesterday?", es: "¿Hubo hinchazón desde ayer?" },
    type: "choice",
    options: [
      choice("None", "None", "Ninguna"),
      choice("Slight", "Slight", "Poca"),
      choice("Noticeable", "Noticeable", "Notable"),
    ],
  },
  {
    id: "yesterday",
    text: { en: "Did you complete yesterday's exercises?", es: "¿Completaste los ejercicios de ayer?" },
    type: "choice",
    options: [
      choice("Yes, fully", "Yes, fully", "Sí, por completo"),
      choice("Partially", "Partially", "En parte"),
      choice("No / rest day", "No / rest day", "No / día de descanso"),
    ],
  },
  {
    id: "confidence",
    text: { en: "Confidence in doing today's session?", es: "¿Confianza para la sesión de hoy?" },
    type: "scale",
  },
  {
    id: "pain",
    text: { en: "How is your pain today?", es: "¿Cómo está tu dolor hoy?" },
    type: "pain",
  },
];

const injuryQuestions: Record<InjuryType, PreBriefingQuestion[]> = {
  knee: [
    {
      id: "knee-stiffness",
      text: { en: "Morning knee stiffness today?", es: "¿Rigidez de rodilla esta mañana?" },
      type: "choice",
      options: [
        choice("None", "None", "Ninguna"),
        choice("Mild", "Mild", "Leve"),
        choice("Moderate", "Moderate", "Moderada"),
        choice("Severe", "Severe", "Severa"),
      ],
    },
    {
      id: "knee-stairs",
      text: { en: "Pain on stairs or squatting?", es: "¿Dolor en escaleras o al agacharte?" },
      type: "choice",
      options: [
        choice("No", "No", "No"),
        choice("A little", "A little", "Un poco"),
        choice("Yes, limits activity", "Yes, limits activity", "Sí, limita la actividad"),
      ],
    },
    {
      id: "knee-giving-way",
      text: { en: "Any giving-way or buckling?", es: "¿La rodilla se dobló o falló?" },
      type: "choice",
      options: [
        choice("No", "No", "No"),
        choice("Once", "Once", "Una vez"),
        choice("More than once", "More than once", "Más de una vez"),
      ],
    },
  ],
  ankle: [
    {
      id: "ankle-stiffness",
      text: { en: "Ankle stiffness when you wake up?", es: "¿Rigidez de tobillo al despertar?" },
      type: "choice",
      options: [
        choice("None", "None", "Ninguna"),
        choice("Mild", "Mild", "Leve"),
        choice("Moderate", "Moderate", "Moderada"),
        choice("Severe", "Severe", "Severa"),
      ],
    },
    {
      id: "ankle-walking",
      text: { en: "Pain while walking today?", es: "¿Dolor al caminar hoy?" },
      type: "choice",
      options: [
        choice("No", "No", "No"),
        choice("Mild", "Mild", "Leve"),
        choice("Moderate", "Moderate", "Moderado"),
        choice("Severe", "Severe", "Severo"),
      ],
    },
    {
      id: "ankle-balance",
      text: { en: "Balance on uneven ground?", es: "¿Equilibrio en terreno irregular?" },
      type: "choice",
      options: [
        choice("Steady", "Steady", "Estable"),
        choice("Slightly unsteady", "Slightly unsteady", "Un poco inestable"),
        choice("Very unsteady", "Very unsteady", "Muy inestable"),
      ],
    },
  ],
  elbow: [
    {
      id: "elbow-stiffness",
      text: { en: "Elbow stiffness this morning?", es: "¿Rigidez de codo esta mañana?" },
      type: "choice",
      options: [
        choice("None", "None", "Ninguna"),
        choice("Mild", "Mild", "Leve"),
        choice("Moderate", "Moderate", "Moderada"),
        choice("Severe", "Severe", "Severa"),
      ],
    },
    {
      id: "elbow-grip",
      text: { en: "Grip strength compared to yesterday?", es: "¿Fuerza de agarre comparada con ayer?" },
      type: "choice",
      options: [
        choice("Better", "Better", "Mejor"),
        choice("Same", "Same", "Igual"),
        choice("Weaker", "Weaker", "Más débil"),
      ],
    },
    {
      id: "elbow-lifting",
      text: { en: "Pain when lifting or reaching?", es: "¿Dolor al levantar o alcanzar?" },
      type: "choice",
      options: [
        choice("No", "No", "No"),
        choice("Light loads only", "Light loads only", "Solo cargas ligeras"),
        choice("Most movements", "Most movements", "En la mayoría de movimientos"),
      ],
    },
  ],
  wrist: [
    {
      id: "wrist-stiffness",
      text: { en: "Wrist stiffness this morning?", es: "¿Rigidez de muñeca esta mañana?" },
      type: "choice",
      options: [
        choice("None", "None", "Ninguna"),
        choice("Mild", "Mild", "Leve"),
        choice("Moderate", "Moderate", "Moderada"),
        choice("Severe", "Severe", "Severa"),
      ],
    },
    {
      id: "wrist-typing",
      text: { en: "Discomfort with typing or gripping?", es: "¿Molestia al escribir o agarrar?" },
      type: "choice",
      options: [
        choice("No", "No", "No"),
        choice("After a while", "After a while", "Después de un rato"),
        choice("Immediately", "Immediately", "De inmediato"),
      ],
    },
    {
      id: "wrist-numbness",
      text: { en: "Any numbness or tingling?", es: "¿Entumecimiento o hormigueo?" },
      type: "choice",
      options: [
        choice("No", "No", "No"),
        choice("Occasionally", "Occasionally", "A veces"),
        choice("Often", "Often", "A menudo"),
      ],
    },
  ],
  other: [
    {
      id: "other-stiffness",
      text: { en: "Stiffness in the affected area today?", es: "¿Rigidez en la zona afectada hoy?" },
      type: "choice",
      options: [
        choice("None", "None", "Ninguna"),
        choice("Mild", "Mild", "Leve"),
        choice("Moderate", "Moderate", "Moderada"),
        choice("Severe", "Severe", "Severa"),
      ],
    },
    {
      id: "other-movement",
      text: { en: "Pain with everyday movement?", es: "¿Dolor con el movimiento diario?" },
      type: "choice",
      options: [
        choice("No", "No", "No"),
        choice("A little", "A little", "Un poco"),
        choice("Yes, limits activity", "Yes, limits activity", "Sí, limita la actividad"),
      ],
    },
    {
      id: "other-confidence",
      text: { en: "Comfort moving the injured area?", es: "¿Comodidad al mover la zona lesionada?" },
      type: "choice",
      options: [
        choice("Confident", "Confident", "Con confianza"),
        choice("Somewhat", "Somewhat", "Más o menos"),
        choice("Very cautious", "Very cautious", "Muy cuidadoso"),
      ],
    },
  ],
};

export function getPreBriefingQuestions(injury: InjuryType): PreBriefingQuestion[] {
  const pain = commonQuestions.filter((question) => question.type === "pain");
  const rest = commonQuestions.filter((question) => question.type !== "pain");
  return [...rest, ...injuryQuestions[injury], ...pain];
}

export function questionText(question: PreBriefingQuestion, locale: Locale) {
  return question.text[locale];
}

export function optionLabel(option: { value: string; label: LocalizedText }, locale: Locale) {
  return option.label[locale];
}

export type CheckInAnswers = Record<string, string | number>;

export function summarizeCheckIn(answers: CheckInAnswers, locale: Locale = "en"): string {
  const flags: string[] = [];
  if (answers.sleep === "Poor — disrupted") flags.push(locale === "es" ? "mal sueño" : "poor sleep");
  if (Number(answers.energy) <= 2) flags.push(locale === "es" ? "poca energía" : "low energy");
  if (answers.swelling === "Noticeable") flags.push(locale === "es" ? "hinchazón" : "swelling");
  if (answers.yesterday === "No / rest day") flags.push(locale === "es" ? "ayer no entrenó" : "missed yesterday");
  if (Number(answers.confidence) <= 2) flags.push(locale === "es" ? "poca confianza" : "low confidence");
  if (Number(answers.pain) >= 7) flags.push(locale === "es" ? "dolor alto" : "high pain");
  return flags.length ? flags.join(", ") : doingWellLabel(locale);
}
