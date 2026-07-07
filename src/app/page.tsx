"use client";

import { useMemo, useState } from "react";
import { CalendarClock, Download, PhoneCall, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CsvImport } from "@/components/csv-import";
import { DailyCallView } from "@/components/daily-call-view";
import { KpiCards } from "@/components/kpi-cards";
import { ProspectSheet } from "@/components/prospect-sheet";
import { ProspectTable } from "@/components/prospect-table";
import { StatsPanel } from "@/components/stats-panel";
import { exportProspectsToCsv } from "@/lib/csv-export";
import { useDailyGoal, useProspects } from "@/lib/store";

export default function DashboardPage() {
  const {
    prospects,
    hydrated,
    addProspects,
    setStatus,
    setNextCallDate,
    setNotes,
    logNoteSaved,
    removeProspect,
    clearAll,
  } = useProspects();
  const { goal, setGoal } = useDailyGoal();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [dailyCallOpen, setDailyCallOpen] = useState(false);

  const selected = useMemo(
    () => prospects.find((p) => p.id === selectedId) ?? null,
    [prospects, selectedId]
  );

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <PhoneCall className="size-6 text-primary" />
            Prospection téléphonique
          </h1>
          <p className="text-sm text-muted-foreground">
            Importez vos prospects, suivez vos appels, prenez des notes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {prospects.length > 0 && (
            <>
              <Button onClick={() => setDailyCallOpen(true)}>
                <CalendarClock className="size-4" />
                Appels du jour
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  exportProspectsToCsv(prospects);
                  toast.success("Export CSV téléchargé.");
                }}
              >
                <Download className="size-4" />
                Exporter en CSV
              </Button>
              <Button
                variant="outline"
                onClick={() => setConfirmClear(true)}
                className="text-destructive"
              >
                <Trash2 className="size-4" />
                Tout effacer
              </Button>
            </>
          )}
          <CsvImport onImport={addProspects} />
        </div>
      </header>

      {hydrated ? (
        <div className="space-y-8">
          <KpiCards prospects={prospects} />
          {prospects.length > 0 && (
            <StatsPanel prospects={prospects} dailyGoal={goal} onGoalChange={setGoal} />
          )}
          <ProspectTable
            prospects={prospects}
            onRowClick={(p) => setSelectedId(p.id)}
            onStatusChange={setStatus}
          />
        </div>
      ) : (
        <p className="py-16 text-center text-sm text-muted-foreground">
          Chargement…
        </p>
      )}

      <ProspectSheet
        prospect={selected}
        onClose={() => setSelectedId(null)}
        onStatusChange={setStatus}
        onNotesChange={setNotes}
        onNotesSaved={logNoteSaved}
        onNextCallDateChange={setNextCallDate}
        onDelete={removeProspect}
      />

      <DailyCallView
        open={dailyCallOpen}
        prospects={prospects}
        onClose={() => setDailyCallOpen(false)}
        onStatusChange={setStatus}
        onNotesChange={setNotes}
        onNotesSaved={logNoteSaved}
      />

      <Dialog open={confirmClear} onOpenChange={setConfirmClear}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Tout effacer ?</DialogTitle>
            <DialogDescription>
              Cette action supprime définitivement les {prospects.length}{" "}
              prospect(s), leurs notes et leur historique.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmClear(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                clearAll();
                setSelectedId(null);
                setConfirmClear(false);
                toast.success("Tous les prospects ont été supprimés.");
              }}
            >
              Supprimer tout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
