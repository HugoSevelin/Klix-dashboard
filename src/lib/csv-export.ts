import Papa from "papaparse";
import type { Prospect } from "./types";
import { FAILURE_REASON_LABELS, STATUS_LABELS } from "./types";

export function exportProspectsToCsv(prospects: Prospect[]): void {
  const extraKeys = Array.from(new Set(prospects.flatMap((p) => Object.keys(p.extra))));

  const rows = prospects.map((p) => {
    const row: Record<string, string> = {
      "Nom de l'entreprise": p.company,
      Téléphone: p.phone,
      Adresse: p.address,
      Statut: STATUS_LABELS[p.status],
      "Raison de l'échec": p.failureReason ? FAILURE_REASON_LABELS[p.failureReason] : "",
      "Rappel prévu le": p.nextCallDate ? p.nextCallDate.slice(0, 10) : "",
      "Tentatives d'appel": String(p.callAttempts),
      Notes: p.notes,
      Historique: p.history.map((h) => `[${h.date.slice(0, 16).replace("T", " ")}] ${h.action}`).join(" | "),
      "Créé le": p.createdAt,
      "Modifié le": p.updatedAt,
    };
    for (const key of extraKeys) row[key] = p.extra[key] ?? "";
    return row;
  });

  const csv = Papa.unparse(rows, { delimiter: ";" });
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `prospects-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
