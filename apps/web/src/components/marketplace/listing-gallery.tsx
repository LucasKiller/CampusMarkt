"use client";

import React, { useState } from "react";
import type { PublicListingImage } from "@campusmarkt/types";
import type { ListingType } from "@campusmarkt/domain";

export interface ListingGalleryProps {
  images: PublicListingImage[];
  title: string;
  listingType: ListingType;
}

export function ListingGallery({
  images,
  title,
  listingType,
}: ListingGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const hasImages = images.length > 0;
  const isWantedWithoutImage = listingType === "WANTED" && !hasImages;

  if (!hasImages) {
    return (
      <div
        className="listing-gallery-placeholder"
        role="img"
        aria-label={
          isWantedWithoutImage
            ? "Gesuch ohne Foto"
            : "Keine Bilder für dieses Inserat vorhanden"
        }
        style={{
          width: "100%",
          aspectRatio: "4 / 3",
          backgroundColor: "#f1f5f9",
          borderRadius: "0.75rem",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.75rem",
          color: "#64748b",
          border: "1px solid #e2e8f0",
        }}
      >
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {isWantedWithoutImage ? (
            <>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="11" y1="8" x2="11" y2="14" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </>
          ) : (
            <>
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </>
          )}
        </svg>
        <span style={{ fontSize: "0.95rem", fontWeight: 500 }}>
          {isWantedWithoutImage ? "Gesuch (Kein Foto)" : "Kein Bild vorhanden"}
        </span>
      </div>
    );
  }

  const currentImage = images[activeIndex] ?? images[0];

  return (
    <div
      className="listing-gallery-carousel"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        width: "100%",
      }}
    >
      {/* Main Image Stage */}
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "4 / 3",
          backgroundColor: "#0f172a",
          borderRadius: "0.75rem",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <img
          src={
            currentImage.storagePath.startsWith("http")
              ? currentImage.storagePath
              : `/${currentImage.storagePath}`
          }
          alt={`${title} - Foto ${activeIndex + 1}`}
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "contain",
          }}
        />

        {/* Prev / Next controls */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() =>
                setActiveIndex((prev) =>
                  prev > 0 ? prev - 1 : images.length - 1,
                )
              }
              aria-label="Vorheriges Foto"
              style={{
                position: "absolute",
                left: "0.75rem",
                top: "50%",
                transform: "translateY(-50%)",
                width: "2.5rem",
                height: "2.5rem",
                borderRadius: "50%",
                backgroundColor: "rgba(0, 0, 0, 0.6)",
                color: "#ffffff",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "background-color 0.15s",
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveIndex((prev) =>
                  prev < images.length - 1 ? prev + 1 : 0,
                )
              }
              aria-label="Nächstes Foto"
              style={{
                position: "absolute",
                right: "0.75rem",
                top: "50%",
                transform: "translateY(-50%)",
                width: "2.5rem",
                height: "2.5rem",
                borderRadius: "50%",
                backgroundColor: "rgba(0, 0, 0, 0.6)",
                color: "#ffffff",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "background-color 0.15s",
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </>
        )}

        {/* Counter Badge */}
        {images.length > 1 && (
          <div
            style={{
              position: "absolute",
              bottom: "0.75rem",
              right: "0.75rem",
              backgroundColor: "rgba(0, 0, 0, 0.7)",
              color: "#ffffff",
              fontSize: "0.75rem",
              fontWeight: 600,
              padding: "0.25rem 0.6rem",
              borderRadius: "9999px",
            }}
          >
            {`${activeIndex + 1} / ${images.length}`}
          </div>
        )}
      </div>

      {/* Dot Indicators */}
      {images.length > 1 && (
        <div
          className="gallery-dots"
          role="tablist"
          aria-label="Bilderübersicht"
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "0.5rem",
            padding: "0.5rem 0",
          }}
        >
          {images.map((img, i) => (
            <button
              key={img.storagePath}
              type="button"
              role="tab"
              aria-selected={activeIndex === i}
              aria-label={`Foto ${i + 1} anzeigen`}
              onClick={() => setActiveIndex(i)}
              style={{
                width: activeIndex === i ? "1.5rem" : "0.5rem",
                height: "0.5rem",
                borderRadius: "9999px",
                backgroundColor: activeIndex === i ? "#0f172a" : "#cbd5e1",
                border: "none",
                padding: 0,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
