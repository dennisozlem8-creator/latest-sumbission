"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { loadUsers, saveUsers, isCareTeam, type User, type UserRole, type PTPrescription } from "@/lib/users";
import { seedDemoAccounts } from "@/lib/demo-account";
import { loadDeviceLocale, saveDeviceLocale, type Locale } from "@/lib/i18n";
import { logActivityToday } from "@/lib/streak";

export type { ExerciseRecord, User, UserRole } from "@/lib/users";
export { loadUsers } from "@/lib/users";

type RegisterOptions = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  doctorEmail?: string;
  caregiverEmail?: string;
  notificationsEnabled?: boolean;
};

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => string | null;
  register: (options: RegisterOptions) => string | null;
  enterDemo: (role?: "patient" | "doctor" | "caregiver") => void;
  logout: () => void;
  saveExerciseHistory: (
    areaId: string,
    exerciseIds: string[],
    metrics?: { angle?: number; reps?: number; pain?: number }
  ) => void;
  getPreviousExerciseIds: (areaId?: string) => string[];
  completeQuest: (questId: string, xp?: number) => void;
  getPatientsForDoctor: () => User[];
  updateUser: (updates: Partial<User>) => void;
  setPatientPrescription: (patientEmail: string, prescription: PTPrescription) => void;
  deviceLocale: Locale;
  setDeviceLocale: (locale: Locale) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const SESSION_KEY = "revive-motion-session";

function normalizeUser(raw: Partial<User> & Pick<User, "email" | "password" | "name">): User {
  return {
    name: raw.name,
    email: raw.email,
    password: raw.password,
    role: raw.role ?? "patient",
    doctorEmail: raw.doctorEmail,
    caregiverEmail: raw.caregiverEmail,
    notificationsEnabled: raw.notificationsEnabled ?? true,
    exerciseHistory: raw.exerciseHistory ?? [],
    questProgress: raw.questProgress ?? {},
    xp: raw.xp ?? 0,
    activityDates: raw.activityDates ?? [],
    setupComplete: raw.setupComplete ?? false,
    pin: raw.pin ?? "",
    injuryType: raw.injuryType ?? "wrist",
    baselineRom: raw.baselineRom ?? 0,
    targetRom: raw.targetRom ?? 90,
    sessionDays: raw.sessionDays ?? 5,
    sessionTime: raw.sessionTime ?? "morning",
    language: raw.language ?? "en",
    painToday: raw.painToday,
    ptPrescription: raw.ptPrescription,
    lastCheckInDate: raw.lastCheckInDate,
    checkInAnswers: raw.checkInAnswers,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [deviceLocale, setDeviceLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const sessionEmail = localStorage.getItem(SESSION_KEY);
    if (sessionEmail) {
      const found = loadUsers().find((u) => u.email === sessionEmail);
      setUser(found ? normalizeUser(found) : null);
    }
    setDeviceLocaleState(loadDeviceLocale());
    setLoading(false);
  }, []);

  const setDeviceLocale = useCallback((locale: Locale) => {
    saveDeviceLocale(locale);
    setDeviceLocaleState(locale);
  }, []);

  const persistUser = useCallback((updated: User) => {
    const users = loadUsers();
    const index = users.findIndex((u) => u.email === updated.email);
    if (index === -1) return;
    users[index] = updated;
    saveUsers(users);
    setUser(updated);
  }, []);

  const login = useCallback((email: string, password: string) => {
    const found = loadUsers().find(
      (u) => u.email === email.trim().toLowerCase() && u.password === password
    );
    if (!found) return "Invalid email or password.";
    const normalized = normalizeUser(found);
    localStorage.setItem(SESSION_KEY, normalized.email);
    setUser(normalized);
    return null;
  }, []);

  const register = useCallback((options: RegisterOptions) => {
    const normalizedEmail = options.email.trim().toLowerCase();
    if (!options.name.trim()) return "Name is required.";
    if (!normalizedEmail.includes("@")) return "Enter a valid email.";
    if (options.password.length < 6) return "Password must be at least 6 characters.";

    const users = loadUsers();
    if (users.some((u) => u.email === normalizedEmail)) {
      return "An account with this email already exists.";
    }

    const newUser = normalizeUser({
      name: options.name.trim(),
      email: normalizedEmail,
      password: options.password,
      role: options.role,
      doctorEmail:
        options.role === "patient" && options.doctorEmail?.includes("@")
          ? options.doctorEmail.trim().toLowerCase()
          : undefined,
      caregiverEmail:
        options.role === "patient" && options.caregiverEmail?.includes("@")
          ? options.caregiverEmail.trim().toLowerCase()
          : undefined,
      notificationsEnabled: options.notificationsEnabled ?? true,
      exerciseHistory: [],
      questProgress: {},
      xp: 0,
      activityDates: [],
    });

    users.push(newUser);
    saveUsers(users);
    localStorage.setItem(SESSION_KEY, normalizedEmail);
    setUser(newUser);
    return null;
  }, []);

  const enterDemo = useCallback((role: "patient" | "doctor" | "caregiver" = "patient") => {
    const { patient, clinician, caregiver } = seedDemoAccounts(loadDeviceLocale());
    const next = role === "doctor" ? clinician : role === "caregiver" ? caregiver : patient;
    localStorage.setItem(SESSION_KEY, next.email);
    setUser(normalizeUser(next));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, []);

  const saveExerciseHistory = useCallback(
    (
      areaId: string,
      exerciseIds: string[],
      metrics?: { angle?: number; reps?: number; pain?: number }
    ) => {
      if (!user) return;
      persistUser({
        ...user,
        exerciseHistory: [
          ...user.exerciseHistory,
          {
            areaId,
            exerciseIds,
            completedAt: new Date().toISOString(),
            angle: metrics?.angle,
            reps: metrics?.reps,
            pain: metrics?.pain,
          },
        ],
        activityDates: logActivityToday(user.activityDates),
      });
    },
    [user, persistUser]
  );

  const getPreviousExerciseIds = useCallback(
    (areaId?: string) => {
      if (!user) return [];
      const records = areaId
        ? user.exerciseHistory.filter((r) => r.areaId === areaId)
        : user.exerciseHistory;
      return records.flatMap((r) => r.exerciseIds);
    },
    [user]
  );

  const completeQuest = useCallback(
    (questId: string, xp = 50) => {
      if (!user) return;
      persistUser({
        ...user,
        questProgress: { ...user.questProgress, [questId]: true },
        xp: user.xp + xp,
        activityDates: logActivityToday(user.activityDates),
      });
    },
    [user, persistUser]
  );

  const getPatientsForDoctor = useCallback(() => {
    if (!user || !isCareTeam(user.role)) return [];
    return loadUsers().filter(
      (u) => u.role === "patient" && (u.doctorEmail === user.email || u.caregiverEmail === user.email)
    );
  }, [user]);

  const updateUser = useCallback(
    (updates: Partial<User>) => {
      if (!user) return;
      persistUser({ ...user, ...updates });
    },
    [user, persistUser]
  );

  const setPatientPrescription = useCallback(
    (patientEmail: string, prescription: PTPrescription) => {
      const users = loadUsers();
      const index = users.findIndex((u) => u.email === patientEmail);
      if (index === -1) return;
      users[index].ptPrescription = prescription;
      saveUsers(users);
      if (user?.email === patientEmail) setUser({ ...users[index] });
    },
    [user]
  );

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      enterDemo,
      logout,
      saveExerciseHistory,
      getPreviousExerciseIds,
      completeQuest,
      getPatientsForDoctor,
      updateUser,
      setPatientPrescription,
      deviceLocale,
      setDeviceLocale,
    }),
    [
      user,
      loading,
      login,
      register,
      enterDemo,
      logout,
      saveExerciseHistory,
      getPreviousExerciseIds,
      completeQuest,
      getPatientsForDoctor,
      updateUser,
      setPatientPrescription,
      deviceLocale,
      setDeviceLocale,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
