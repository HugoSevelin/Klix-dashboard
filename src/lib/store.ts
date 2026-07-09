"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { prospectToRow, rowToProspect } from "@/lib/supabase/prospect-mapper";
import type { FailureReason, HistoryEntry, Prospect, ProspectStatus } from "./types";
import { FAILURE_REASON_LABELS, STATUS_LABELS } from "./types";

const DAILY_GOAL_KEY = "klix-daily-goal-v1";

export function makeHistoryEntry(action: string): HistoryEntry {
  return { id: crypto.randomUUID(), date: new Date().toISOString(), action };
}

export function useProspects() {
  const [supabase] = useState(() => createClient());
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const userIdRef = useRef<string | null>(null);

  const fetchAll = useCallback(async () => {
    const { data, error } = await supabase
      .from("prospects")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) {
      toast.error("Impossible de charger les prospects.");
      return;
    }
    setProspects((data ?? []).map(rowToProspect));
  }, [supabase]);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | undefined;
    let cancelled = false;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        setHydrated(true);
        return;
      }
      userIdRef.current = user.id;
      await fetchAll();
      if (cancelled) return;
      setHydrated(true);

      channel = supabase
        .channel("prospects-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "prospects", filter: `owner_id=eq.${user.id}` },
          () => {
            fetchAll();
          }
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [fetchAll, supabase]);

  // Applique l'updater localement (optimistic), persiste en arrière-plan,
  // et revient en arrière + toast si la persistance échoue.
  //
  // La fonction passée à setProspects doit rester pure (React peut l'invoquer
  // plusieurs fois, notamment en Strict Mode) : on capture `next`/`previous`
  // dans des variables locales et on n'appelle `persist` qu'une fois, après
  // que setProspects soit retourné.
  const update = useCallback(
    (updater: (prev: Prospect[]) => Prospect[], persist: (next: Prospect[]) => Promise<void>) => {
      let previous!: Prospect[];
      let next!: Prospect[];
      setProspects((prev) => {
        previous = prev;
        next = updater(prev);
        return next;
      });
      persist(next).catch(() => {
        setProspects(previous);
        toast.error("Échec de la synchronisation. Réessayez.");
      });
    },
    []
  );

  const addProspects = useCallback(
    (items: Prospect[]) =>
      update(
        (prev) => [...prev, ...items],
        async () => {
          const { error } = await supabase.from("prospects").insert(items.map(prospectToRow));
          if (error) throw error;
        }
      ),
    [update, supabase]
  );

  const setStatus = useCallback(
    (id: string, status: ProspectStatus, failureReason?: FailureReason) =>
      update(
        (prev) =>
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
          }),
        async (next) => {
          const row = next.find((p) => p.id === id);
          if (!row) return;
          const { error } = await supabase.from("prospects").update(prospectToRow(row)).eq("id", id);
          if (error) throw error;
        }
      ),
    [update, supabase]
  );

  const setPriority = useCallback(
    (id: string, priority: boolean) =>
      update(
        (prev) =>
          prev.map((p) => {
            if (p.id !== id || p.priority === priority) return p;
            const action = priority ? "Marqué comme prioritaire" : "Retiré des prioritaires";
            return {
              ...p,
              priority,
              updatedAt: new Date().toISOString(),
              history: [...p.history, makeHistoryEntry(action)],
            };
          }),
        async (next) => {
          const row = next.find((p) => p.id === id);
          if (!row) return;
          const { error } = await supabase.from("prospects").update(prospectToRow(row)).eq("id", id);
          if (error) throw error;
        }
      ),
    [update, supabase]
  );

  const setStatusBulk = useCallback(
    (ids: string[], status: ProspectStatus, failureReason?: FailureReason) =>
      update(
        (prev) =>
          prev.map((p) => {
            if (!ids.includes(p.id) || p.status === status) return p;
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
          }),
        async (next) => {
          const rows = next.filter((p) => ids.includes(p.id));
          if (rows.length === 0) return;
          const { error } = await supabase.from("prospects").upsert(rows.map(prospectToRow));
          if (error) throw error;
        }
      ),
    [update, supabase]
  );

  const setPriorityBulk = useCallback(
    (ids: string[], priority: boolean) =>
      update(
        (prev) =>
          prev.map((p) => {
            if (!ids.includes(p.id) || p.priority === priority) return p;
            const action = priority ? "Marqué comme prioritaire" : "Retiré des prioritaires";
            return {
              ...p,
              priority,
              updatedAt: new Date().toISOString(),
              history: [...p.history, makeHistoryEntry(action)],
            };
          }),
        async (next) => {
          const rows = next.filter((p) => ids.includes(p.id));
          if (rows.length === 0) return;
          const { error } = await supabase.from("prospects").upsert(rows.map(prospectToRow));
          if (error) throw error;
        }
      ),
    [update, supabase]
  );

  const removeProspects = useCallback(
    (ids: string[]) =>
      update(
        (prev) => prev.filter((p) => !ids.includes(p.id)),
        async () => {
          const { error } = await supabase.from("prospects").delete().in("id", ids);
          if (error) throw error;
        }
      ),
    [update, supabase]
  );

  const setNextCallDate = useCallback(
    (id: string, date: string | undefined) =>
      update(
        (prev) =>
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
          }),
        async (next) => {
          const row = next.find((p) => p.id === id);
          if (!row) return;
          const { error } = await supabase.from("prospects").update(prospectToRow(row)).eq("id", id);
          if (error) throw error;
        }
      ),
    [update, supabase]
  );

  const setNotes = useCallback(
    (id: string, notes: string) =>
      update(
        (prev) =>
          prev.map((p) => (p.id === id ? { ...p, notes, updatedAt: new Date().toISOString() } : p)),
        async (next) => {
          const row = next.find((p) => p.id === id);
          if (!row) return;
          const { error } = await supabase.from("prospects").update(prospectToRow(row)).eq("id", id);
          if (error) throw error;
        }
      ),
    [update, supabase]
  );

  const logNoteSaved = useCallback(
    (id: string) =>
      update(
        (prev) =>
          prev.map((p) =>
            p.id === id
              ? { ...p, history: [...p.history, makeHistoryEntry("Note mise à jour")] }
              : p
          ),
        async (next) => {
          const row = next.find((p) => p.id === id);
          if (!row) return;
          const { error } = await supabase.from("prospects").update(prospectToRow(row)).eq("id", id);
          if (error) throw error;
        }
      ),
    [update, supabase]
  );

  const removeProspect = useCallback(
    (id: string) =>
      update(
        (prev) => prev.filter((p) => p.id !== id),
        async () => {
          const { error } = await supabase.from("prospects").delete().eq("id", id);
          if (error) throw error;
        }
      ),
    [update, supabase]
  );

  const clearAll = useCallback(
    () =>
      update(
        () => [],
        async () => {
          // RLS limite déjà aux lignes de l'utilisateur connecté ; ce filtre
          // toujours-vrai est l'idiome documenté par Supabase pour un delete-all.
          const { error } = await supabase.from("prospects").delete().not("id", "is", null);
          if (error) throw error;
        }
      ),
    [update, supabase]
  );

  return {
    prospects,
    hydrated,
    addProspects,
    setStatus,
    setPriority,
    setStatusBulk,
    setPriorityBulk,
    setNextCallDate,
    setNotes,
    logNoteSaved,
    removeProspect,
    removeProspects,
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
