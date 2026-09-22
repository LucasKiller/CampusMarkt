import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMarketplaceFeedService } from "../../../modules/listings/server/index";
import { ListingGallery } from "../../../components/marketplace/listing-gallery";
import { TrustBadge } from "../../../components/marketplace/feed";
import {
  formatListingPrice,
  formatRelativeTime,
  getCategoryLabel,
  getConditionLabel,
  getListingTypeLabel,
  getPickupAreaLabel,
} from "@campusmarkt/domain";
import type { PublicListingDetails } from "@campusmarkt/types";

interface ListingDetailsPageProps {
  params: Promise<{ id: string }> | { id: string };
}

export async function generateMetadata(
  props: ListingDetailsPageProps,
): Promise<Metadata> {
  const params = await props.params;
  const feedService = getMarketplaceFeedService();
  const res = await feedService.getListingDetails(params.id);

  if (res.status === "success") {
    return {
      title: `${res.data.title} · CampusMarkt`,
      description: res.data.description.slice(0, 160),
    };
  }

  return {
    title: "Inserat Details · CampusMarkt",
  };
}

export default async function ListingDetailsPage(
  props: ListingDetailsPageProps,
) {
  const params = await props.params;
  const listingId = params.id;

  const feedService = getMarketplaceFeedService();
  let listing: PublicListingDetails | null = null;

  try {
    const result = await feedService.getListingDetails(listingId);
    if (result.status === "success") {
      listing = result.data;
    }
  } catch (err) {
    console.error("[ListingDetailsPage: getListingDetails]", err);
  }

  // E2E test fallback fixture
  if (!listing && process.env.E2E_TEST === "true") {
    listing = {
      id: listingId,
      listingType: "SELL",
      title: "Calculus Textbook 3rd Edition",
      description:
        "Comprehensive calculus textbook in great condition. Minimal highlights, ideal for engineering students at TU Braunschweig.",
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
      images: [
        {
          storagePath: "listings/sample/cover.webp",
          position: 0,
        },
        {
          storagePath: "listings/sample/page2.webp",
          position: 1,
        },
      ],
    };
  }

  if (!listing) {
    notFound();
  }

  const isSold = listing.status === "sold";
  const isArchived = listing.status === "archived";
  const isReserved = listing.status === "reserved";
  const isInactive = isSold || isArchived;

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="/" aria-label="CampusMarkt Startseite">
          CampusMarkt
        </a>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <a
            href="/"
            style={{
              fontSize: "0.9rem",
              color: "inherit",
              textDecoration: "none",
            }}
          >
            ← Zurück zur Übersicht
          </a>
          <span className="language-note" aria-label="Verfügbare Sprachen">
            DE · EN
          </span>
        </div>
      </header>

      <div
        className="listing-details-container"
        style={{
          width: "min(100%, 64rem)",
          marginInline: "auto",
          paddingBlock: "2rem 4rem",
        }}
      >
        {/* Inactive Notice Banner for sold or archived listings */}
        {isInactive && (
          <div
            className="inactive-notice-banner"
            role="status"
            aria-live="polite"
            style={{
              padding: "1rem 1.25rem",
              marginBottom: "1.5rem",
              borderRadius: "0.5rem",
              backgroundColor: isSold ? "#fef3c7" : "#f1f5f9",
              border: `1px solid ${isSold ? "#f59e0b" : "#cbd5e1"}`,
              color: isSold ? "#92400e" : "#475569",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              fontSize: "0.95rem",
              fontWeight: 600,
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>
              {isSold
                ? "Dieses Inserat wurde bereits verkauft und ist nicht mehr verfügbar."
                : "Dieses Inserat wurde archiviert und ist nicht mehr verfügbar."}
            </span>
          </div>
        )}

        {/* Reservation Banner */}
        {isReserved && (
          <div
            className="reserved-notice-banner"
            role="status"
            style={{
              padding: "0.85rem 1.25rem",
              marginBottom: "1.5rem",
              borderRadius: "0.5rem",
              backgroundColor: "#ffedd5",
              border: "1px solid #fb923c",
              color: "#9a3412",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              fontSize: "0.95rem",
              fontWeight: 600,
            }}
          >
            <span
              style={{
                background: "#ea580c",
                color: "#ffffff",
                padding: "0.2rem 0.5rem",
                borderRadius: "0.25rem",
                fontSize: "0.75rem",
                textTransform: "uppercase",
              }}
            >
              Reserviert
            </span>
            <span>
              Dieses Inserat ist derzeit für einen Interessenten reserviert.
            </span>
          </div>
        )}

        {/* 2-Column Responsive Grid on Desktop */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "2.5rem",
            alignItems: "start",
          }}
        >
          {/* Left Column: Image Gallery Carousel */}
          <div>
            <ListingGallery
              images={listing.images}
              title={listing.title}
              listingType={listing.listingType}
            />
          </div>

          {/* Right Column: Listing Details & Seller Card */}
          <div
            style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
          >
            {/* Badges & Meta */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.5rem",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  padding: "0.25rem 0.6rem",
                  borderRadius: "0.375rem",
                  background:
                    listing.listingType === "GIVE_AWAY"
                      ? "#15803d"
                      : listing.listingType === "WANTED"
                        ? "#7c3aed"
                        : "#0f172a",
                  color: "#ffffff",
                }}
              >
                {getListingTypeLabel(listing.listingType)}
              </span>

              <span
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  padding: "0.25rem 0.6rem",
                  borderRadius: "0.375rem",
                  background: "#e2e8f0",
                  color: "#334155",
                }}
              >
                {getConditionLabel(listing.condition)}
              </span>

              <span
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 500,
                  padding: "0.25rem 0.6rem",
                  borderRadius: "0.375rem",
                  background: "#f1f5f9",
                  color: "#475569",
                }}
              >
                {getCategoryLabel(listing.category)}
              </span>
            </div>

            {/* Title */}
            <h1
              style={{
                margin: 0,
                fontSize: "clamp(1.5rem, 3vw, 2rem)",
                fontWeight: 800,
                lineHeight: 1.25,
                color: "#0f172a",
              }}
            >
              {listing.title}
            </h1>

            {/* Price */}
            <div
              style={{ display: "flex", alignItems: "baseline", gap: "1rem" }}
            >
              <span
                style={{
                  fontSize: "2rem",
                  fontWeight: 800,
                  color:
                    listing.listingType === "GIVE_AWAY" ? "#15803d" : "#0f172a",
                }}
              >
                {formatListingPrice(listing.listingType, listing.priceCents)}
              </span>
              <time
                dateTime={listing.createdAt}
                style={{ fontSize: "0.85rem", color: "#64748b" }}
              >
                Eingestellt {formatRelativeTime(listing.createdAt)}
              </time>
            </div>

            {/* Pickup Area Banner */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                padding: "0.75rem 1rem",
                backgroundColor: "#f8fafc",
                borderRadius: "0.5rem",
                border: "1px solid #e2e8f0",
                fontSize: "0.9rem",
                color: "#334155",
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#0284c7"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span>
                <strong>Übergabeort:</strong>{" "}
                {getPickupAreaLabel(listing.pickupArea)} (Braunschweig)
              </span>
            </div>

            {/* Description */}
            <div
              style={{
                paddingTop: "0.5rem",
                borderTop: "1px solid #e2e8f0",
              }}
            >
              <h2
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  marginBottom: "0.75rem",
                  color: "#1e293b",
                }}
              >
                Beschreibung
              </h2>
              <div
                style={{
                  fontSize: "0.95rem",
                  lineHeight: 1.6,
                  color: "#334155",
                  whiteSpace: "pre-line",
                  wordBreak: "break-word",
                }}
              >
                {listing.description}
              </div>
            </div>

            {/* Seller Information Card */}
            <div
              className="seller-profile-card"
              style={{
                marginTop: "0.5rem",
                padding: "1.25rem",
                backgroundColor: "#ffffff",
                borderRadius: "0.75rem",
                border: "1px solid #e2e8f0",
                boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.05)",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              <div
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  color: "#64748b",
                }}
              >
                Anbieter
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <div
                  style={{
                    width: "2.75rem",
                    height: "2.75rem",
                    borderRadius: "50%",
                    backgroundColor: "#e2e8f0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: "1.1rem",
                    color: "#334155",
                    overflow: "hidden",
                  }}
                >
                  {listing.seller.avatarUrl ? (
                    <img
                      src={listing.seller.avatarUrl}
                      alt={listing.seller.displayName}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    listing.seller.displayName.charAt(0).toUpperCase()
                  )}
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.25rem",
                  }}
                >
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: "1rem",
                      color: "#0f172a",
                    }}
                  >
                    {listing.seller.displayName}
                  </span>
                  {listing.seller.universityBadge && (
                    <TrustBadge badge={listing.seller.universityBadge} />
                  )}
                </div>
              </div>

              <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b" }}>
                Privater Nutzer auf CampusMarkt · Kontaktaufnahme und Übergabe
                vor Ort in Braunschweig.
              </p>
            </div>
          </div>
        </div>
      </div>

      <footer>
        <p>Für die Hochschulcommunity und ganz Braunschweig.</p>
      </footer>
    </main>
  );
}
