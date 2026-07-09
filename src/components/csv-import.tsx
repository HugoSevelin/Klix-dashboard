"use client";

import { useRef, useState } from "react";
import Papa from "papaparse";
import { FileUp, Upload } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { makeHistoryEntry } from "@/lib/store";
import type { Prospect } from "@/lib/types";
import { findDuplicateProspect } from "@/lib/utils";

type MappableField = "company" | "phone" | "address" | "city" | "businessType" | "website";

const FIELD_LABELS: Record<MappableField, string> = {
  company: "Nom de l'entreprise",
  phone: "Téléphone",
  address: "Adresse",
  city: "Ville",
  businessType: "Type d'entreprise",
  website: "Site internet",
};

const NONE = "__none__";

// Heuristiques de détection automatique des colonnes (insensible à la casse/accents)
const FIELD_KEYWORDS: Record<MappableField, string[]> = {
  company: ["entreprise", "societe", "company", "nom", "name", "raison sociale", "business"],
  phone: ["telephone", "tel", "phone", "mobile", "portable", "numero"],
  address: ["adresse", "address", "localisation", "location"],
  city: ["ville", "city", "commune", "localite"],
  businessType: ["secteur", "type", "categorie", "activite", "domaine", "industry", "sector"],
  website: ["site", "website", "url", "site web", "site internet"],
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    // supprime les diacritiques (accents) après décomposition NFD
    .replace(/[̀-ͯ]/g, "");
}

function autoMap(headers: string[]): Record<MappableField, string> {
  const result = { company: "", phone: "", address: "", city: "", businessType: "", website: "" };
  const taken = new Set<string>();
  for (const field of ["phone", "address", "city", "website", "businessType", "company"] as MappableField[]) {
    for (const keyword of FIELD_KEYWORDS[field]) {
      const match = headers.find(
        (h) => !taken.has(h) && normalize(h).includes(keyword)
      );
      if (match) {
        result[field] = match;
        taken.add(match);
        break;
      }
    }
  }
  return result;
}

interface CsvImportProps {
  existingProspects: Prospect[];
  onImport: (prospects: Prospect[]) => void;
}

export function CsvImport({ existingProspects, onImport }: CsvImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<MappableField, string>>({
    company: "",
    phone: "",
    address: "",
    city: "",
    businessType: "",
    website: "",
  });

  function handleFile(file: File) {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      complete: (result) => {
        const parsedHeaders = (result.meta.fields ?? []).filter(Boolean);
        if (parsedHeaders.length === 0 || result.data.length === 0) {
          toast.error("Fichier CSV vide ou illisible.");
          return;
        }
        setFileName(file.name);
        setHeaders(parsedHeaders);
        setRows(result.data);
        setMapping(autoMap(parsedHeaders));
        setOpen(true);
      },
      error: () => toast.error("Impossible de lire le fichier CSV."),
    });
  }

  function handleImport() {
    if (!mapping.company) {
      toast.error("Sélectionnez au minimum la colonne « Nom de l'entreprise ».");
      return;
    }
    const mapped = new Set(Object.values(mapping).filter(Boolean));
    const now = new Date().toISOString();
    const parsed: Prospect[] = rows
      .map((row) => {
        const extra: Record<string, string> = {};
        for (const h of headers) {
          if (!mapped.has(h) && row[h]?.trim()) extra[h] = row[h].trim();
        }
        return {
          id: crypto.randomUUID(),
          company: (row[mapping.company] ?? "").trim(),
          phone: mapping.phone ? (row[mapping.phone] ?? "").trim() : "",
          address: mapping.address ? (row[mapping.address] ?? "").trim() : "",
          city: mapping.city ? (row[mapping.city] ?? "").trim() : "",
          businessType: mapping.businessType ? (row[mapping.businessType] ?? "").trim() : "",
          website: mapping.website ? (row[mapping.website] ?? "").trim() : "",
          extra,
          status: "todo" as const,
          callAttempts: 0,
          priority: false,
          notes: "",
          history: [makeHistoryEntry(`Importé depuis ${fileName}`)],
          createdAt: now,
          updatedAt: now,
        };
      })
      .filter((p) => p.company);
    if (parsed.length === 0) {
      toast.error("Aucune ligne valide trouvée (nom d'entreprise manquant).");
      return;
    }

    // Écarte les doublons : contre les prospects déjà en base, puis entre
    // les lignes du fichier lui-même.
    const prospects: Prospect[] = [];
    let duplicateCount = 0;
    for (const p of parsed) {
      const isDuplicate =
        findDuplicateProspect(existingProspects, p.company, p.phone) ||
        findDuplicateProspect(prospects, p.company, p.phone);
      if (isDuplicate) {
        duplicateCount++;
        continue;
      }
      prospects.push(p);
    }

    if (prospects.length === 0) {
      toast.error("Toutes les lignes correspondent à des prospects déjà existants.");
      return;
    }
    onImport(prospects);
    toast.success(
      duplicateCount > 0
        ? `${prospects.length} prospect(s) importé(s), ${duplicateCount} doublon(s) ignoré(s).`
        : `${prospects.length} prospect(s) importé(s).`
    );
    setOpen(false);
    setRows([]);
    setHeaders([]);
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      <Button onClick={() => fileInputRef.current?.click()}>
        <Upload className="size-4" />
        Importer un CSV
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileUp className="size-4" />
              Mapping des colonnes
            </DialogTitle>
            <DialogDescription>
              {fileName} — {rows.length} ligne(s) détectée(s). Vérifiez la
              correspondance des colonnes ; les colonnes non mappées seront
              conservées comme informations supplémentaires.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {(Object.keys(FIELD_LABELS) as MappableField[]).map((field) => (
              <div key={field} className="grid grid-cols-2 items-center gap-3">
                <Label>
                  {FIELD_LABELS[field]}
                  {field === "company" && (
                    <span className="text-destructive"> *</span>
                  )}
                </Label>
                <Select
                  value={mapping[field] || NONE}
                  onValueChange={(v) =>
                    setMapping((m) => ({ ...m, [field]: v === NONE ? "" : v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir une colonne" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>— Aucune —</SelectItem>
                    {headers.map((h) => (
                      <SelectItem key={h} value={h}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleImport}>
              Importer {rows.length} prospect(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
