"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarClock,
  Globe,
  History,
  MapPin,
  PartyPopper,
  Phone,
  Search,
  StickyNote,
  Timer,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { StatusBadge, StatusButtons } from "@/components/status-controls";
import { NOTE_SNIPPETS } from "@/lib/note-snippets";
import type { FailureReason, Prospect, ProspectStatus } from "@/lib/types";
import { getProspectWebsite } from "@/lib/utils";

interface DailyCallViewProps {
  open: boolean;
  prospects: Prospect[];
  onClose: () => void;
  onStatusChange: (id: string, status: ProspectStatus, failureReason?: FailureReason) => void;
  onNotesChange: (id: string, notes: string) => void;
  onNotesSaved: (id: string) => void;
  onNextCallDateChange: (id: string, date: string | undefined) => void;
}

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function DailyCallView({
  open,
  prospects,
  onClose,
  onStatusChange,
  onNotesChange,
  onNotesSaved,
  onNextCallDateChange,
}: DailyCallViewProps) {
  const [skipped, setSkipped] = useState<string[]>([]);
  const [draftNotes, setDraftNotes] = useState("");
  const [seconds, setSeconds] = useState(0);

  const queue = useMemo(() => {
    const today = startOfToday();
    const candidates = prospects.filter((p) => {
      if (p.status !== "todo") return false;
      if (!p.nextCallDate) return true;
      return new Date(p.nextCallDate).setHours(0, 0, 0, 0) <= today;
    });
    candidates.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority ? -1 : 1;
      const aOverdue = a.nextCallDate ? new Date(a.nextCallDate).setHours(0, 0, 0, 0) < today : false;
      const bOverdue = b.nextCallDate ? new Date(b.nextCallDate).setHours(0, 0, 0, 0) < today : false;
      if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
      if (a.nextCallDate && b.nextCallDate) {
        return new Date(a.nextCallDate).getTime() - new Date(b.nextCallDate).getTime();
      }
      if (a.nextCallDate) return -1;
      if (b.nextCallDate) return 1;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
    const skipSet = new Set(skipped);
    const notSkipped = candidates.filter((p) => !skipSet.has(p.id));
    const skippedOnes = skipped
      .map((id) => candidates.find((p) => p.id === id))
      .filter((p): p is Prospect => Boolean(p));
    return [...notSkipped, ...skippedOnes];
  }, [prospects, skipped]);

  const current = queue[0] ?? null;

  // Chronomètre d'appel
  useEffect(() => {
    if (!open || !current) {
      setSeconds(0);
      return;
    }
    setSeconds(0);
    const interval = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [current?.id, open]);

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    setDraftNotes(current?.notes ?? "");
  }, [current?.id, current?.notes]);

  useEffect(() => {
    if (!open) setSkipped([]);
  }, [open]);

  useEffect(() => {
    if (!open || !current) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (!current) return;
      const target = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA"].includes(target.tagName) || target.isContentEditable) return;
      if (e.key === "1") onStatusChange(current.id, "todo");
      else if (e.key === "2") onStatusChange(current.id, "success");
      else if (e.key === "3") onStatusChange(current.id, "failed");
      else if (e.key === "Enter") setSkipped((prev) => [...prev, current.id]);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, current, onStatusChange]);

  function saveNotesIfDirty() {
    if (current && draftNotes !== current.notes) {
      onNotesChange(current.id, draftNotes);
      onNotesSaved(current.id);
    }
  }

  function handleQuickDate(days: number) {
    if (!current) return;
    const date = new Date();
    date.setDate(date.getDate() + days);
    date.setHours(9, 0, 0, 0); // 9h00 du matin
    onNextCallDateChange(current.id, date.toISOString());
    toast.success(`Rappel planifié pour le ${date.toLocaleDateString("fr-FR")}`);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex h-[85vh] flex-col sm:max-w-2xl">
        <DialogTitle className="flex items-center justify-between pr-6">
          <span className="flex items-center gap-2">
            Appels du jour
            {current && (
              <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-xs font-mono font-medium text-amber-500 border border-amber-500/20">
                <Timer className="size-3" />
                {formatTime(seconds)}
              </span>
            )}
          </span>
          <span className="text-sm font-normal text-muted-foreground">
            {queue.length} prospect(s) restant(s)
          </span>
        </DialogTitle>
        <DialogDescription className="sr-only">
          Traitement séquentiel des prospects à appeler aujourd&apos;hui
        </DialogDescription>

        {!current ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-muted-foreground">
            <PartyPopper className="size-10 text-primary" />
            <p className="text-lg font-medium text-foreground">Tout est traité !</p>
            <p className="text-sm">Aucun appel à faire pour le moment.</p>
            <Button variant="outline" onClick={onClose}>
              Fermer
            </Button>
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-5 overflow-y-auto py-2">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <h2 className="text-xl font-semibold">{current.company}</h2>
                <div className="flex items-center gap-1.5">
                  <a
                    href={`https://www.google.com/search?q=${encodeURIComponent(current.company + " " + (current.city || ""))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-5 items-center gap-1 rounded bg-muted px-1.5 text-[11px] text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                    title="Rechercher sur Google"
                  >
                    <Search className="size-2.5" /> Google
                  </a>
                  <a
                    href={`https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(current.company)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-5 items-center gap-1 rounded bg-muted px-1.5 text-[11px] text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                    title="Rechercher sur LinkedIn"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-2.5">
                      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                      <rect width="4" height="12" x="2" y="9" />
                      <circle cx="4" cy="4" r="2" />
                    </svg> LinkedIn
                  </a>
                  {current.address && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(current.company + " " + current.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-5 items-center gap-1 rounded bg-muted px-1.5 text-[11px] text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                      title="Rechercher sur Google Maps"
                    >
                      <MapPin className="size-2.5" /> Maps
                    </a>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                {current.phone ? (
                  <a
                    href={`tel:${current.phone.replace(/[^+\d]/g, "")}`}
                    className="flex items-center gap-2 text-lg font-medium tabular-nums hover:underline"
                  >
                    <Phone className="size-4 text-muted-foreground" />
                    {current.phone}
                  </a>
                ) : (
                  <span className="text-muted-foreground text-sm">Téléphone non renseigné</span>
                )}
                {getProspectWebsite(current) && (
                  <a
                    href={getProspectWebsite(current)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    <Globe className="size-4 text-muted-foreground" />
                    {getProspectWebsite(current)!.replace(/^https?:\/\/(www\.)?/, "")}
                  </a>
                )}
              </div>
              {current.address && (
                <p className="text-sm text-muted-foreground">{current.address}</p>
              )}
              <StatusBadge status={current.status} failureReason={current.failureReason} />
            </div>

            {/* Sélecteur de Rappel Rapide */}
            {current.status === "failed" && current.failureReason === "call_back_later" && (
              <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 space-y-2">
                <p className="text-sm font-medium flex items-center gap-2 text-blue-400">
                  <CalendarClock className="size-4" />
                  Planifier le rappel :
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleQuickDate(1)}>Demain</Button>
                  <Button size="sm" variant="outline" onClick={() => handleQuickDate(3)}>Dans 3j</Button>
                  <Button size="sm" variant="outline" onClick={() => handleQuickDate(7)}>Dans 7j</Button>
                  <Input
                    type="date"
                    value={current.nextCallDate ? current.nextCallDate.slice(0, 10) : ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      onNextCallDateChange(current.id, val ? new Date(val).toISOString() : undefined);
                      if (val) {
                        toast.success(`Rappel planifié pour le ${new Date(val).toLocaleDateString("fr-FR")}`);
                      }
                    }}
                    className="h-8 w-36 text-xs"
                  />
                </div>
                {current.nextCallDate && (
                  <p className="text-xs text-muted-foreground">
                    Rappel programmé pour le {new Date(current.nextCallDate).toLocaleDateString("fr-FR")}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <StickyNote className="size-4" />
                Notes
              </p>
              <div className="flex flex-wrap gap-1.5">
                {NOTE_SNIPPETS.map((snippet) => (
                  <Button
                    key={snippet}
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() =>
                      setDraftNotes((prev) => (prev.trim() ? `${prev}\n${snippet}` : snippet))
                    }
                  >
                    {snippet}
                  </Button>
                ))}
              </div>
              <Textarea
                value={draftNotes}
                onChange={(e) => setDraftNotes(e.target.value)}
                onBlur={saveNotesIfDirty}
                placeholder="Notes de l'appel précédent ou en cours…"
                className="min-h-24"
              />
            </div>

            {/* Historique récent */}
            {current.history && current.history.length > 0 && (
              <div className="space-y-1.5 border-t pt-3">
                <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <History className="size-3.5" />
                  Historique récent
                </p>
                <div className="max-h-24 overflow-y-auto space-y-1 pl-1 text-xs">
                  {[...current.history].reverse().slice(0, 3).map((entry) => (
                    <div key={entry.id} className="flex justify-between gap-2 text-muted-foreground">
                      <span className="truncate">{entry.action}</span>
                      <span className="shrink-0 text-[10px] opacity-70">
                        {new Date(entry.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-auto flex items-center justify-between gap-3 border-t pt-4">
              <StatusButtons
                size="default"
                status={current.status}
                onChange={(s, reason) => {
                  saveNotesIfDirty();
                  onStatusChange(current.id, s, reason);
                  if (s !== "todo") toast.success("Statut enregistré.");
                }}
              />
              <Button
                variant="outline"
                onClick={() => {
                  saveNotesIfDirty();
                  setSkipped((prev) => [...prev, current.id]);
                }}
              >
                Suivant
                <ArrowRight className="size-4" />
              </Button>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Raccourcis : 1 À faire · 2 Succès · 3 Échec · Entrée Suivant
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

