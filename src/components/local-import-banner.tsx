"use client";

import { useEffect, useState } from "react";
import { DatabaseZap, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Prospect } from "@/lib/types";

const LEGACY_KEY = "klix-prospects-v1";
const STATUS_KEY = "klix-local-import-status-v1";

interface LocalImportBannerProps {
  onImport: (prospects: Prospect[]) => void;
}

export function LocalImportBanner({ onImport }: LocalImportBannerProps) {
  const [localProspects, setLocalProspects] = useState<Prospect[] | null>(null);

  useEffect(() => {
    try {
      const status = window.localStorage.getItem(STATUS_KEY);
      if (status === "done" || status === "dismissed") return;
      const raw = window.localStorage.getItem(LEGACY_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setLocalProspects(parsed);
      }
    } catch {
      // stockage local illisible : on ignore silencieusement
    }
  }, []);

  if (!localProspects) return null;

  function handleImport() {
    if (!localProspects) return;
    onImport(localProspects);
    window.localStorage.setItem(STATUS_KEY, "done");
    setLocalProspects(null);
    toast.success(`${localProspects.length} prospect(s) importé(s) dans votre compte.`);
  }

  function handleDismiss() {
    window.localStorage.setItem(STATUS_KEY, "dismissed");
    setLocalProspects(null);
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <DatabaseZap className="size-5 shrink-0 text-primary" />
          <p className="text-sm">
            <span className="font-medium">{localProspects.length} prospect(s)</span> trouvé(s)
            dans le stockage local de ce navigateur. Les importer dans votre compte ?
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button size="sm" onClick={handleImport}>
            Importer
          </Button>
          <Button size="icon-sm" variant="ghost" onClick={handleDismiss} title="Ignorer">
            <X className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
