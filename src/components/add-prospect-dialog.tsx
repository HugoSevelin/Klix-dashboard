"use client";

import { useState } from "react";
import { AlertTriangle, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { makeHistoryEntry } from "@/lib/store";
import type { Prospect } from "@/lib/types";
import { findDuplicateProspect } from "@/lib/utils";

interface AddProspectDialogProps {
  prospects: Prospect[];
  onAdd: (prospect: Prospect) => void;
}

const EMPTY_FORM = {
  company: "",
  phone: "",
  address: "",
  city: "",
  businessType: "",
  website: "",
  priority: false,
};

export function AddProspectDialog({ prospects, onAdd }: AddProspectDialogProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [duplicate, setDuplicate] = useState<Prospect | null>(null);

  function handleChange(field: keyof typeof EMPTY_FORM, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
    setDuplicate(null);
  }

  function submit() {
    const now = new Date().toISOString();
    const prospect: Prospect = {
      id: crypto.randomUUID(),
      company: form.company.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      businessType: form.businessType.trim(),
      website: form.website.trim(),
      extra: {},
      status: "todo",
      callAttempts: 0,
      priority: form.priority,
      notes: "",
      history: [makeHistoryEntry("Ajouté manuellement")],
      createdAt: now,
      updatedAt: now,
    };
    onAdd(prospect);
    toast.success("Prospect ajouté.");
    setForm(EMPTY_FORM);
    setDuplicate(null);
    setOpen(false);
  }

  function handleSubmit() {
    if (!form.company.trim()) {
      toast.error("Le nom de l'entreprise est obligatoire.");
      return;
    }
    if (!duplicate) {
      const match = findDuplicateProspect(prospects, form.company, form.phone);
      if (match) {
        setDuplicate(match);
        return;
      }
    }
    submit();
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <UserPlus className="size-4" />
        Ajouter un prospect
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setForm(EMPTY_FORM);
            setDuplicate(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="size-4" />
              Ajouter un prospect
            </DialogTitle>
            <DialogDescription>
              Renseignez les informations du prospect. Seul le nom de
              l&apos;entreprise est obligatoire.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="add-company">
                Nom de l&apos;entreprise <span className="text-destructive">*</span>
              </Label>
              <Input
                id="add-company"
                value={form.company}
                onChange={(e) => handleChange("company", e.target.value)}
                placeholder="Ex. Boulangerie Dupont"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="add-phone">Téléphone</Label>
                <Input
                  id="add-phone"
                  value={form.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="06 12 34 56 78"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="add-city">Ville</Label>
                <Input
                  id="add-city"
                  value={form.city}
                  onChange={(e) => handleChange("city", e.target.value)}
                  placeholder="Paris"
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="add-address">Adresse</Label>
              <Input
                id="add-address"
                value={form.address}
                onChange={(e) => handleChange("address", e.target.value)}
                placeholder="12 rue de la Paix, 75002 Paris"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="add-type">Type d&apos;entreprise</Label>
                <Input
                  id="add-type"
                  value={form.businessType}
                  onChange={(e) => handleChange("businessType", e.target.value)}
                  placeholder="Restauration, BTP…"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="add-website">Site internet</Label>
                <Input
                  id="add-website"
                  value={form.website}
                  onChange={(e) => handleChange("website", e.target.value)}
                  placeholder="exemple.fr"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="add-priority"
                checked={form.priority}
                onCheckedChange={(checked) => handleChange("priority", checked === true)}
              />
              <Label htmlFor="add-priority" className="font-normal">
                Prospect prioritaire
              </Label>
            </div>

            {duplicate && (
              <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-600 dark:text-amber-400">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>
                  Un prospect similaire existe déjà : <strong>{duplicate.company}</strong>
                  {duplicate.phone && <> — {duplicate.phone}</>}.
                </span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSubmit}>
              {duplicate ? "Ajouter quand même" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
