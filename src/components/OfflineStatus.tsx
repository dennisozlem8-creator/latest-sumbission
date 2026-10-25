"use client";

import { useEffect, useState } from "react";
import { t } from "@/lib/i18n";
import { useClinicLocale } from "./useClinicLocale";

export function OfflineStatus() {
  const { locale } = useClinicLocale();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const sync = () => setOffline(typeof navigator !== "undefined" && navigator.onLine === false);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (!offline) return null;

  return (
    <p className="sticky top-0 z-40 bg-[#1b3348] px-4 py-2 text-center text-sm text-[#f7f3ea]">
      {t("offlineBanner", locale)}
    </p>
  );
}
