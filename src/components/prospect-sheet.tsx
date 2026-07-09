"use client";

import { useEffect, useState } from "react";
import {
  AlarmClock,
  Building2,
  Globe,
  History,
  MapPin,
  Phone,
  Star,
  StickyNote,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn, getProspectWebsite } from "@/lib/utils";
import { NOTE_SNIPPETS } from "@/lib/note-snippets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge, StatusButtons } from "@/components/status-controls";
import type { FailureReason, Prospect, ProspectStatus } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/types";

interface ProspectSheetProps {
  prospect: Prospect | null;
  onClose: () => void;
  onStatusChange: (id: string, status: ProspectStatus, failureReason?: FailureReason) => void;
  onPriorityChange: (id: string, priority: boolean) => void;
  onNotesChange: (id: string, notes: string) => void;
  onNotesSaved: (id: string) => void;
  onNextCallDateChange: (id: string, date: string | undefined) => void;
  onDelete: (prospect: Prospect) => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toDateInputValue(iso?: string): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export function ProspectSheet({
  prospect,
  onClose,
  onStatusChange,
  onPriorityChange,
  onNotesChange,
  onNotesSaved,
  onNextCallDateChange,
  onDelete,
}: ProspectSheetProps) {
  const [draftNotes, setDraftNotes] = useState("");

  useEffect(() => {
    setDraftNotes(prospect?.notes ?? "");
  }, [prospect?.id, prospect?.notes]);

  // Raccourcis clavier 1/2/3 pour changer le statut, désactivés si on tape dans un champ
  useEffect(() => {
    if (!prospect) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (!prospect) return;
      const target = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA"].includes(target.tagName) || target.isContentEditable) return;
      if (e.key === "1") onStatusChange(prospect.id, "todo");
      else if (e.key === "2") onStatusChange(prospect.id, "success");
      else if (e.key === "3") onStatusChange(prospect.id, "failed");
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [prospect, onStatusChange]);

  if (!prospect) {
    return <Sheet open={false} onOpenChange={() => {}} />;
  }

  const notesDirty = draftNotes !== prospect.notes;
  const historyDesc = [...prospect.history].reverse();

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <Building2 className="size-5 shrink-0" />
            {prospect.company}
          </SheetTitle>
          <SheetDescription className="sr-only">
            Fiche détaillée du prospect
          </SheetDescription>
          <div className="flex items-center gap-3 pt-1">
            <StatusBadge status={prospect.status} failureReason={prospect.failureReason} />
            <StatusButtons
              status={prospect.status}
              onChange={(s, reason) => onStatusChange(prospect.id, s, reason)}
            />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onPriorityChange(prospect.id, !prospect.priority)}
              title={prospect.priority ? "Retirer des prioritaires" : "Marquer comme prioritaire"}
            >
              <Star className={cn("size-4", prospect.priority && "fill-amber-400 text-amber-400")} />
            </Button>
          </div>
          <p className="pt-1 text-xs text-muted-foreground">
            Raccourcis : <kbd className="rounded border px-1">1</kbd> À faire ·{" "}
            <kbd className="rounded border px-1">2</kbd> Succès ·{" "}
            <kbd className="rounded border px-1">3</kbd> Échec
          </p>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-6 px-6 py-5">
            {/* Coordonnées */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Phone className="size-4 shrink-0 text-muted-foreground" />
                {prospect.phone ? (
                  <a
                    href={`tel:${prospect.phone.replace(/[^+\d]/g, "")}`}
                    className="text-base font-medium tabular-nums hover:underline"
                  >
                    {prospect.phone}
                  </a>
                ) : (
                  <span className="text-muted-foreground">Non renseigné</span>
                )}
              </div>
              {getProspectWebsite(prospect) && (
                <div className="flex items-center gap-3">
                  <Globe className="size-4 shrink-0 text-muted-foreground" />
                  <a
                    href={getProspectWebsite(prospect)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-base font-medium text-primary hover:underline"
                  >
                    {getProspectWebsite(prospect)!.replace(/^https?:\/\/(www\.)?/, "")}
                  </a>
                </div>
              )}
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span className={prospect.address ? "" : "text-muted-foreground"}>
                  {prospect.address || "Non renseignée"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <AlarmClock className="size-4 shrink-0 text-muted-foreground" />
                <div className="flex items-center gap-2">
                  <Label htmlFor="next-call-date" className="text-sm font-normal text-muted-foreground">
                    Rappeler le
                  </Label>
                  <Input
                    id="next-call-date"
                    type="date"
                    value={toDateInputValue(prospect.nextCallDate)}
                    onChange={(e) =>
                      onNextCallDateChange(
                        prospect.id,
                        e.target.value ? new Date(e.target.value).toISOString() : undefined
                      )
                    }
                    className="h-8 w-40"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>
                  Tentatives d&apos;appel : <span className="tabular-nums text-foreground">{prospect.callAttempts}</span>
                </span>
              </div>
            </div>

            {/* Informations supplémentaires du CSV */}
            {Object.keys(prospect.extra).length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Informations supplémentaires
                  </h3>
                  <dl className="grid gap-1.5">
                    {Object.entries(prospect.extra).map(([key, value]) => (
                      <div key={key} className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-2 text-sm">
                        <dt className="truncate text-muted-foreground">{key}</dt>
                        <dd className="break-words">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </>
            )}

            <Separator />

            {/* Notes d'appel */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <StickyNote className="size-4 text-muted-foreground" />
                Notes d&apos;appel
              </Label>
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
                placeholder="Prenez vos notes pendant l'appel…"
                className="min-h-32"
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  disabled={!notesDirty}
                  onClick={() => {
                    onNotesChange(prospect.id, draftNotes);
                    onNotesSaved(prospect.id);
                    toast.success("Note enregistrée.");
                  }}
                >
                  Enregistrer la note
                </Button>
              </div>
            </div>

            <Separator />

            {/* Historique */}
            <div className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-medium">
                <History className="size-4 text-muted-foreground" />
                Historique des actions
              </h3>
              {historyDesc.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune action.</p>
              ) : (
                <ol className="space-y-2 border-l pl-4">
                  {historyDesc.map((entry) => (
                    <li key={entry.id} className="text-sm">
                      <span className="block text-xs text-muted-foreground">
                        {formatDate(entry.date)}
                      </span>
                      {entry.action}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </ScrollArea>

        <div className="border-t px-6 py-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Statut actuel : {STATUS_LABELS[prospect.status]} · Modifié le{" "}
              {formatDate(prospect.updatedAt)}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-destructive"
              title="Supprimer ce prospect"
              onClick={() => {
                onDelete(prospect);
                onClose();
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
