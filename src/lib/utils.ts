import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Prospect } from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getProspectWebsite(prospect: Prospect): string | null {
  // If explicitly mapped
  if (prospect.website && prospect.website.trim()) {
    return formatWebsiteUrl(prospect.website);
  }

  // Otherwise, inspect extra fields
  const webKeywords = ["site", "web", "url", "lien", "website"];
  for (const [key, value] of Object.entries(prospect.extra)) {
    const normKey = key.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    const matchesKeyword = webKeywords.some(kw => normKey.includes(kw));
    const isUrlVal = value && (
      value.startsWith("http://") || 
      value.startsWith("https://") || 
      value.startsWith("www.") || 
      value.includes(".fr") || 
      value.includes(".com") || 
      value.includes(".org") || 
      value.includes(".net")
    );
    if ((matchesKeyword || isUrlVal) && value.trim()) {
      return formatWebsiteUrl(value);
    }
  }

  return null;
}

function formatWebsiteUrl(url: string): string {
  let cleaned = url.trim();
  if (!cleaned.startsWith("http://") && !cleaned.startsWith("https://")) {
    cleaned = "https://" + cleaned;
  }
  return cleaned;
}

export function getProspectType(prospect: Prospect): string | null {
  // If explicitly mapped
  if (prospect.businessType && prospect.businessType.trim()) {
    return prospect.businessType.trim();
  }

  // Otherwise, inspect extra fields
  const typeKeywords = ["secteur", "type", "categorie", "activite", "domaine", "industry", "sector"];
  for (const [key, value] of Object.entries(prospect.extra)) {
    const normKey = key.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    const matchesKeyword = typeKeywords.some(kw => normKey.includes(kw));
    if (matchesKeyword && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function findDuplicateProspect(
  prospects: Prospect[],
  company: string,
  phone: string
): Prospect | null {
  const normCompany = company.trim().toLowerCase();
  const normPhone = normalizePhone(phone);
  return (
    prospects.find((p) => {
      if (normPhone && normalizePhone(p.phone) === normPhone) return true;
      if (normCompany && p.company.trim().toLowerCase() === normCompany) return true;
      return false;
    }) ?? null
  );
}

export function getProspectCity(prospect: Prospect): string | null {
  // If explicitly mapped
  if (prospect.city && prospect.city.trim()) {
    return prospect.city.trim();
  }

  // Otherwise, inspect extra fields
  const cityKeywords = ["ville", "city", "commune", "localite"];
  for (const [key, value] of Object.entries(prospect.extra)) {
    const normKey = key.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    const matchesKeyword = cityKeywords.some(kw => normKey.includes(kw));
    if (matchesKeyword && value.trim()) {
      return value.trim();
    }
  }

  // Otherwise, extract from address
  if (prospect.address) {
    // Standard French address format: e.g. "12 rue de la Paix, 75002 Paris"
    const match = prospect.address.match(/\b\d{5}\s+([A-Za-zÀ-ÖØ-öø-ÿ\s'-]+)$/);
    if (match && match[1]) {
      return match[1].trim();
    }
    
    // Fallback if comma separated
    const parts = prospect.address.split(",");
    if (parts.length > 1) {
      const lastPart = parts[parts.length - 1].trim();
      if (!/\d/.test(lastPart)) {
        return lastPart;
      }
    }
  }

  return null;
}
