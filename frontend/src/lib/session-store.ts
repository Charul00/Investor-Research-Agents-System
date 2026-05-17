"use client";

import { useSyncExternalStore } from "react";

import { AuthSession, SESSION_CHANGED_EVENT, SESSION_STORAGE_KEY } from "@/lib/api";

export const SESSION_PENDING = "session-pending" as const;

let cachedSessionRaw: string | null | undefined;
let cachedSession: AuthSession | null = null;

function parseStoredSession(raw: string | null) {
  if (raw === cachedSessionRaw) {
    return cachedSession;
  }

  cachedSessionRaw = raw;
  if (!raw) {
    cachedSession = null;
    return cachedSession;
  }

  try {
    cachedSession = JSON.parse(raw) as AuthSession;
  } catch {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    cachedSessionRaw = null;
    cachedSession = null;
  }

  return cachedSession;
}

function getSessionSnapshot() {
  return parseStoredSession(localStorage.getItem(SESSION_STORAGE_KEY));
}

function getServerSessionSnapshot() {
  return SESSION_PENDING;
}

function subscribeToSession(callback: () => void) {
  function handleStorage(event: StorageEvent) {
    if (event.key === SESSION_STORAGE_KEY) {
      callback();
    }
  }

  window.addEventListener("storage", handleStorage);
  window.addEventListener(SESSION_CHANGED_EVENT, callback);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(SESSION_CHANGED_EVENT, callback);
  };
}

export function useStoredSession() {
  return useSyncExternalStore<AuthSession | null | typeof SESSION_PENDING>(
    subscribeToSession,
    getSessionSnapshot,
    getServerSessionSnapshot,
  );
}
