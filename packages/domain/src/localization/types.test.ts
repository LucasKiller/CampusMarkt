import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  isSupportedLocale,
  type Dictionary,
  type DictionaryNamespace,
  type SupportedLocale,
} from "./types.ts";

describe("localization types & predicates", () => {
  it("defines supported locales containing german and english", () => {
    expect(SUPPORTED_LOCALES).toEqual(["de", "en"]);
    expect(DEFAULT_LOCALE).toBe("de");
  });

  it("accurately identifies supported locales via type predicate", () => {
    expect(isSupportedLocale("de")).toBe(true);
    expect(isSupportedLocale("en")).toBe(true);
    expect(isSupportedLocale("fr")).toBe(false);
    expect(isSupportedLocale("es")).toBe(false);
    expect(isSupportedLocale("")).toBe(false);
    expect(isSupportedLocale(null)).toBe(false);
    expect(isSupportedLocale(undefined)).toBe(false);
    expect(isSupportedLocale(123)).toBe(false);
    expect(isSupportedLocale({})).toBe(false);
    expect(isSupportedLocale(["de"])).toBe(false);
  });

  it("satisfies dictionary structural schema", () => {
    const mockDict: Dictionary = {
      common: {
        appName: "CampusMarkt",
        tagline: "Test Tagline",
        loading: "Loading",
        save: "Save",
        cancel: "Cancel",
        confirm: "Confirm",
        back: "Back",
        close: "Close",
        error: "Error",
        success: "Success",
      },
      nav: {
        browse: "Browse",
        createListing: "Create",
        inbox: "Inbox",
        favorites: "Favorites",
        myListings: "My Listings",
        reservations: "Reservations",
        moderation: "Moderation",
        signIn: "Sign In",
        signOut: "Sign Out",
        profile: "Profile",
        language: "Language",
      },
      listings: {
        typeSell: "Sell",
        typeGiveAway: "Give Away",
        typeWanted: "Wanted",
        statusActive: "Active",
        statusReserved: "Reserved",
        statusSold: "Sold",
        statusArchived: "Archived",
        free: "Free",
        locationBraunschweig: "Braunschweig",
        pickupOnly: "Pickup Only",
      },
      messaging: {
        title: "Messages",
        typeMessagePlaceholder: "Write a message...",
        send: "Send",
        emptyInbox: "No messages",
      },
      negotiation: {
        makeOffer: "Make Offer",
        acceptOffer: "Accept",
        declineOffer: "Decline",
        withdrawOffer: "Withdraw",
        reserve: "Reserve",
        cancelReservation: "Cancel Reservation",
        markCompleted: "Mark Completed",
      },
      safety: {
        report: "Report",
        block: "Block",
        blockedUsers: "Blocked Users",
        unblock: "Unblock",
      },
      moderation: {
        queue: "Queue",
        auditLog: "Audit Log",
        dismiss: "Dismiss",
        removeListing: "Remove Listing",
        suspendUser: "Suspend User",
      },
      legal: {
        impressum: "Impressum",
        datenschutz: "Datenschutz",
        agb: "AGB",
        allRightsReserved: "All rights reserved",
        bindingGermanNotice: "German version is binding",
      },
    };

    const namespace: DictionaryNamespace = "common";
    expect(mockDict[namespace].appName).toBe("CampusMarkt");

    const locale: SupportedLocale = "de";
    expect(isSupportedLocale(locale)).toBe(true);
  });
});
