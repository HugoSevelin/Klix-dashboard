export type ProspectStatus = "todo" | "success" | "failed";

export type FailureReason =
  | "not_interested"
  | "voicemail"
  | "invalid_number"
  | "call_back_later"
  | "unreachable";

export const FAILURE_REASON_LABELS: Record<FailureReason, string> = {
  not_interested: "Pas intéressé",
  voicemail: "Répondeur",
  invalid_number: "Numéro invalide",
  call_back_later: "Rappeler plus tard",
  unreachable: "Injoignable",
};

export interface HistoryEntry {
  id: string;
  date: string; // ISO
  action: string;
}

export interface Prospect {
  id: string;
  company: string;
  phone: string;
  address: string;
  city?: string;
  website?: string;
  /** Colonnes CSV supplémentaires non mappées : { "Nom de colonne": "valeur" } */
  extra: Record<string, string>;
  status: ProspectStatus;
  /** Raison de l'échec, uniquement pertinente si status === "failed" */
  failureReason?: FailureReason;
  /** Date ISO du prochain rappel prévu, optionnelle */
  nextCallDate?: string;
  /** Nombre de fois où le prospect a été marqué succès ou échec */
  callAttempts: number;
  notes: string;
  history: HistoryEntry[];
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

export const STATUS_LABELS: Record<ProspectStatus, string> = {
  todo: "À faire",
  success: "Fait - Succès",
  failed: "Fait - Échec",
};
