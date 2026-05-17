"use client";

import { AlertCircle, X } from "lucide-react";
import { useEffect } from "react";

type ToastProps = {
  message: string;
  title?: string;
  onClose: () => void;
};

export function Toast({ message, title = "Request failed", onClose }: ToastProps) {
  useEffect(() => {
    if (!message) {
      return;
    }

    const timer = window.setTimeout(onClose, 6000);
    return () => window.clearTimeout(timer);
  }, [message, onClose]);

  if (!message) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="toast-pop fixed left-4 right-4 top-4 z-50 sm:left-auto sm:right-5 sm:w-[460px]"
    >
      <div className="overflow-hidden rounded-2xl border border-[#f04438]/35 bg-white text-[var(--foreground)] shadow-[0_26px_80px_rgba(180,35,24,0.28)]">
        <div className="h-1.5 bg-[#d92d20]" />
        <div className="flex gap-4 p-5">
        <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#fef3f2] text-[#d92d20] ring-4 ring-[#fee4e2]">
          <AlertCircle size={22} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[#7a271a]">{title}</p>
          <p className="mt-1 text-sm leading-6 text-[#344054]">{message}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#7a271a] transition hover:bg-[#fee4e2]"
          aria-label="Dismiss notification"
        >
          <X size={16} aria-hidden="true" />
        </button>
        </div>
      </div>
    </div>
  );
}
