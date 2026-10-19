import { GONIOMETER_KEY, type GoniometerMeasurement } from "./goniometer";
import { MYOWARE_LOG_KEY, type MyoWareRecording } from "./myoware-log";
import type { Locale } from "./i18n";
import { loadDeviceLocale } from "./i18n";
import { todayDateString } from "./streak";
import { loadUsers, saveUsers, type User } from "./users";

export const DEMO_PATIENT_EMAIL = "demo@revivemotion.ai";
export const DEMO_CLINIC_EMAIL = "clinic@revivemotion.ai";
export const DEMO_CAREGIVER_EMAIL = "care@revivemotion.ai";
export const DEMO_PASSWORD = "demo123";

export function isDemoEmail(email?: string | null) {
  return email === DEMO_PATIENT_EMAIL || email === DEMO_CLINIC_EMAIL || email === DEMO_CAREGIVER_EMAIL;
}

function daysAgo(days: number, hour = 10) {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function replaceKeyedRows<T extends { userEmail: string }>(storageKey: string, emails: string[], next: T[]) {
  const existing = (() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) ?? "[]") as T[];
    } catch {
      return [] as T[];
    }
  })();
  const kept = existing.filter((row) => !emails.includes(row.userEmail));
  localStorage.setItem(storageKey, JSON.stringify([...kept, ...next]));
}

function demoPatient(locale: Locale): User {
  const today = todayDateString();
  return {
    name: "Jordan Rivera",
    email: DEMO_PATIENT_EMAIL,
    password: DEMO_PASSWORD,
    role: "patient",
    doctorEmail: DEMO_CLINIC_EMAIL,
    caregiverEmail: DEMO_CAREGIVER_EMAIL,
    notificationsEnabled: false,
    exerciseHistory: [
      {
        areaId: "knee",
        exerciseIds: ["heel-slides"],
        completedAt: daysAgo(11, 11),
        reps: 8,
        angle: 70,
        pain: 5,
      },
      {
        areaId: "knee",
        exerciseIds: ["heel-slides"],
        completedAt: daysAgo(8, 11),
        reps: 10,
        angle: 76,
        pain: 4,
      },
      {
        areaId: "knee",
        exerciseIds: ["heel-slides", "quad-sets"],
        completedAt: daysAgo(4, 11),
        reps: 10,
        angle: 80,
        pain: 4,
      },
      {
        areaId: "knee",
        exerciseIds: ["heel-slides"],
        completedAt: daysAgo(3, 11),
        reps: 10,
        angle: 84,
        pain: 3,
      },
      {
        areaId: "knee",
        exerciseIds: ["heel-slides", "mini-squats"],
        completedAt: daysAgo(1, 11),
        reps: 10,
        angle: 90,
        pain: 3,
      },
    ],
    questProgress: { "heel-slides": true },
    xp: 50,
    activityDates: [daysAgo(11), daysAgo(9), daysAgo(8), daysAgo(4), daysAgo(3), daysAgo(2), daysAgo(1), daysAgo(0)].map((iso) => iso.split("T")[0]),
    setupComplete: true,
    pin: "",
    injuryType: "knee",
    baselineRom: 70,
    targetRom: 120,
    sessionDays: 5,
    sessionTime: "morning",
    language: locale,
    painToday: 3,
    recoveryProfile: {
      ageBand: "40-64",
      sex: "female",
      work: "standing",
      stage: "rebuilding",
      history: ["sprain"],
    },
    lastCheckInDate: today,
    checkInAnswers: {
      sleep: "OK — some rest",
      energy: 4,
      medication: "Yes",
      swelling: "None",
      yesterday: "Yes, fully",
      confidence: 4,
      "knee-stiffness": "Mild",
      "knee-stairs": "A little",
      "knee-giving-way": "No",
    },
    ptPrescription: {
      exerciseName: "Heel Slide",
      sets: 3,
      reps: 10,
      holdSeconds: 12,
      targetAngle: 100,
      notes: "Phone camera is the prescribed method. Share the session report after you measure.",
      method: "camera",
      updatedAt: daysAgo(6),
    },
  };
}

function demoCaregiver(locale: Locale): User {
  return {
    name: "Alex Rivera",
    email: DEMO_CAREGIVER_EMAIL,
    password: DEMO_PASSWORD,
    role: "caregiver",
    notificationsEnabled: false,
    exerciseHistory: [],
    questProgress: {},
    xp: 0,
    activityDates: [],
    setupComplete: true,
    pin: "",
    injuryType: "other",
    baselineRom: 0,
    targetRom: 90,
    sessionDays: 5,
    sessionTime: "morning",
    language: locale,
  };
}

function demoClinician(locale: Locale): User {
  return {
    name: "Sam Ortiz, DPT",
    email: DEMO_CLINIC_EMAIL,
    password: DEMO_PASSWORD,
    role: "doctor",
    notificationsEnabled: false,
    exerciseHistory: [],
    questProgress: {},
    xp: 0,
    activityDates: [],
    setupComplete: true,
    pin: "",
    injuryType: "other",
    baselineRom: 0,
    targetRom: 90,
    sessionDays: 5,
    sessionTime: "morning",
    language: locale,
  };
}

function demoClips(): GoniometerMeasurement[] {
  const email = DEMO_PATIENT_EMAIL;
  return [
    {
      id: "demo-photo-11",
      userEmail: email,
      date: daysAgo(11),
      exercise: "Heel Slide",
      joint: "Knee (Right)",
      angle: 70,
      note: "Prior week, first clip.",
      source: "photo",
      formScore: 70,
    },
    {
      id: "demo-photo-9",
      userEmail: email,
      date: daysAgo(9),
      exercise: "Heel Slide",
      joint: "Knee (Right)",
      angle: 74,
      note: "Prior week.",
      source: "photo",
      formScore: 74,
    },
    {
      id: "demo-photo-8",
      userEmail: email,
      date: daysAgo(8),
      exercise: "Heel Slide",
      joint: "Knee (Right)",
      angle: 76,
      note: "Prior week video.",
      source: "video",
      formScore: 76,
      minAngle: 40,
      range: 36,
    },
    {
      id: "demo-photo-4",
      userEmail: email,
      date: daysAgo(4),
      exercise: "Heel Slide",
      joint: "Knee (Right)",
      angle: 80,
      note: "First side-view photo this week.",
      source: "photo",
      formScore: 78,
    },
    {
      id: "demo-photo-3",
      userEmail: email,
      date: daysAgo(3),
      exercise: "Heel Slide",
      joint: "Knee (Right)",
      angle: 84,
      note: "Same chair and camera spot.",
      source: "photo",
      formScore: 82,
    },
    {
      id: "demo-photo-2",
      userEmail: email,
      date: daysAgo(2),
      exercise: "Heel Slide",
      joint: "Knee (Right)",
      angle: 88,
      note: "Still photo after warm-up.",
      source: "photo",
      formScore: 84,
    },
    {
      id: "demo-photo-1",
      userEmail: email,
      date: daysAgo(1),
      exercise: "Heel Slide",
      joint: "Knee (Right)",
      angle: 90,
      note: "Clear side view.",
      source: "photo",
      formScore: 86,
    },
    {
      id: "demo-photo-0",
      userEmail: email,
      date: daysAgo(0, 11),
      exercise: "Heel Slide",
      joint: "Knee (Right)",
      angle: 92,
      note: "Still photo for the clinician.",
      source: "photo",
      formScore: 88,
      nextAction: "Do the prescribed Heel Slide sets, then save the session report.",
    },
    {
      id: "demo-motion-0",
      userEmail: email,
      date: daysAgo(0, 9),
      exercise: "Heel Slide",
      joint: "Knee (Right)",
      angle: 78,
      minAngle: 12,
      range: 66,
      durationSec: 18,
      note: "Live MPU reading while moving — different from the still photo.",
      source: "motion",
      formScore: 80,
    },
  ];
}

function demoMuscle(): MyoWareRecording[] {
  const samples = Array.from({ length: 20 }, (_, i) => ({
    time: i * 0.4,
    emg: 90 + Math.round(Math.sin(i / 3) * 80 + (i === 12 ? 240 : 0)),
  }));
  return [
    {
      id: "demo-myoware-0",
      userEmail: DEMO_PATIENT_EMAIL,
      date: daysAgo(0, 10),
      deviceName: "MyoWare 2.0 demo",
      durationSec: 8,
      avgEmg: 148,
      maxEmg: 412,
      samples,
    },
  ];
}

export function seedDemoAccounts(locale: Locale = loadDeviceLocale()): { patient: User; clinician: User; caregiver: User } {
  const patient = demoPatient(locale);
  const clinician = demoClinician(locale);
  const caregiver = demoCaregiver(locale);
  const others = loadUsers().filter((user) => !isDemoEmail(user.email));
  saveUsers([...others, clinician, caregiver, patient]);
  replaceKeyedRows(GONIOMETER_KEY, [DEMO_PATIENT_EMAIL], demoClips());
  replaceKeyedRows(MYOWARE_LOG_KEY, [DEMO_PATIENT_EMAIL], demoMuscle());
  return { patient, clinician, caregiver };
}
