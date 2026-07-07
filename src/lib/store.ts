"use client";

import { useCallback, useEffect, useState } from "react";
import type { FailureReason, HistoryEntry, Prospect, ProspectStatus } from "./types";
import { FAILURE_REASON_LABELS, STATUS_LABELS } from "./types";

const STORAGE_KEY = "klix-prospects-v1";
const DAILY_GOAL_KEY = "klix-daily-goal-v1";

function loadFromStorage(): Prospect[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // valeurs par défaut pour les prospects enregistrés avant l'ajout de ces champs
    return parsed.map((p: Prospect) => ({
      ...p,
      callAttempts: p.callAttempts ?? 0,
    }));
  } catch {
    return [];
  }
}

function saveToStorage(prospects: Prospect[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prospects));
  } catch {
    // quota dépassé ou stockage indisponible : on garde l'état en mémoire
  }
}

export function makeHistoryEntry(action: string): HistoryEntry {
  return { id: crypto.randomUUID(), date: new Date().toISOString(), action };
}

export function useProspects() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setProspects(loadFromStorage());
    setHydrated(true);
  }, []);

  const update = useCallback((updater: (prev: Prospect[]) => Prospect[]) => {
    setProspects((prev) => {
      const next = updater(prev);
      saveToStorage(next);
      return next;
    });
  }, []);

  const addProspects = useCallback(
    (items: Prospect[]) => update((prev) => [...prev, ...items]),
    [update]
  );

  const setStatus = useCallback(
    (id: string, status: ProspectStatus, failureReason?: FailureReason) =>
      update((prev) =>
        prev.map((p) => {
          if (p.id !== id || p.status === status) return p;
          const isTerminal = status === "success" || status === "failed";
          const label =
            status === "failed" && failureReason
              ? `${STATUS_LABELS[status]} (${FAILURE_REASON_LABELS[failureReason]})`
              : STATUS_LABELS[status];
          return {
            ...p,
            status,
            failureReason: status === "failed" ? failureReason : undefined,
            callAttempts: isTerminal ? p.callAttempts + 1 : p.callAttempts,
            updatedAt: new Date().toISOString(),
            history: [...p.history, makeHistoryEntry(`Statut changé en « ${label} »`)],
          };
        })
      ),
    [update]
  );

  const setNextCallDate = useCallback(
    (id: string, date: string | undefined) =>
      update((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p;
          const action = date
            ? `Rappel programmé le ${new Date(date).toLocaleDateString("fr-FR")}`
            : "Rappel annulé";
          return {
            ...p,
            nextCallDate: date,
            updatedAt: new Date().toISOString(),
            history: [...p.history, makeHistoryEntry(action)],
          };
        })
      ),
    [update]
  );

  const setNotes = useCallback(
    (id: string, notes: string) =>
      update((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, notes, updatedAt: new Date().toISOString() } : p
        )
      ),
    [update]
  );

  const logNoteSaved = useCallback(
    (id: string) =>
      update((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, history: [...p.history, makeHistoryEntry("Note mise à jour")] }
            : p
        )
      ),
    [update]
  );

  const removeProspect = useCallback(
    (id: string) => update((prev) => prev.filter((p) => p.id !== id)),
    [update]
  );

  const clearAll = useCallback(() => update(() => []), [update]);

  return {
    prospects,
    hydrated,
    addProspects,
    setStatus,
    setNextCallDate,
    setNotes,
    logNoteSaved,
    removeProspect,
    clearAll,
  };
}

export function useDailyGoal() {
  const [goal, setGoalState] = useState(20);

  useEffect(() => {
    const raw = window.localStorage.getItem(DAILY_GOAL_KEY);
    const parsed = raw ? Number(raw) : NaN;
    if (Number.isFinite(parsed) && parsed > 0) setGoalState(parsed);
  }, []);

  const setGoal = useCallback((value: number) => {
    setGoalState(value);
    try {
      window.localStorage.setItem(DAILY_GOAL_KEY, String(value));
    } catch {
      // stockage indisponible : le réglage reste en mémoire pour la session
    }
  }, []);

  return { goal, setGoal };
}
