import type {
  ItemCondition,
  ListingCategory,
  ListingType,
  PickupArea,
} from "./index.ts";

export type SupportedLocale = "de" | "en";

export const CATEGORY_LABELS_DE: Readonly<Record<ListingCategory, string>> = {
  furniture: "Möbel & Wohnen",
  electronics: "Elektronik & Technik",
  books_studies: "Bücher & Studium",
  bicycles_mobility: "Fahrräder & Mobilität",
  clothing: "Kleidung & Accessoires",
  home_kitchen: "Küche & Haushalt",
  other: "Sonstiges",
};

export const CATEGORY_LABELS_EN: Readonly<Record<ListingCategory, string>> = {
  furniture: "Furniture & Living",
  electronics: "Electronics & Tech",
  books_studies: "Books & Studies",
  bicycles_mobility: "Bicycles & Mobility",
  clothing: "Clothing & Accessories",
  home_kitchen: "Home & Kitchen",
  other: "Other",
};

export const PICKUP_AREA_LABELS_DE: Readonly<Record<PickupArea, string>> = {
  innenstadt: "Innenstadt",
  campus_tu_altgebaeude: "Campus / TU-Altgebäude",
  campus_nord_bienrode: "Campus Nord / Bienrode",
  oestliches_ringgebiet: "Östliches Ringgebiet",
  westliches_ringgebiet: "Westliches Ringgebiet",
  noerdliches_ringgebiet_siegfriedviertel:
    "Nördliches Ringgebiet / Siegfriedviertel",
  viewegs_garten_bebelhof: "Viewegs Garten / Bebelhof",
  heidberg_melverode: "Heidberg / Melverode",
  weststadt: "Weststadt",
  lehndorf_kanzlerfeld: "Lehndorf / Kanzlerfeld",
};

export const PICKUP_AREA_LABELS_EN: Readonly<Record<PickupArea, string>> = {
  innenstadt: "City Centre",
  campus_tu_altgebaeude: "Campus / TU Historic Main Building",
  campus_nord_bienrode: "Campus North / Bienrode",
  oestliches_ringgebiet: "Eastern Ring Area",
  westliches_ringgebiet: "Western Ring Area",
  noerdliches_ringgebiet_siegfriedviertel:
    "Northern Ring Area / Siegfriedviertel",
  viewegs_garten_bebelhof: "Viewegs Garden / Bebelhof",
  heidberg_melverode: "Heidberg / Melverode",
  weststadt: "Weststadt",
  lehndorf_kanzlerfeld: "Lehndorf / Kanzlerfeld",
};

export const CONDITION_LABELS_DE: Readonly<Record<ItemCondition, string>> = {
  NEW: "Neu",
  LIKE_NEW: "Wie neu",
  GOOD: "Gut",
  FAIR: "Akzeptabel",
};

export const CONDITION_LABELS_EN: Readonly<Record<ItemCondition, string>> = {
  NEW: "New",
  LIKE_NEW: "Like new",
  GOOD: "Good condition",
  FAIR: "Fair / Signs of wear",
};

export const LISTING_TYPE_LABELS_DE: Readonly<Record<ListingType, string>> = {
  SELL: "Verkauf",
  GIVE_AWAY: "Zu verschenken",
  WANTED: "Gesuch",
};

export const LISTING_TYPE_LABELS_EN: Readonly<Record<ListingType, string>> = {
  SELL: "For Sale",
  GIVE_AWAY: "Give Away",
  WANTED: "Wanted",
};

export function getCategoryLabel(
  category: ListingCategory,
  locale: SupportedLocale = "de",
): string {
  return locale === "en"
    ? (CATEGORY_LABELS_EN[category] ?? category)
    : (CATEGORY_LABELS_DE[category] ?? category);
}

export function getPickupAreaLabel(
  area: PickupArea,
  locale: SupportedLocale = "de",
): string {
  return locale === "en"
    ? (PICKUP_AREA_LABELS_EN[area] ?? area)
    : (PICKUP_AREA_LABELS_DE[area] ?? area);
}

export function getConditionLabel(
  condition: ItemCondition,
  locale: SupportedLocale = "de",
): string {
  return locale === "en"
    ? (CONDITION_LABELS_EN[condition] ?? condition)
    : (CONDITION_LABELS_DE[condition] ?? condition);
}

export function getListingTypeLabel(
  type: ListingType,
  locale: SupportedLocale = "de",
): string {
  return locale === "en"
    ? (LISTING_TYPE_LABELS_EN[type] ?? type)
    : (LISTING_TYPE_LABELS_DE[type] ?? type);
}

export interface CategoryBadgeInfo {
  category: ListingCategory;
  label: string;
  colorClass: string;
}

const CATEGORY_COLOR_CLASSES: Readonly<Record<ListingCategory, string>> = {
  furniture: "badge-amber",
  electronics: "badge-blue",
  books_studies: "badge-purple",
  bicycles_mobility: "badge-emerald",
  clothing: "badge-rose",
  home_kitchen: "badge-orange",
  other: "badge-slate",
};

export function getCategoryBadgeInfo(
  category: ListingCategory,
  locale: SupportedLocale = "de",
): CategoryBadgeInfo {
  return {
    category,
    label: getCategoryLabel(category, locale),
    colorClass: CATEGORY_COLOR_CLASSES[category] ?? "badge-slate",
  };
}

export function formatListingPrice(
  type: ListingType,
  priceCents: number | null | undefined,
  locale: SupportedLocale = "de",
): string {
  if (type === "GIVE_AWAY") {
    return locale === "en" ? "Free" : "Zu verschenken";
  }

  if (priceCents === null || priceCents === undefined) {
    if (type === "WANTED") {
      return locale === "en"
        ? "Max. budget not specified"
        : "Gesuch (Kein Budget)";
    }
    return "—";
  }

  const eurosFormatted = (priceCents / 100).toFixed(2);

  if (type === "WANTED") {
    return locale === "en"
      ? `Max. €${eurosFormatted}`
      : `Bis zu €${eurosFormatted}`;
  }

  return `€${eurosFormatted}`;
}

export function formatRelativeTime(
  timestamp: string | Date,
  now: Date = new Date(),
  locale: SupportedLocale = "de",
): string {
  const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
  const diffMs = now.getTime() - date.getTime();

  if (Number.isNaN(diffMs)) {
    return "";
  }

  // Handle future or small clock skew
  if (diffMs < 60_000) {
    return locale === "en" ? "Just now" : "Gerade eben";
  }

  const diffMinutes = Math.floor(diffMs / 60_000);
  if (diffMinutes < 60) {
    if (locale === "en") {
      return diffMinutes === 1 ? "1 minute ago" : `${diffMinutes} minutes ago`;
    }
    return diffMinutes === 1 ? "vor 1 Minute" : `vor ${diffMinutes} Minuten`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    if (locale === "en") {
      return diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago`;
    }
    return diffHours === 1 ? "vor 1 Stunde" : `vor ${diffHours} Stunden`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    if (locale === "en") {
      return diffDays === 1 ? "Yesterday" : `${diffDays} days ago`;
    }
    return diffDays === 1 ? "Gestern" : `vor ${diffDays} Tagen`;
  }

  // Older dates: format as DD.MM.YYYY
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}.${month}.${year}`;
}
