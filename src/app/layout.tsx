import type { Metadata } from "next";
import { Geist, Geist_Mono, Baloo_2, Source_Serif_4 } from "next/font/google";
import { AuthGate } from "@/components/AuthGate";
import { AuthProvider } from "@/components/AuthProvider";
import { HeartRateProvider } from "@/components/HeartRateProvider";
import { MyoWareProvider } from "@/components/MyoWareProvider";
import { NotificationScheduler } from "@/components/NotificationScheduler";
import { ChatAssistant } from "@/components/ChatAssistant";
import { OfflineStatus } from "@/components/OfflineStatus";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  display: "swap",
});

const kidsDisplay = Baloo_2({
  variable: "--font-kids",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Revive Motion | Clinician-prescribed therapy at home",
  description:
    "Complete the plan your clinician prescribed, capture movement at home, and share one Recovery Passport with the care team.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${sourceSerif.variable} ${kidsDisplay.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <HeartRateProvider>
            <MyoWareProvider>
              <AuthGate>
                <OfflineStatus />
                {children}
                <NotificationScheduler />
                <ChatAssistant />
              </AuthGate>
            </MyoWareProvider>
          </HeartRateProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
