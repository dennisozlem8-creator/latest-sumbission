export type AppNotification = {
  id: string;
  toEmail: string;
  role: "patient" | "doctor";
  title: string;
  message: string;
  sentAt: string;
  read: boolean;
};

const NOTIFICATIONS_KEY = "revive-motion-notifications";
const LAST_DAILY_KEY = "revive-motion-last-daily";

export function loadNotifications(): AppNotification[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveNotifications(notifications: AppNotification[]) {
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
}

export function addNotification(
  notification: Omit<AppNotification, "id" | "sentAt" | "read">
) {
  const all = loadNotifications();
  all.unshift({
    ...notification,
    id: crypto.randomUUID(),
    sentAt: new Date().toISOString(),
    read: false,
  });
  saveNotifications(all.slice(0, 100));
}

export function markNotificationsRead(email: string) {
  const all = loadNotifications().map((n) =>
    n.toEmail === email ? { ...n, read: true } : n
  );
  saveNotifications(all);
}

export function getNotificationsForUser(email: string) {
  return loadNotifications().filter((n) => n.toEmail === email);
}

export function shouldSendDailyReminder() {
  const last = localStorage.getItem(LAST_DAILY_KEY);
  if (!last) return true;
  const lastDate = new Date(last);
  const now = new Date();
  return now.getTime() - lastDate.getTime() > 24 * 60 * 60 * 1000;
}

export function markDailyReminderSent() {
  localStorage.setItem(LAST_DAILY_KEY, new Date().toISOString());
}

export async function sendBrowserNotification(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "granted") {
    new Notification(title, { body, icon: "/exercises/mobility.svg" });
  }
}

export function requestNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "default") {
    Notification.requestPermission();
  }
}

export function sendDailyNotifications(
  patientEmail: string,
  patientName: string,
  careEmails?: string | string[]
) {
  if (!shouldSendDailyReminder()) return;

  addNotification({
    toEmail: patientEmail,
    role: "patient",
    title: "Daily exercise reminder",
    message: `Hi ${patientName.split(" ")[0]}, time for today's Revive Motion exercises!`,
  });

  sendBrowserNotification(
    "Revive Motion",
    `Hi ${patientName.split(" ")[0]}, time for your exercises today!`
  );

  const recipients = (Array.isArray(careEmails) ? careEmails : careEmails ? [careEmails] : []).filter(Boolean);
  for (const doctorEmail of recipients) {
    addNotification({
      toEmail: doctorEmail,
      role: "doctor",
      title: "Patient check-in",
      message: `${patientName} has a daily exercise reminder. Review their weekly update in your dashboard.`,
    });
  }

  markDailyReminderSent();
}

/** One notice per care-team account per week, so the dashboard does not pile up duplicates. */
export function ensureWeeklyUpdateNotice(toEmail: string, weekId: string, message: string) {
  const id = `weekly-${weekId}-${toEmail.toLowerCase()}`;
  const all = loadNotifications();
  if (all.some((note) => note.id === id)) return;
  all.unshift({
    id,
    toEmail,
    role: "doctor",
    title: "Weekly patient update",
    message,
    sentAt: new Date().toISOString(),
    read: false,
  });
  saveNotifications(all.slice(0, 100));
}
