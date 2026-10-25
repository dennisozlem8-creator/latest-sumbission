"use client";

import { useEffect, useRef, useState } from "react";
import { getChatResponse } from "@/lib/chat-bot";
import { useAuth } from "./AuthProvider";
import { usePathname } from "next/navigation";

type Message = { role: "user" | "assistant"; text: string };

export function ChatAssistant() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Hi! Ask me about exercises, streaks, ROM tests, or recovery tips.",
    },
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  if (!user) return null;
  if (pathname === "/kids") return null;

  function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;

    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: getChatResponse(text) },
      ]);
    }, 400);
  }

  return (
    <div className="fixed bottom-[calc(9.25rem+env(safe-area-inset-bottom))] right-3 z-30 flex max-w-[calc(100vw-1.5rem)] flex-col items-end gap-3 sm:right-5 print:hidden">
      {open && (
        <div className="flex h-[min(22rem,60vh)] w-[min(20rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-surface shadow-[0_8px_40px_rgba(0,0,0,0.4)] sm:h-96 sm:w-96">
          <div className="flex items-center justify-between border-b border-[var(--border)] bg-brand/10 px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Revive Assistant</p>
              <p className="text-xs text-muted">Ask simple PT questions</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-muted hover:text-foreground"
              aria-label="Close chat"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "ml-auto bg-brand text-white"
                    : "bg-background text-foreground"
                }`}
              >
                {msg.text}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <form
            onSubmit={sendMessage}
            className="flex gap-2 border-t border-[var(--border)] p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              className="flex-1 rounded-xl border border-[var(--border)] bg-background px-3 py-2 text-sm outline-none focus:border-brand"
            />
            <button
              type="submit"
              className="rounded-xl bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-light"
            >
              Send
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-brand text-white shadow-lg transition hover:bg-brand-light hover:scale-105 sm:h-14 sm:w-14"
        aria-label="Open chat assistant"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v7A2.5 2.5 0 0 1 16.5 16H11l-4 3.2V16H7.5A2.5 2.5 0 0 1 5 13.5v-7Z" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
