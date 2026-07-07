"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Globe, PartyPopper, Phone, StickyNote } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge, StatusButtons } from "@/components/status-controls";
import type { FailureReason, Prospect, ProspectStatus } from "@/lib/types";
import { getProspectWebsite } from "@/lib/utils";

interface DailyCallViewProps {
  open: boolean;
  prospects: Prospect[];
  onClose: () => void;
  onStatusChange: (id: string, status: ProspectStatus, failureReason?: FailureReason) => void;
  onNotesChange: (id: string, notes: string) => void;
  onNotesSaved: (id: string) => void;
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
}: DailyCallViewProps) {
  const [skipped, setSkipped] = useState<string[]>([]);
  const [draftNotes, setDraftNotes] = useState("");

  const queue = useMemo(() => {
    const today = startOfToday();
    const candidates = prospects.filter((p) => {
      if (p.status !== "todo") return false;
      if (!p.nextCallDate) return true;
      return new Date(p.nextCallDate).setHours(0, 0, 0, 0) <= today;
    });
    candidates.sort((a, b) => {
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

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex h-[85vh] flex-col sm:max-w-2xl">
        <DialogTitle className="flex items-center justify-between pr-6">
          <span>Appels du jour</span>
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
              <h2 className="text-xl font-semibold">{current.company}</h2>
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
                  <span className="text-muted-foreground">Téléphone non renseigné</span>
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

            <div className="space-y-1.5">
              <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <StickyNote className="size-4" />
                Notes
              </p>
              <Textarea
                value={draftNotes}
                onChange={(e) => setDraftNotes(e.target.value)}
                onBlur={saveNotesIfDirty}
                placeholder="Notes de l'appel précédent ou en cours…"
                className="min-h-24"
              />
            </div>

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
