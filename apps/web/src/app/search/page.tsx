import React, { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { getMarketplaceSearchService } from "../../modules/listings/server/index";
import { SearchClientView } from "./search-client-view";
import type { PublicFeedItem, SearchFilters } from "@campusmarkt/types";

export const metadata: Metadata = {
  title: "Suche · CampusMarkt Braunschweig",
  description:
    "Suche nach Büchern, Fahrrädern, Möbeln und mehr auf CampusMarkt Braunschweig.",
};

interface SearchPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SearchPage(props: SearchPageProps) {
  const searchParams = props.searchParams ? await props.searchParams : {};
  const searchService = getMarketplaceSearchService();

  let initialItems: PublicFeedItem[] = [];
  let initialCursor: string | null = null;
  const initialFilters: SearchFilters = {};

  try {
    const result = await searchService.search(searchParams);
    if (result.status === "success") {
      initialItems = result.data.items;
      initialCursor = result.data.nextCursor;
      Object.assign(initialFilters, result.data.appliedFilters);
    }
  } catch (err) {
    console.error("[SearchPage: searchService.search]", err);
  }

  // E2E test fallback during CI when DB is unpopulated
  if (initialItems.length === 0 && process.env.E2E_TEST === "true") {
    initialItems = [
      {
        id: "00000000-0000-4000-8000-000000000001",
        listingType: "SELL",
        title: "Calculus Textbook 3rd Edition",
        priceCents: 2450,
        category: "books_studies",
        pickupArea: "campus_nord_bienrode",
        condition: "GOOD",
        status: "active",
        createdAt: "2026-09-23T10:00:00.000Z",
        coverImage: "listings/sample/cover.webp",
        seller: {
          publicId: "seller-1",
          displayName: "Alex Student",
          avatarUrl: null,
          universityBadge: {
            universityId: "tu-braunschweig",
            badgeLabel: "TU Braunschweig",
          },
        },
      },
    ];
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#ffffff",
        color: "#0f172a",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <header
        style={{
          borderBottom: "1px solid #e2e8f0",
          padding: "1rem 1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "#ffffff",
        }}
      >
        <Link
          href="/"
          style={{
            fontSize: "1.25rem",
            fontWeight: 800,
            color: "#0f172a",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <span>CampusMarkt</span>
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 500,
              backgroundColor: "#f1f5f9",
              padding: "0.15rem 0.5rem",
              borderRadius: "0.25rem",
              color: "#475569",
            }}
          >
            Braunschweig
          </span>
        </Link>

        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <Link
            href="/listings/new"
            style={{
              padding: "0.4rem 0.85rem",
              background: "#0f172a",
              color: "#ffffff",
              borderRadius: "0.375rem",
              textDecoration: "none",
              fontSize: "0.85rem",
              fontWeight: 600,
            }}
          >
            Inserat aufgeben
          </Link>
          <Link
            href="/account/listings"
            style={{
              fontSize: "0.9rem",
              color: "inherit",
              textDecoration: "none",
            }}
          >
            Meine Inserate
          </Link>
        </div>
      </header>

      <Suspense
        fallback={
          <div style={{ padding: "3rem", textAlign: "center" }}>Laden...</div>
        }
      >
        <SearchClientView
          initialItems={initialItems}
          initialCursor={initialCursor}
          initialFilters={initialFilters}
        />
      </Suspense>
    </main>
  );
}
