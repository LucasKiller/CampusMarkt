"use client";

import { useState } from "react";
import type { ListingStatus } from "@campusmarkt/domain";
import type { ListingEntity } from "@campusmarkt/types";
import {
  STATUS_BADGE_STYLES,
  STATUS_LABELS,
} from "../../listings/[id]/manage/listing-manage-editor";
import {
  CATEGORY_LABELS,
  PICKUP_AREA_LABELS,
} from "../../listings/new/listing-create-form";

export interface MyListingsViewProps {
  initialListings: ListingEntity[];
}

export function MyListingsView({ initialListings }: MyListingsViewProps) {
  const [filterStatus, setFilterStatus] = useState<ListingStatus | "all">(
    "all",
  );

  const filteredListings = initialListings.filter((l) =>
    filterStatus === "all" ? true : l.status === filterStatus,
  );

  return (
    <div className="my-listings-view">
      {/* Top action bar & filter tabs */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setFilterStatus("all")}
            style={{
              fontSize: "0.85rem",
              padding: "0.4rem 0.85rem",
              fontWeight: filterStatus === "all" ? 700 : 500,
              background: filterStatus === "all" ? "#17231c" : "#ffffff",
              color: filterStatus === "all" ? "#ffffff" : "#17231c",
            }}
          >
            All ({initialListings.length})
          </button>
          {(["active", "reserved", "sold", "archived"] as const).map((st) => {
            const count = initialListings.filter((l) => l.status === st).length;
            const active = filterStatus === st;
            return (
              <button
                type="button"
                key={st}
                className="btn-secondary"
                onClick={() => setFilterStatus(st)}
                style={{
                  fontSize: "0.85rem",
                  padding: "0.4rem 0.85rem",
                  fontWeight: active ? 700 : 500,
                  background: active ? "#17231c" : "#ffffff",
                  color: active ? "#ffffff" : "#17231c",
                }}
              >
                {STATUS_LABELS[st]} ({count})
              </button>
            );
          })}
        </div>

        <a
          href="/listings/new"
          className="btn-primary"
          style={{
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            padding: "0.5rem 1rem",
            fontSize: "0.9rem",
          }}
        >
          + Create New Listing
        </a>
      </div>

      {filteredListings.length === 0 ? (
        <div
          role="region"
          aria-label="No listings"
          style={{
            padding: "3rem 1.5rem",
            textAlign: "center",
            background: "#ffffff",
            border: "1px dashed #cbd5e1",
            borderRadius: "0.5rem",
          }}
        >
          <p style={{ color: "#64748b", margin: "0 0 1rem 0" }}>
            {filterStatus === "all"
              ? "You haven't created any listings yet."
              : `No listings with status "${STATUS_LABELS[filterStatus as ListingStatus]}".`}
          </p>
          <a
            href="/listings/new"
            className="btn-secondary"
            style={{ textDecoration: "none", display: "inline-block" }}
          >
            Create your first listing
          </a>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "1.25rem",
          }}
        >
          {filteredListings.map((listing) => {
            const badge = STATUS_BADGE_STYLES[listing.status];
            const coverImage = listing.media?.[0];

            return (
              <article
                key={listing.id}
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "0.5rem",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  transition: "box-shadow 0.15s ease",
                }}
              >
                {/* Cover Photo */}
                <div
                  style={{
                    height: "180px",
                    background: "#f1f5f9",
                    position: "relative",
                  }}
                >
                  {coverImage ? (
                    <img
                      src={`/api/listings/media/preview?path=${encodeURIComponent(coverImage.storagePath)}`}
                      alt={listing.title}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#94a3b8",
                        fontSize: "0.85rem",
                      }}
                    >
                      No Photo Provided
                    </div>
                  )}

                  {/* Status Badge */}
                  <span
                    style={{
                      position: "absolute",
                      top: "8px",
                      right: "8px",
                      padding: "0.2rem 0.6rem",
                      borderRadius: "9999px",
                      background: badge.bg,
                      color: badge.color,
                      border: `1px solid ${badge.border}`,
                      fontSize: "0.75rem",
                      fontWeight: 700,
                    }}
                  >
                    {STATUS_LABELS[listing.status]}
                  </span>

                  {/* Intent Badge */}
                  <span
                    style={{
                      position: "absolute",
                      top: "8px",
                      left: "8px",
                      padding: "0.2rem 0.6rem",
                      borderRadius: "4px",
                      background: "rgba(0,0,0,0.75)",
                      color: "#ffffff",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                    }}
                  >
                    {listing.listingType === "SELL" && "Sell"}
                    {listing.listingType === "GIVE_AWAY" && "Giveaway"}
                    {listing.listingType === "WANTED" && "Wanted"}
                  </span>
                </div>

                {/* Content */}
                <div
                  style={{
                    padding: "1rem",
                    display: "flex",
                    flexDirection: "column",
                    flex: 1,
                  }}
                >
                  <h2
                    style={{
                      margin: "0 0 0.5rem 0",
                      fontSize: "1.1rem",
                      fontWeight: 700,
                      lineHeight: 1.3,
                    }}
                  >
                    {listing.title}
                  </h2>

                  <p
                    style={{
                      margin: "0 0 0.75rem 0",
                      fontSize: "1.15rem",
                      fontWeight: 800,
                      color: listing.priceCents === 0 ? "#059669" : "#17231c",
                    }}
                  >
                    {listing.listingType === "GIVE_AWAY"
                      ? "Free (Verschenken)"
                      : listing.priceCents !== null
                        ? `€${(listing.priceCents / 100).toFixed(2)}`
                        : "No budget specified"}
                  </p>

                  <div
                    style={{
                      fontSize: "0.8rem",
                      color: "#64748b",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.25rem",
                      marginBottom: "1rem",
                    }}
                  >
                    <span>
                      {CATEGORY_LABELS[listing.category] || listing.category}
                    </span>
                    <span>
                      {PICKUP_AREA_LABELS[listing.pickupArea] ||
                        listing.pickupArea}
                    </span>
                  </div>

                  <div style={{ marginTop: "auto", paddingTop: "0.75rem" }}>
                    <a
                      href={`/listings/${listing.id}/manage`}
                      className="btn-secondary"
                      style={{
                        display: "block",
                        textAlign: "center",
                        textDecoration: "none",
                        fontSize: "0.85rem",
                        padding: "0.45rem",
                      }}
                    >
                      Manage Listing
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
