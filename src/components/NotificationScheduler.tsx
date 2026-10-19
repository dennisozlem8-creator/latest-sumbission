"use client";

import { useEffect } from "react";
import { useAuth } from "./AuthProvider";
import {
  requestNotificationPermission,
  sendDailyNotifications,
} from "@/lib/notifications";
import { careTeamEmails } from "@/lib/users";

export function NotificationScheduler() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user || user.role !== "patient" || !user.notificationsEnabled) return;

    requestNotificationPermission();

    sendDailyNotifications(user.email, user.name, careTeamEmails(user));

    const interval = setInterval(() => {
      sendDailyNotifications(user.email, user.name, careTeamEmails(user));
    }, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user]);

  return null;
}
