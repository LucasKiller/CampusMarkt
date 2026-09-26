export const SUPPORTED_LOCALES = ["de", "en"] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = "de";

export interface Dictionary {
  common: {
    appName: string;
    tagline: string;
    loading: string;
    save: string;
    cancel: string;
    confirm: string;
    back: string;
    close: string;
    error: string;
    success: string;
  };
  nav: {
    browse: string;
    createListing: string;
    inbox: string;
    favorites: string;
    myListings: string;
    reservations: string;
    moderation: string;
    signIn: string;
    signOut: string;
    profile: string;
    language: string;
  };
  listings: {
    typeSell: string;
    typeGiveAway: string;
    typeWanted: string;
    statusActive: string;
    statusReserved: string;
    statusSold: string;
    statusArchived: string;
    free: string;
    locationBraunschweig: string;
    pickupOnly: string;
  };
  messaging: {
    title: string;
    typeMessagePlaceholder: string;
    send: string;
    emptyInbox: string;
  };
  negotiation: {
    makeOffer: string;
    acceptOffer: string;
    declineOffer: string;
    withdrawOffer: string;
    reserve: string;
    cancelReservation: string;
    markCompleted: string;
  };
  safety: {
    report: string;
    block: string;
    blockedUsers: string;
    unblock: string;
  };
  moderation: {
    queue: string;
    auditLog: string;
    dismiss: string;
    removeListing: string;
    suspendUser: string;
  };
  legal: {
    impressum: string;
    datenschutz: string;
    agb: string;
    allRightsReserved: string;
    bindingGermanNotice: string;
  };
}

export type DictionaryNamespace = keyof Dictionary;

export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return (
    typeof value === "string" &&
    (SUPPORTED_LOCALES as readonly string[]).includes(value)
  );
}
