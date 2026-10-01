"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Check, MessageCircle, X, ArrowRight, BellRing } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const WHATSAPP_CHANNEL_URL = "https://whatsapp.com/channel/0029Vb8LXTvIN9ik5rI9M52E";
const STATE_KEY = "sa-jobs-hub:whatsapp-popup-state";

const DAY_MS = 24 * 60 * 60 * 1000;

// Re-engagement schedule: increasing intervals so it doesn't feel spammy
const REENGAGE_INTERVALS = [
  0,           // First visit: show almost immediately
  7 * DAY_MS,  // After 1st dismiss: show again in 7 days
  14 * DAY_MS, // After 2nd dismiss: show again in 14 days
  30 * DAY_MS, // After 3rd+ dismiss: show once a month max
];

interface PopupState {
  dismissCount: number;
  lastDismissedAt: number | null;
  lastShownAt: number | null;
  joined: boolean;
}

function readState(): PopupState {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (raw) return JSON.parse(raw) as PopupState;
  } catch {
    // ignore
  }
  return { dismissCount: 0, lastDismissedAt: null, lastShownAt: null, joined: false };
}

function writeState(state: PopupState) {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function shouldShowModal(state: PopupState, now: number): boolean {
  if (state.joined) return false; // Never show after they've joined
  const lastDismissed = state.lastDismissedAt;
  if (lastDismissed === null) return true; // First visit

  const maxIdx = REENGAGE_INTERVALS.length - 1;
  const idx = Math.min(Math.max(state.dismissCount, 0), maxIdx);
  const interval: number = REENGAGE_INTERVALS[idx] as number;
  const nextShowAt = lastDismissed + interval;
  return now >= nextShowAt;
}

export function WhatsappChannelPopup() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [fabPulse, setFabPulse] = useState(false);
  const stateRef = useRef<PopupState>(readState());
  const timersRef = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  const showModal = useCallback(() => {
    setOpen(true);
    const now = Date.now();
    stateRef.current = { ...stateRef.current, lastShownAt: now };
    writeState(stateRef.current);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    const now = Date.now();
    stateRef.current = {
      ...stateRef.current,
      dismissCount: stateRef.current.dismissCount + 1,
      lastDismissedAt: now,
    };
    writeState(stateRef.current);
  }, []);

  const handleJoin = useCallback(() => {
    setOpen(false);
    stateRef.current = { ...stateRef.current, joined: true };
    writeState(stateRef.current);
    if (typeof window !== "undefined") {
      window.open(WHATSAPP_CHANNEL_URL, "_blank", "noopener,noreferrer");
    }
  }, []);

  const openModalFromFab = useCallback(() => {
    setOpen(true);
  }, []);

  useEffect(() => {
    setMounted(true);
    const state = stateRef.current;
    const now = Date.now();

    // Don't auto-show if they already joined
    if (state.joined) return;

    if (shouldShowModal(state, now)) {
      // First visit or returning after re-engagement cooldown
      const isFirstVisit = state.lastDismissedAt === null;
      const initialDelay = isFirstVisit ? 800 : 3500; // Give returning users more time to browse first

      const t1 = window.setTimeout(() => {
        showModal();
      }, initialDelay);
      timersRef.current.push(t1);
    }

    // --- Intent-based follow-ups for sessions where we don't auto-show ---
    // If they've been on the site >15s and still haven't seen it, soft-trigger.
    const t2 = window.setTimeout(() => {
      const s = stateRef.current;
      if (s.joined) return;
      // Only show intent-triggered if we haven't shown it this session already
      if (s.lastShownAt && s.lastShownAt > now - 1000) return;
      // Pulse the FAB gently to catch attention without blocking the UI
      setFabPulse(true);
    }, 15000);
    timersRef.current.push(t2);

    // Exit-intent: show when user's mouse leaves the top of the window (desktop only)
    if (typeof window !== "undefined" && typeof document !== "undefined") {
      const handleMouseLeave = (e: MouseEvent) => {
        if (e.clientY <= 0) {
          const s = stateRef.current;
          if (!s.joined && shouldShowModal(s, Date.now()) && !open) {
            showModal();
          }
        }
      };
      document.addEventListener("mouseleave", handleMouseLeave);
      return () => {
        document.removeEventListener("mouseleave", handleMouseLeave);
        clearTimers();
      };
    }

    return clearTimers;
  }, [showModal, clearTimers, open]);

  if (!mounted) return null;

  return (
    <>
      {/* Floating WhatsApp Button — always there, always accessible */}
      {!stateRef.current.joined && (
        <button
          type="button"
          onClick={openModalFromFab}
          aria-label="Join our WhatsApp Channel"
          className={cn(
            "fixed bottom-5 right-5 z-40 flex items-center gap-2",
            "h-14 px-4 rounded-full",
            "bg-green-500 text-white",
            "shadow-xl shadow-green-500/40 ring-1 ring-green-600/20",
            "hover:bg-green-600 hover:scale-105 active:scale-100",
            "transition-all duration-200",
          )}
        >
          <span className={cn("relative inline-flex size-8 items-center justify-center")}>
            <MessageCircle className={cn("h-6 w-6 relative z-10", fabPulse && "animate-bounce")} strokeWidth={2} />
            {fabPulse && (
              <>
                <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-60" style={{ animationDuration: "1.5s" }} />
                <BellRing className="absolute -top-1 -right-1 h-4 w-4 text-yellow-300 drop-shadow-sm z-20 animate-bounce" style={{ animationDelay: "0.3s" }} />
              </>
            )}
          </span>
          <span className="hidden sm:inline font-bold text-sm pr-1">Get Job Alerts</span>
        </button>
      )}

      <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent
        className={cn(
          "w-[95vw] max-w-3xl p-0 overflow-hidden border-0 sm:rounded-2xl",
          "bg-gradient-to-br from-white to-green-50",
          "gap-0",
        )}
      >
        {/* Visually hidden title for a11y */}
        <DialogTitle className="sr-only">Join our WhatsApp Channel</DialogTitle>
        <DialogDescription className="sr-only">
          Get the latest job opportunities, career tips and important updates directly on WhatsApp.
        </DialogDescription>

        {/* Close button */}
        <DialogClose
          onClick={handleClose}
          className={cn(
            "absolute right-4 top-4 z-10 rounded-full p-2",
            "bg-white/80 backdrop-blur-sm text-navy/70 hover:text-navy hover:bg-white",
            "shadow-sm ring-1 ring-navy/10 transition-all",
          )}
          aria-label="Close popup"
        >
          <X className="h-4 w-4" />
        </DialogClose>

        <div className="grid md:grid-cols-2 gap-0">
          {/* LEFT: Copy & CTA */}
          <div className="relative px-6 py-8 sm:px-8 sm:py-10 z-[1]">
            {/* Decorative green blob */}
            <div className="absolute -left-16 -top-16 h-48 w-48 rounded-full bg-green-400/10 blur-3xl pointer-events-none" />
            <div className="absolute -right-8 bottom-0 h-40 w-40 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />

            {/* Badge */}
            <div className="relative inline-flex items-center gap-2 rounded-full bg-green-100/80 px-3 py-1.5 mb-5 ring-1 ring-green-500/20">
              <div className="flex items-center justify-center size-5 rounded-full bg-green-500 text-white">
                <MessageCircle className="h-3 w-3" strokeWidth={2.5} />
              </div>
              <span className="text-xs font-bold tracking-widest uppercase text-green-700">
                Join Our
              </span>
            </div>

            {/* Heading */}
            <h2 className="font-display text-4xl sm:text-5xl font-bold leading-[1.05] tracking-tight mb-4">
              <span className="text-green-600">WhatsApp</span>
              <br />
              <span className="text-navy">Channel</span>
            </h2>

            {/* Sub copy */}
            <p className="text-sm sm:text-base text-navy/70 leading-relaxed mb-6 max-w-sm">
              Get the latest job opportunities, career tips and important updates directly on
              WhatsApp!
            </p>

            {/* Benefits */}
            <ul className="space-y-3 mb-8">
              {[
                "New job alerts as soon as they're posted",
                "Career advice & tips",
                "Application closing reminders",
                "Stay ahead in your job search",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-green-500 text-white ring-4 ring-green-500/10">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <span className="text-sm text-navy/80 font-medium leading-snug">{item}</span>
                </li>
              ))}
            </ul>

            {/* CTA Button */}
            <button
              onClick={handleJoin}
              className={cn(
                "group relative w-full inline-flex items-center justify-center gap-2.5",
                "h-14 px-6 rounded-2xl font-bold text-base sm:text-lg text-white",
                "bg-green-500 hover:bg-green-600 active:bg-green-700",
                "shadow-lg shadow-green-500/30 hover:shadow-green-500/40",
                "transition-all duration-200",
                "ring-1 ring-green-600/20",
              )}
            >
              <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.25} />
              <span>Join Our WhatsApp Channel</span>
              <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 transition-transform group-hover:translate-x-0.5" strokeWidth={2.5} />
            </button>

            {/* Footnote */}
            <p className="mt-4 text-xs text-navy/50 text-center sm:text-left">
              It's free, quick and easy to join!
            </p>
          </div>

          {/* RIGHT: Phone mockup */}
          <div className="relative hidden md:block overflow-hidden bg-gradient-to-br from-green-100/50 via-emerald-50 to-transparent">
            {/* Decorative sparkles */}
            <SparkleDecoration className="absolute left-8 top-12" />
            <SparkleDecoration className="absolute right-10 bottom-32" />
            <SparkleDecoration className="absolute left-12 bottom-10" />

            {/* Green background blob behind phone */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[85%] w-[85%] rounded-full bg-green-400/20 blur-2xl" />

            {/* Phone frame */}
            <div className="relative z-[1] mx-auto my-8 h-[520px] w-[260px]">
              {/* Phone body */}
              <div className="relative h-full w-full rounded-[42px] bg-navy p-[10px] shadow-2xl ring-1 ring-navy/10">
                {/* Notch */}
                <div className="absolute left-1/2 top-3 z-20 -translate-x-1/2 h-5 w-24 rounded-full bg-navy" />

                {/* Screen */}
                <div className="relative h-full w-full overflow-hidden rounded-[32px] bg-gradient-to-b from-slate-50 to-white">
                  {/* Chat header */}
                  <div className="flex items-center gap-2 bg-green-600 px-3 pt-10 pb-3 text-white">
                    <div className="flex size-8 items-center justify-center rounded-full bg-white/90 text-navy font-bold text-xs shadow-sm">
                      SA
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-semibold truncate">SA Career Hub</span>
                        <svg className="size-3.5 text-white/90" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                        </svg>
                      </div>
                      <span className="text-[10px] text-green-100/80">WhatsApp Channel</span>
                    </div>
                  </div>

                  {/* Chat body */}
                  <div className="h-[calc(100%-68px)] space-y-2.5 overflow-hidden bg-[#ECE5DD]/40 p-3">
                    {/* Job alert message */}
                    <div className="rounded-xl rounded-tl-sm bg-white px-3 py-2.5 shadow-sm ring-1 ring-black/5 max-w-[92%] ml-auto">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-xs">📣</span>
                        <span className="text-[11px] font-bold text-navy">New Job Alert!</span>
                      </div>
                      <p className="text-[11px] font-semibold text-navy leading-snug">
                        Accounting Clerk: Financial
                        <br />
                        Accounting Services
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                        <span className="inline-flex items-center gap-1 text-navy/70">
                          <span>📍</span> Limpopo
                        </span>
                        <span className="inline-flex items-center gap-1 text-navy/70">
                          <span>🏢</span> Full-Time
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-1 text-[10px] text-navy/60">
                        <span>🗓️</span>
                        <span>Closing: 28 Sept 2026</span>
                      </div>
                      <div className="mt-1 text-right text-[9px] text-navy/40">10:24</div>
                    </div>

                    {/* Career tip message */}
                    <div className="rounded-xl rounded-tl-sm bg-white px-3 py-2.5 shadow-sm ring-1 ring-black/5 max-w-[92%] ml-auto">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-xs">💡</span>
                        <span className="text-[11px] font-bold text-navy">Career Tip</span>
                      </div>
                      <p className="text-[11px] text-navy/80 leading-relaxed">
                        Update your CV regularly and highlight your key achievements!
                      </p>
                      <div className="mt-1 text-right text-[9px] text-navy/40">10:25</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating WhatsApp badge */}
              <div className="absolute -bottom-2 -right-4 z-20">
                <div
                  className={cn(
                    "flex size-16 items-center justify-center rounded-3xl",
                    "bg-green-500 text-white shadow-xl shadow-green-500/40",
                    "ring-4 ring-white animate-bounce",
                  )}
                  style={{ animationDuration: "3s" }}
                >
                  <MessageCircle className="h-8 w-8" strokeWidth={2} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}

function SparkleDecoration({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-1.5 opacity-60", className)}>
      <div className="h-2.5 w-1 rounded-full bg-green-500 rotate-45" />
      <div className="h-1 w-1 rounded-full bg-green-500" />
    </div>
  );
}